import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { getServiceUrl } from "../config.js";

export async function wsRoutes(app: FastifyInstance) {
  // WebSocket proxy to voice service
  app.get(
    "/voice",
    { websocket: true },
    async (socket: WebSocket, req) => {
      const voiceUrl = getServiceUrl("voice").replace("http", "ws");
      const upstream = new WebSocket(`${voiceUrl}/ws/stream`);

      upstream.on("open", () => {
        req.log.info("Voice upstream connection established");
      });

      // Client → Upstream
      socket.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data);
        }
      });

      // Upstream → Client
      upstream.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });

      // Cleanup
      const cleanup = () => {
        if (upstream.readyState === WebSocket.OPEN) upstream.close();
        if (socket.readyState === WebSocket.OPEN) socket.close();
      };

      socket.on("close", cleanup);
      upstream.on("close", cleanup);
      socket.on("error", (err: Error) => {
        req.log.error({ err }, "Client WebSocket error");
        cleanup();
      });
      upstream.on("error", (err: Error) => {
        req.log.error({ err }, "Upstream WebSocket error");
        cleanup();
      });
    }
  );

  // WebSocket proxy to orchestration (conversation streaming)
  app.get(
    "/conversation",
    { websocket: true },
    async (socket: WebSocket, req) => {
      const orchUrl = getServiceUrl("orchestration").replace("http", "ws");
      const upstream = new WebSocket(`${orchUrl}/ws/conversation`);

      upstream.on("open", () => {
        req.log.info("Orchestration upstream connection established");
      });

      socket.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data);
        }
      });

      upstream.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });

      const cleanup = () => {
        if (upstream.readyState === WebSocket.OPEN) upstream.close();
        if (socket.readyState === WebSocket.OPEN) socket.close();
      };

      socket.on("close", cleanup);
      upstream.on("close", cleanup);
      socket.on("error", () => cleanup());
      upstream.on("error", () => cleanup());
    }
  );
}
