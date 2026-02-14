import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AURIXA Dashboard",
  description: "AURIXA AI Platform - Orchestration Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${inter.className} font-sans antialiased`} style={{ backgroundColor: "#0a0a0f", color: "#ffffff" }}>
        <div className="flex min-h-screen bg-surface-primary" style={{ backgroundColor: "#0a0a0f" }}>
          <Sidebar />
          <main className="flex-1 overflow-auto" style={{ backgroundColor: "#0a0a0f" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
