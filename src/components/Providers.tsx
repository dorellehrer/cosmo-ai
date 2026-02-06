"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";
import { IntegrationsProvider } from "@/contexts/IntegrationsContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <IntegrationsProvider>
        <VoiceSettingsProvider>
          <KeyboardShortcutsProvider>
            {children}
          </KeyboardShortcutsProvider>
        </VoiceSettingsProvider>
      </IntegrationsProvider>
    </SessionProvider>
  );
}
