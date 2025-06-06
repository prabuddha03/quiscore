import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { SocketInitializer } from "@/components/SocketInitializer";

export const metadata: Metadata = {
  title: "Quiscore",
  description: "A real-time, scalable quiz scoreboard platform.",
};

// Initialize Socket.IO server on app startup
if (typeof window !== 'undefined') {
  // Client-side initialization
  fetch('/api/socket').catch(console.error);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.className
        )}
      >
        <Providers>
          <SocketInitializer />
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
