"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { processVoice, sendMessage, synthesizeSpeech } from "./api";

const DEMO_PATIENT_ID = 1;

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

export default function VoicePage() {
  const [wantTts, setWantTts] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Tap the microphone to speak, or type below. I'll respond with text and optional voice.",
      sender: "bot",
    },
  ]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const awaitingResponseRef = useRef(false);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
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
          setErrorMsg("Recording too short. Please speak for at least 1–2 seconds before releasing.");
          setStatus("idle");
          return;
        }
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        }
        const b64 = btoa(binary);
        awaitingResponseRef.current = true;
        setStatus("processing");
        setErrorMsg(null);
        try {
          const res = await processVoice(b64, DEMO_PATIENT_ID, wantTts);
          awaitingResponseRef.current = false;
          if (res.transcript) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), text: res.transcript, sender: "user" },
            ]);
          }
          const responseText = res.response?.trim() || "I didn't catch that. Try again or type your message below.";
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), text: responseText, sender: "bot" },
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
        } catch (err) {
          awaitingResponseRef.current = false;
          setStatus("idle");
          setErrorMsg(err instanceof Error ? err.message : "Voice processing failed. Try again.");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setStatus("listening");
    } catch (err) {
      setStatus("error");
      setErrorMsg("Microphone access denied or unavailable.");
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

  const sendText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), text: text.trim(), sender: "user" }]);
    setStatus("processing");
    setErrorMsg(null);
    try {
      const res = await sendMessage(text.trim(), DEMO_PATIENT_ID);
      const responseText = res.final_response?.trim() || "No response.";
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: responseText, sender: "bot" },
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to get response.");
      setStatus("idle");
    }
  }, [wantTts]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const isRecording = status === "listening";

  return (
    <div className="glass rounded-xl flex flex-col min-h-[520px] overflow-hidden -mt-6">
      <div className="px-4 py-3 border-b border-white/5 bg-surface-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Voice Assistant</h2>
            <p className="text-white/50 text-sm mt-0.5">
              Speak or type — responses shown as text
              {wantTts ? " and played aloud" : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-white/70 text-sm">Play aloud</span>
            <input
              type="checkbox"
              checked={wantTts}
              onChange={(e) => setWantTts(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-surface-secondary text-aurixa-500 focus:ring-aurixa-500"
            />
          </label>
        </div>
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
        {status === "processing" && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-surface-secondary/80 border border-white/5 flex items-center gap-2">
              <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" />
              <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 bg-aurixa-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              <span className="text-white/60 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-200 text-sm">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="flex justify-center gap-4 items-center">
          <button
            type="button"
            onClick={isRecording ? stopListening : startListening}
            disabled={status === "speaking"}
            className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-aurixa-500 hover:bg-aurixa-600"
            } text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
          <span className="text-white/60 text-sm">
            {isRecording ? "Listening... tap to send" : status === "speaking" ? "Playing response..." : "Tap to speak"}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            ref={textInputRef}
            type="text"
            placeholder="Or type your message..."
            className="flex-grow bg-surface-secondary/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-aurixa-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value;
                if (v) {
                  sendText(v);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const v = textInputRef.current?.value;
              if (v) {
                sendText(v);
                if (textInputRef.current) textInputRef.current.value = "";
              }
            }}
            disabled={status === "processing" || status === "speaking"}
            className="px-4 py-2.5 rounded-xl bg-aurixa-500 hover:bg-aurixa-600 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
