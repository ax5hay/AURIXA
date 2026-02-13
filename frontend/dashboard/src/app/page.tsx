"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ServiceCard from "@/components/ServiceCard";
import { getServiceHealth, ServiceHealth } from "@/app/services/api";

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
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({});
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await getServiceHealth();
        setServiceHealth(health);
      } catch (err) {
        setError("Failed to fetch service health.");
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealth();
    // Refresh health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

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
          System Status
        </motion.h1>
        <p className="text-white/40 text-sm">
          An overview of the health of all AURIXA services.
        </p>
      </div>

      {/* Service Status Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white/80 mb-4">Live Service Health</h2>
        {error && <div className="text-red-500 my-4">{error}</div>}
        {healthLoading ? (
          <div className="text-white/50">Loading service status...</div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {Object.entries(serviceHealth).map(([name, health]) => (
              <motion.div key={name} variants={item}>
                <ServiceCard
                  name={name}
                  status={health.status as any}
                  latency={`${health.latencyMs || 0}ms`}
                  lastCheck="Just now"
                  description={`The ${name} service.`}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
