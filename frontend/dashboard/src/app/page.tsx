"use client";

import { motion } from "framer-motion";
import ServiceCard from "@/components/ServiceCard";

const services = [
  { name: "API Gateway", status: "healthy" as const, latency: "12ms", lastCheck: "10s ago", description: "Main request router" },
  { name: "Orchestrator", status: "healthy" as const, latency: "8ms", lastCheck: "10s ago", description: "Pipeline execution engine" },
  { name: "LLM Router", status: "healthy" as const, latency: "45ms", lastCheck: "15s ago", description: "Model selection & routing" },
  { name: "RAG Pipeline", status: "degraded" as const, latency: "230ms", lastCheck: "30s ago", description: "Knowledge retrieval system" },
  { name: "Memory Service", status: "healthy" as const, latency: "15ms", lastCheck: "10s ago", description: "Conversation memory store" },
  { name: "Vector Store", status: "healthy" as const, latency: "22ms", lastCheck: "20s ago", description: "Embedding storage & search" },
];

const recentActivity = [
  { id: 1, action: "Pipeline executed", detail: "research-deep-dive completed in 2.3s", time: "2 min ago", type: "success" },
  { id: 2, action: "Model fallback triggered", detail: "GPT-4 -> Claude 3.5 Sonnet (rate limit)", time: "5 min ago", type: "warning" },
  { id: 3, action: "Knowledge base updated", detail: "143 new documents indexed", time: "12 min ago", type: "info" },
  { id: 4, action: "Cost threshold alert", detail: "Daily LLM spend at 80% of budget", time: "1 hr ago", type: "warning" },
  { id: 5, action: "Service deployed", detail: "Memory service v0.4.2 deployed", time: "2 hr ago", type: "info" },
];

const quickActions = [
  { label: "New Conversation", icon: "chat" },
  { label: "Run Pipeline", icon: "play" },
  { label: "View Logs", icon: "logs" },
  { label: "Manage Models", icon: "model" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      {/* Welcome header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Welcome back
        </motion.h1>
        <p className="text-white/40 text-sm">
          Here is an overview of your AURIXA platform status.
        </p>
      </div>

      {/* Quick Actions */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex gap-3 mb-8">
        {quickActions.map((action) => (
          <motion.button
            key={action.label}
            variants={item}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="glass glass-hover rounded-xl px-5 py-3 text-sm font-medium text-white/70 hover:text-white flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-aurixa-500" />
            {action.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Service Status Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white/80 mb-4">Service Status</h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {services.map((service) => (
            <motion.div key={service.name} variants={item}>
              <ServiceCard {...service} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4">Recent Activity</h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="glass rounded-xl divide-y divide-white/5"
        >
          {recentActivity.map((event) => (
            <motion.div
              key={event.id}
              variants={item}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    event.type === "success"
                      ? "bg-accent-success"
                      : event.type === "warning"
                      ? "bg-accent-warning"
                      : "bg-accent-info"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-white/80">{event.action}</p>
                  <p className="text-xs text-white/40">{event.detail}</p>
                </div>
              </div>
              <span className="text-xs text-white/30 flex-shrink-0 ml-4">{event.time}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
