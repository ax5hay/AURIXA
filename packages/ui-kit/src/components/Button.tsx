"use client";

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "icon";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "ui-re-btn ui-re-btn-primary border text-ui-accent-ink shadow-ui-soft hover:brightness-[1.03]",
  secondary:
    "ui-re-btn ui-re-btn-secondary border border-ui-border-strong text-ui-ink hover:border-ui-accent/35 hover:bg-ui-surface-raised",
  danger:
    "ui-re-btn ui-re-btn-danger border border-transparent bg-ui-danger text-white shadow-ui-soft hover:brightness-90",
  quiet:
    "ui-re-btn border border-transparent bg-transparent text-ui-muted hover:bg-ui-surface-inset hover:text-ui-ink",
  icon:
    "ui-re-btn ui-re-btn-icon border border-ui-border text-ui-muted hover:border-ui-border-strong hover:text-ui-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-ui-sm px-3 text-xs gap-1.5",
  md: "min-h-11 rounded-ui-md px-4 text-sm gap-2",
  lg: "min-h-12 rounded-ui-md px-5 text-base gap-2.5",
  icon: "h-11 w-11 rounded-ui-md p-0",
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  icon: "h-4 w-4",
};

function Spinner({ size }: { size: ButtonSize }) {
  return (
    <svg
      aria-hidden="true"
      className={clsx("animate-spin", spinnerSizes[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      asChild = false,
      children,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const sharedClassName = clsx(
      "inline-flex shrink-0 items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ui-canvas",
      variantClasses[variant],
      sizeClasses[size],
      isDisabled && "cursor-not-allowed opacity-50",
      className,
    );

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        children?: React.ReactNode;
      }>;

      return (
        <Slot
          ref={ref}
          aria-busy={loading || undefined}
          aria-disabled={isDisabled || undefined}
          className={sharedClassName}
          onClick={(event) => {
            if (isDisabled) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            onClick?.(event as React.MouseEvent<HTMLButtonElement>);
          }}
          {...props}
        >
          {React.cloneElement(
            child,
            undefined,
            <>
              {loading && <Spinner size={size} />}
              {child.props.children}
            </>,
          )}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        className={sharedClassName}
        disabled={isDisabled}
        onClick={onClick}
        {...props}
      >
        {loading && <Spinner size={size} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
