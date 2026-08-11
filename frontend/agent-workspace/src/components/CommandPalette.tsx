"use client";

import { Button, Dialog, Icon, SearchInput } from "@aurixa/ui-kit";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getClients, type Client } from "@/app/api";
import { useStaffContext } from "@/context/StaffContext";

interface NavigationItem {
  id: string;
  href: string;
  label: string;
}

export function CommandPalette({ navigation }: { navigation: NavigationItem[] }) {
  const router = useRouter();
  const { tenantId } = useStaffContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!open || clients.length) return;
    setLoadingClients(true);
    getClients(tenantId)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [open, clients.length, tenantId]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 20);
    else setQuery("");
  }, [open]);
  useEffect(() => setSelected(0), [query]);

  const commands = useMemo(
    () => [
      ...navigation.map((item) => ({
        key: `nav-${item.id}`,
        label: item.label,
        description: "Workspace",
        href: item.href,
      })),
      ...clients.map((client) => ({
        key: `client-${client.id}`,
        label: client.fullName,
        description: `Client record #${client.id}`,
        href: `/clients/${client.id}`,
      })),
    ],
    [navigation, clients],
  );
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? commands.filter((item) =>
          `${item.label} ${item.description}`.toLowerCase().includes(term),
        )
      : commands;
  }, [commands, query]);

  const choose = (index: number) => {
    const command = results[index];
    if (!command) return;
    setOpen(false);
    router.push(command.href);
  };

  return (
    <>
      <Button variant="quiet" size="sm" onClick={() => setOpen(true)} aria-label="Open command menu">
        <Icon name="search" size="sm" />
        <span className="hidden md:inline">Find</span>
        <kbd className="hidden text-[10px] text-ui-faint lg:inline">⌘K</kbd>
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Find a client or page"
        description="Search within your verified organization scope."
      >
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Client name, record number, or page"
          aria-label="Search commands and clients"
          role="combobox"
          aria-expanded="true"
          aria-controls="workspace-command-results"
          aria-activedescendant={results[selected] ? `workspace-command-${selected}` : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected((value) => Math.min(value + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(selected);
            }
          }}
        />
        <div id="workspace-command-results" role="listbox" className="mt-3 max-h-80 overflow-y-auto">
          {loadingClients && <p className="px-3 py-2 text-xs text-ui-muted">Loading client index…</p>}
          {results.map((item, index) => (
            <button
              key={item.key}
              id={`workspace-command-${index}`}
              type="button"
              role="option"
              aria-selected={index === selected}
              onMouseEnter={() => setSelected(index)}
              onClick={() => choose(index)}
              className="flex min-h-14 w-full items-center justify-between rounded-ui-sm px-3 text-left hover:bg-ui-surface-inset aria-selected:bg-ui-tint"
            >
              <span>
                <strong className="block text-sm text-ui-ink">{item.label}</strong>
                <span className="text-xs text-ui-muted">{item.description}</span>
              </span>
              <Icon name="chevron-right" size="sm" className="text-ui-faint" />
            </button>
          ))}
          {!loadingClients && !results.length && (
            <p className="py-8 text-center text-sm text-ui-muted">No matching client or page.</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
