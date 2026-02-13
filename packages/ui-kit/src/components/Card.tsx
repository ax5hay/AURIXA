import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

export interface CardProps extends HTMLMotionProps<"div"> {
  header?: React.ReactNode;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
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

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      header,
      hoverable = false,
      padding = "md",
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={
          hoverable
            ? {
                y: -2,
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
                transition: { duration: 0.2 },
              }
            : undefined
        }
        className={clsx(
          "rounded-xl border border-white/[0.06] bg-surface-secondary shadow-lg",
          "overflow-hidden",
          className
        )}
        {...props}
      >
        {header && (
          <div
            className={clsx(
              "border-b border-white/[0.06] bg-surface-tertiary/50",
              headerPaddingClasses[padding]
            )}
          >
            {header}
          </div>
        )}
        <div className={paddingClasses[padding]}>{children}</div>
      </motion.div>
    );
  }
);

Card.displayName = "Card";
