"use client";

import { SessionProvider } from "next-auth/react";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { CreateEventModalProvider } from "@/context/CreateEventModalContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        <CreateEventModalProvider>{children}</CreateEventModalProvider>
      </AuthModalProvider>
    </SessionProvider>
  );
} 