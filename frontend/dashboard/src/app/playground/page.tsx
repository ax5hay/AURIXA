"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge, Button, PageHeader, PipelineVisualizer } from "@aurixa/ui-kit";
import {
  runPipeline,
  routeIntent,
  retrieveRAG,
  validateSafety,
  runAgentTask,
  executeAction,
  listExecutionActions,
  getClients,
  getServiceHealth,
  getAnalytics,
  getAnalyticsSummary,
  getLLMProviders,
  getLLMModels,
  getKnowledgeArticles,
  getAuditLog,
  type PipelineResponse,
  type ServiceHealth,
} from "@/app/services/api";

const PIPELINE_SAMPLES = [
  "What are your office hours?",
  "How do I schedule a property showing?",
  "Tell me about financing and pre-approval.",
  "I need help with a maintenance request.",
  "Get showings for client 1",
  "What listings are available downtown?",
];

interface TestResult {
  id: string;
  label: string;
  status: "pass" | "fail";
  latencyMs: number;
  error?: string;
  at: string;
}

const SERVICE_TESTS: {
  id: string;
  label: string;
  fn: string;
  sample?: string;
  action?: string;
  params?: Record<string, unknown>;
}[] = [
  { id: "route", label: "LLM Route", fn: "route", sample: "I need to schedule a showing" },
  { id: "rag", label: "RAG Retrieve", fn: "rag", sample: "fair housing policy" },
  {
    id: "safety",
    label: "Safety Validate",
    fn: "safety",
    sample: "Hello, this is a normal message",
  },
  { id: "agent", label: "Agent Run", fn: "agent", sample: "Get showings for client 1" },
  {
    id: "execute",
    label: "Execute",
    fn: "execute",
    action: "get_showings",
    params: { client_id: 1 },
  },
  { id: "knowledge", label: "Knowledge Articles", fn: "knowledge" },
  { id: "llm-providers", label: "LLM Providers", fn: "llm-providers" },
  { id: "llm-models", label: "LLM Models", fn: "llm-models" },
  { id: "audit", label: "Audit Log", fn: "audit" },
  { id: "health", label: "Service Health", fn: "health" },
];

