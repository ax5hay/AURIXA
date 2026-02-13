import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AURIXA Patient Portal",
  description: "Your virtual assistant for appointments and inquiries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-white`}>
        <main className="container mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
