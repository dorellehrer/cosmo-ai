import type { Metadata } from 'next';

const INTEGRATION_META: Record<string, { title: string; description: string }> = {
  google: {
    title: 'Google Integration - Nova AI',
    description: 'Connect Google Calendar, Gmail, and Drive to Nova AI. View events, create meetings, search emails, and find files with natural language.',
  },
  hue: {
    title: 'Philips Hue Integration - Nova AI',
    description: 'Philips Hue smart lighting integration for Nova AI. Control lights, scenes, and rooms with your AI assistant (coming soon).',
  },
  spotify: {
    title: 'Spotify Integration - Nova AI',
    description: 'Connect Spotify to Nova AI. Control playback, check what\'s playing, and search for music with your AI assistant.',
  },
  sonos: {
    title: 'Sonos Integration - Nova AI',
    description: 'Sonos speaker integration for Nova AI. Multi-room audio control with your AI assistant (coming soon).',
  },
  notion: {
    title: 'Notion Integration - Nova AI',
    description: 'Connect Notion to Nova AI. Search pages, create notes, and manage your workspace with natural language.',
  },
  slack: {
    title: 'Slack Integration - Nova AI',
    description: 'Connect Slack to Nova AI. Search messages, send messages to channels, and browse team communication.',
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
