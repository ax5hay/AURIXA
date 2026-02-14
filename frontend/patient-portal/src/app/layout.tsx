import type { Metadata } from "next";
import "./globals.css";
import { PatientNav } from "@/components/PatientNav";

export const metadata: Metadata = {
  title: "AURIXA Patient Portal",
  description: "Your virtual assistant for appointments and inquiries.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-background text-white min-h-screen antialiased">
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6">
          <PatientNav />
          {children}
        </main>
      </body>
    </html>
  );
}
