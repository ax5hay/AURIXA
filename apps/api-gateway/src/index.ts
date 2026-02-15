import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { healthRoutes } from "./routes/health.js";
import { proxyRoutes } from "./routes/proxy.js";
import { wsRoutes } from "./routes/websocket.js";
import { adminRoutes } from "./routes/admin.js";
import { observeRoutes } from "./routes/observe.js";
import { requestLogger } from "./middleware/request-logger.js";
import { SERVICE_REGISTRY } from "./config.js";

const PORT = parseInt(process.env.API_GATEWAY_PORT || "3000", 10);
const HOST = process.env.API_GATEWAY_HOST || "0.0.0.0";

async function main() {
  const startTime = performance.now();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // Security & middleware
  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      return (
        req.headers["x-tenant-id"]?.toString() ||
        req.headers["x-forwarded-for"]?.toString() ||
        req.ip
      );
    },
  });
  await app.register(websocket);

  // Request logging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestLogger(app as any);

  // Routes (specific routes before catch-all proxy)
  await app.register(healthRoutes, { prefix: "/" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });
  await app.register(observeRoutes, { prefix: "/api/v1/observe" });
  await app.register(proxyRoutes, { prefix: "/api/v1" });
  await app.register(wsRoutes, { prefix: "/ws" });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully`);
      await app.close();
      process.exit(0);
    });
  }

  await app.listen({ port: PORT, host: HOST });

  const bootTime = (performance.now() - startTime).toFixed(1);
  app.log.info(
    {
      bootTimeMs: bootTime,
      port: PORT,
      services: Object.keys(SERVICE_REGISTRY),
      memoryMB: (process.memoryUsage.rss() / 1024 / 1024).toFixed(1),
    },
    `api-gateway started in ${bootTime}ms`
  );
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
