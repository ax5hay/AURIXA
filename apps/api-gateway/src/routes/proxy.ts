import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getServiceUrl } from "../config.js";

/** Route map: URL prefix → downstream service name */
const ROUTE_MAP: Record<string, string> = {
  orchestration: "orchestration",
  llm: "llm-router",
  agents: "agent-runtime",
  rag: "rag",
  safety: "safety",
  execute: "execution",
  voice: "voice",
};

export async function proxyRoutes(app: FastifyInstance) {
  // Register a catch-all proxy for each service prefix
  for (const [prefix, serviceName] of Object.entries(ROUTE_MAP)) {
    app.all(
      `/${prefix}/*`,
      async (req: FastifyRequest, reply: FastifyReply) => {
        const upstream = getServiceUrl(serviceName);
        const path = (req.params as Record<string, string>)["*"];
        const url = `${upstream}/api/v1/${path ?? ""}`;

        const start = performance.now();
        try {
          const headers: Record<string, string> = {
            "content-type":
              req.headers["content-type"] || "application/json",
            "x-request-id": req.id,
          };

          // Forward auth header
          if (req.headers.authorization) {
            headers.authorization = req.headers.authorization;
          }
          // Forward tenant context
          if (req.headers["x-tenant-id"]) {
            headers["x-tenant-id"] = req.headers["x-tenant-id"] as string;
          }

          // Orchestration pipelines (LLM generation) need 2+ minutes; LM Studio can be slow
          const isPipeline = prefix === "orchestration" && (path ?? "").includes("pipeline");
          const isLlm = prefix === "llm";
          const timeoutMs = isPipeline ? 180000 : isLlm ? 15000 : 30000;
          const response = await fetch(url, {
            method: req.method,
            headers,
            body:
              req.method !== "GET" && req.method !== "HEAD"
                ? JSON.stringify(req.body ?? {})
                : undefined,
            signal: AbortSignal.timeout(timeoutMs),
          });

          const latency = Math.round(performance.now() - start);
          const body = await response.text();

          reply
            .status(response.status)
            .header("x-upstream-latency-ms", latency)
            .header("x-upstream-service", serviceName)
            .type(response.headers.get("content-type") || "application/json")
            .send(body);
        } catch (err) {
          const latency = Math.round(performance.now() - start);
          req.log.error(
            { err, service: serviceName, path, latencyMs: latency },
            "Upstream request failed"
          );
          reply.status(502).send({
            error: "Bad Gateway",
            service: serviceName,
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    );
  }
}
