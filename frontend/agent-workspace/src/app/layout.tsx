import type { Metadata } from "next";
import { ToastProvider } from "@aurixa/ui-kit";
import "./globals.css";
import { AgentNav } from "@/components/AgentNav";
import { StaffProvider } from "@/context/StaffContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "AURIXA Agent Workspace",
  description: "Operational workspace for agents, coordinators, and brokerage staff.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="workspace">
      <body className="min-h-screen font-sans text-ui-ink antialiased">
        <ToastProvider>
          <StaffProvider>
            <ErrorBoundary>
              <AgentNav>{children}</AgentNav>
            </ErrorBoundary>
          </StaffProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
