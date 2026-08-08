import { verifyJWT, type TokenPayload } from "@aurixa/auth";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getServiceUrl } from "../config.js";

export class DeploymentAuthorizationError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function authorizeDeploymentToken(
  authorization: string | undefined,
  isWrite: boolean,
): Promise<TokenPayload> {
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new DeploymentAuthorizationError(401, "Deployment administrator token required");
  }
  if (!process.env.DEPLOYMENT_JWT_SECRET) {
    throw new DeploymentAuthorizationError(503, "Deployment authentication is not configured");
  }
  if (process.env.DEPLOYMENT_JWT_SECRET.length < 32) {
    throw new DeploymentAuthorizationError(503, "Deployment authentication secret is too short");
  }
  let user: TokenPayload;
  try {
    user = await verifyJWT(
      authorization.slice(7),
      process.env.DEPLOYMENT_JWT_SECRET,
      process.env.DEPLOYMENT_JWT_ISSUER || "aurixa",
    );
    const payload = JSON.parse(
      Buffer.from(authorization.slice(7).split(".")[1], "base64url").toString("utf8"),
    ) as { aud?: string | string[] };
    const expectedAudience =
      process.env.DEPLOYMENT_JWT_AUDIENCE || "aurixa-deployment-control-plane";
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expectedAudience)) {
      throw new Error("Invalid deployment token audience");
    }
  } catch {
    throw new DeploymentAuthorizationError(401, "Invalid deployment administrator token");
  }
  const adminRoles = new Set(
    (process.env.DEPLOYMENT_ADMIN_ROLES || "admin,deployment-admin")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  );
  if (!user.roles.some((role) => adminRoles.has(role))) {
    throw new DeploymentAuthorizationError(403, "Deployment administrator role required");
  }
  if (isWrite && process.env.DEPLOYMENT_WRITES_ENABLED !== "true") {
    throw new DeploymentAuthorizationError(503, "Deployment writes are disabled");
  }
  return user;
}

async function authorize(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    req.user = await authorizeDeploymentToken(
      req.headers.authorization,
      !["GET", "HEAD", "OPTIONS"].includes(req.method),
    );
  } catch (error) {
    const authError =
      error instanceof DeploymentAuthorizationError
        ? error
        : new DeploymentAuthorizationError(401, "Unauthorized");
    await reply.code(authError.statusCode).send({ detail: authError.message });
  }
}

async function proxyDeployment(path: string, req: FastifyRequest, reply: FastifyReply) {
  const query = new URLSearchParams(
    Object.entries((req.query as Record<string, unknown>) ?? {}).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((item) => [key, String(item)] as [string, string])
        : [[key, String(value)] as [string, string]],
    ),
  ).toString();
  const url = `${getServiceUrl("deployment-controller")}/api/v1/${path}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = {
    "content-type": req.headers["content-type"] || "application/json",
    "x-request-id": req.id,
  };
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers["idempotency-key"]) {
    headers["idempotency-key"] = String(req.headers["idempotency-key"]);
  }
  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(30000),
    });
    reply
      .code(response.status)
      .header("x-upstream-service", "deployment-controller")
      .type(response.headers.get("content-type") || "application/json")
      .send(await response.text());
  } catch (error) {
    req.log.error({ error, url }, "Deployment controller proxy failed");
    reply.code(502).send({ error: "Deployment controller unavailable" });
  }
}

export async function deploymentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authorize);
  app.all("/", async (req, reply) => proxyDeployment("admin/deployments", req, reply));
  app.all("/*", async (req, reply) => {
    const path = (req.params as { "*": string })["*"];
    return proxyDeployment(`admin/deployments/${path}`, req, reply);
  });
}

export async function legacyDeploymentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authorize);
  app.all("/", async (req, reply) => proxyDeployment("deployments", req, reply));
  app.all("/*", async (req, reply) => {
    const path = (req.params as { "*": string })["*"];
    return proxyDeployment(path, req, reply);
  });
}

export async function deploymentCallbackRoutes(app: FastifyInstance) {
  app.post("/github-actions", async (req, reply) => {
    return proxyDeployment("callbacks/github-actions", req, reply);
  });
}
