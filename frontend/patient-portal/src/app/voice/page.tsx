"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Alert, Button, ChatPanel, Input, PageHeader } from "@aurixa/ui-kit";
import { processVoice, sendMessage, synthesizeSpeech } from "../api";

interface Message {
  id: number;
  text: string;
  sender: "user" | "assistant";
}

export default function VoicePage() {
  const [wantTts, setWantTts] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Use the microphone when speaking is easier. Your words and the response will also appear here as text.",
      sender: "assistant",
    },
  ]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const awaitingResponseRef = useRef(false);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
        audioBitsPerSecond: 128000,
      });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        if (blob.size < 1000) {
          setErrorMsg(
            "Recording too short. Please speak for at least 1–2 seconds before releasing.",
          );
          setStatus("idle");
          return;
        }
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
        }
        const b64 = btoa(binary);
        awaitingResponseRef.current = true;
        setStatus("processing");
        setErrorMsg(null);
        try {
          const res = await processVoice(b64, wantTts);
          awaitingResponseRef.current = false;
          if (res.transcript) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), text: res.transcript as string, sender: "user" },
            ]);
          }
          const responseText =
            res.response?.trim() || "I didn't catch that. Try again or type your message below.";
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), text: responseText, sender: "assistant" },
          ]);
          if (res.audio_b64 && wantTts) {
            setStatus("speaking");
            const audio = new Audio("data:audio/mpeg;base64," + res.audio_b64);
            audio.onended = () => setStatus("idle");
            audio.onerror = () => setStatus("idle");
            audio.play().catch(() => setStatus("idle"));
          } else {
            setStatus("idle");
          }
        } catch {
          awaitingResponseRef.current = false;
          setStatus("idle");
          setErrorMsg("We couldn’t process that recording. Please try again or use text support.");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setStatus("listening");
    } catch {
      setStatus("error");
      setErrorMsg(
        "Microphone access isn’t available. Check your browser permission or use text support.",
      );
    }
  }, [wantTts]);

  const stopListening = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
      mediaRecorderRef.current = null;
    }
    if (status === "listening") setStatus("processing");
  }, [status]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setMessages((prev) => [...prev, { id: Date.now(), text: text.trim(), sender: "user" }]);
      setStatus("processing");
      setErrorMsg(null);
      try {
        const res = await sendMessage(text.trim());
        const responseText = res.final_response?.trim() || "No response.";
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), text: responseText, sender: "assistant" },
        ]);
        if (wantTts) {
          setStatus("speaking");
          const audioB64 = await synthesizeSpeech(responseText);
          if (audioB64) {
            const audio = new Audio("data:audio/mpeg;base64," + audioB64);
            audio.onended = () => setStatus("idle");
            audio.onerror = () => setStatus("idle");
            audio.play().catch(() => setStatus("idle"));
          } else {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      } catch {
        setErrorMsg("We couldn’t get a response. Please try again or open text support.");
        setStatus("idle");
      }
    },
    [wantTts],
  );

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const isRecording = status === "listening";

  return (
    <div className="space-y-7 py-8 sm:py-10">
      <PageHeader
        eyebrow="Hands-free support"
        title="Speak with AURIXA"
        description="Record a question and review the transcript before relying on the response. You can use text at any time."
        actions={
          <Button asChild variant="secondary">
            <Link href="/chat">Open text support</Link>
          </Button>
        }
      />

      <Alert title="Voice support has limits" tone="info">
        This tool cannot diagnose symptoms or handle emergencies. Contact local emergency services
        if you may be in immediate danger.
      </Alert>

      <ChatPanel
        title="Voice transcript"
        subtitle="Your words and responses appear as text"
        messages={messages}
        loading={status === "processing"}
        notice={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ui-ink" aria-live="polite">
              Status:{" "}
              {isRecording
                ? "Recording — select Stop and send when finished"
                : status === "processing"
                  ? "Processing your recording"
                  : status === "speaking"
                    ? "Playing the response aloud"
                    : status === "error"
                      ? "Microphone unavailable"
                      : "Ready to record"}
            </p>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ui-ink">
              <input
                type="checkbox"
                checked={wantTts}
                onChange={(event) => setWantTts(event.target.checked)}
                className="h-5 w-5 rounded border-ui-border-strong text-ui-accent focus:ring-ui-accent"
              />
              Play responses aloud
            </label>
          </div>
        }
        composer={
          <div className="space-y-4">
            {errorMsg && (
              <Alert title="Voice support needs another try" tone="warning">
                {errorMsg}
              </Alert>
            )}
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                size="lg"
                variant={isRecording ? "danger" : "primary"}
                onClick={isRecording ? stopListening : startListening}
                disabled={status === "speaking" || status === "processing"}
                className="min-w-48"
              >
                {isRecording ? "Stop and send" : "Start recording"}
              </Button>
              <p className="text-center text-xs leading-5 text-ui-muted">
                Your browser will ask for microphone permission. No pulsing indicator is used; the
                written status above confirms when recording is active.
              </p>
            </div>
            <div className="flex gap-2">
              <label htmlFor="voice-text-message" className="sr-only">
                Type a message instead
              </label>
              <Input
                id="voice-text-message"
                ref={textInputRef}
                type="text"
                placeholder="Type a message instead"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const value = (event.target as HTMLInputElement).value;
                    if (value) {
                      sendText(value);
                      (event.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  const value = textInputRef.current?.value;
                  if (value) {
                    sendText(value);
                    if (textInputRef.current) textInputRef.current.value = "";
                  }
                }}
                disabled={status === "processing" || status === "speaking"}
              >
                Send
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
