'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import type { AgentInstanceResponse, AgentChannelResponse, AgentSkillResponse } from '@/types/agent';

interface AgentDashboardData {
  agent: AgentInstanceResponse;
  channels: AgentChannelResponse[];
  skills: AgentSkillResponse[];
  stats: { sessionCount: number; memoryCount: number };
}

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'skills' | 'memory' | 'settings'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch agent');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Initial fetch + polling
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAgent();
      pollRef.current = setInterval(fetchAgent, 10_000); // Poll every 10s
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, fetchAgent]);

  if (status === 'loading' || loading) return <DashboardSkeleton />;
  if (!session) { router.push('/sign-in'); return null; }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Agent not found'}</p>
          <button onClick={() => router.push('/agent/setup')} className="text-violet-600 hover:underline">
            ← Back to setup
          </button>
        </div>
      </div>
    );
  }

  const { agent, channels, skills, stats } = data;

  async function handleAction(action: string) {
    setActionLoading(action);
    try {
      if (action === 'destroy') {
        if (!confirm('Are you sure? This will permanently delete your agent and all its data.')) {
          setActionLoading(null);
          return;
        }
        await fetch(`/api/agent/${agentId}`, { method: 'DELETE' });
        router.push('/agent/setup');
        return;
      }

      await fetch(`/api/agent/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchAgent();
    } catch {
      setError('Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  const statusColor = {
    running: 'bg-green-500',
    stopped: 'bg-gray-400',
    provisioning: 'bg-yellow-500 animate-pulse',
    pending: 'bg-yellow-500',
    error: 'bg-red-500',
    destroyed: 'bg-gray-600',
  }[agent.status] || 'bg-gray-400';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Agent Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl text-white shadow-lg">
                🌟
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{agent.status}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agent.modelProvider}/{agent.modelName} · {agent.personality}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {agent.status === 'running' && (
                <ActionButton
                  onClick={() => handleAction('stop')}
                  loading={actionLoading === 'stop'}
                  variant="secondary"
                >
                  ⏹ Stop
                </ActionButton>
              )}
              {(agent.status === 'stopped' || agent.status === 'error') && (
                <ActionButton
                  onClick={() => handleAction('restart')}
                  loading={actionLoading === 'restart'}
                  variant="primary"
                >
                  ▶ Start
                </ActionButton>
              )}
              <ActionButton
                onClick={() => handleAction('destroy')}
                loading={actionLoading === 'destroy'}
                variant="danger"
              >
                🗑
              </ActionButton>
            </div>
          </div>

          {agent.errorMessage && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{agent.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
          {(['overview', 'channels', 'skills', 'memory', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Active Sessions" value={stats.sessionCount.toString()} icon="💬" />
            <StatCard title="Memories Stored" value={stats.memoryCount.toString()} icon="🧠" />
            <StatCard title="Channels Connected" value={channels.filter(c => c.status === 'connected').length.toString()} icon="📡" />
            <StatCard title="Skills Installed" value={skills.filter(s => s.enabled).length.toString()} icon="⚡" />

            {agent.lastActivity && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last Activity</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(agent.lastActivity).toLocaleString()}
                </div>
              </div>
            )}

            {agent.wsEndpoint && agent.status === 'running' && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">WebSocket Endpoint</div>
                <code className="text-sm bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 block text-violet-600 dark:text-violet-400 break-all">
                  {agent.wsEndpoint}
                </code>
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <ChannelsTab channels={channels} onUpdate={fetchAgent} />
        )}

        {activeTab === 'skills' && (
          <SkillsTab skills={skills} onUpdate={fetchAgent} />
        )}

        {activeTab === 'memory' && (
          <MemoryTab memoryCount={stats.memoryCount} onUpdate={fetchAgent} />
        )}

        {activeTab === 'settings' && (
          <AgentSettings agent={agent} agentId={agentId} onUpdate={fetchAgent} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function AgentSettings({
  agent,
  agentId,
  onUpdate,
}: {
  agent: AgentInstanceResponse;
  agentId: string;
  onUpdate: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [personality, setPersonality] = useState(agent.personality);
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(agent.heartbeatEnabled);
  const [heartbeatInterval, setHeartbeatInterval] = useState(agent.heartbeatInterval);
  const [activeHoursStart, setActiveHoursStart] = useState(agent.activeHoursStart);
  const [activeHoursEnd, setActiveHoursEnd] = useState(agent.activeHoursEnd);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/agent/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          personality,
          heartbeatEnabled,
          heartbeatInterval,
          activeHoursStart,
          activeHoursEnd,
        }),
      });
      onUpdate();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Settings</h2>

      <SettingField label="Agent Name">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </SettingField>

      <SettingField label="Personality">
        <select
          value={personality}
          onChange={e => setPersonality(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="friendly">😊 Friendly</option>
          <option value="professional">💼 Professional</option>
          <option value="playful">🎮 Playful</option>
          <option value="mentor">🎓 Mentor</option>
        </select>
      </SettingField>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          🫀 Heartbeat (Proactive Check-ins)
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Enable Heartbeat</div>
            <div className="text-xs text-gray-500">Agent will proactively reach out at intervals</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={heartbeatEnabled}
              onChange={e => setHeartbeatEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
          </label>
        </div>

        {heartbeatEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-violet-200 dark:border-violet-800">
            <SettingField label="Check-in Interval">
              <select
                value={heartbeatInterval}
                onChange={e => setHeartbeatInterval(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="15m">Every 15 minutes</option>
                <option value="30m">Every 30 minutes</option>
                <option value="1h">Every hour</option>
                <option value="4h">Every 4 hours</option>
                <option value="12h">Twice a day</option>
              </select>
            </SettingField>

            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Active Hours Start">
                <input
                  type="time"
                  value={activeHoursStart}
                  onChange={e => setActiveHoursStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </SettingField>
              <SettingField label="Active Hours End">
                <input
                  type="time"
                  value={activeHoursEnd}
                  onChange={e => setActiveHoursEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </SettingField>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    disconnected: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || colors.disconnected}`}>
      {status}
    </span>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  variant: 'primary' | 'secondary' | 'danger';
}) {
  const classes = {
    primary: 'bg-violet-600 text-white hover:bg-violet-700',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${classes[variant]}`}
    >
      {loading ? '...' : children}
    </button>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SkillsTab({ skills, onUpdate }: { skills: AgentSkillResponse[]; onUpdate: () => void }) {
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(skillId: string, enabled: boolean) {
    setToggling(skillId);
    try {
      await fetch('/api/agent/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled }),
      });
      onUpdate();
    } catch {
      // error silenced — UI reflects server state via onUpdate
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Skills & Capabilities</h2>
      {skills.length === 0 ? (
        <EmptyState icon="⚡" title="No skills installed" description="Install skills to give your agent new capabilities." />
      ) : (
        skills.map(skill => (
          <div key={skill.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{skill.name}</div>
              <div className="text-xs text-gray-500">{skill.description}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={skill.enabled}
                onChange={() => handleToggle(skill.skillId, !skill.enabled)}
                disabled={toggling === skill.skillId}
                className="sr-only peer"
              />
              <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 ${toggling === skill.skillId ? 'opacity-50' : ''}`} />
            </label>
          </div>
        ))
      )}
    </div>
  );
}

interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  createdAt: string;
}

function MemoryTab({ memoryCount, onUpdate }: { memoryCount: number; onUpdate: () => void }) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function fetchMemories() {
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (categoryFilter) params.set('category', categoryFilter);
        const res = await fetch(`/api/agent/memory?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMemories(data.memories || []);
        }
      } catch {
        // silenced
      } finally {
        setLoading(false);
      }
    }
    fetchMemories();
  }, [categoryFilter]);

  async function handleClearAll() {
    if (!confirm('Are you sure you want to clear all agent memories? This cannot be undone.')) return;
    setClearing(true);
    try {
      await fetch('/api/agent/memory', { method: 'DELETE' });
      setMemories([]);
      onUpdate();
    } catch {
      // silenced
    } finally {
      setClearing(false);
    }
  }

  const categoryColors: Record<string, string> = {
    general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    preference: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    task: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    fact: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Memory</h2>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All categories</option>
            <option value="general">General</option>
            <option value="preference">Preferences</option>
            <option value="task">Tasks</option>
            <option value="fact">Facts</option>
          </select>
          <button
            onClick={handleClearAll}
            disabled={clearing || memoryCount === 0}
            className="px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : memories.length === 0 ? (
        <EmptyState
          icon="🧠"
          title={memoryCount === 0 ? 'No memories yet' : 'No matching memories'}
          description={memoryCount === 0 ? 'Start chatting to build your agent\'s memory!' : 'Try a different category filter.'}
        />
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {memories.map(memory => (
            <div key={memory.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[memory.category] || categoryColors.general}`}>
                  {memory.category}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{memory.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CHANNEL_CONFIGS: { type: string; name: string; icon: string; desc: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
  { type: 'telegram', name: 'Telegram', icon: '✈️', desc: 'Enter bot token', fields: [
    { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...' },
  ]},
  { type: 'discord', name: 'Discord', icon: '🎮', desc: 'Enter bot token', fields: [
    { key: 'botToken', label: 'Bot Token', placeholder: 'Your Discord bot token' },
    { key: 'guildId', label: 'Guild ID', placeholder: 'Server ID' },
  ]},
  { type: 'whatsapp', name: 'WhatsApp', icon: '📱', desc: 'Twilio credentials', fields: [
    { key: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
    { key: 'authToken', label: 'Auth Token', placeholder: 'Your auth token', type: 'password' },
    { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890' },
  ]},
  { type: 'webchat', name: 'Web Chat', icon: '🌐', desc: 'Auto-generated', fields: [] },
];

function ChannelsTab({ channels, onUpdate }: { channels: AgentChannelResponse[]; onUpdate: () => void }) {
  const [addingType, setAddingType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getChannelIcon(type: string): string {
    const icons: Record<string, string> = { whatsapp: '💬', telegram: '✈️', discord: '🎮', slack: '💼', gmail: '📧', webchat: '🌐' };
    return icons[type] || '📡';
  }

  async function handleAddChannel(channelType: string) {
    setSaving(true);
    setError(null);
    const config = CHANNEL_CONFIGS.find(c => c.type === channelType);
    try {
      const res = await fetch('/api/agent/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType,
          channelName: config?.name || channelType,
          config: config?.fields.length ? formData : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add channel');
        return;
      }
      setAddingType(null);
      setFormData({});
      onUpdate();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const channelConfig = CHANNEL_CONFIGS.find(c => c.type === addingType);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Channels</h2>
      </div>

      {channels.length === 0 && !addingType ? (
        <EmptyState icon="📡" title="No channels connected" description="Connect WhatsApp, Telegram, or Discord to reach your agent from anywhere." />
      ) : (
        channels.map(ch => (
          <div key={ch.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getChannelIcon(ch.channelType)}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{ch.channelName}</div>
                <div className="text-xs text-gray-500">{ch.channelType}</div>
              </div>
            </div>
            <StatusBadge status={ch.status} />
          </div>
        ))
      )}

      {/* Add channel modal */}
      {addingType && channelConfig && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 border-violet-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{channelConfig.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white">Connect {channelConfig.name}</h3>
          </div>
          {channelConfig.fields.length > 0 ? (
            <div className="space-y-3">
              {channelConfig.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This channel will be auto-configured with a WebSocket endpoint.
            </p>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleAddChannel(addingType)}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Connecting...' : 'Connect'}
            </button>
            <button
              onClick={() => { setAddingType(null); setFormData({}); setError(null); }}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick-add channel cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {CHANNEL_CONFIGS.filter(c => !channels.find(ch => ch.channelType === c.type))
          .map(c => (
            <button
              key={c.type}
              onClick={() => { setAddingType(c.type); setFormData({}); setError(null); }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm text-left hover:ring-2 hover:ring-violet-500 transition-all"
            >
              <span className="text-2xl">{c.icon}</span>
              <div className="font-medium text-gray-900 dark:text-white text-sm mt-2">{c.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{c.desc}</div>
            </button>
          ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
