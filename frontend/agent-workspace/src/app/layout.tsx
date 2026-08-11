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
          <StaffProvider>
            <ErrorBoundary>
              <StaffNav>{children}</StaffNav>
            </ErrorBoundary>
          </StaffProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
