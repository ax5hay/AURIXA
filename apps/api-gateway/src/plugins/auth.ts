/**
 * Auth plugin - modular placeholder for future authentication.
 * Plug in JWT validation, API key auth, or session-based auth by replacing this module.
 * Currently a no-op; all routes remain public.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { TokenPayload } from "@aurixa/auth";

export interface AuthPluginOptions {
  /** Route prefixes that skip auth (e.g. /health, /auth/login) */
  publicPrefixes?: string[];
}

export type AuthenticatedUser = TokenPayload;

declare module "fastify" {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

async function authPlugin(fastify: FastifyInstance, opts: AuthPluginOptions): Promise<void> {
  const publicPrefixes = opts.publicPrefixes ?? ["/", "/health", "/api/v1/auth"];

  fastify.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    const path = request.url.split("?")[0];
    if (publicPrefixes.some((p) => path === p || path.startsWith(p + "/"))) {
      return;
    }
    // TODO: Validate JWT/API key and set request.user
    // For now: no-op, all routes public
  });
}

export default fp(authPlugin, { name: "@aurixa/auth-plugin" });
