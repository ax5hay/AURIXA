"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  ChatPanel,
  Input,
  PageLoader,
  RealEstateDisclaimer,
  type ChatPanelMessage,
  useToast,
} from "@aurixa/ui-kit";
import { getConversations, sendMessage, validateMessage, type ConversationSummary } from "../api";
import {
  fairHousingAssistCopy,
  isFairHousingBlocked,
  suggestChatActions,
} from "@/lib/chat-actions";

const SAMPLE_PROMPTS = [
  "When is my next showing?",
  "How do I apply for a rental?",
  "What financing options are available?",
  "I need help with a maintenance request.",
];

export default function ChatPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing");
  const [messages, setMessages] = useState<ChatPanelMessage[]>([
    {
      id: 1,
      text: "Hello. I can help with practical questions about showings, listings, applications, financing, and maintenance. I can't provide legal or tax advice or replace your agent.",
      sender: "assistant",
    },
  ]);
  const [inputText, setInputText] = useState(
    listingId ? `Tell me about listing #${listingId}.` : "",
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [safetyChecking, setSafetyChecking] = useState(false);

  useEffect(() => {
    getConversations()
      .then((conversations) => {
        const history = conversations
          .slice()
          .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""))
          .flatMap((conversation: ConversationSummary) => {
            const entries: ChatPanelMessage[] = [];
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
                actions: suggestChatActions(conversation.prompt, conversation.response),
                fairHousingNotice: isFairHousingBlocked(conversation.response)
                  ? fairHousingAssistCopy("fair_housing")
                  : undefined,
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
    const newMsg: ChatPanelMessage = { id: Date.now(), text: pendingText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setSafetyChecking(true);

    try {
      const safety = await validateMessage(pendingText);
      if (!safety.is_safe) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text:
              safety.validated_text ||
              "This message cannot be sent because it may conflict with Fair Housing policy.",
            sender: "assistant",
            fairHousingNotice: fairHousingAssistCopy(safety.escalation_type),
            actions: [{ label: "Fair Housing guide", href: "/help" }],
          },
        ]);
        toast({
          title: "Fair Housing Assist",
          description: "Review the guidance before rephrasing your question.",
          tone: "warning",
        });
        return;
      }
    } catch {
      // Continue to pipeline when safety pre-check is unavailable.
    } finally {
      setSafetyChecking(false);
    }

    setChatLoading(true);

    try {
      const res = await sendMessage(pendingText);
      const reply =
        res.final_response ||
        "I couldn't find a useful answer just now. Please try asking in a different way or contact your agent.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: reply,
          sender: "assistant",
          actions: suggestChatActions(pendingText, reply),
          fairHousingNotice: isFairHousingBlocked(reply)
            ? fairHousingAssistCopy("fair_housing")
            : undefined,
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
          actions: [{ label: "View showings", href: "/showings" }],
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

  const busy = chatLoading || safetyChecking;

  return (
    <div className="py-8 sm:py-10">
      {listingId && (
        <Alert title="Listing context" tone="info" className="mb-5">
          Your question references listing #{listingId}.{" "}
          <Link href="/listings" className="font-semibold text-ui-accent">
            Browse all listings
          </Link>
        </Alert>
      )}
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
        loading={busy}
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
                disabled={busy}
                maxLength={4000}
              />
              <Button type="submit" disabled={busy || !inputText.trim()}>
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
