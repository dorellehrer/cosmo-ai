"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <VoiceSettingsProvider>
        {children}
      </VoiceSettingsProvider>
    </SessionProvider>
  );
}
