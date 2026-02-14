import jwt, {
  NotBeforeError,
  type SignOptions,
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";m "fastify";m "fastify";m "fastify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard JWT payload used across all AURIXA services. */
export interface TokenPayload {
  /** Subject – typically the user ID. */
  sub: string;
  /** Tenant (organisation) the user belongs to. */
  tenantId: string;
  /** Role strings, e.g. ["admin", "trader"]. */
  roles: string[];
  /** Issued-at (epoch seconds). */
  iat: number;
  /** Expiry (epoch seconds). */
  exp: number;
}

/** Extend Fastify's request to carry the authenticated user payload. */
declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

/** Options accepted by the auth middleware Fastify plugin. */
export interface AuthMiddlewareOptions {
  /** JWT secret or public key (default: `JWT_SECRET` env var). */
  secret?: string;
  /** Expected `iss` claim (default: `JWT_ISSUER` env var or "aurixa"). */
  issuer?: string;
  /** Route prefixes that should *not* require authentication. */
  publicPrefixes?: string[];
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the signing secret, preferring an explicit argument, then env.
 * Throws if nothing is configured.
 */
function resolveSecret(explicit?: string): string {
  const secret = explicit ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT secret is not configured. Set the JWT_SECRET environment variable.",
    );
  }
  return secret;
}

/**
 * Verify and decode a JWT, returning the typed payload.
 *
 * @param token   Raw JWT string (without "Bearer " prefix).
 * @param secret  Signing secret override (falls back to `JWT_SECRET` env var).
 * @param issuer  Expected issuer claim (falls back to `JWT_ISSUER` or "aurixa").
 */
export async function verifyJWT(
  token: string,
  secret?: string,
  issuer?: string,
): Promise<TokenPayload> {
  const key = resolveSecret(secret);
  const iss = issuer ?? process.env.JWT_ISSUER ?? "aurixa";

  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(
      token,
      key,
      { algorithms: ["HS256", "HS384", "HS512"], issuer: iss },
      (err, decoded) => {
        if (err) {
          reject(normalizeJwtError(err));
          return;
        }

        const payload = decoded as Record<string, unknown>;

        // Validate shape minimally
        if (
          typeof payload.sub !== "string" ||
          typeof payload.tenantId !== "string" ||
          !Array.isArray(payload.roles)
        ) {
          reject(
            new AuthError(
              "INVALID_TOKEN",
              "Token payload is missing required claims (sub, tenantId, roles).",
            ),
          );
          return;
        }

        resolve({
          sub: payload.sub,
          tenantId: payload.tenantId as string,
          roles: payload.roles as string[],
          iat: payload.iat as number,
          exp: payload.exp as number,
        });
      },
    );
  });
}

/**
 * Create a signed JWT. Primarily used in tests and by the auth service itself.
 */
export function signJWT(
  payload: Omit<TokenPayload, "iat" | "exp">,
  secret?: string,
  options?: { expiresIn?: string; issuer?: string },
): string {
  const key = resolveSecret(secret);
  const iss = options?.issuer ?? process.env.JWT_ISSUER ?? "aurixa";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signOptions: any = {
    algorithm: "HS256",
    expiresIn: options?.expiresIn ?? process.env.JWT_EXPIRES_IN ?? "1h",
    issuer: iss,
  };

  return jwt.sign(
    { sub: payload.sub, tenantId: payload.tenantId, roles: payload.roles },
    key,
    signOptions,
  );
}

// ---------------------------------------------------------------------------
// Fastify auth middleware (plugin)
// ---------------------------------------------------------------------------

/**
 * Fastify plugin that extracts a Bearer token from the `Authorization` header,
 * validates it, and sets `request.user` to the decoded payload.
 *
 * ```ts
 * import Fastify from "fastify";
 * import { createAuthMiddleware } from "@aurixa/auth";
 *
 * const app = Fastify();
 * app.register(createAuthMiddleware({ publicPrefixes: ["/health"] }));
 * ```
 */
