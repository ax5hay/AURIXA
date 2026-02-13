import { FastifyInstance } from "fastify";
import { SERVICE_REGISTRY, getServiceUrl } from "../config.js";

export async function healthRoutes(app: FastifyInstance) {
  // Root welcome message
  app.get("/", async () => {
    return {
      message: "Welcome to the AURIXA API Gateway.",
      documentation: "See /README.md for details.",
      version: "0.1.0",
    };
  });
  
  // Gateway health
  app.get("/health", async () => {
    return {
      service: "api-gateway",
      status: "healthy",
      uptime: process.uptime(),
      memoryMB: (process.memoryUsage.rss() / 1024 / 1024).toFixed(1),
    };
  });

  // Aggregate health of all downstream services
  app.get("/health/services", async (req) => {
    const results: Record<string, { status: string; latencyMs?: number }> = {};

    const checks = Object.entries(SERVICE_REGISTRY).map(
      async ([name, svc]) => {
        const start = performance.now();
        try {
          const res = await fetch(
            `http://${svc.host}:${svc.port}${svc.healthPath}`,
            { signal: AbortSignal.timeout(3000) }
          );
          results[name] = {
            status: res.ok ? "healthy" : "degraded",
            latencyMs: Math.round(performance.now() - start),
          };
        } catch {
          results[name] = {
            status: "down",
            latencyMs: Math.round(performance.now() - start),
          };
        }
      }
    );

    await Promise.allSettled(checks);
    return { gateway: "healthy", services: results };
  });
}
