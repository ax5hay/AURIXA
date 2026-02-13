"use client";

import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
      <div className="glass rounded-xl p-8 text-center text-white/50">
        <p>User and platform settings will be configurable here.</p>
        <p className="text-sm">This page is under construction.</p>
      </div>
    </motion.div>
  );
}
