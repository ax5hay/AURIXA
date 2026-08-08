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
  type ChatPanelMessage,
  useToast,
} from "@aurixa/ui-kit";
import { getPatient, sendMessage, type Patient } from "../api";
import { useStaffContext } from "@/context/StaffContext";

const PROMPTS = {
  clinical: [
    "Summarize today’s appointment schedule",
    "Search guidance for patient follow-up",
    "Check upcoming visits",
  ],
  coordination: [
    "Find available appointment information",
    "Search scheduling guidance",
    "Review upcoming visits",
  ],
  operations: [
    "Search operational guidance",
    "Check service workflow information",
    "Summarize appointment activity",
  ],
  unassigned: [
    "Search the knowledge base",
    "Review upcoming appointments",
    "Find scheduling information",
  ],
};

export default function ChatPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { roleCategory, tenantFilter } = useStaffContext();
  const parsedPatientId = parseInt(searchParams.get("patientId") ?? "", 10);
  const patientId = isNaN(parsedPatientId) ? undefined : parsedPatientId;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientUnavailable, setPatientUnavailable] = useState(false);
  const [messages, setMessages] = useState<ChatPanelMessage[]>([
    {
      id: 1,
      text: "I can help retrieve operational information and organizational guidance. Verify clinical decisions in the patient record and follow your organization’s care protocols.",
      sender: "assistant",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setPatientUnavailable(false);
      return;
    }
    getPatient(patientId)
      .then((record) => {
        setPatient(record);
        setPatientUnavailable(false);
      })
      .catch(() => {
        setPatient(null);
        setPatientUnavailable(true);
      });
  }, [patientId]);

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
        patientId,
        tenantId: tenantFilter || undefined,
      });
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          text: response.final_response || "The assistant returned no content.",
          sender: "assistant",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          text: "I couldn’t complete that request. No action was taken. Check the service connection or try again in a moment.",
          sender: "assistant",
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
      {patient && (
        <Banner
          title={`Active patient: ${patient.fullName}`}
          tone="info"
          action={
            <Button asChild variant="secondary">
              <Link href={`/patients/${patient.id}`}>Open record</Link>
            </Button>
          }
        >
          Patient record #{patient.id}. Confirm this identity before using patient-specific
          information.
        </Banner>
      )}
      {patientUnavailable && (
        <Alert title="Patient context unavailable" tone="danger">
          The requested patient identity could not be verified. This conversation will not include
          patient context.
        </Alert>
      )}

      <ChatPanel
        variant="clinical"
        title="Clinical assistant"
        subtitle="Operational support with patient-aware context when verified"
        messages={messages}
        loading={loading}
        notice={
          <p className="text-xs leading-5 text-ui-muted">
            This assistant does not replace clinical judgment, emergency pathways, or the source
            patient record.
          </p>
        }
        composer={
          <form onSubmit={send}>
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ask about appointments or organizational guidance"
                aria-label="Message the clinical assistant"
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
    </div>
  );
}
