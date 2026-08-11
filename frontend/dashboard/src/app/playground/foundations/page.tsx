"use client";

import { useState } from "react";
import {
  AsyncBoundary,
  Card,
  DateTime,
  HealthcareDisclaimer,
  Icon,
  type IconName,
  PageHeader,
  RealEstateDisclaimer,
  SearchSelect,
  StatusBadge,
} from "@aurixa/ui-kit";

const icons: IconName[] = [
  "home",
  "calendar",
  "message",
  "search",
  "bell",
  "user",
  "settings",
  "refresh",
  "alert",
  "info",
];

const themes = [
  { value: "operator", label: "Operator", description: "Technical, precise, status-led" },
  { value: "workspace", label: "Agent workspace", description: "Dense, clear, task-oriented" },
  { value: "client", label: "Client portal", description: "Warm, calm, editorial" },
  { value: "clinical", label: "Clinical (legacy)", description: "Alias for agent workspace theme" },
  { value: "patient", label: "Patient (legacy)", description: "Alias for client portal theme" },
];

const chartColors = [
  "bg-ui-chart-1",
  "bg-ui-chart-2",
  "bg-ui-chart-3",
  "bg-ui-chart-4",
  "bg-ui-chart-5",
];

export default function FoundationsPage() {
  const [theme, setTheme] = useState("operator");

  return (
    <div data-theme={theme} className="min-h-screen bg-ui-canvas p-ui-gutter text-ui-ink">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          eyebrow="UI kit workbench"
          title="Shared foundations"
          description="A lightweight in-repo surface for reviewing themes, status language, icons, date formatting, and keyboard search."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl font-medium">Theme</h2>
            <SearchSelect
              className="mt-4"
              label="Product expression"
              options={themes}
              value={theme}
              onChange={(nextTheme) => nextTheme && setTheme(nextTheme)}
            />
            <div className="mt-5 grid grid-cols-5 gap-2" aria-label="Theme chart colors">
              {chartColors.map((colorClass, index) => (
                <div
                  key={colorClass}
                  className={`h-12 rounded-ui-sm ${colorClass}`}
                  title={`Chart color ${index + 1}`}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-xl font-medium">Status vocabulary</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="pending" />
              <StatusBadge status="attention" />
              <StatusBadge status="complete" />
              <StatusBadge status="failed" />
              <StatusBadge status="offline" />
            </div>
            <p className="mt-5 text-sm text-ui-muted">
              Updated{" "}
              <DateTime
                value="2026-08-08T18:00:00.000Z"
                relative
                now={new Date("2026-08-08T18:05:00.000Z")}
              />
            </p>
          </Card>
        </section>

        <Card>
          <h2 className="font-display text-xl font-medium">Shared icons</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {icons.map((name) => (
              <div
                key={name}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-ui-md border border-ui-border bg-ui-surface-inset"
              >
                <Icon name={name} />
                <span className="text-xs text-ui-muted">{name}</span>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl font-medium">Async boundary</h2>
            <div className="mt-4">
              <AsyncBoundary loadingLabel="Loading sample region">
                <p className="text-sm text-ui-muted">
                  Recoverable loading and render failures share one boundary across portals.
                </p>
              </AsyncBoundary>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-medium">Real estate disclaimers</h2>
            <div className="mt-4 space-y-3">
              <RealEstateDisclaimer variant="assistant-limits" />
              <RealEstateDisclaimer variant="fair-housing" />
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-medium">Deprecated disclaimer wrapper</h2>
            <div className="mt-4 space-y-3">
              <HealthcareDisclaimer variant="assistant-limits" />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
