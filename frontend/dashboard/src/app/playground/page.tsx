"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import ChatMessage from "@/components/ChatMessage";

const mockMessages = [
  {
    role: "user" as const,
    content: "Research the latest developments in quantum computing and summarize the key breakthroughs from 2025.",
    timestamp: "10:32 AM",
  },
  {
    role: "assistant" as const,
    content:
      "I will research the latest developments in quantum computing for you. Let me search through multiple sources and compile a comprehensive summary.\n\nHere are the key breakthroughs from 2025:\n\n1. **Error Correction Milestone** - Google achieved below-threshold quantum error correction with their latest surface code implementation.\n\n2. **1000+ Qubit Systems** - IBM deployed their Flamingo architecture processor exceeding 1,000 logical qubits.\n\n3. **Quantum Advantage in Drug Discovery** - Several pharmaceutical companies demonstrated practical quantum advantage in molecular simulation tasks.",
    timestamp: "10:32 AM",
    metadata: { model: "claude-3.5-sonnet", tokens: 847, latency: "2.1s" },
  },
  {
    role: "user" as const,
    content: "Can you go deeper on the error correction advances? What makes this significant?",
    timestamp: "10:34 AM",
  },
  {
    role: "assistant" as const,
    content:
      "Great question. The error correction breakthrough is arguably the most significant development because it addresses the fundamental bottleneck of quantum computing: noise.\n\nPreviously, adding more physical qubits to a quantum error correction code would eventually hit a point where the overhead outweighed the benefit. The new surface code implementations have crossed the 'threshold theorem' boundary in practice, meaning that adding more physical qubits now reliably reduces the logical error rate exponentially.\n\nThis is significant because it provides a clear engineering pathway to fault-tolerant quantum computing, rather than requiring fundamental physics breakthroughs.",
    timestamp: "10:34 AM",
    metadata: { model: "claude-3.5-sonnet", tokens: 1243, latency: "3.4s" },
  },
];

const pipelineSteps = [
  { name: "Intent Classification", status: "completed", duration: "45ms" },
  { name: "RAG Retrieval", status: "completed", duration: "180ms" },
  { name: "Context Assembly", status: "completed", duration: "12ms" },
  { name: "LLM Generation", status: "completed", duration: "2.1s" },
  { name: "Safety Filter", status: "completed", duration: "8ms" },
  { name: "Response Formatting", status: "completed", duration: "3ms" },
];

export default function PlaygroundPage() {
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"detailed" | "simple">("detailed");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen"
    >
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-white/5">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white/80">Conversation Playground</h1>
            <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-surface-tertiary">
              research-deep-dive
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Transparency toggle */}
            <div className="flex items-center glass rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("simple")}
                className={clsx(
                  "text-xs px-3 py-1.5 rounded-md transition-all",
                  viewMode === "simple"
                    ? "bg-aurixa-600/20 text-aurixa-400"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Simple
              </button>
              <button
                onClick={() => setViewMode("detailed")}
                className={clsx(
                  "text-xs px-3 py-1.5 rounded-md transition-all",
                  viewMode === "detailed"
                    ? "bg-aurixa-600/20 text-aurixa-400"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-2">
          {mockMessages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              metadata={viewMode === "detailed" ? msg.metadata : undefined}
            />
          ))}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-white/5">
          <div className="glass rounded-xl p-3 flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 resize-none outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  // send message handler would go here
                }
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-aurixa-600 hover:bg-aurixa-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Send
            </motion.button>
          </div>
          <p className="text-[10px] text-white/20 mt-2 px-1">
            Press Enter to send, Shift+Enter for new line. Pipeline: research-deep-dive | Model: auto-select
          </p>
        </div>
      </div>

      {/* Right sidebar - Pipeline visualization */}
      <AnimatePresence>
        {viewMode === "detailed" && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-white/5 bg-surface-secondary/50 overflow-hidden"
          >
            <div className="p-5 w-80">
              <h2 className="text-sm font-semibold text-white/70 mb-4">Pipeline Visualization</h2>

              {/* Pipeline steps */}
              <div className="space-y-1">
                {pipelineSteps.map((step, idx) => (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    {/* Connector line */}
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-success border-2 border-accent-success/30" />
                      {idx < pipelineSteps.length - 1 && (
                        <div className="w-px h-6 bg-white/10" />
                      )}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 flex items-center justify-between py-1">
                      <span className="text-xs text-white/60">{step.name}</span>
                      <span className="text-[10px] text-white/30 font-mono">{step.duration}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 glass rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Run Summary</h3>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Total latency</span>
                  <span className="text-white/70 font-mono">2.35s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Total tokens</span>
                  <span className="text-white/70 font-mono">2,090</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Est. cost</span>
                  <span className="text-white/70 font-mono">$0.0187</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Model</span>
                  <span className="text-aurixa-400 font-mono">claude-3.5-sonnet</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
