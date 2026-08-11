"use client";

import { useState, useEffect } from "react";
import { Alert, Button, ChatPanel, Input, PageLoader, useToast } from "@aurixa/ui-kit";
import { getConversations, sendMessage, type ConversationSummary } from "../api";

const SAMPLE_PROMPTS = [
  "When is my next appointment?",
  "How do I request a prescription refill?",
  "What are your billing options?",
  "I need help with lab results.",
];

interface Message {
  id: number | string;
  text: string;
  sender: "user" | "assistant";
}

export default function ChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello. I can help with practical questions about appointments, billing, refills, and care information. I can’t diagnose symptoms or replace your care team.",
      sender: "assistant",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    getConversations()
      .then((conversations) => {
        const history = conversations
          .slice()
          .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""))
          .flatMap((conversation: ConversationSummary) => {
            const entries: Message[] = [];
            if (conversation.prompt) {
              entries.push({
                id: `history-${conversation.id}-prompt`,
                text: conversation.prompt,
                sender: "user",
              });
            }
            if (conversation.response) {
              entries.push({
                id: `history-${conversation.id}-response`,
                text: conversation.response,
                sender: "assistant",
              });
            }
            return entries;
          });
        if (history.length > 0) {
          setMessages((current) => [current[0], ...history]);
          setHasHistory(true);
        }
      })
      .catch(() =>
        setHistoryError("Saved messages could not be loaded. New messages are still available."),
      )
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const pendingText = inputText.trim();
    const newMsg: Message = { id: Date.now(), text: pendingText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setChatLoading(true);

    try {
      const res = await sendMessage(pendingText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text:
            res.final_response ||
            "I couldn’t find a useful answer just now. Please try asking in a different way or contact your care team.",
          sender: "assistant",
        },
      ]);
      toast({ title: "Response ready", tone: "success", duration: 5000 });
    } catch {
      setInputText(pendingText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I’m having trouble responding right now. Your care team can still help through their usual contact channel, or you can try again in a moment.",
          sender: "assistant",
        },
      ]);
      toast({
        title: "Assistant unavailable",
        description: "We couldn’t confirm a response. Check the connection and try again.",
        tone: "error",
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (historyLoading) return <PageLoader label="Loading your saved messages" />;

  return (
    <div className="py-8 sm:py-10">
      {historyError && (
        <Alert title="Message history is unavailable" tone="warning" className="mb-5">
          {historyError}
        </Alert>
      )}
      {!hasHistory && !historyError && (
        <Alert title="Start a new conversation" tone="info" className="mb-5">
          There are no saved messages yet. Messages supported by the care service will appear here
          the next time you return.
        </Alert>
      )}
      <ChatPanel
        title="Care messages"
        subtitle="Practical help, with clear limits"
        messages={messages}
        loading={chatLoading}
        notice={
          <Alert
            title="For information, not diagnosis"
            tone="info"
            className="border-0 bg-transparent p-0"
          >
            This chat does not provide medical diagnosis or emergency care. If you may be in
            immediate danger, contact your local emergency services now.
          </Alert>
        }
        composer={
          <form onSubmit={handleSendMessage} className="space-y-3">
            <label htmlFor="care-message" className="sr-only">
              Ask a care support question
            </label>
            <div className="flex gap-2">
              <Input
                id="care-message"
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ask about an appointment, refill, bill, or next step"
                disabled={chatLoading}
                maxLength={4000}
              />
              <Button type="submit" disabled={chatLoading || !inputText.trim()}>
                Send
              </Button>
            </div>
            <div aria-label="Suggested questions" className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setInputText(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </form>
        }
      />
    </div>
  );
}
