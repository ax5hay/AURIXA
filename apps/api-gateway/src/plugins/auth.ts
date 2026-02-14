/**
 * Auth plugin - modular placeholder for future authentication.
 * Plug in JWT validation, API key auth, or session-based auth by replacing this module.
 * Currently a no-op; all routes remain public.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

export interface AuthPluginOptions {
  /** Route prefixes that skip auth (e.g. /health, /auth/login) */
  publicPrefixes?: string[];
}

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  roles: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

async function authPlugin(
  fastify: FastifyInstance,
  opts: AuthPluginOptions
): Promise<void> {
  const publicPrefixes = opts.publicPrefixes ?? [
    "/",
    "/health",
    "/api/v1/auth",
  ];

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0];
    if (publicPrefixes.some((p) => path === p || path.startsWith(p + "/"))) {
      return;
    }
    // TODO: Validate JWT/API key and set request.user
    // For now: no-op, all routes public
  });
}

export default fp(authPlugin, { name: "@aurixa/auth-plugin" });
