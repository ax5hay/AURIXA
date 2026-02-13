"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: string;
  };
}

export default function ChatMessage({ role, content, timestamp, metadata }: ChatMessageProps) {
  const [showMeta, setShowMeta] = useState(false);
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex gap-3 mb-4", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
          isUser
            ? "bg-aurixa-600/20 text-aurixa-400"
            : "bg-surface-elevated text-white/60"
        )}
      >
        {isUser ? "U" : "A"}
      </div>

      {/* Message bubble */}
      <div className={clsx("max-w-[75%] group", isUser && "items-end")}>
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-aurixa-600/20 text-white/90 rounded-tr-sm"
              : "glass rounded-tl-sm text-white/80"
          )}
        >
          {content}
        </div>

        {/* Timestamp and metadata toggle */}
        <div className={clsx("flex items-center gap-2 mt-1.5 px-1", isUser && "flex-row-reverse")}>
          <span className="text-[10px] text-white/30">{timestamp}</span>
          {metadata && (
            <button
              onClick={() => setShowMeta(!showMeta)}
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
            >
              {showMeta ? "hide details" : "show details"}
            </button>
          )}
        </div>

        {/* Metadata panel */}
        {metadata && showMeta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={clsx(
              "mt-1 px-3 py-2 rounded-lg bg-surface-tertiary/50 border border-white/5 text-[11px] text-white/40 space-y-0.5",
              isUser && "text-right"
            )}
          >
            {metadata.model && <div>Model: <span className="text-white/60">{metadata.model}</span></div>}
            {metadata.tokens && <div>Tokens: <span className="text-white/60">{metadata.tokens}</span></div>}
            {metadata.latency && <div>Latency: <span className="text-white/60">{metadata.latency}</span></div>}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
