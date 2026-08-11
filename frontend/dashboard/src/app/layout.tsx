import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { ToastProvider } from "@aurixa/ui-kit";
import { authOptions, authSessionConfigured } from "@/auth";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import ContextBar from "@/components/ContextBar";
import { OperatorProvider } from "@/context/OperatorContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AURIXA Dashboard",
  description: "AURIXA platform operator console",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = authSessionConfigured ? await getServerSession(authOptions) : null;
  const initialRole = session?.user.roles.includes("deployment-admin")
    ? "administrator"
    : "operator";

  return (
    <html lang="en" data-theme="operator" className="dark" style={{ colorScheme: "dark" }}>
      <body className="ui-re-backdrop bg-ui-canvas font-sans text-ui-ink antialiased">
        <OperatorProvider initialRole={initialRole}>
          <ToastProvider>
            <a
              href="#main-content"
              className="sr-only z-[200] rounded-ui-md bg-ui-accent px-4 py-3 font-semibold text-ui-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              Skip to content
            </a>
            <div className="relative flex min-h-screen">
              <Sidebar />
              <div className="min-w-0 flex-1">
                <ContextBar />
                <main id="main-content" tabIndex={-1} className="pb-24 lg:pb-0">
                  {children}
                </main>
              </div>
            </div>
            <CommandPalette />
          </ToastProvider>
        </OperatorProvider>
      </body>
    </html>
  );
}
