import type { Metadata } from "next";
import { ToastProvider } from "@aurixa/ui-kit";
import "./globals.css";
import { PatientNav } from "@/components/PatientNav";

export const metadata: Metadata = {
  title: "AURIXA Patient Portal",
  description: "Appointments, care information, and support in one calm place.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="patient">
      <body className="min-h-screen bg-ui-canvas font-sans text-ui-ink antialiased">
        <ToastProvider>
          <a
            href="#main-content"
            className="sr-only z-[200] rounded-ui-md bg-ui-accent px-4 py-3 font-semibold text-ui-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <PatientNav />
          <main id="main-content" tabIndex={-1} className="portal-container">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
