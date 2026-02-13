import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-aurixa-600 text-white hover:bg-aurixa-700 active:bg-aurixa-800 shadow-md shadow-aurixa-600/25",
  secondary:
    "bg-surface-tertiary text-gray-200 hover:bg-surface-elevated active:bg-surface-elevated border border-white/10",
  danger:
    "bg-accent-error text-white hover:bg-red-500 active:bg-red-600 shadow-md shadow-accent-error/25",
  ghost:
    "bg-transparent text-gray-300 hover:bg-white/5 active:bg-white/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-3 text-base rounded-lg gap-2.5",
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

function Spinner({ size }: { size: ButtonSize }) {
  return (
    <motion.svg
      className={clsx("animate-spin", spinnerSizes[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </motion.svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurixa-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Spinner size={size} />}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
