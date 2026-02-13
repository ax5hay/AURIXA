import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  progress?: number;
}

export interface PipelineVisualizerProps {
  steps: PipelineStep[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

const statusColors = {
  pending: {
    bg: "bg-surface-elevated",
    border: "border-white/10",
    text: "text-gray-500",
    dot: "bg-gray-500",
  },
  active: {
    bg: "bg-aurixa-600/10",
    border: "border-aurixa-500/40",
    text: "text-aurixa-300",
    dot: "bg-aurixa-500",
  },
  complete: {
    bg: "bg-accent-success/10",
    border: "border-accent-success/30",
    text: "text-accent-success",
    dot: "bg-accent-success",
  },
  error: {
    bg: "bg-accent-error/10",
    border: "border-accent-error/30",
    text: "text-accent-error",
    dot: "bg-accent-error",
  },
};

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  const colors = statusColors[status];

  if (status === "complete") {
    return (
      <motion.div
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full",
          colors.dot
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full",
          colors.dot
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </motion.div>
    );
  }

  if (status === "active") {
    return (
      <div className="relative flex items-center justify-center">
        <motion.div
          className={clsx("absolute h-6 w-6 rounded-full", "bg-aurixa-500/30")}
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className={clsx("h-6 w-6 rounded-full", colors.dot)}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "h-6 w-6 rounded-full border-2",
        "border-gray-600 bg-surface-tertiary"
      )}
    />
  );
}

function Connector({
  fromStatus,
  toStatus,
  orientation,
}: {
  fromStatus: PipelineStep["status"];
  toStatus: PipelineStep["status"];
  orientation: "horizontal" | "vertical";
}) {
  const isComplete = fromStatus === "complete";
  const isActive =
    fromStatus === "complete" &&
    (toStatus === "active" || toStatus === "complete");

  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        orientation === "horizontal" ? "h-0.5 flex-1 min-w-6" : "w-0.5 h-6 mx-auto"
      )}
    >
      {/* Background track */}
      <div
        className={clsx(
          "absolute bg-surface-elevated",
          orientation === "horizontal" ? "inset-0" : "inset-0"
        )}
      />

      {/* Animated fill */}
      <motion.div
        className={clsx(
          "absolute",
          orientation === "horizontal" ? "inset-y-0 left-0" : "inset-x-0 top-0",
          isComplete ? "bg-accent-success" : isActive ? "bg-aurixa-500" : "bg-surface-elevated"
        )}
        initial={orientation === "horizontal" ? { width: "0%" } : { height: "0%" }}
        animate={
          orientation === "horizontal"
            ? { width: isComplete || isActive ? "100%" : "0%" }
            : { height: isComplete || isActive ? "100%" : "0%" }
        }
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      />
    </div>
  );
}

function StepCard({
  step,
  index,
  orientation,
}: {
  step: PipelineStep;
  index: number;
  orientation: "horizontal" | "vertical";
}) {
  const colors = statusColors[step.status];

  return (
    <motion.div
      className={clsx(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        colors.bg,
        colors.border,
        orientation === "horizontal" ? "min-w-[140px]" : "w-full"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <StepIcon status={step.status} />

      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={clsx(
            "text-sm font-medium truncate",
            colors.text
          )}
        >
          {step.label}
        </span>

        {step.progress !== undefined && step.status === "active" && (
          <div className="flex items-center gap-2">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-surface-primary">
              <motion.div
                className="h-full rounded-full bg-aurixa-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, step.progress))}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] font-mono text-aurixa-400">
              {Math.round(step.progress)}%
            </span>
          </div>
        )}

        {step.status === "complete" && (
          <span className="text-[10px] text-accent-success/70">Complete</span>
        )}
        {step.status === "error" && (
          <span className="text-[10px] text-accent-error/70">Failed</span>
        )}
        {step.status === "pending" && (
          <span className="text-[10px] text-gray-600">Pending</span>
        )}
      </div>
    </motion.div>
  );
}

export function PipelineVisualizer({
  steps,
  orientation = "horizontal",
  className,
}: PipelineVisualizerProps) {
  return (
    <div
      className={clsx(
        "flex",
        orientation === "horizontal"
          ? "flex-row items-center gap-0"
          : "flex-col items-stretch gap-0",
        className
      )}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <StepCard step={step} index={index} orientation={orientation} />
          {index < steps.length - 1 && (
            <Connector
              fromStatus={step.status}
              toStatus={steps[index + 1].status}
              orientation={orientation}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
