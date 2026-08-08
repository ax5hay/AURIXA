"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";

export interface DialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Dialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const descriptionId = React.useId();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_180ms_ease-out]" />
        <DialogPrimitive.Content
          aria-describedby={description ? descriptionId : undefined}
          className={clsx(
            "fixed left-1/2 top-1/2 z-[111] max-h-[88vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-ui-xl border border-ui-border-strong bg-ui-surface p-5 text-ui-ink shadow-ui outline-none sm:p-6",
            size === "sm" && "max-w-md",
            size === "md" && "max-w-xl",
            size === "lg" && "max-w-3xl",
          )}
        >
          <div className="pr-10">
            <DialogPrimitive.Title className="font-display text-2xl font-medium tracking-[-0.025em]">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description
                id={descriptionId}
                className="mt-1.5 text-sm leading-6 text-ui-muted"
              >
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-ui-md text-xl text-ui-muted transition hover:bg-ui-surface-inset hover:text-ui-ink"
          >
            ×
          </DialogPrimitive.Close>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export function Menu({
  trigger,
  label,
  items,
}: {
  trigger: React.ReactNode;
  label: string;
  items: MenuItem[];
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          aria-label={label}
          className="z-[120] min-w-52 rounded-ui-md border border-ui-border-strong bg-ui-surface p-1.5 text-ui-ink shadow-ui"
        >
          {items.map((item, index) => (
            <DropdownMenuPrimitive.Item
              key={`${item.href ?? item.label}-${index}`}
              disabled={item.disabled}
              onSelect={item.onSelect}
              asChild={Boolean(item.href)}
              className={clsx(
                "flex min-h-10 cursor-pointer select-none items-center justify-between gap-4 rounded-ui-sm px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-ui-surface-inset",
                item.danger && "text-ui-danger",
              )}
            >
              {item.href ? (
                <a href={item.href}>
                  <span>{item.label}</span>
                  {item.shortcut && <kbd className="text-xs text-ui-faint">{item.shortcut}</kbd>}
                </a>
              ) : (
                <>
                  <span>{item.label}</span>
                  {item.shortcut && <kbd className="text-xs text-ui-faint">{item.shortcut}</kbd>}
                </>
              )}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({
  items,
  defaultValue,
  ariaLabel,
}: {
  items: TabItem[];
  defaultValue?: string;
  ariaLabel: string;
}) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value}>
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-ui-md bg-ui-surface-inset p-1"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="min-h-10 whitespace-nowrap rounded-ui-sm px-3.5 text-sm font-semibold text-ui-muted transition data-[state=active]:bg-ui-surface data-[state=active]:text-ui-ink data-[state=active]:shadow-sm"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="mt-5 outline-none">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export function Accordion({
  items,
}: {
  items: { id: string; title: string; content: React.ReactNode }[];
}) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="divide-y divide-ui-border">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex min-h-16 w-full items-center justify-between gap-6 py-4 text-left text-base font-semibold text-ui-ink">
              {item.title}
              <span
                aria-hidden="true"
                className="text-xl text-ui-muted transition-transform duration-200 group-data-[state=open]:rotate-45"
              >
                +
              </span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden text-sm leading-7 text-ui-muted data-[state=closed]:animate-[accordion-up_180ms_ease-out] data-[state=open]:animate-[accordion-down_180ms_ease-out]">
            <div className="pb-5 pr-10">{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}

export function Tooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={7}
            className="z-[130] max-w-64 rounded-ui-sm bg-ui-ink px-3 py-2 text-xs leading-5 text-ui-canvas shadow-ui"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-ui-ink" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
