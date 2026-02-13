"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { runPipeline, PipelineResponse } from "@/app/services/api";

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
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-8">Conversation Playground</h1>
      <form onSubmit={handleSubmit} className="glass rounded-xl p-4 flex gap-3 items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="flex-grow bg-transparent text-white placeholder-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-aurixa-500 hover:bg-aurixa-600 text-white font-semibold px-4 py-2 rounded-lg disabled:bg-gray-600"
        >
          {loading ? "Running..." : "Run Pipeline"}
        </button>
      </form>
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {response && (
        <div className="glass rounded-xl p-4 mt-4">
          <h3 className="font-semibold text-white mb-2">Response:</h3>
          <p className="text-white/80">{response.final_response}</p>
          <p className="text-xs text-white/40 mt-2">Session ID: {response.session_id}</p>
        </div>
      )}
    </motion.div>
  );
}