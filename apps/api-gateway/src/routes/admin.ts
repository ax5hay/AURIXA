import { FastifyInstance } from "fastify";
import { getServiceUrl } from "../config.js";

async function proxyToOrchestration(path: string, req: any, reply: any) {
  const base = getServiceUrl("orchestration");
  const qs = new URLSearchParams((req.query as Record<string, string>) ?? {}).toString();
  const url = `${base}/api/v1/${path}${qs ? `?${qs}` : ""}`;
  try {
    req.log.debug({ path, url }, "Proxying to orchestration");
    const res = await fetch(url, {
      method: req.method,
      headers: { "content-type": "application/json" },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    if (!res.ok) {
      req.log.warn({ path, status: res.status, url }, "Orchestration returned error");
    }
    reply.status(res.status).type("application/json").send(body);
  } catch (err) {
    req.log.error({ err, path, url }, "Orchestration proxy failed");
    reply.status(502).send({
      error: "Bad Gateway",
      service: "orchestration",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/tenants", async (req, reply) => proxyToOrchestration("tenants", req, reply));
  app.post("/tenants", async (req, reply) => proxyToOrchestration("tenants", req, reply));
  app.get("/tenants/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`tenants/${id}`, req, reply);
  });
  app.patch("/tenants/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`tenants/${id}`, req, reply);
  });
  app.get("/audit", async (req, reply) => proxyToOrchestration("audit", req, reply));
  app.get("/analytics/summary", async (req, reply) => proxyToOrchestration("analytics/summary", req, reply));
  app.get("/config/summary", async (req, reply) => proxyToOrchestration("config/summary", req, reply));
  app.get("/config/detail", async (req, reply) => proxyToOrchestration("config/detail", req, reply));
  app.patch("/config/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    return proxyToOrchestration(`config/${encodeURIComponent(key)}`, req, reply);
  });
  app.get("/patients", async (req, reply) => proxyToOrchestration("patients", req, reply));
  app.post("/patients", async (req, reply) => proxyToOrchestration("patients", req, reply));
  app.get("/patients/:id/appointments", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`patients/${id}/appointments`, req, reply);
  });
  app.get("/patients/:id/conversations", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`patients/${id}/conversations`, req, reply);
  });
  app.get("/patients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`patients/${id}`, req, reply);
  });
  app.get("/knowledge/articles", async (req, reply) => proxyToOrchestration("knowledge/articles", req, reply));
  app.post("/knowledge/articles", async (req, reply) => proxyToOrchestration("knowledge/articles", req, reply));
  app.get("/appointments", async (req, reply) => proxyToOrchestration("appointments", req, reply));
  app.post("/appointments", async (req, reply) => proxyToOrchestration("appointments", req, reply));
  app.patch("/appointments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`appointments/${id}`, req, reply);
  });
  app.get("/staff", async (req, reply) => proxyToOrchestration("staff", req, reply));

  app.get("/health", async () => ({
    service: "api-gateway-admin",
    status: "healthy",
    uptime: process.uptime(),
    memoryMB: (process.memoryUsage.rss() / 1024 / 1024).toFixed(1),
  }));
}
