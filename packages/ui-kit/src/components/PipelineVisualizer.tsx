import React from "react";
import { motion, useReducedMotion } from "framer-motion";
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
    bg: "bg-ui-surface-inset",
    border: "border-ui-border",
    text: "text-ui-muted",
    dot: "bg-ui-faint",
  },
  active: {
    bg: "bg-ui-tint",
    border: "border-ui-accent/40",
    text: "text-ui-accent",
    dot: "bg-ui-accent",
  },
  complete: {
    bg: "bg-ui-success/10",
    border: "border-ui-success/30",
    text: "text-ui-success",
    dot: "bg-ui-success",
  },
  error: {
    bg: "bg-ui-danger/10",
    border: "border-ui-danger/30",
    text: "text-ui-danger",
    dot: "bg-ui-danger",
  },
};

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  const colors = statusColors[status];
  const reduceMotion = useReducedMotion();

  if (status === "complete") {
    return (
      <motion.div
        aria-hidden="true"
        className={clsx("flex h-6 w-6 items-center justify-center rounded-full", colors.dot)}
        initial={reduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }
        }
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
        aria-hidden="true"
        className={clsx("flex h-6 w-6 items-center justify-center rounded-full", colors.dot)}
        initial={reduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }
        }
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
      <div aria-hidden="true" className="relative flex items-center justify-center">
        {!reduceMotion && (
          <motion.div
            className="absolute h-6 w-6 rounded-full bg-ui-accent/30"
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          className={clsx("h-6 w-6 rounded-full", colors.dot)}
          animate={reduceMotion ? undefined : { scale: [1, 1.1, 1] }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="h-6 w-6 rounded-full border-2 border-ui-border-strong bg-ui-surface-inset"
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
  const isActive = fromStatus === "complete" && (toStatus === "active" || toStatus === "complete");
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "relative overflow-hidden",
        orientation === "horizontal" ? "h-0.5 flex-1 min-w-6" : "w-0.5 h-6 mx-auto",
      )}
    >
      {/* Background track */}
      <div
        className={clsx(
          "absolute bg-ui-surface-inset",
          orientation === "horizontal" ? "inset-0" : "inset-0",
        )}
      />

      {/* Animated fill */}
      <motion.div
        className={clsx(
          "absolute",
          orientation === "horizontal" ? "inset-y-0 left-0" : "inset-x-0 top-0",
          isComplete ? "bg-ui-success" : isActive ? "bg-ui-accent" : "bg-ui-surface-inset",
        )}
        initial={
          reduceMotion ? false : orientation === "horizontal" ? { width: "0%" } : { height: "0%" }
        }
        animate={
          orientation === "horizontal"
            ? { width: isComplete || isActive ? "100%" : "0%" }
            : { height: isComplete || isActive ? "100%" : "0%" }
        }
        transition={{
          duration: reduceMotion ? 0 : 0.5,
          ease: "easeOut",
          delay: reduceMotion ? 0 : 0.2,
        }}
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
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="listitem"
      className={clsx(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        colors.bg,
        colors.border,
        orientation === "horizontal" ? "min-w-[140px]" : "w-full",
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : index * 0.1 }}
    >
      <StepIcon status={step.status} />

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={clsx("text-sm font-medium truncate", colors.text)}>{step.label}</span>

        {step.progress !== undefined && step.status === "active" && (
          <div className="flex items-center gap-2">
            <div
              role="progressbar"
              aria-label={`${step.label} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, Math.max(0, step.progress)))}
              className="h-1 w-16 overflow-hidden rounded-full bg-ui-surface-inset"
            >
              <motion.div
                className="h-full rounded-full bg-ui-accent"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, step.progress))}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="font-mono text-xs text-ui-accent">{Math.round(step.progress)}%</span>
          </div>
        )}

        {step.status === "complete" && <span className="text-xs text-ui-success">Complete</span>}
        {step.status === "error" && <span className="text-xs text-ui-danger">Failed</span>}
        {step.status === "active" && <span className="text-xs text-ui-accent">Running</span>}
        {step.status === "pending" && <span className="text-xs text-ui-faint">Pending</span>}
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
      role="list"
      aria-label="Pipeline progress"
      className={clsx(
        "flex",
        orientation === "horizontal"
          ? "flex-row items-center gap-0"
          : "flex-col items-stretch gap-0",
        className,
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
