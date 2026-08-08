import React from "react";
import clsx from "clsx";

export type CardVariant = "feature" | "standard" | "compact" | "inset" | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: CardVariant;
  children: React.ReactNode;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

const headerPaddingClasses = {
  none: "px-0 py-0",
  sm: "px-3 py-2",
  md: "px-5 py-3",
  lg: "px-7 py-4",
};

const variantClasses: Record<CardVariant, string> = {
  feature: "border-ui-border-strong bg-ui-tint shadow-none",
  standard: "border-ui-border bg-ui-surface shadow-ui-soft",
  compact: "border-ui-border bg-ui-surface shadow-none",
  inset: "border-transparent bg-ui-surface-inset shadow-none",
  interactive:
    "border-ui-border bg-ui-surface shadow-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-ui-border-strong hover:bg-ui-surface-raised hover:shadow-ui-soft",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      header,
      hoverable = false,
      padding = "md",
      variant = "standard",
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant = hoverable ? "interactive" : variant;
    return (
      <div
        ref={ref}
        className={clsx(
          "overflow-hidden rounded-ui-lg border",
          variantClasses[resolvedVariant],
          className,
        )}
        {...props}
      >
        {header && (
          <div
            className={clsx(
              "border-b border-ui-border bg-ui-surface-inset/60",
              headerPaddingClasses[padding],
            )}
          >
            {header}
          </div>
        )}
        <div className={paddingClasses[padding]}>{children}</div>
      </div>
    );
  },
);

Card.displayName = "Card";
