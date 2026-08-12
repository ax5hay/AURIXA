"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Banner,
  Button,
  ChatPanel,
  Input,
  RealEstateDisclaimer,
  type ChatPanelMessage,
  useToast,
} from "@aurixa/ui-kit";
import { getClient, sendMessage, type Client } from "../api";
import { useStaffContext } from "@/context/StaffContext";

const PROMPTS = {
  agent: [
    "Summarize today’s showing schedule",
    "Search guidance for client follow-up",
    "Check upcoming tours",
  ],
  coordination: [
    "Find available showing times",
    "Search scheduling guidance",
    "Review upcoming showings",
  ],
  operations: [
    "Search operational guidance",
    "Check service workflow information",
    "Summarize showing activity",
  ],
  unassigned: [
    "Search the knowledge base",
    "Review upcoming showings",
    "Find scheduling information",
  ],
};

const ACTION_RULES: Array<{ pattern: RegExp; label: string; href: string }> = [
  { pattern: /\b(showing|tour|schedule)\b/i, label: "Today queue", href: "/" },
  { pattern: /\b(client|buyer|renter)\b/i, label: "Client directory", href: "/clients" },
  { pattern: /\b(listing|property|inventory)\b/i, label: "Listings", href: "/listings" },
  { pattern: /\b(lead|pipeline)\b/i, label: "Leads", href: "/leads" },
];

function suggestWorkspaceActions(prompt: string, reply: string, clientId?: number) {
  const haystack = `${prompt}\n${reply}`;
  const chips: { label: string; href: string }[] = [];
  const seen = new Set<string>();
  for (const rule of ACTION_RULES) {
    if (!rule.pattern.test(haystack)) continue;
    const href =
      rule.href === "/clients" && clientId ? `/clients/${clientId}` : rule.href;
    if (seen.has(href)) continue;
    seen.add(href);
    chips.push({ label: rule.label, href });
    if (chips.length >= 3) break;
  }
  return chips;
}

export default function ChatPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { roleCategory, tenantFilter, tenantId } = useStaffContext();
  const parsedClientId = parseInt(searchParams.get("clientId") ?? "", 10);
  const clientId = isNaN(parsedClientId) ? undefined : parsedClientId;
  const [client, setClient] = useState<Client | null>(null);
  const [clientUnavailable, setClientUnavailable] = useState(false);
  const [messages, setMessages] = useState<ChatPanelMessage[]>([
    {
      id: 1,
      text: "I can help retrieve operational information and organizational guidance. Verify decisions in the client record and follow your brokerage protocols.",
      sender: "assistant",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      setClientUnavailable(false);
      return;
    }
    getClient(clientId, tenantId)
      .then((record) => {
        setClient(record);
        setClientUnavailable(false);
      })
      .catch(() => {
        setClient(null);
        setClientUnavailable(true);
      });
  }, [clientId, tenantId]);

  const prompts = useMemo(() => PROMPTS[roleCategory], [roleCategory]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = inputText.trim();
    if (!prompt) return;
    setMessages((current) => [...current, { id: Date.now(), text: prompt, sender: "user" }]);
    setInputText("");
    setLoading(true);
    try {
      const response = await sendMessage(prompt, {
        clientId,
        tenantId: tenantFilter || undefined,
      });
      setLastSessionId(response.session_id);
      const reply = response.final_response || "The assistant returned no content.";
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          text: reply,
          sender: "assistant",
          actions: suggestWorkspaceActions(prompt, reply, clientId),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          text: "I couldn’t complete that request. Check the service connection or try again.",
          sender: "assistant",
          actions: [{ label: "Today queue", href: "/" }],
        },
      ]);
      toast({
        title: "Assistant unavailable",
        description: "No action was taken. Please try again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {client && (
        <Banner
          title={`Active client: ${client.fullName}`}
          tone="info"
          action={
            <Button asChild variant="secondary">
              <Link href={`/clients/${client.id}`}>Open record</Link>
            </Button>
          }
        >
          Client record #{client.id}. Confirm identity before using client-specific information.
        </Banner>
      )}
      {clientUnavailable && (
        <Alert title="Client context unavailable" tone="danger">
          The requested client could not be verified. This conversation will not include client
          context.
        </Alert>
      )}

      <ChatPanel
        variant="workspace"
        title="Agent assistant"
        subtitle="Operational support with client context when verified"
        messages={messages}
        loading={loading}
        notice={
          <p className="text-xs leading-5 text-ui-muted">
            This assistant does not replace agent judgment or the source client record.
          </p>
        }
        composer={
          <form onSubmit={send}>
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ask about showings, listings, or process guidance"
                aria-label="Message the agent assistant"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !inputText.trim()}>
                Send
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested prompts">
              {prompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setInputText(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </form>
        }
      />
      <RealEstateDisclaimer variant="assistant-limits" />
      {lastSessionId && (
        <Alert title="Response trace" tone="info">
          <span className="font-mono text-xs">{lastSessionId}</span>
        </Alert>
      )}
    </div>
  );
}
