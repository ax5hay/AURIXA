import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

export type StatusType = "healthy" | "degraded" | "down" | "unknown";

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  healthy: "bg-ui-success",
  degraded: "bg-ui-warning",
  down: "bg-ui-danger",
  unknown: "bg-ui-faint",
};

const statusRingColors: Record<StatusType, string> = {
  healthy: "bg-ui-success/30",
  degraded: "bg-ui-warning/30",
  down: "bg-ui-danger/30",
  unknown: "bg-ui-faint/30",
};

const statusLabels: Record<StatusType, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

const dotSizes = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3.5 w-3.5",
};

const ringSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function StatusIndicator({ status, label, size = "md", className }: StatusIndicatorProps) {
  const isActive = status === "healthy" || status === "degraded";
  const displayLabel = label ?? statusLabels[status];
  const reduceMotion = useReducedMotion();

  return (
    <div role="status" className={clsx("inline-flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        {/* Pulse ring for active states */}
        {isActive && !reduceMotion && (
          <motion.div
            className={clsx("absolute rounded-full", ringSizes[size], statusRingColors[status])}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Dot */}
        <motion.div
          className={clsx("relative rounded-full", dotSizes[size], statusColors[status])}
          animate={isActive && !reduceMotion ? { scale: [1, 1.15, 1] } : {}}
          transition={
            isActive && !reduceMotion ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
          }
        />
      </div>

      {displayLabel && (
        <span
          className={clsx(
            "font-medium",
            textSizes[size],
            status === "healthy" && "text-ui-success",
            status === "degraded" && "text-ui-warning",
            status === "down" && "text-ui-danger",
            status === "unknown" && "text-ui-muted",
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
