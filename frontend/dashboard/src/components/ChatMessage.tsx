"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const metadataId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
      className={cn("flex gap-3 mb-4", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        role="img"
        aria-label={isUser ? "Operator" : "AURIXA"}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
          isUser ? "bg-aurixa-600/20 text-aurixa-400" : "bg-surface-elevated text-white/60",
        )}
      >
        {isUser ? "U" : "A"}
      </div>

      {/* Message bubble */}
      <div className={cn("max-w-[75%] group", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-aurixa-600/20 text-white/90 rounded-tr-sm"
              : "glass rounded-tl-sm text-white/80",
          )}
        >
          {content}
        </div>

        {/* Timestamp and metadata toggle */}
        <div className={cn("flex items-center gap-2 mt-1.5 px-1", isUser && "flex-row-reverse")}>
          <span className="text-[10px] text-white/30">{timestamp}</span>
          {metadata && (
            <button
              type="button"
              onClick={() => setShowMeta(!showMeta)}
              aria-expanded={showMeta}
              aria-controls={metadataId}
              className="min-h-9 rounded px-2 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              {showMeta ? "hide details" : "show details"}
            </button>
          )}
        </div>

        {/* Metadata panel */}
        {metadata && showMeta && (
          <motion.div
            id={metadataId}
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "mt-1 px-3 py-2 rounded-lg bg-surface-tertiary/50 border border-white/5 text-[11px] text-white/40 space-y-0.5",
              isUser && "text-right",
            )}
          >
            {metadata.model && (
              <div>
                Model: <span className="text-white/60">{metadata.model}</span>
              </div>
            )}
            {metadata.tokens && (
              <div>
                Tokens: <span className="text-white/60">{metadata.tokens}</span>
              </div>
            )}
            {metadata.latency && (
              <div>
                Latency: <span className="text-white/60">{metadata.latency}</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
