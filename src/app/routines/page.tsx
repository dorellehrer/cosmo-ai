'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/notifications';

interface ToolStep {
  toolName: string;
  args?: Record<string, string>;
}

interface RoutineExecution {
  id: string;
  status: 'running' | 'completed' | 'failed';
  result: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface Routine {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  toolChain: ToolStep[];
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  lastExecution: RoutineExecution | null;
  createdAt: string;
}

const SCHEDULE_PRESETS = [
  { label: 'Every morning (8:00 AM)', value: '0 8 * * *' },
  { label: 'Every evening (6:00 PM)', value: '0 18 * * *' },
  { label: 'Weekday mornings (8:00 AM)', value: '0 8 * * 1-5' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Monday mornings (9:00 AM)', value: '0 9 * * 1' },
  { label: 'Friday afternoons (5:00 PM)', value: '0 17 * * 5' },
];

const AVAILABLE_TOOLS = [
  { name: 'google_calendar_list_events', label: 'List Calendar Events', category: 'Google' },
  { name: 'google_gmail_search', label: 'Search Email', category: 'Google' },
  { name: 'google_gmail_send', label: 'Send Email', category: 'Google' },
  { name: 'google_drive_search', label: 'Search Drive', category: 'Google' },
  { name: 'slack_send_message', label: 'Send Slack Message', category: 'Slack' },
  { name: 'slack_send_dm', label: 'Send Slack DM', category: 'Slack' },
  { name: 'slack_search_messages', label: 'Search Slack', category: 'Slack' },
  { name: 'notion_search', label: 'Search Notion', category: 'Notion' },
  { name: 'notion_create_page', label: 'Create Notion Page', category: 'Notion' },
  { name: 'web_search', label: 'Web Search', category: 'Built-in' },
  { name: 'weather_current', label: 'Current Weather', category: 'Built-in' },
  { name: 'summarize_url', label: 'Summarize URL', category: 'Built-in' },
  { name: 'translate_text', label: 'Translate Text', category: 'Built-in' },
  { name: 'hue_control_light', label: 'Control Light', category: 'Hue' },
  { name: 'hue_activate_scene', label: 'Activate Scene', category: 'Hue' },
  { name: 'sonos_playback_control', label: 'Sonos Playback', category: 'Sonos' },
];

function cronToHuman(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute === '0' && hour === '*') return 'Every hour';
  if (minute === '*/5') return 'Every 5 minutes';
  if (minute === '*/15') return 'Every 15 minutes';
  if (minute === '*/30') return 'Every 30 minutes';
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*' && minute !== '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5' && hour !== '*' && minute !== '*') {
    return `Weekdays at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (dayOfMonth === '*' && month === '*' && /^\d$/.test(dayOfWeek) && hour !== '*' && minute !== '*') {
    return `${dayNames[parseInt(dayOfWeek)]}s at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }
  return schedule;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RoutinesPage() {
  const t = useTranslations('routines');
  const common = useTranslations('common');

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<RoutineExecution[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSchedule, setNewSchedule] = useState('0 8 * * *');
  const [newCustomCron, setNewCustomCron] = useState('');
  const [useCustomCron, setUseCustomCron] = useState(false);
  const [newToolChain, setNewToolChain] = useState<ToolStep[]>([{ toolName: '' }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch('/api/routines');
      if (res.ok) {
        const data = await res.json();
        setRoutines(data);
      }
    } catch (err) {
      console.error('Failed to fetch routines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const toggleRoutine = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/routines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        setRoutines((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r))
        );
      }
    } catch (err) {
      console.error('Failed to toggle routine:', err);
    }
  };

  const deleteRoutine = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/routines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutines((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete routine:', err);
    }
  };

