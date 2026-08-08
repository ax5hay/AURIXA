"use client";

import React, { forwardRef } from "react";
import clsx from "clsx";

export interface FieldShellProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FieldShellProps) {
  const generatedId = React.useId();
  const child = React.isValidElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean | "true" | "false";
    required?: boolean;
  }>(children)
    ? children
    : null;
  const controlId = htmlFor ?? child?.props.id ?? `field-${generatedId}`;
  const descriptionId = `${controlId}-description`;
  const describedBy = [child?.props["aria-describedby"], hint || error ? descriptionId : undefined]
    .filter(Boolean)
    .join(" ");
  const renderedChildren = child
    ? React.cloneElement(child, {
        id: controlId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : child.props["aria-invalid"],
        required: required || child.props.required,
      })
    : children;

  return (
    <div className={clsx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={controlId} className="block text-sm font-semibold text-ui-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-ui-danger">
              *
            </span>
          )}
        </label>
      )}
      {renderedChildren}
      {(hint || error) && (
        <p
          id={descriptionId}
          className={clsx("text-xs leading-5", error ? "text-ui-danger" : "text-ui-muted")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

const controlClasses =
  "min-h-11 w-full rounded-ui-md border border-ui-border-strong bg-ui-surface px-3.5 text-sm text-ui-ink shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ui-faint hover:border-ui-faint focus:border-ui-accent focus:ring-4 focus:ring-ui-accent/10 disabled:cursor-not-allowed disabled:opacity-55";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx(controlClasses, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const SearchInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative">
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-faint"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
    <input
      ref={ref}
      type="search"
      className={clsx(controlClasses, "pl-10", className)}
      {...props}
    />
  </div>
));
SearchInput.displayName = "SearchInput";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(controlClasses, "min-h-28 resize-y py-3 leading-6", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(controlClasses, "appearance-none pr-10", className)}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function ErrorSummary({
  title = "Please check the following",
  errors,
}: {
  title?: string;
  errors: string[];
}) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="rounded-ui-md border border-ui-danger/25 bg-ui-danger/10 p-4">
      <p className="text-sm font-semibold text-ui-danger">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ui-ink">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
