"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import { Avatar } from "./Layout";
import { Badge, type BadgeTone } from "./DataDisplay";
import { CopyButton } from "./CopyButton";

export interface ChatPanelMessage {
  id: string | number;
  text: string;
  sender: "user" | "assistant";
}

export function ChatPanel({
  title,
  subtitle,
  messages,
  loading,
  composer,
  notice,
  variant = "client",
}: {
  title: string;
  subtitle?: string;
  messages: ChatPanelMessage[];
  loading?: boolean;
  composer: React.ReactNode;
  notice?: React.ReactNode;
  /** Client-facing portal vs agent workspace. Legacy `patient` / `clinical` aliases are supported. */
  variant?: "client" | "workspace" | "patient" | "clinical";
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const clientFacing = variant === "client" || variant === "patient";
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

  return (
    <section className="flex min-h-[640px] flex-col overflow-hidden rounded-ui-xl border border-ui-border bg-ui-surface shadow-ui-soft">
      <header className="flex items-center gap-3 border-b border-ui-border px-5 py-4">
        <Avatar name="AURIXA" status="online" />
        <div>
          <h1 className="text-sm font-semibold text-ui-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-ui-muted">{subtitle}</p>}
        </div>
        <Badge
          tone={clientFacing ? "accent" : "info"}
          className="ml-auto hidden sm:inline-flex"
        >
          {clientFacing ? "Here to help" : "Client-aware"}
        </Badge>
      </header>
      {notice && (
        <div className="border-b border-ui-border bg-ui-surface-inset/50 px-5 py-3">{notice}</div>
      )}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx("flex", message.sender === "user" ? "justify-end" : "justify-start")}
          >
            <div className="group max-w-[88%] sm:max-w-[74%]">
              <div
                className={clsx(
                  "px-4 py-3 text-sm leading-6",
                  message.sender === "user"
                    ? "rounded-[1.2rem_1.2rem_.35rem_1.2rem] bg-ui-accent text-ui-accent-ink"
                    : "rounded-[1.2rem_1.2rem_1.2rem_.35rem] border border-ui-border bg-ui-canvas-subtle text-ui-ink",
                )}
              >
                {message.text}
              </div>
              {message.sender === "assistant" && (
                <CopyButton
                  value={message.text}
                  label="Copy"
                  className="mt-1 min-h-8 border-transparent bg-transparent px-2 text-ui-muted"
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-sm text-ui-muted">
            <span className="h-2 w-2 rounded-full bg-ui-accent" />
            Thinking through your request…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-ui-border bg-ui-canvas-subtle/55 p-4 sm:p-5">{composer}</div>
    </section>
  );
}

export function AppointmentCard({
  provider,
  date,
  detail,
  status,
  tone = "accent",
  action,
  compact = false,
  eventLabel = "Showing",
}: {
  provider: string;
  date: string;
  detail?: string;
  status: string;
  tone?: BadgeTone;
  action?: React.ReactNode;
  compact?: boolean;
  /** Short label for the event icon (e.g. Showing, Tour). */
  eventLabel?: string;
}) {
  return (
    <article
      className={clsx(
        "flex flex-col gap-4 rounded-ui-lg border border-ui-border bg-ui-surface sm:flex-row sm:items-center sm:justify-between",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-ui-md bg-ui-tint text-ui-accent">
          <span className="text-[10px] font-semibold tracking-wide">{eventLabel}</span>
          <span className="text-sm font-bold">•</span>
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ui-ink">{provider}</h3>
          <p className="mt-1 text-sm text-ui-muted">{date}</p>
          {detail && <p className="mt-1 text-xs text-ui-faint">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Badge tone={tone} dot>
          {status}
        </Badge>
        {action}
      </div>
    </article>
  );
}