export const createAuthMiddleware = fp(
  async function authMiddleware(
    fastify: FastifyInstance,
    options: AuthMiddlewareOptions,
  ) {
    const {
      secret,
      issuer,
      publicPrefixes = ["/health", "/healthz", "/ready", "/metrics"],
    } = options;

    fastify.addHook(
      "onRequest",
      async (request: FastifyRequest, reply: FastifyReply) => {
        // Skip public routes
        if (publicPrefixes.some((prefix) => request.url.startsWith(prefix))) {
          return;
        }

        const authHeader = request.headers.authorization;
        if (!authHeader) {
          reply.code(401).send({ error: "Missing Authorization header" });
          return;
        }

        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
          reply.code(401).send({ error: "Invalid Authorization header format (expected: Bearer <token>)" });
          return;
        }

        try {
          request.user = await verifyJWT(parts[1], secret, issuer);
        } catch (err) {
          const authErr =
            err instanceof AuthError
              ? err
              : new AuthError("UNKNOWN", String(err));

          reply.code(401).send({
            error: authErr.code,
            message: authErr.message,
          });
        }
      },
    );
  },
  {
    name: "@aurixa/auth",
    fastify: ">=4.x",
  },
);

// ---------------------------------------------------------------------------
// API Key authentication
// ---------------------------------------------------------------------------

export interface ApiKeyValidationResult {
  valid: boolean;
  tenantId?: string;
  scopes?: string[];
}

export type ApiKeyResolver = (apiKey: string) => Promise<ApiKeyValidationResult>;

/**
 * Simple API-key validator.
 *
 * In production you would back this with a database lookup. The default
 * implementation checks against the `AURIXA_API_KEY` env var (useful for
 * service-to-service calls in dev/staging).
 */
export class ApiKeyAuth {
  private resolver: ApiKeyResolver;

  constructor(resolver?: ApiKeyResolver) {
    this.resolver = resolver ?? ApiKeyAuth.envResolver();
  }

  /** Validate an API key and return scoping information. */
  async validate(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false };
    }
    return this.resolver(apiKey);
  }

  /**
   * Default resolver: compares against `AURIXA_API_KEY` env var.
   * Grants full scope to matching keys (suitable only for internal services).
   */
  static envResolver(): ApiKeyResolver {
    return async (apiKey: string) => {
      const expected = process.env.AURIXA_API_KEY;
      if (!expected) {
        return { valid: false };
      }
      // Constant-time comparison (basic)
      if (apiKey.length !== expected.length) {
        return { valid: false };
      }
      let mismatch = 0;
      for (let i = 0; i < apiKey.length; i++) {
        mismatch |= apiKey.charCodeAt(i) ^ expected.charCodeAt(i);
      }
      return mismatch === 0
        ? { valid: true, tenantId: "internal", scopes: ["*"] }
        : { valid: false };
    };
  }
}

// ---------------------------------------------------------------------------
// Role-based access helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the token payload includes **any** of the required roles.
 */
export function hasAnyRole(user: TokenPayload, roles: string[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

/**
 * Check whether the token payload includes **all** of the required roles.
 */
export function hasAllRoles(user: TokenPayload, roles: string[]): boolean {
  return roles.every((role) => user.roles.includes(role));
}

// ---------------------------------------------------------------------------
// Custom error type
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "TOKEN_NOT_ACTIVE"
  | "MISSING_TOKEN"
  | "UNKNOWN";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

function normalizeJwtError(err: Error): AuthError {
  if (err instanceof TokenExpiredError) {
    return new AuthError("TOKEN_EXPIRED", "Token has expired");
  }
  if (err instanceof NotBeforeError) {
    return new AuthError("TOKEN_NOT_ACTIVE", "Token is not yet active");
  }
  if (err instanceof JsonWebTokenError) {
    return new AuthError("INVALID_TOKEN", err.message);
  }
  return new AuthError("UNKNOWN", err.message);
}
