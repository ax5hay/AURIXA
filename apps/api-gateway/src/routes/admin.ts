import { FastifyInstance } from "fastify";

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/health", async () => {
    return {
      service: "api-gateway-admin",
      status: "healthy",
      uptime: process.uptime(),
      memoryMB: (process.memoryUsage.rss() / 1024 / 1024).toFixed(1),
    };
  });
}
