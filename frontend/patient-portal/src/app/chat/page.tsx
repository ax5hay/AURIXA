"use client";

import { useState, useEffect } from "react";
import { getConversations, sendMessage } from "../api";

const DEMO_PATIENT_ID = 1;

const SAMPLE_PROMPTS = [
  "When is my next appointment?",
  "How do I request a prescription refill?",
  "What are your billing options?",
  "I need help with lab results.",
];

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AURIXA assistant. Ask about appointments, billing, lab results, or any healthcare questions.",
      sender: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    getConversations(DEMO_PATIENT_ID).then(() => {}).catch(() => {});
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = { id: Date.now(), text: inputText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setChatLoading(true);

    try {
      const res = await sendMessage(inputText, DEMO_PATIENT_ID);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: res.final_response || "I couldn't process that. Please try again.",
          sender: "bot",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Sorry: ${err instanceof Error ? err.message : "Connection error"}. Ensure the API gateway and backend are running.`,
          sender: "bot",
        },
      ]);
    } finally {
      setChatLoading(false);
      getConversations(DEMO_PATIENT_ID).catch(() => {});
    }
  };

  return (
    <div className="glass rounded-xl flex flex-col min-h-[500px] overflow-hidden -mt-6">
      <div className="px-4 py-3 border-b border-white/5 bg-surface-secondary/30">
        <p className="text-white/60 text-sm">AI assistant — powered by your provider&apos;s knowledge base</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                msg.sender === "user"
                  ? "bg-aurixa-500 text-white"
                  : "bg-surface-secondary/80 text-white/90 border border-white/5"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-surface-secondary/80 border border-white/5">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" />
                <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about appointments, billing, prescriptions, or health..."
            className="flex-grow bg-surface-secondary/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-aurixa-500/50"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading}
            className="p-2.5 rounded-xl bg-aurixa-500 hover:bg-aurixa-600 text-white disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.105 2.288a.75.75 0 0 1 1.054-.057l16.5 9a.75.75 0 0 1 0 1.338l-16.5 9a.75.75 0 0 1-1.106-.996l1.5-1.75a.75.75 0 0 1 1.053.058L13 10l-8.396-4.73 1.5-1.75Z" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLE_PROMPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInputText(s)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
