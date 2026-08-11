import type { Metadata } from "next";
import { ToastProvider } from "@aurixa/ui-kit";
import "./globals.css";
import { ClientShell } from "@/components/ClientNav";
import { PreferenceBootstrap } from "@/components/PreferenceBootstrap";

export const metadata: Metadata = {
  title: "AURIXA Client Portal",
  description: "Showings, listings, and real estate support in one calm place.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="client">
      <body className="min-h-screen bg-ui-canvas font-sans text-ui-ink antialiased">
        <ToastProvider>
          <PreferenceBootstrap />
          <ClientShell>{children}</ClientShell>
        </ToastProvider>
      </body>
    </html>
  );
}
