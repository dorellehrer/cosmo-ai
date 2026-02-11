'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications';

// ── Types ───────────────────────────────────────

interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: string;
  freeMemory: string;
  uptime: string;
  [key: string]: string | number;
}

interface VolumeInfo { volume: number; muted: boolean }
interface BrightnessInfo { brightness: number }
interface LocalRoutine {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  toolChain: Array<{ toolName: string; params?: Record<string, string> }>;
}

// ── Helpers ─────────────────────────────────────

function cronToHuman(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const [minute, hour,, , dayOfWeek] = parts;
  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute === '0' && hour === '*') return 'Every hour';
  if (minute === '*/5') return 'Every 5 min';
  if (minute === '*/15') return 'Every 15 min';
  if (minute === '*/30') return 'Every 30 min';
  if (dayOfWeek === '*' && hour !== '*' && minute !== '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  if (dayOfWeek === '1-5' && hour !== '*' && minute !== '*') {
    return `Weekdays at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  return schedule;
}

// ── Component ───────────────────────────────────

export default function DesktopSettingsPage() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Quick Controls
  const [volume, setVolume] = useState<VolumeInfo | null>(null);
  const [brightness, setBrightness] = useState<BrightnessInfo | null>(null);
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [dnd, setDnd] = useState<boolean | null>(null);

  // Accessibility
  const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null);

  // Local Routines
  const [routines, setRoutines] = useState<LocalRoutine[]>([]);
  const [routineRunning, setRoutineRunning] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  const nd = typeof window !== 'undefined' ? window.novaDesktop : undefined;

  // ── Load all data ──
  const loadData = useCallback(async () => {
    if (!nd) return;
    setLoading(true);
    try {
      const [sysInfo, ver, vol, bright, dark, dndStatus, accPerm, rts] = await Promise.allSettled([
        nd.getSystemInfo(),
        nd.getVersion(),
        nd.automation?.system.getVolume(),
        nd.automation?.system.getBrightness(),
        nd.automation?.system.getDarkMode(),
        nd.automation?.system.getDnd(),
        nd.automation?.accessibility.check(),
        nd.routines?.list(),
      ]);

      if (sysInfo.status === 'fulfilled') setSystemInfo(sysInfo.value as SystemInfo);
      if (ver.status === 'fulfilled') setAppVersion(ver.value as string);
      if (vol.status === 'fulfilled' && vol.value) setVolume(vol.value as VolumeInfo);
      if (bright.status === 'fulfilled' && bright.value) setBrightness(bright.value as BrightnessInfo);
      if (dark.status === 'fulfilled') setDarkMode((dark.value as { darkMode: boolean })?.darkMode ?? null);
      if (dndStatus.status === 'fulfilled') setDnd((dndStatus.value as { enabled: boolean })?.enabled ?? null);
      if (accPerm.status === 'fulfilled') setAccessibilityGranted((accPerm.value as { granted: boolean })?.granted ?? null);
      if (rts.status === 'fulfilled' && Array.isArray(rts.value)) setRoutines(rts.value as LocalRoutine[]);
    } catch (e) {
      console.error('Failed to load desktop data:', e);
    } finally {
      setLoading(false);
    }
  }, [nd]);

  useEffect(() => {
    const desktop = window.novaDesktop;
    setIsDesktop(!!desktop?.isDesktopApp);
    setIsMac(!!desktop?.isMac);
    if (desktop?.isDesktopApp) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  // ── Quick Controls ──
  const handleVolumeChange = async (newVol: number) => {
    setVolume((prev) => prev ? { ...prev, volume: newVol } : { volume: newVol, muted: false });
    await nd?.automation?.system.setVolume({ volume: newVol });
  };

  const handleMuteToggle = async () => {
    const newMuted = !(volume?.muted ?? false);
    setVolume((prev) => prev ? { ...prev, muted: newMuted } : { volume: 50, muted: newMuted });
    await nd?.automation?.system.setVolume({ muted: newMuted });
  };

  const handleBrightnessChange = async (newBright: number) => {
    setBrightness({ brightness: newBright });
    await nd?.automation?.system.setBrightness({ brightness: newBright });
  };

  const handleDarkModeToggle = async () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    await nd?.automation?.system.setDarkMode({ enabled: newDark });
  };

  const handleDndToggle = async () => {
    await nd?.automation?.system.toggleDnd();
    setDnd((prev) => !prev);
  };

  const handleLockScreen = async () => {
    await nd?.automation?.system.lockScreen();
  };

  const handleEmptyTrash = async () => {
    if (confirm('Empty the Trash? This cannot be undone.')) {
      await nd?.automation?.system.emptyTrash();
    }
  };

  // ── Accessibility ──
  const handleRequestAccessibility = async () => {
    await nd?.automation?.accessibility.request();
    // Give time for the user to grant, then re-check
    setTimeout(async () => {
      const result = await nd?.automation?.accessibility.check();
      setAccessibilityGranted((result as { granted: boolean })?.granted ?? null);
    }, 3000);
  };

  // ── Routines ──
  const handleToggleRoutine = async (id: string, enabled: boolean) => {
    setRoutines((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r));
    await nd?.routines?.update(id, { enabled });
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    await nd?.routines?.delete(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRunRoutineNow = async (id: string) => {
    setRoutineRunning(id);
    try {
      await nd?.routines?.runNow(id);
    } finally {
      setRoutineRunning(null);
      // Reload routines to get updated lastRun
      const rts = await nd?.routines?.list();
      if (Array.isArray(rts)) setRoutines(rts as LocalRoutine[]);
    }
  };

  // ── Not desktop? ──
  if (!loading && !isDesktop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Desktop Only</h1>
          <p className="text-white/60 mb-6">
            This page is only available in the Nova desktop app. Download it to access macOS automation features.
          </p>
          <Link
            href="/settings"
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-medium transition-colors"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/settings"
            className="flex items-center gap-1 sm:gap-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm sm:text-base">Settings</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Desktop
          </h1>
          <NotificationBell />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── System Quick Controls ── */}
            <section className="mb-8 sm:mb-12">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                System Controls
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
                {/* Volume */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button onClick={handleMuteToggle} className="text-white/60 hover:text-white transition-colors" title={volume?.muted ? 'Unmute' : 'Mute'}>
                        {volume?.muted ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </button>
                      <span className="text-sm text-white font-medium">Volume</span>
                    </div>
                    <span className="text-sm text-white/60 tabular-nums w-10 text-right">{Math.round(volume?.volume ?? 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume?.volume ?? 50}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                {/* Brightness */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" /></svg>
                      <span className="text-sm text-white font-medium">Brightness</span>
                    </div>
                    <span className="text-sm text-white/60 tabular-nums w-10 text-right">{Math.round(brightness?.brightness ?? 50)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brightness?.brightness ?? 50}
                    onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Dark Mode */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    <span className="text-sm text-white font-medium">Dark Mode</span>
                  </div>
                  <button
                    onClick={handleDarkModeToggle}
                    className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${darkMode ? 'bg-violet-500' : 'bg-white/20'}`}
                    role="switch"
                    aria-checked={darkMode ?? false}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'end-1' : 'start-1'}`} />
                  </button>
                </div>

                {/* Do Not Disturb */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64A9 9 0 0 1 20.77 15M6.16 6.16a9 9 0 1 0 12.68 12.68" strokeLinecap="round" /><path d="m2 2 20 20" strokeLinecap="round" /></svg>
                    <span className="text-sm text-white font-medium">Do Not Disturb</span>
                  </div>
                  <button
                    onClick={handleDndToggle}
                    className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${dnd ? 'bg-purple-500' : 'bg-white/20'}`}
                    role="switch"
                    aria-checked={dnd ?? false}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${dnd ? 'end-1' : 'start-1'}`} />
                  </button>
                </div>

                {/* Quick actions row */}
                <div className="p-4 sm:p-5 flex gap-3">
                  <button
                    onClick={handleLockScreen}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm text-white/80 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Lock Screen
                  </button>
                  <button
                    onClick={handleEmptyTrash}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm text-white/80 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" strokeLinecap="round" /></svg>
                    Empty Trash
                  </button>
                </div>
              </div>
            </section>

            {/* ── Accessibility Permission ── */}
            {isMac && (
              <section className="mb-8 sm:mb-12">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></svg>
                  Accessibility
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accessibilityGranted ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                      {accessibilityGranted ? (
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base text-white font-medium">
                        {accessibilityGranted ? 'Accessibility Enabled' : 'Accessibility Not Granted'}
                      </h3>
                      <p className="text-white/40 text-xs sm:text-sm mt-1">
                        {accessibilityGranted
                          ? 'Nova can read screen elements, click buttons, type text, and press keyboard shortcuts in other apps.'
                          : 'Grant Accessibility permission to let Nova interact with other apps — read screen elements, click buttons, type text, and automate keyboard shortcuts.'}
                      </p>
                      {!accessibilityGranted && (
                        <button
                          onClick={handleRequestAccessibility}
                          className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors"
                        >
                          Open System Preferences
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Local Routines ── */}
            <section className="mb-8 sm:mb-12">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" strokeLinecap="round" /></svg>
                  Local Routines
                </h2>
                <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                  Runs offline
                </span>
              </div>

              {routines.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" strokeLinecap="round" /></svg>
                  </div>
                  <h3 className="text-white font-medium mb-1">No local routines</h3>
                  <p className="text-white/40 text-sm mb-4">
                    Ask Nova to create one in chat, e.g. &ldquo;Create a routine that checks my calendar every morning at 8 AM.&rdquo;
                  </p>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Ask Nova
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base text-white font-medium truncate">{routine.name}</h3>
                          <p className="text-white/40 text-xs sm:text-sm mt-0.5 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" strokeLinecap="round" /></svg>
                            {cronToHuman(routine.schedule)}
                          </p>
                          {routine.lastRun && (
                            <p className="text-white/30 text-xs mt-1">
                              Last ran: {new Date(routine.lastRun).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle */}
                          <button
                            onClick={() => handleToggleRoutine(routine.id, !routine.enabled)}
                            className={`w-10 h-6 rounded-full relative transition-colors ${routine.enabled ? 'bg-cyan-500' : 'bg-white/20'}`}
                            role="switch"
                            aria-checked={routine.enabled}
                            title={routine.enabled ? 'Disable' : 'Enable'}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${routine.enabled ? 'end-0.5' : 'start-0.5'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Tool chain preview */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {routine.toolChain.map((step, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                            {step.toolName.replace('desktop_', '').replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRunRoutineNow(routine.id)}
                          disabled={routineRunning === routine.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/20 rounded-lg text-xs text-cyan-300 font-medium transition-colors disabled:opacity-50"
                        >
                          {routineRunning === routine.id ? (
                            <>
                              <div className="w-3 h-3 border border-cyan-300/50 border-t-cyan-300 rounded-full animate-spin" />
                              Running…
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              Run Now
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" strokeLinecap="round" /></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── System Info ── */}
            <section className="mb-8 sm:mb-12">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                System Info
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl divide-y divide-white/10">
                {[
                  { label: 'Nova Version', value: appVersion || '—' },
                  { label: 'Platform', value: systemInfo?.platform || '—' },
                  { label: 'Architecture', value: systemInfo?.arch || '—' },
                  { label: 'OS Version', value: systemInfo?.osVersion || '—' },
                  { label: 'Hostname', value: systemInfo?.hostname || '—' },
                  { label: 'CPU', value: systemInfo?.cpuModel || '—' },
                  { label: 'CPU Cores', value: String(systemInfo?.cpuCores ?? '—') },
                  { label: 'Total Memory', value: systemInfo?.totalMemory || '—' },
                  { label: 'Free Memory', value: systemInfo?.freeMemory || '—' },
                  { label: 'Uptime', value: systemInfo?.uptime || '—' },
                ].map((row) => (
                  <div key={row.label} className="p-3 sm:p-4 flex items-center justify-between gap-4">
                    <span className="text-sm text-white/60">{row.label}</span>
                    <span className="text-sm text-white font-medium text-right truncate max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Capabilities Overview ── */}
            <section className="mb-8 sm:mb-12">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>
                Desktop Capabilities
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                <p className="text-white/40 text-sm mb-4">
                  These capabilities are available to Nova when you chat. Just ask naturally — e.g. &ldquo;read my Desktop folder&rdquo; or &ldquo;set volume to 50%.&rdquo;
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: '📅', label: 'Calendar' },
                    { icon: '✅', label: 'Reminders' },
                    { icon: '✉️', label: 'Mail' },
                    { icon: '📝', label: 'Notes' },
                    { icon: '🔊', label: 'Volume & Audio' },
                    { icon: '🌙', label: 'Dark Mode' },
                    { icon: '🔆', label: 'Brightness' },
                    { icon: '🔕', label: 'Do Not Disturb' },
                    { icon: '📂', label: 'File System' },
                    { icon: '🔍', label: 'Spotlight Search' },
                    { icon: '🪟', label: 'Window Management' },
                    { icon: '🚀', label: 'App Control' },
                    { icon: '🗣️', label: 'Text-to-Speech' },
                    { icon: '⌨️', label: 'Keyboard Control' },
                    { icon: '🖱️', label: 'UI Interaction' },
                    { icon: '💻', label: 'Shell Commands' },
                    { icon: '📸', label: 'Screenshots' },
                    { icon: '⏰', label: 'Routines' },
                  ].map((cap) => (
                    <div
                      key={cap.label}
                      className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                    >
                      <span className="text-sm">{cap.icon}</span>
                      <span className="text-xs text-white/70">{cap.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
