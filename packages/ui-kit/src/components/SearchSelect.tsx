"use client";

import React from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

export interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SearchSelectProps {
  options?: SearchSelectOption[];
  loadOptions?: (query: string, signal: AbortSignal) => Promise<SearchSelectOption[]>;
  value?: string;
  onChange: (value: string | null, option: SearchSelectOption | null) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

export function SearchSelect({
  options = [],
  loadOptions,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  searchPlaceholder = "Search options",
  emptyMessage = "No matching options",
  loadingMessage = "Searching…",
  errorMessage = "Options could not be loaded",
  disabled,
  required,
  name,
  className,
}: SearchSelectProps) {
  const id = React.useId();
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [remoteOptions, setRemoteOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!loadOptions || !open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setFailed(false);
      loadOptions(query, controller.signal)
        .then((items) => {
          setRemoteOptions(items);
          setActiveIndex(items.findIndex((item) => !item.disabled));
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadOptions, open, query]);

  const visibleOptions = React.useMemo(() => {
    if (loadOptions) return remoteOptions;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(
      (option) =>
        option.label.toLocaleLowerCase().includes(normalizedQuery) ||
        option.description?.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [loadOptions, options, query, remoteOptions]);

  const selected = [...options, ...remoteOptions].find((option) => option.value === value);
  const choose = (option: SearchSelectOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setQuery("");
    setOpen(false);
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    const selectedIndex = visibleOptions.findIndex((option) => option.value === value);
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : visibleOptions.findIndex((option) => !option.disabled),
    );
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const moveActive = (direction: 1 | -1) => {
    if (!visibleOptions.length) return;
    let next = activeIndex;
    do {
      next = (next + direction + visibleOptions.length) % visibleOptions.length;
    } while (visibleOptions[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  };

  return (
    <div className={clsx("relative", className)}>
      {label && (
        <label id={`${id}-label`} className="mb-1.5 block text-sm font-semibold text-ui-ink">
          {label}
          {required && <span className="ml-1 text-ui-danger">*</span>}
        </label>
      )}
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}-value` : `${id}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        className="ui-re-field flex min-h-11 w-full items-center gap-2 rounded-ui-md border border-ui-border-strong px-3.5 text-left text-sm outline-none transition hover:border-ui-faint focus:border-ui-accent disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span
          id={`${id}-value`}
          className={clsx("min-w-0 flex-1 truncate", selected ? "text-ui-ink" : "text-ui-faint")}
        >
          {selected?.label ?? placeholder}
        </span>
        <Icon name="chevron-down" size="sm" className="text-ui-faint" />
      </button>

      {open && (
        <div
          className="ui-re-panel absolute z-50 mt-2 w-full rounded-ui-md border p-1.5"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
          }}
        >
          <div className="relative mb-1.5">
            <Icon
              name="search"
              size="sm"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-faint"
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveActive(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveActive(-1);
                } else if (event.key === "Enter" && visibleOptions[activeIndex]) {
                  event.preventDefault();
                  choose(visibleOptions[activeIndex]);
                } else if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="ui-re-field min-h-10 w-full rounded-ui-sm border pl-9 pr-3 text-sm text-ui-ink outline-none placeholder:text-ui-faint focus:border-ui-accent"
            />
          </div>
          <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {(loading || failed || !visibleOptions.length) && (
              <li className="px-3 py-4 text-center text-sm text-ui-muted" role="status">
                {loading ? loadingMessage : failed ? errorMessage : emptyMessage}
              </li>
            )}
            {!loading &&
              !failed &&
              visibleOptions.map((option, index) => (
                <li
                  id={`${id}-option-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-ui-sm px-3 py-2.5 text-sm",
                    index === activeIndex && "bg-ui-tint",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ui-ink">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-ui-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {option.value === value && (
                    <Icon name="check" size="sm" className="text-ui-accent" />
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
