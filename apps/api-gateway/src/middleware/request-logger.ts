import { FastifyInstance } from "fastify";

export function requestLogger(app: FastifyInstance) {
  app.addHook("onRequest", (req, _reply, done) => {
    req.log.info(
      {
        method: req.method,
        url: req.url,
        requestId: req.id,
        tenantId: req.headers["x-tenant-id"],
        userAgent: req.headers["user-agent"],
      },
      "incoming request"
    );
    done();
  });

  app.addHook("onResponse", (req, reply, done) => {
    req.log.info(
      {
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        requestId: req.id,
        responseTimeMs: Math.round(reply.elapsedTime),
      },
      "request completed"
    );
    done();
  });
}
