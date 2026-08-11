#!/usr/bin/env node
/**
 * Lightweight bundle budget check for Next.js standalone/static assets.
 * Fails when a First Load JS equivalent chunk directory exceeds the budget.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const budgets = [
  {
    name: "dashboard",
    path: "frontend/dashboard/.next/static/chunks",
    maxBytes: 4_500_000,
  },
  {
    name: "client-portal",
    path: "frontend/client-portal/.next/static/chunks",
    maxBytes: 3_500_000,
  },
  {
    name: "agent-workspace",
    path: "frontend/agent-workspace/.next/static/chunks",
    maxBytes: 3_500_000,
  },
];

function directoryBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += directoryBytes(full);
    else total += statSync(full).size;
  }
  return total;
}

let failed = false;
for (const budget of budgets) {
  if (!existsSync(budget.path)) {
    console.log(`SKIP ${budget.name}: build output missing at ${budget.path}`);
    continue;
  }
  const size = directoryBytes(budget.path);
  const mb = (size / 1_000_000).toFixed(2);
  const limit = (budget.maxBytes / 1_000_000).toFixed(2);
  if (size > budget.maxBytes) {
    failed = true;
    console.error(`FAIL ${budget.name}: ${mb} MB exceeds ${limit} MB budget`);
  } else {
    console.log(`OK   ${budget.name}: ${mb} MB / ${limit} MB`);
  }
}

if (failed) process.exit(1);
