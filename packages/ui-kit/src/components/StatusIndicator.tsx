import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export type StatusType = "healthy" | "degraded" | "down" | "unknown";

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  healthy: "bg-accent-success",
  degraded: "bg-accent-warning",
  down: "bg-accent-error",
  unknown: "bg-gray-500",
};

const statusRingColors: Record<StatusType, string> = {
  healthy: "bg-accent-success/30",
  degraded: "bg-accent-warning/30",
  down: "bg-accent-error/30",
  unknown: "bg-gray-500/30",
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

export function StatusIndicator({
  status,
  label,
  size = "md",
  className,
}: StatusIndicatorProps) {
  const isActive = status === "healthy" || status === "degraded";
  const displayLabel = label ?? statusLabels[status];

  return (
    <div className={clsx("inline-flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        {/* Pulse ring for active states */}
        {isActive && (
          <motion.div
            className={clsx(
              "absolute rounded-full",
              ringSizes[size],
              statusRingColors[status]
            )}
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
          className={clsx(
            "relative rounded-full",
            dotSizes[size],
            statusColors[status]
          )}
          animate={
            isActive
              ? { scale: [1, 1.15, 1] }
              : {}
          }
          transition={
            isActive
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        />
      </div>

      {displayLabel && (
        <span
          className={clsx(
            "font-medium",
            textSizes[size],
            status === "healthy" && "text-accent-success",
            status === "degraded" && "text-accent-warning",
            status === "down" && "text-accent-error",
            status === "unknown" && "text-gray-400"
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
