"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";
import { ToastMotifIcon } from "./RealEstateMotif";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-ui-success/30 text-ui-success",
  error: "border-ui-danger/30 text-ui-danger",
  warning: "border-ui-warning/30 text-ui-warning",
  info: "border-ui-info/30 text-ui-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const tone = input.tone ?? "info";
      const item = { ...input, id, tone };
      setItems((current) => [...current.slice(-3), item]);

      if (tone !== "error") {
        const duration = Math.max(input.duration ?? 6000, 5000);
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[100] flex flex-col items-end gap-3 sm:bottom-5 sm:left-auto sm:w-[390px]"
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
      >
        {items
          .filter((item) => item.tone !== "error")
          .map((item) => (
            <ToastCard key={item.id} item={item} dismiss={dismiss} />
          ))}
      </div>
      <div
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[101] flex flex-col items-end gap-3 sm:bottom-5 sm:left-auto sm:w-[390px]"
        role="alert"
        aria-live="assertive"
        aria-relevant="additions"
        aria-atomic="true"
      >
        {items
          .filter((item) => item.tone === "error")
          .map((item) => (
            <ToastCard key={item.id} item={item} dismiss={dismiss} />
          ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const tone = item.tone ?? "info";
  return (
    <div
      className={clsx(
        "ui-re-toast pointer-events-auto w-full animate-ui-toast-in rounded-ui-lg border p-4 shadow-ui",
        toneStyles[tone],
      )}
    >
      <div className="flex items-start gap-3">
        <ToastMotifIcon tone={tone} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ui-ink">{item.title}</p>
          {item.description && (
            <p className="mt-1 text-xs leading-5 text-ui-muted">{item.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notification"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm text-ui-faint transition hover:bg-ui-surface-inset hover:text-ui-ink"
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
