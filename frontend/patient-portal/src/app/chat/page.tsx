"use client";

import { useState, useEffect } from "react";
import { Alert, Button, ChatPanel, Input, useToast } from "@aurixa/ui-kit";
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

  useEffect(() => {
    getConversations(DEMO_PATIENT_ID)
      .then(() => {})
      .catch(() => {});
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
          text:
            res.final_response ||
            "I couldn’t find a useful answer just now. Please try asking in a different way or contact your care team.",
          sender: "assistant",
        },
      ]);
      toast({ title: "Response ready", tone: "success", duration: 5000 });
    } catch {
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
      getConversations(DEMO_PATIENT_ID).catch(() => {});
    }
  };

  return (
    <div className="py-8 sm:py-10">
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
