"use client";

import { useState } from "react";
import { runPipeline, PipelineResponse } from "@/app/services/api";

const SAMPLE_PROMPTS = [
  "What are your operating hours?",
  "How do I request a prescription refill?",
  "Tell me about billing and insurance.",
  "I need to schedule an appointment.",
];

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await runPipeline(prompt);
      setResponse(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unknown error occurred.";
      const isAbort = msg.toLowerCase().includes("abort") || msg.includes("signal is aborted");
      setError(
        isAbort
          ? "Request timed out. LLM generation can take 30–120 seconds—ensure LM Studio is running at http://127.0.0.1:1234 with a model loaded."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Conversation Playground</h1>
        <p className="text-white/50 text-sm">
          Test the full pipeline: intent → RAG retrieval → LLM generation → safety. Uses LM Studio by default.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-xl p-5 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about appointments, billing, prescriptions..."
          className="flex-grow bg-surface-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-aurixa-500/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-aurixa-500 hover:bg-aurixa-600 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Running pipeline…" : "Run Pipeline"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_PROMPTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 glass rounded-xl p-4 border border-accent-error/30">
          <p className="text-accent-error font-medium">Error</p>
          <p className="text-white/80 text-sm mt-1">{error}</p>
          <p className="text-white/40 text-xs mt-2">Ensure LM Studio is running at http://127.0.0.1:1234 with a model loaded.</p>
        </div>
      )}

      {response && (
        <div className="mt-6 glass rounded-xl p-6 glow-sm">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Response</h3>
          <p className="text-white leading-relaxed">{response.final_response}</p>
          <p className="text-xs text-white/40 mt-4 font-mono">Session: {response.session_id}</p>
        </div>
      )}
    </div>
  );
}