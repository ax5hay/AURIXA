import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

export interface ProgressBarProps {
  progress: number;
  label: string;
  steps?: string[];
  currentStep?: number;
  className?: string;
}

export function ProgressBar({ progress, label, steps, currentStep, className }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const reduceMotion = useReducedMotion();

  return (
    <div className={clsx("w-full", className)}>
      {/* Header: label and percentage */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ui-ink">{label}</span>
        <motion.span
          className="font-mono text-sm font-semibold text-ui-ink"
          key={Math.round(clampedProgress)}
          initial={reduceMotion ? false : { opacity: 0.6, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {Math.round(clampedProgress)}%
        </motion.span>
      </div>

      {/* Progress track */}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedProgress)}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-ui-surface-inset"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-ui-accent"
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            ease: "easeOut",
          }}
        />

        {/* Shimmer effect when active */}
        {!reduceMotion && clampedProgress > 0 && clampedProgress < 100 && (
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
            const isComplete = currentStep !== undefined && index < currentStep;

            return (
              <React.Fragment key={`${step}-${index}`}>
                {index > 0 && (
                  <div
                    className={clsx(
                      "h-px flex-1 transition-colors duration-300",
                      isComplete ? "bg-ui-success" : "bg-ui-surface-inset",
                    )}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300",
                      isComplete && "bg-ui-success text-ui-surface",
                      isActive && "bg-ui-accent text-ui-accent-ink ring-2 ring-ui-accent/30",
                      !isActive && !isComplete && "bg-ui-surface-inset text-ui-faint",
                    )}
                    animate={isActive && !reduceMotion ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={
                      isActive && !reduceMotion
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
                      "whitespace-nowrap text-xs transition-colors duration-300",
                      isActive && "font-medium text-ui-accent",
                      isComplete && "text-ui-success",
                      !isActive && !isComplete && "text-ui-faint",
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
