import type { Metadata } from "next";
import { ToastProvider } from "@aurixa/ui-kit";
import "./globals.css";
import { StaffNav } from "@/components/StaffNav";
import { StaffProvider } from "@/context/StaffContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "AURIXA Hospital Portal",
  description: "Staff interface for doctors, nurses, reception, and scheduling.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="clinical">
      <body className="min-h-screen font-sans text-ui-ink antialiased">
        <ToastProvider>
          <a
            href="#main-content"
            className="sr-only z-[200] rounded-ui-md bg-ui-accent px-4 py-3 text-ui-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <StaffProvider>
            <ErrorBoundary>
              <main id="main-content" tabIndex={-1} className="portal-container">
                <StaffNav />
                {children}
              </main>
            </ErrorBoundary>
          </StaffProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
