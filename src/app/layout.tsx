import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuiScore - Live Scoring for Events & Competitions",
  description: "The ultimate platform for live scoring your events and competitions. From quizzes to sports tournaments, get real-time results, customizable rules, and a seamless experience.",
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
      <body className={`${inter.className} bg-black`}>
        <Providers>
          <Toaster richColors theme="dark" />
          <Navbar />
          <main className="min-h-screen pt-20">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
