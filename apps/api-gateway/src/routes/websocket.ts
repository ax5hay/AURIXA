import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { getServiceUrl } from "../config.js";

/** Buffer client messages until upstream is open, then forward. Ensures no message loss on slow upstream connect. */
function proxyWithBuffering(
  socket: WebSocket,
  upstream: WebSocket,
  log: { info: (o: object, msg: string) => void; error: (o: object, msg: string) => void }
) {
  const clientToUpstreamBuffer: (Buffer | Buffer[] | ArrayBuffer)[] = [];
  let upstreamReady = false;

  upstream.on("open", () => {
    upstreamReady = true;
    log.info({}, "Voice upstream connection established");
    for (const data of clientToUpstreamBuffer) {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
    }
    clientToUpstreamBuffer.length = 0;
  });

  socket.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data);
    } else if (!upstreamReady) {
      clientToUpstreamBuffer.push(data);
    }
  });

  upstream.on("message", (data: Buffer | Buffer[] | ArrayBuffer) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });
}

export async function wsRoutes(app: FastifyInstance) {
  // WebSocket proxy to voice service — buffers client messages until upstream is open for razor-sharp streaming
  app.get(
    "/voice",
    { websocket: true },
    async (socket: WebSocket, req) => {
      const voiceUrl = getServiceUrl("voice").replace("http", "ws");
      const upstream = new WebSocket(`${voiceUrl}/ws/stream`, { handshakeTimeout: 10000 });

      proxyWithBuffering(socket, upstream, req.log);

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
      const upstream = new WebSocket(orchUrl + "/ws/conversation", { handshakeTimeout: 10000 });

      proxyWithBuffering(socket, upstream, req.log);

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
