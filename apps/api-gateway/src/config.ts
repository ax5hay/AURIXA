export interface ServiceEndpoint {
  host: string;
  port: number;
  healthPath: string;
}

function svc(envPrefix: string, defaultPort: number): ServiceEndpoint {
  return {
    host: process.env[`${envPrefix}_HOST`] || "localhost",
    port: parseInt(process.env[`${envPrefix}_PORT`] || String(defaultPort), 10),
    healthPath: "/health",
  };
}

export const SERVICE_REGISTRY: Record<string, ServiceEndpoint> = {
  orchestration: svc("ORCHESTRATION", 8001),
  "llm-router": svc("LLM_ROUTER", 8002),
  "agent-runtime": svc("AGENT_RUNTIME", 8003),
  rag: svc("RAG_SERVICE", 8004),
  safety: svc("SAFETY", 8005),
  voice: svc("VOICE", 8006),
  execution: svc("EXECUTION", 8007),
  observability: svc("OBSERVABILITY", 8008),
};

export function getServiceUrl(name: string): string {
  const svc = SERVICE_REGISTRY[name];
  if (!svc) throw new Error(`Unknown service: ${name}`);
  return `http://${svc.host}:${svc.port}`;
}
