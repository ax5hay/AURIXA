"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

const costCards = [
  { label: "Today's Spend", value: "$12.47", change: "+8%", trend: "up" },
  { label: "This Week", value: "$67.32", change: "-3%", trend: "down" },
  { label: "This Month", value: "$284.19", change: "+12%", trend: "up" },
  { label: "Monthly Budget", value: "$500.00", used: 56.8 },
];

const tokenUsage = [
  { model: "claude-3.5-sonnet", input: "1.2M", output: "480K", cost: "$18.72", percentage: 42 },
  { model: "gpt-4-turbo", input: "890K", output: "320K", cost: "$14.20", percentage: 32 },
  { model: "claude-3-haiku", input: "2.1M", output: "1.4M", cost: "$4.90", percentage: 11 },
  { model: "gpt-4o-mini", input: "1.8M", output: "950K", cost: "$3.40", percentage: 8 },
  { model: "gemini-1.5-pro", input: "450K", output: "180K", cost: "$2.97", percentage: 7 },
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

export default function AnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/40 text-sm">
          LLM cost tracking, token usage, and platform metrics.
        </p>
      </div>

      {/* Cost overview cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {costCards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            whileHover={{ y: -2 }}
            className="glass rounded-xl p-5"
          >
            <p className="text-xs text-white/40 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-white mb-2">{card.value}</p>
            {"change" in card ? (
              <span
                className={clsx(
                  "text-xs font-medium",
                  card.trend === "up" ? "text-accent-warning" : "text-accent-success"
                )}
              >
                {card.change} vs last period
              </span>
            ) : (
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Used</span>
                  <span>{card.used}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${card.used}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={clsx(
                      "h-full rounded-full",
                      (card.used ?? 0) > 80 ? "bg-accent-error" : (card.used ?? 0) > 60 ? "bg-accent-warning" : "bg-aurixa-500"
                    )}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Token usage by model */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white/80 mb-4">Token Usage by Model</h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="glass rounded-xl overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-white/5 text-xs font-medium text-white/40 uppercase tracking-wider">
            <span>Model</span>
            <span>Input Tokens</span>
            <span>Output Tokens</span>
            <span>Cost</span>
            <span>Share</span>
          </div>

          {/* Table rows */}
          {tokenUsage.map((row) => (
            <motion.div
              key={row.model}
              variants={item}
              className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-sm text-white/80 font-mono">{row.model}</span>
              <span className="text-sm text-white/60 font-mono">{row.input}</span>
              <span className="text-sm text-white/60 font-mono">{row.output}</span>
              <span className="text-sm text-white/70 font-mono">{row.cost}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-elevated">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${row.percentage}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-aurixa-500"
                  />
                </div>
                <span className="text-xs text-white/40 w-8 text-right">{row.percentage}%</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4">Daily Cost Trend</h3>
          <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg">
            <p className="text-sm text-white/20">Chart placeholder -- integrate with charting library</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4">Request Volume</h3>
          <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg">
            <p className="text-sm text-white/20">Chart placeholder -- integrate with charting library</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4">Latency Distribution</h3>
          <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg">
            <p className="text-sm text-white/20">Chart placeholder -- integrate with charting library</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4">Model Usage Breakdown</h3>
          <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg">
            <p className="text-sm text-white/20">Chart placeholder -- integrate with charting library</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
