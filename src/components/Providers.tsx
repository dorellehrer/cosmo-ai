"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";
import { IntegrationsProvider } from "@/contexts/IntegrationsContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ToastContainer } from "@/components/notifications";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <NotificationsProvider>
        <IntegrationsProvider>
          <VoiceSettingsProvider>
            <KeyboardShortcutsProvider>
              {children}
              <ToastContainer />
            </KeyboardShortcutsProvider>
          </VoiceSettingsProvider>
        </IntegrationsProvider>
      </NotificationsProvider>
    </SessionProvider>
  );
}
