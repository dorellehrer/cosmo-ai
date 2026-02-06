"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";
import { IntegrationsProvider } from "@/contexts/IntegrationsContext";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ToastContainer } from "@/components/notifications";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

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
              <PWAInstallPrompt />
              <ServiceWorkerRegistration />
            </KeyboardShortcutsProvider>
          </VoiceSettingsProvider>
        </IntegrationsProvider>
      </NotificationsProvider>
    </SessionProvider>
  );
}
