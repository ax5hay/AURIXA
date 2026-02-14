import { FastifyInstance } from "fastify";
import { getServiceUrl } from "../config.js";

export async function observeRoutes(app: FastifyInstance) {
  app.get("/reports/performance", async (req, reply) => {
    const url = `${getServiceUrl("observability")}/api/v1/reports/performance`;
    const res = await fetch(url);
    const body = await res.text();
    reply.status(res.status).type("application/json").send(body);
  });
}
