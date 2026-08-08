"use client";

import { Dialog, SearchInput } from "@aurixa/ui-kit";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigationForRole } from "@/config/navigation";
import { useOperator } from "@/context/OperatorContext";

export default function CommandPalette() {
  const router = useRouter();
  const { role } = useOperator();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = useMemo(
    () => [
      ...navigationForRole(role).map((item) => ({
        ...item,
        action: () => router.push(item.route),
      })),
      {
        route: "#top",
        label: "Scroll to top",
        group: "Action",
        description: "Return to the top of this page",
        action: () =>
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          }),
      },
      {
        route: "#reload",
        label: "Reload current view",
        group: "Action",
        description: "Refresh data by reloading this page",
        action: () => window.location.reload(),
      },
    ],
    [role, router],
  );
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? commands.filter((item) =>
          `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(term),
        )
      : commands;
  }, [commands, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 20);
    else setQuery("");
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  const choose = (index: number) => {
    const command = results[index];
    if (!command) return;
    setOpen(false);
    command.action();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 hidden min-h-11 rounded-md border border-white/15 bg-[#0c1828] px-3 text-xs text-white/60 hover:text-white lg:block"
        aria-label="Open command menu"
      >
        Commands <kbd className="ml-2">⌘K</kbd>
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Command menu"
        description="Navigate or run a safe interface action."
      >
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages and actions"
          aria-label="Search commands"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results[selected] ? `command-option-${selected}` : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected((value) => Math.min(value + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((value) => Math.max(value - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              choose(selected);
            }
          }}
        />
        <p className="sr-only" aria-live="polite">
          {results.length} {results.length === 1 ? "command" : "commands"} available
        </p>
        <div
          id="command-results"
          role="listbox"
          aria-label="Commands"
          className="mt-3 max-h-80 overflow-y-auto"
        >
          {results.length ? (
            results.map((item, index) => (
              <button
                key={`${item.route}-${item.label}`}
                type="button"
                id={`command-option-${index}`}
                role="option"
                aria-selected={index === selected}
                tabIndex={-1}
                onMouseEnter={() => setSelected(index)}
                onClick={() => choose(index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 rounded-md px-3 text-left text-sm text-ui-muted hover:bg-ui-surface-inset aria-selected:bg-ui-surface-inset aria-selected:text-ui-ink"
              >
                <span>
                  <strong className="block font-semibold">{item.label}</strong>
                  <span className="block text-xs text-ui-faint">{item.description}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-ui-faint">
                  {item.group}
                </span>
              </button>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-ui-muted">No matching command.</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
