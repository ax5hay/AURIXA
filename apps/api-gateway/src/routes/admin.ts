import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getServiceUrl } from "../config.js";

async function proxyToOrchestration(path: string, req: FastifyRequest, reply: FastifyReply) {
  const base = getServiceUrl("orchestration");
  const qs = new URLSearchParams((req.query as Record<string, string>) ?? {}).toString();
  const url = `${base}/api/v1/${path}${qs ? `?${qs}` : ""}`;
  const needsLongTimeout = path.includes("agent/drafts");
  try {
    req.log.debug({ path, url }, "Proxying to orchestration");
    const res = await fetch(url, {
      method: req.method,
      headers: { "content-type": "application/json" },
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(needsLongTimeout ? 180000 : 30000),
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
  app.get("/analytics/summary", async (req, reply) =>
    proxyToOrchestration("analytics/summary", req, reply),
  );
  app.get("/config/summary", async (req, reply) =>
    proxyToOrchestration("config/summary", req, reply),
  );
  app.get("/config/detail", async (req, reply) =>
    proxyToOrchestration("config/detail", req, reply),
  );
  app.patch("/config/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    return proxyToOrchestration(`config/${encodeURIComponent(key)}`, req, reply);
  });

  // Clients (real estate) + legacy /patients aliases
  app.get("/clients", async (req, reply) => proxyToOrchestration("clients", req, reply));
  app.post("/clients", async (req, reply) => proxyToOrchestration("clients", req, reply));
  app.get("/clients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}`, req, reply);
  });
  app.get("/clients/:id/showings", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}/showings`, req, reply);
  });
  app.get("/clients/:id/conversations", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}/conversations`, req, reply);
  });
  app.patch("/clients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}`, req, reply);
  });
  app.get("/patients", async (req, reply) => proxyToOrchestration("clients", req, reply));
  app.post("/patients", async (req, reply) => proxyToOrchestration("clients", req, reply));
  app.get("/patients/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}`, req, reply);
  });
  app.get("/patients/:id/appointments", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}/showings`, req, reply);
  });
  app.get("/patients/:id/conversations", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`clients/${id}/conversations`, req, reply);
  });

  // Showings + legacy /appointments
  app.get("/showings", async (req, reply) => proxyToOrchestration("showings", req, reply));
  app.post("/showings", async (req, reply) => proxyToOrchestration("showings", req, reply));
  app.patch("/showings/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`showings/${id}`, req, reply);
  });
  app.get("/appointments", async (req, reply) => proxyToOrchestration("showings", req, reply));
  app.post("/appointments", async (req, reply) => proxyToOrchestration("appointments", req, reply));
  app.patch("/appointments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`showings/${id}`, req, reply);
  });

  app.get("/listings", async (req, reply) => proxyToOrchestration("listings", req, reply));
  app.get("/listings/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`listings/${id}`, req, reply);
  });
  app.get("/properties", async (req, reply) => proxyToOrchestration("properties", req, reply));

  app.get("/leads", async (req, reply) => proxyToOrchestration("leads", req, reply));
  app.post("/leads", async (req, reply) => proxyToOrchestration("leads", req, reply));
  app.patch("/leads/:id/stage", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`leads/${id}/stage`, req, reply);
  });

  app.get("/activity/overnight", async (req, reply) =>
    proxyToOrchestration("activity/overnight", req, reply),
  );
  app.get("/activity/stale", async (req, reply) =>
    proxyToOrchestration("activity/stale", req, reply),
  );
  app.get("/escalations", async (req, reply) => proxyToOrchestration("escalations", req, reply));
  app.patch("/escalations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return proxyToOrchestration(`escalations/${id}`, req, reply);
  });
  app.post("/agent/drafts", async (req, reply) =>
    proxyToOrchestration("agent/drafts", req, reply),
  );
  app.post("/agent/drafts/stream", async (req, reply) => {
    const base = getServiceUrl("orchestration");
    const url = `${base}/api/v1/agent/drafts/stream`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(180000),
      });
      reply.status(res.status);
      reply.header("content-type", res.headers.get("content-type") ?? "application/x-ndjson");
      reply.header("cache-control", "no-store");
      return reply.send(res.body);
    } catch (err) {
      req.log.error({ err, url }, "Draft stream proxy failed");
      return reply.status(502).send({
        error: "Bad Gateway",
        service: "orchestration",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/staff", async (req, reply) => proxyToOrchestration("staff", req, reply));

  app.get("/knowledge/articles", async (req, reply) =>
    proxyToOrchestration("knowledge/articles", req, reply),
  );
  app.post("/knowledge/articles", async (req, reply) =>
    proxyToOrchestration("knowledge/articles", req, reply),
  );

  app.get("/health", async () => ({
    service: "api-gateway-admin",
    status: "healthy",
    uptime: process.uptime(),
    memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
  }));
}
