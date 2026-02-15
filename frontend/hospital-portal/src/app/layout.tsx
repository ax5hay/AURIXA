import type { Metadata } from "next";
import "./globals.css";
import { StaffNav } from "@/components/StaffNav";

export const metadata: Metadata = {
  title: "AURIXA Hospital Portal",
  description: "Staff interface for doctors, nurses, reception, and scheduling.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-background text-white min-h-screen antialiased">
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <StaffNav />
          {children}
        </main>
      </body>
    </html>
  );
}