export default function PlaygroundPage() {
  const [activeView, setActiveView] = useState<"overview" | "pipeline" | "services" | "actions">(
    "pipeline",
  );
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceResult, setServiceResult] = useState<Record<string, unknown> | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [clients, setClients] = useState<{ id: number; fullName: string }[]>([]);
  const [flowSteps, setFlowSteps] = useState<{ name: string; status: string }[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [metrics, setMetrics] = useState<{
    performance?: Awaited<ReturnType<typeof getAnalytics>>;
    summary?: Awaited<ReturnType<typeof getAnalyticsSummary>>;
    refreshedAt?: string;
  } | null>(null);

  const refreshHealthAndMetrics = useCallback(async () => {
    try {
      const [health, perf, summary] = await Promise.all([
        getServiceHealth(),
        getAnalytics().catch(() => null),
        getAnalyticsSummary().catch(() => null),
      ]);
      setServiceHealth(health);
      setMetrics({
        performance: perf ?? undefined,
        summary: summary ?? undefined,
        refreshedAt: new Date().toISOString(),
      });
    } catch {
      setServiceHealth(null);
      setMetrics(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listExecutionActions().catch(() => ({ actions: [] })),
      getClients().catch(() => []),
    ]).then(([actionsRes, clientsList]) => {
      if (mounted) {
        setActions(actionsRes?.actions ?? []);
        setClients(Array.isArray(clientsList) ? clientsList : []);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    refreshHealthAndMetrics();
  }, [refreshHealthAndMetrics]);

  const handlePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setLoading(true);
    setResponse(null);
    setError(null);
    setFlowSteps([
      { name: "Intent", status: "running" },
      { name: "RAG/Agent", status: "pending" },
      { name: "Generate", status: "pending" },
      { name: "Safety", status: "pending" },
    ]);

    try {
      const res = await runPipeline(prompt, {
        client_id: clientId !== "" ? clientId : undefined,
      });
      setResponse(res);
      setFlowSteps([
        { name: "Intent", status: "done" },
        { name: "RAG/Agent", status: "done" },
        { name: "Generate", status: "done" },
        { name: "Safety", status: "done" },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const isAbort = msg.toLowerCase().includes("abort") || msg.includes("signal is aborted");
      setError(
        isAbort
          ? "Request timed out. LLM can take 30–120s—ensure LM Studio is running at http://127.0.0.1:1234 with a model loaded."
          : msg,
      );
      setFlowSteps((s) => s.map((x) => ({ ...x, status: "error" })));
    } finally {
      setLoading(false);
    }
  };

  const runServiceTest = async (test: (typeof SERVICE_TESTS)[number]) => {
    setServiceResult(null);
    setServiceError(null);
    const start = performance.now();
    try {
      let data: unknown;
      switch (test.fn) {
        case "route":
          data = await routeIntent(test.sample ?? "");
          break;
        case "rag":
          data = await retrieveRAG(test.sample ?? "");
          break;
        case "safety":
          data = await validateSafety(test.sample ?? "");
          break;
        case "agent":
          data = await runAgentTask(test.sample ?? "", 1);
          break;
        case "execute":
          if (test.action && test.params) data = await executeAction(test.action, test.params);
          else throw new Error("Missing action/params");
          break;
        case "knowledge":
          data = await getKnowledgeArticles();
          break;
        case "llm-providers":
          data = await getLLMProviders();
          break;
        case "llm-models":
          data = await getLLMModels();
          break;
        case "audit":
          data = await getAuditLog(10);
          break;
        case "health":
          data = await getServiceHealth();
          break;
        default:
          return;
      }
      const latencyMs = Math.round(performance.now() - start);
      setServiceResult(data as Record<string, unknown>);
      setTestResults((r) =>
        [
          {
            id: test.id,
            label: test.label,
            status: "pass" as const,
            latencyMs,
            at: new Date().toISOString(),
          },
          ...r,
        ].slice(0, 50),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setServiceError(msg);
      const latencyMs = Math.round(performance.now() - start);
      setTestResults((r) =>
        [
          {
            id: test.id,
            label: test.label,
            status: "fail" as const,
            latencyMs,
            error: msg,
            at: new Date().toISOString(),
          },
          ...r,
        ].slice(0, 50),
      );
    }
  };

  const runAllTests = async () => {
    setRunningAll(true);
    setTestResults([]);
    setServiceResult(null);
    setServiceError(null);
    const results: TestResult[] = [];
    for (const test of SERVICE_TESTS) {
      const start = performance.now();
      try {
        switch (test.fn) {
          case "route":
            await routeIntent(test.sample ?? "");
            break;
          case "rag":
            await retrieveRAG(test.sample ?? "");
            break;
          case "safety":
            await validateSafety(test.sample ?? "");
            break;
          case "agent":
            await runAgentTask(test.sample ?? "", 1);
            break;
          case "execute":
            if (test.action && test.params) await executeAction(test.action, test.params);
            else throw new Error("Missing params");
            break;
          case "knowledge":
            await getKnowledgeArticles();
            break;
          case "llm-providers":
            await getLLMProviders();
            break;
          case "llm-models":
            await getLLMModels();
            break;
          case "audit":
            await getAuditLog(10);
            break;
          case "health":
            await getServiceHealth();
            break;
          default:
            continue;
        }
        results.push({
          id: test.id,
          label: test.label,
          status: "pass",
          latencyMs: Math.round(performance.now() - start),
          at: new Date().toISOString(),
        });
      } catch (e) {
        results.push({
          id: test.id,
          label: test.label,
          status: "fail",
          latencyMs: Math.round(performance.now() - start),
          error: e instanceof Error ? e.message : "Failed",
          at: new Date().toISOString(),
        });
      }
      setTestResults([...results]);
    }
    setRunningAll(false);
    const last = results[results.length - 1];
    if (last) {
      setServiceResult(
        last.status === "pass"
          ? {
              summary: `${results.filter((r) => r.status === "pass").length}/${results.length} passed`,
            }
          : { error: last.error },
      );
      if (last.status === "fail") setServiceError(last.error ?? null);
    }
    await refreshHealthAndMetrics();
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

  return (
    <div className="page-container max-w-6xl">
      <PageHeader
        eyebrow="Test workspace"
        title="Playground"
        description="Run a full request, inspect individual services, or exercise execution actions without mixing every tool into one screen."
        actions={
          <>
            <Button variant="secondary" onClick={refreshHealthAndMetrics}>
              Refresh checks
            </Button>
            <Button onClick={runAllTests} loading={runningAll}>
              Run service suite
            </Button>
          </>
        }
        aside={
          <Badge tone={serviceError || error ? "danger" : "neutral"}>
            {serviceError || error ? "Last run needs review" : "Manual test environment"}
          </Badge>
        }
      />

      <div
        role="tablist"
        aria-label="Playground tools"
        className="mb-6 mt-6 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-[#0c1828] p-1"
      >
        {(
          [
            ["pipeline", "Full request"],
            ["overview", "Health & results"],
            ["services", "Service checks"],
            ["actions", "Execution actions"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeView === value}
            onClick={() => setActiveView(value)}
            className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors ${
              activeView === value
                ? "bg-teal-400 text-[#07111f]"
                : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Health & Metrics / Telemetry */}
      {activeView === "overview" && (
        <section role="tabpanel" className="glass mb-8 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Service Health & Metrics
          </h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={refreshHealthAndMetrics}
              className="min-h-11 rounded bg-white/10 px-3 text-xs text-white/80 hover:bg-white/20"
            >
              Load
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-white/50">Service health</p>
              {serviceHealth && Object.keys(serviceHealth).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(serviceHealth).map(([name, h]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{name.replace(/-/g, " ")}</span>
                      <span
                        className={
                          h?.status === "healthy"
                            ? "text-green-400"
                            : h?.status === "degraded"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }
                      >
                        {h?.status} {h?.latencyMs != null ? `(${h.latencyMs}ms)` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm">Click Load to fetch health</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-white/50">Telemetry and analytics</p>
              {metrics ? (
                <div className="space-y-1.5 text-sm text-white/80">
                  {metrics.summary && (
                    <>
                      <p>Conversations: {metrics.summary.conversations_total}</p>
                      <p>Tenants: {metrics.summary.tenants_count}</p>
                      <p>Clients: {metrics.summary.clients_count ?? metrics.summary.patients_count}</p>
                      <p>Showings: {metrics.summary.showings_count ?? metrics.summary.appointments_count}</p>
                      <p>Listings: {metrics.summary.listings_count ?? 0}</p>
                      <p>Leads: {metrics.summary.leads_count ?? 0}</p>
                    </>
                  )}
                  {metrics.performance?.overall_metrics &&
                  Object.keys(metrics.performance.overall_metrics).length > 0 ? (
                    Object.entries(metrics.performance.overall_metrics).map(([k, v]) => (
                      <p key={k}>
                        {k}: count={v?.count ?? 0} avg={Math.round(v?.avg_latency_ms ?? 0)}ms
                      </p>
                    ))
                  ) : (
                    <p className="text-white/40">No telemetry events yet</p>
                  )}
                  {metrics.refreshedAt && (
                    <p className="text-white/30 text-xs mt-2">
                      Updated {new Date(metrics.refreshedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-white/40 text-sm">Click Load to fetch metrics</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* E2E Pipeline */}
      {activeView === "pipeline" && (
        <section role="tabpanel" className="glass mb-8 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-aurixa-500" />
            Full Pipeline (E2E)
          </h2>
          <form onSubmit={handlePipeline} className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              aria-label="Pipeline prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about showings, listings, financing, maintenance..."
              className="flex-grow bg-surface-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-aurixa-500/50"
            />
            <select
              aria-label="Client context"
              value={clientId}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
              className="bg-surface-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white max-w-[180px]"
            >
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName} (#{client.id})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="bg-aurixa-500 hover:bg-aurixa-600 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? "Running…" : "Run Pipeline"}
            </button>
          </form>

          {flowSteps.length > 0 && (
            <PipelineVisualizer
              className="mb-4"
              steps={flowSteps.map((step) => ({
                id: step.name,
                label: step.name,
                status:
                  step.status === "done"
                    ? "complete"
                    : step.status === "running"
                      ? "active"
                      : step.status === "error"
                        ? "error"
                        : "pending",
              }))}
            />
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {PIPELINE_SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                className="min-h-10 rounded-lg bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>

          {error && (
            <div
              role="alert"
              className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm"
            >
              {error}
            </div>
          )}
          {response && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-white font-medium mb-1">Response</p>
              <p className="text-white/90 text-sm">{response.final_response}</p>
              <p className="text-xs text-white/40 mt-2 font-mono">Session: {response.session_id}</p>
            </div>
          )}
        </section>
      )}

      {/* Test Results History */}
      {activeView === "overview" && testResults.length > 0 && (
        <section className="glass rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Test Results ({testResults.filter((r) => r.status === "pass").length}/
            {testResults.length} passed)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Most recent playground test results</caption>
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th scope="col" className="pb-2 pr-4">
                    Test
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Status
                  </th>
                  <th scope="col" className="pb-2 pr-4">
                    Latency
                  </th>
                  <th scope="col" className="pb-2">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {testResults.slice(0, 20).map((r) => (
                  <tr key={`${r.id}-${r.at}`} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/90">{r.label}</td>
                    <td className="py-2 pr-4">
                      <span className={r.status === "pass" ? "text-green-400" : "text-red-400"}>
                        {r.status === "pass" ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-white/60">{r.latencyMs}ms</td>
                    <td className="py-2 text-red-400/80 truncate max-w-[200px]">
                      {r.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Individual Service Tests */}
      {activeView === "services" && (
        <section role="tabpanel" className="glass mb-8 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-aurixa-400" />
            Service API Tests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {SERVICE_TESTS.map((t) => (
              <button
                key={t.id}
                onClick={() => runServiceTest(t)}
                disabled={runningAll}
                className="text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors disabled:opacity-50"
              >
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs text-white/50 mt-0.5">
                  {t.sample || (t.action ? `${t.action}(${JSON.stringify(t.params)})` : "—")}
                </span>
              </button>
            ))}
          </div>
          {serviceError && (
            <p role="alert" className="text-red-400 text-sm mb-2">
              {serviceError}
            </p>
          )}
          {serviceResult && (
            <pre className="p-4 rounded-lg bg-black/30 text-green-400 text-xs overflow-auto max-h-48">
              {JSON.stringify(serviceResult, null, 2)}
            </pre>
          )}
        </section>
      )}

      {/* Execution Actions */}
      {activeView === "actions" && (
        <>
          <section className="glass rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-aurixa-300" />
              Execution Engine Actions
            </h2>
            <p className="text-white/50 text-sm mb-4">
              DB-backed: get_showings, create_showing, get_client_financing, get_listings,
              create_service_request, create_lead
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <span
                  key={a}
                  className="px-3 py-1 rounded-lg bg-white/5 text-white/70 text-sm font-mono"
                >
                  {a}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  try {
                    const r = await executeAction("get_showings", { client_id: 1 });
                    setServiceResult(r as Record<string, unknown>);
                    setServiceError(null);
                  } catch (e) {
                    setServiceError(String(e));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-aurixa-600/30 hover:bg-aurixa-600/50 text-aurixa-300 text-sm"
              >
                get_showings(1)
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await executeAction("get_client_financing", { client_id: 1 });
                    setServiceResult(r as Record<string, unknown>);
                    setServiceError(null);
                  } catch (e) {
                    setServiceError(String(e));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-aurixa-600/30 hover:bg-aurixa-600/50 text-aurixa-300 text-sm"
              >
                get_client_financing(1)
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await executeAction("get_listings", { tenant_id: 1 });
                    setServiceResult(r as Record<string, unknown>);
                    setServiceError(null);
                  } catch (e) {
                    setServiceError(String(e));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-aurixa-600/30 hover:bg-aurixa-600/50 text-aurixa-300 text-sm"
              >
                get_listings(1)
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await executeAction("create_showing", {
                      client_id: 1,
                      reason: "Second walkthrough",
                    });
                    setServiceResult(r as Record<string, unknown>);
                    setServiceError(null);
                  } catch (e) {
                    setServiceError(String(e));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-600/30 hover:bg-green-600/50 text-green-300 text-sm"
                title="DB write"
              >
                create_showing(1)
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await executeAction("create_service_request", {
                      client_id: 1,
                      category: "maintenance",
                      description: "Leaky faucet",
                    });
                    setServiceResult(r as Record<string, unknown>);
                    setServiceError(null);
                  } catch (e) {
                    setServiceError(String(e));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-600/30 hover:bg-green-600/50 text-green-300 text-sm"
                title="DB write"
              >
                create_service_request(1)
              </button>
            </div>
          </section>

          <section className="glass rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-2">Connection reference</h2>
            <p className="text-sm text-white/55">
              Requests use the configured gateway. Detailed architecture belongs in technical
              documentation, not in the test workspace.
            </p>
            <p className="mt-4 text-white/40 text-xs">
              Voice WebSocket:{" "}
              <a
                href={`${API_BASE.replace("http", "ws")}/ws/voice`}
                className="text-aurixa-400 underline"
              >
                {API_BASE.replace("http", "ws")}/ws/voice
              </a>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