  const loadHistory = async (routineId: string) => {
    if (expandedHistory === routineId) {
      setExpandedHistory(null);
      return;
    }
    setExpandedHistory(routineId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/routines/${routineId}/history`);
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const createRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) { setError(t('nameRequired')); return; }
    const schedule = useCustomCron ? newCustomCron : newSchedule;
    if (!schedule) { setError(t('scheduleRequired')); return; }
    const validSteps = newToolChain.filter((s) => s.toolName);
    if (validSteps.length === 0) { setError(t('toolRequired')); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          schedule,
          toolChain: validSteps,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setNewName('');
        setNewDescription('');
        setNewSchedule('0 8 * * *');
        setNewCustomCron('');
        setUseCustomCron(false);
        setNewToolChain([{ toolName: '' }]);
        fetchRoutines();
      } else {
        const data = await res.json();
        setError(data.error || t('createFailed'));
      }
    } catch {
      setError(t('createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const addStep = () => setNewToolChain((prev) => [...prev, { toolName: '' }]);
  const removeStep = (i: number) => setNewToolChain((prev) => prev.filter((_, idx) => idx !== i));
  const updateStep = (i: number, toolName: string) => {
    setNewToolChain((prev) => prev.map((s, idx) => (idx === i ? { ...s, toolName } : s)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/chat" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60" aria-label="Back to chat">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{t('title')}</h1>
              <p className="text-xs text-white/50">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex-1" />
          <NotificationBell />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            {t('create')}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : routines.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{t('emptyTitle')}</h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">{t('emptyDescription')}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-medium transition-all"
            >
              {t('createFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Routine Cards */}
            {routines.map((routine) => (
              <div key={routine.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleRoutine(routine.id, routine.enabled)}
                      className={`mt-1 relative w-11 h-6 rounded-full transition-colors ${routine.enabled ? 'bg-violet-600' : 'bg-white/20'}`}
                      aria-label={routine.enabled ? t('disable') : t('enable')}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${routine.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{routine.name}</h3>
                      {routine.description && (
                        <p className="text-white/50 text-sm mt-0.5 truncate">{routine.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                          {cronToHuman(routine.schedule)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                          {routine.toolChain.length} {routine.toolChain.length === 1 ? 'step' : 'steps'}
                        </span>
                        {routine.lastRun && (
                          <span className="flex items-center gap-1">
                            Last: {timeAgo(routine.lastRun)}
                          </span>
                        )}
                        {routine.nextRun && routine.enabled && (
                          <span className="flex items-center gap-1 text-violet-400/60">
                            Next: {new Date(routine.nextRun).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Last execution status */}
                      {routine.lastExecution && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            routine.lastExecution.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : routine.lastExecution.status === 'failed'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {routine.lastExecution.status === 'completed' && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                            )}
                            {routine.lastExecution.status === 'failed' && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            )}
                            {routine.lastExecution.status}
                          </span>
                        </div>
                      )}

                      {/* Tool chain preview */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {routine.toolChain.map((step, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/50 font-mono">
                            {step.toolName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadHistory(routine.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
                        aria-label={t('viewHistory')}
                        title={t('viewHistory')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>
                      </button>
                      <button
                        onClick={() => deleteRoutine(routine.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-red-400"
                        aria-label={t('delete')}
                        title={t('delete')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Execution History (expandable) */}
                {expandedHistory === routine.id && (
                  <div className="border-t border-white/10 bg-white/[0.02] px-4 sm:px-5 py-3">
                    <h4 className="text-sm font-medium text-white/70 mb-2">{t('executionHistory')}</h4>
                    {loadingHistory ? (
                      <div className="flex items-center gap-2 py-4 text-white/40 text-sm">
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        {common('loading')}
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-white/30 text-sm py-2">{t('noHistory')}</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map((exec) => (
                          <div key={exec.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              exec.status === 'completed' ? 'bg-green-400' :
                              exec.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                            }`} />
                            <span className="text-white/50">
                              {new Date(exec.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`${exec.status === 'completed' ? 'text-green-400' : exec.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                              {exec.status}
                            </span>
                            {exec.error && (
                              <span className="text-red-400/70 truncate flex-1">{exec.error}</span>
                            )}
                            {exec.finishedAt && (
                              <span className="text-white/30">
                                {Math.round((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)}s
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Routine Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">{t('createRoutine')}</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <form onSubmit={createRoutine} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="routine-name" className="block text-sm font-medium text-white/70 mb-1">{t('name')}</label>
                  <input
                    id="routine-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="routine-desc" className="block text-sm font-medium text-white/70 mb-1">{t('description')}</label>
                  <input
                    id="routine-desc"
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    maxLength={200}
                  />
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">{t('schedule')}</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                        <input type="radio" checked={!useCustomCron} onChange={() => setUseCustomCron(false)} className="accent-violet-500" />
                        {t('preset')}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                        <input type="radio" checked={useCustomCron} onChange={() => setUseCustomCron(true)} className="accent-violet-500" />
                        {t('customCron')}
                      </label>
                    </div>
                    {useCustomCron ? (
                      <input
                        type="text"
                        value={newCustomCron}
                        onChange={(e) => setNewCustomCron(e.target.value)}
                        placeholder="*/30 * * * *"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    ) : (
                      <select
                        value={newSchedule}
                        onChange={(e) => setNewSchedule(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {SCHEDULE_PRESETS.map((p) => (
                          <option key={p.value} value={p.value} className="bg-slate-800">{p.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Tool Chain */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">{t('toolChain')}</label>
                  <p className="text-xs text-white/30 mb-2">{t('toolChainHint')}</p>
                  <div className="space-y-2">
                    {newToolChain.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-white/30 w-5 text-center">{i + 1}</span>
                        <select
                          value={step.toolName}
                          onChange={(e) => updateStep(i, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="" className="bg-slate-800">{t('selectTool')}</option>
                          {AVAILABLE_TOOLS.map((tool) => (
                            <option key={tool.name} value={tool.name} className="bg-slate-800">
                              [{tool.category}] {tool.label}
                            </option>
                          ))}
                        </select>
                        {newToolChain.length > 1 && (
                          <button type="button" onClick={() => removeStep(i)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addStep} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      + {t('addStep')}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 text-sm transition-colors"
                  >
                    {common('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-all"
                  >
                    {creating ? common('loading') : t('create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
