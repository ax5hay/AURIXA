import type { Metadata } from "next";
import { AdminSidebar } from "@/components/AdminSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURIXA Admin Console",
  description: "System administration and tenant management for the AURIXA platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <AdminSidebar />
        <main className="ml-60 min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
