"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceCardProps {
  name: string;
  status: ServiceStatus;
  latency: string;
  lastCheck: string;
  description?: string;
}

const statusConfig: Record<ServiceStatus, { color: string; bg: string; label: string }> = {
  healthy: {
    color: "text-accent-success",
    bg: "bg-accent-success/10",
    label: "Healthy",
  },
  degraded: {
    color: "text-accent-warning",
    bg: "bg-accent-warning/10",
    label: "Degraded",
  },
  down: {
    color: "text-accent-error",
    bg: "bg-accent-error/10",
    label: "Down",
  },
};

export default function ServiceCard({ name, status, latency, lastCheck, description }: ServiceCardProps) {
  const config = statusConfig[status];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="glass glass-hover rounded-xl p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">{name}</h3>
        <span className={clsx("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", config.color, config.bg)}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", status === "healthy" ? "bg-accent-success" : status === "degraded" ? "bg-accent-warning" : "bg-accent-error")} />
          {config.label}
        </span>
      </div>

      {description && (
        <p className="text-xs text-white/40 mb-3">{description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>{latency}</span>
        </div>
        <span>Last check: {lastCheck}</span>
      </div>
    </motion.div>
  );
}
