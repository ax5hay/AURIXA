"use client";

import { useState, useEffect } from "react";
import { Alert, Button, ChatPanel, Input, PageLoader, RealEstateDisclaimer, useToast } from "@aurixa/ui-kit";
import { getConversations, sendMessage, type ConversationSummary } from "../api";

const SAMPLE_PROMPTS = [
  "When is my next showing?",
  "How do I apply for a rental?",
  "What financing options are available?",
  "I need help with a maintenance request.",
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
      text: "Hello. I can help with practical questions about showings, listings, applications, financing, and maintenance. I can't provide legal or tax advice or replace your agent.",
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
            "I couldn't find a useful answer just now. Please try asking in a different way or contact your agent.",
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
          text: "I'm having trouble responding right now. Your agent can still help through their usual contact channel, or you can try again in a moment.",
          sender: "assistant",
        },
      ]);
      toast({
        title: "Assistant unavailable",
        description: "We couldn't confirm a response. Check the connection and try again.",
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
          There are no saved messages yet. Messages supported by the assistant will appear here the
          next time you return.
        </Alert>
      )}
      <ChatPanel
        variant="client"
        title="Messages"
        subtitle="Practical help, with clear limits"
        messages={messages}
        loading={chatLoading}
        notice={<RealEstateDisclaimer variant="assistant-limits" className="border-0 bg-transparent p-0" />}
        composer={
          <form onSubmit={handleSendMessage} className="space-y-3">
            <label htmlFor="client-message" className="sr-only">
              Ask a support question
            </label>
            <div className="flex gap-2">
              <Input
                id="client-message"
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ask about a showing, listing, application, or maintenance"
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
