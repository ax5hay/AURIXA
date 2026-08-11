import React from "react";
import clsx from "clsx";
import { Icon, type IconName } from "./Icon";

/** Small pediment-shaped icon frame used in toasts, empty states, and timeline nodes. */
export function MotifFrame({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  return (
    <span
      className={clsx(
        "ui-re-empty-icon inline-flex shrink-0 items-center justify-center text-ui-accent",
        sizeMap[size],
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

const toastIcons: Record<string, IconName> = {
  success: "key",
  error: "alert",
  warning: "sign",
  info: "map-pin",
};

export function ToastMotifIcon({ tone, className }: { tone: string; className?: string }) {
  const name = toastIcons[tone] ?? "info";
  return (
    <MotifFrame size="sm" className={clsx("ui-re-toast-icon mt-0.5", className)}>
      <Icon name={name} size="sm" />
    </MotifFrame>
  );
}
