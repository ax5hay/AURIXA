"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Your unified control center for the AURIXA healthcare AI platform.",
    items: [
      {
        title: "Dashboard",
        href: "/",
        desc: "View system health, tenant counts, conversations, and LLM costs at a glance. The Knowledge Base card shows articles per tenant.",
      },
      {
        title: "Playground",
        href: "/playground",
        desc: "Test pipelines, run prompts, route intents, retrieve RAG context, validate safety, and run agent tasks interactively.",
      },
    ],
  },
  {
    id: "tenant-management",
    title: "Tenant Management",
    description: "Manage organizations (hospitals, clinics) that use AURIXA.",
    items: [
      {
        title: "Tenants",
        href: "/tenants",
        desc: "Create and manage tenants. Each tenant has a plan (starter, professional, enterprise) and status (active, suspended, pending).",
      },
    ],
  },
  {
    id: "operational",
    title: "Operations & Monitoring",
    description: "Monitor services and view platform metrics.",
    items: [
      {
        title: "Services",
        href: "/services",
        desc: "Check health and latency of microservices. Click a service for detailed observability metrics: event counts, latency, and estimated cost by event type.",
      },
      {
        title: "Analytics",
        href: "/analytics",
        desc: "Database metrics (conversations, patients, appointments, articles, audits) plus telemetry: event volume, latency, and LLM cost. Includes charts and visualizations.",
      },
      {
        title: "Audit Log",
        href: "/audit",
        desc: "View all audit-worthy actions: tenant/patient creation, config changes, appointments, prescription refills, and more.",
      },
    ],
  },
  {
    id: "content",
    title: "Content & Knowledge",
    description: "Manage RAG-indexed knowledge for context retrieval.",
    items: [
      {
        title: "Knowledge Base",
        href: "/knowledge",
        desc: "Browse RAG-indexed articles. Each article belongs to a specific tenant. Filter by tenant or search to find relevant content used in pipelines.",
      },
    ],
  },
  {
    id: "configuration",
    title: "Configuration & Settings",
    description: "Adjust platform behavior and view configuration.",
    items: [
      {
        title: "Configuration",
        href: "/configuration",
        desc: "Overview of platform configuration and service health.",
      },
      {
        title: "Settings",
        href: "/settings",
        desc: "Edit platform config keys: rate limits, feature flags (RAG, voice, safety), API timeout, default LLM provider, and maintenance mode. Changes are persisted to the database.",
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 max-w-4xl mx-auto"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Start Here — AURIXA Dashboard Guide</h1>
        <p className="text-white/60">
          A detailed guide to help you navigate and use the AURIXA admin dashboard effectively.
        </p>
      </div>

      <div className="space-y-10">
        {sections.map((section, si) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="text-xl font-semibold text-white mb-1">{section.title}</h2>
            <p className="text-sm text-white/50 mb-4">{section.description}</p>
            <div className="space-y-3">
              {section.items.map((item, ii) => (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.1 + ii * 0.05 }}
                    className="glass rounded-xl p-4 flex items-start gap-4 hover:ring-2 hover:ring-aurixa-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-aurixa-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-aurixa-600/30 transition-colors">
                      <span className="text-aurixa-400 text-lg">→</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white group-hover:text-aurixa-300">{item.title}</h3>
                      <p className="text-sm text-white/50 mt-1">{item.desc}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 glass rounded-xl p-6 border border-aurixa-500/20">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Tips</h3>
        <ul className="space-y-2 text-sm text-white/70">
          <li>• <strong>Tenants</strong> are organizations (hospitals, clinics). Each has a plan and can have patients and knowledge articles.</li>
          <li>• <strong>Knowledge Base</strong> articles are tenant-scoped and used by the RAG service for context in conversational pipelines.</li>
          <li>• <strong>Audit Log</strong> records create/update operations for tenants, patients, appointments, prescription refills, and config changes.</li>
          <li>• <strong>Settings</strong> lets you toggle feature flags (RAG, voice, safety) and adjust rate limits without code changes.</li>
          <li>• <strong>Playground</strong> is ideal for testing prompts and pipelines before integrating with your application.</li>
        </ul>
      </div>
    </motion.div>
  );
}
