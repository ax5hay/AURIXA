"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import clsx from "clsx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  description?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
  ariaLabel,
  className,
}: ModalProps) {
  const descriptionId = React.useId();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-label={title ? undefined : (ariaLabel ?? "Dialog")}
          aria-describedby={description ? descriptionId : undefined}
          onEscapeKeyDown={(event) => {
            if (!closeOnEscape) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!closeOnBackdrop) event.preventDefault();
          }}
          className={clsx(
            "fixed left-1/2 top-1/2 z-[51] max-h-[88vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-ui-xl border border-ui-border-strong bg-ui-surface text-ui-ink shadow-ui outline-none",
            sizeClasses[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="border-b border-ui-border px-6 py-5 pr-16">
              {title && (
                <DialogPrimitive.Title className="font-display text-xl font-medium tracking-[-0.025em] text-ui-ink">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description
                  id={descriptionId}
                  className={clsx("text-sm leading-6 text-ui-muted", title && "mt-1.5")}
                >
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className={clsx(
              "absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-ui-md text-ui-muted transition-colors hover:bg-ui-surface-inset hover:text-ui-ink",
            )}
          >
            <span aria-hidden="true" className="text-xl">
              ×
            </span>
          </DialogPrimitive.Close>
          <div className={clsx("px-6 py-5", !title && !description && "pt-16")}>{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
