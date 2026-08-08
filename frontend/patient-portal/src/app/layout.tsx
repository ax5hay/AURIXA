import type { Metadata } from "next";
import { ToastProvider } from "@aurixa/ui-kit";
import "./globals.css";
import { PatientShell } from "@/components/PatientNav";
import { PreferenceBootstrap } from "@/components/PreferenceBootstrap";

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
          <PreferenceBootstrap />
          <PatientShell>{children}</PatientShell>
        </ToastProvider>
      </body>
    </html>
  );
}
