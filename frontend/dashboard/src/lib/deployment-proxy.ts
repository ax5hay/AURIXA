import { SignJWT } from "jose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, authSessionConfigured } from "@/auth";

const SAFE_RESPONSE_HEADERS = ["content-type", "x-request-id", "x-upstream-service"];
const TOKEN_LIFETIME_SECONDS = 60;

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function deploymentGatewayBase(): URL | null {
  const configured = process.env.DEPLOYMENT_GATEWAY_URL ?? process.env.API_GATEWAY_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/api/v1/admin/deployments";
    }
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function deploymentToken() {
  if (!authSessionConfigured) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.roles.includes("deployment-admin")) return null;

  const secret = process.env.DEPLOYMENT_JWT_SECRET;
  if (!secret || secret.length < 32) return null;

  const issuer = process.env.DEPLOYMENT_JWT_ISSUER ?? "aurixa";
  const audience = process.env.DEPLOYMENT_JWT_AUDIENCE ?? "aurixa-deployment-control-plane";

  return new SignJWT({
    tenantId: session.user.tenantId,
    roles: session.user.roles,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(session.user.id)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function proxyDeploymentRequest(request: Request, path: string[] = []) {
  const token = await deploymentToken();
  if (!token) return errorResponse(401, "An authorized deployment session is required.");

  const base = deploymentGatewayBase();
  if (!base) return errorResponse(503, "Deployment gateway is not configured.");

  const incomingUrl = new URL(request.url);
  const basePath = base.pathname.replace(/\/$/, "");
  base.pathname = [basePath, ...path.map(encodeURIComponent)].join("/");
  base.search = incomingUrl.search;

  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "application/json",
    Authorization: `Bearer ${token}`,
  });
  const contentType = request.headers.get("content-type");
  const idempotencyKey = request.headers.get("idempotency-key");
  if (contentType) headers.set("Content-Type", contentType);
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  try {
    const upstream = await fetch(base, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const responseHeaders = new Headers();
    for (const name of SAFE_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse(502, "Deployment gateway is unavailable.");
  }
}
