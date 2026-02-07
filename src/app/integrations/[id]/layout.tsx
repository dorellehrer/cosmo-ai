import type { Metadata } from 'next';

const INTEGRATION_META: Record<string, { title: string; description: string }> = {
  google: {
    title: 'Google Integration - Nova AI',
    description: 'Connect Google Calendar, Gmail, and Drive to Nova AI. Manage calendar events, send and read emails, and search files with natural language.',
  },
  hue: {
    title: 'Philips Hue Integration - Nova AI',
    description: 'Connect Philips Hue to Nova AI. Control lights, activate scenes, adjust brightness and colors with your AI assistant.',
  },
  spotify: {
    title: 'Spotify Integration - Nova AI',
    description: 'Connect Spotify to Nova AI. Control playback, browse playlists, check what\'s playing, and search for music with your AI assistant.',
  },
  sonos: {
    title: 'Sonos Integration - Nova AI',
    description: 'Connect Sonos to Nova AI. Multi-room audio control, playback management, and volume adjustment with your AI assistant.',
  },
  notion: {
    title: 'Notion Integration - Nova AI',
    description: 'Connect Notion to Nova AI. Search pages, create and update notes, and manage your workspace with natural language.',
  },
  slack: {
    title: 'Slack Integration - Nova AI',
    description: 'Connect Slack to Nova AI. Search messages, send messages to channels and DMs, reply in threads, and browse team communication.',
  },
};

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const meta = INTEGRATION_META[id];
  if (!meta) return { title: 'Integration - Nova AI' };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description },
  };
}

export default function IntegrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
