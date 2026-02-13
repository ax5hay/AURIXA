import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export interface ProgressBarProps {
  progress: number;
  label: string;
  steps?: string[];
  currentStep?: number;
  className?: string;
}

function getProgressColor(progress: number): string {
  if (progress < 25) return "from-accent-error to-accent-warning";
  if (progress < 50) return "from-accent-warning to-yellow-300";
  if (progress < 75) return "from-yellow-300 to-aurixa-400";
  if (progress < 100) return "from-aurixa-400 to-accent-success";
  return "from-accent-success to-green-300";
}

function getProgressGlow(progress: number): string {
  if (progress < 25) return "shadow-accent-error/40";
  if (progress < 50) return "shadow-accent-warning/40";
  if (progress < 75) return "shadow-aurixa-400/40";
  return "shadow-accent-success/40";
}

export function ProgressBar({
  progress,
  label,
  steps,
  currentStep,
  className,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx("w-full", className)}>
      {/* Header: label and percentage */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        <motion.span
          className="text-sm font-mono font-semibold text-white"
          key={Math.round(clampedProgress)}
          initial={{ opacity: 0.6, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(clampedProgress)}%
        </motion.span>
      </div>

      {/* Progress track */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
        <motion.div
          className={clsx(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-lg",
            getProgressColor(clampedProgress),
            getProgressGlow(clampedProgress)
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        />

        {/* Shimmer effect when active */}
        {clampedProgress > 0 && clampedProgress < 100 && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ width: `${clampedProgress}%` }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>

      {/* Steps indicators */}
      {steps && steps.length > 0 && (
        <div className="mt-3 flex items-center gap-1">
          {steps.map((step, index) => {
            const isActive = currentStep !== undefined && index === currentStep;
            const isComplete =
              currentStep !== undefined && index < currentStep;

            return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <div
                    className={clsx(
                      "h-px flex-1 transition-colors duration-300",
                      isComplete ? "bg-accent-success" : "bg-surface-elevated"
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300",
                      isComplete &&
                        "bg-accent-success text-surface-primary",
                      isActive &&
                        "bg-aurixa-600 text-white ring-2 ring-aurixa-400/30",
                      !isActive &&
                        !isComplete &&
                        "bg-surface-elevated text-gray-500"
                    )}
                    animate={
                      isActive
                        ? { scale: [1, 1.1, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      isActive
                        ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                        : {}
                    }
                  >
                    {isComplete ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <span
                    className={clsx(
                      "text-[10px] whitespace-nowrap transition-colors duration-300",
                      isActive && "text-aurixa-400 font-medium",
                      isComplete && "text-accent-success",
                      !isActive && !isComplete && "text-gray-500"
                    )}
                  >
                    {step}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
