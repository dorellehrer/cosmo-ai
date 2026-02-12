'use client';

import { useEffect, useState } from 'react';

type MacArch = 'arm64' | 'x64' | null;

function detectMacArch(): MacArch {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  // Apple Silicon Macs report "Mac OS X" in UA — but we can't reliably
  // distinguish from Intel via UA alone. Use GPU renderer as a heuristic.
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
        // Apple GPU = Apple Silicon; Intel in renderer = Intel Mac
        if (/apple/i.test(renderer) && !/intel/i.test(renderer)) {
          return 'arm64';
        }
        if (/intel/i.test(renderer)) {
          return 'x64';
        }
      }
    }
  } catch {
    // WebGL not available
  }
  // Default: assume Apple Silicon (most modern Macs)
  return 'arm64';
}

function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|Macintosh/i.test(navigator.userAgent);
}

function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Win/i.test(navigator.userAgent);
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

export function MacDownloadButtons() {
  const [detectedArch, setDetectedArch] = useState<MacArch>(null);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(isMacOS());
    setDetectedArch(detectMacArch());
  }, []);

  const primary = detectedArch || 'arm64';
  const secondary = primary === 'arm64' ? 'x64' : 'arm64';
  const primaryLabel = primary === 'arm64' ? 'Apple Silicon' : 'Intel';
  const secondaryLabel = secondary === 'arm64' ? 'Apple Silicon' : 'Intel';

  return (
    <div className="space-y-3">
      <a
        href={`/api/download?platform=mac&arch=${primary}`}
        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-semibold transition-all shadow-lg shadow-violet-500/25"
      >
        <DownloadIcon />
        Download for Mac ({primaryLabel})
        {isMac && detectedArch === primary && (
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Recommended
          </span>
        )}
      </a>
      <a
        href={`/api/download?platform=mac&arch=${secondary}`}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-sm font-medium transition-all"
      >
        <DownloadIcon />
        Download for Mac ({secondaryLabel})
      </a>
      <p className="text-[11px] text-white/40 text-center leading-relaxed">
        macOS 12 or later required.{' '}
        <span className="text-white/30">
          If macOS shows &quot;app is damaged&quot;, right-click the app → Open → Open.
        </span>
      </p>
    </div>
  );
}

export function WindowsDownloadButton() {
  return (
    <div className="space-y-3">
      <a
        href="/api/download?platform=win&arch=x64"
        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-white font-semibold transition-all shadow-lg shadow-violet-500/25"
      >
        <DownloadIcon />
        Download for Windows
      </a>
      <p className="text-[11px] text-white/40 text-center">
        Windows 10/11 (x64).{' '}
        <span className="text-white/30">
          Windows SmartScreen may warn — click &quot;More info&quot; → &quot;Run anyway&quot;.
        </span>
      </p>
    </div>
  );
}

/**
 * Auto-detect platform and show a smart universal download CTA.
 * Used on landing pages or other contexts where you want one button.
 */
export function SmartDownloadButton() {
  const [platform, setPlatform] = useState<'mac' | 'win' | 'other'>('other');
  const [arch, setArch] = useState<MacArch>(null);

  useEffect(() => {
    if (isMacOS()) {
      setPlatform('mac');
      setArch(detectMacArch());
    } else if (isWindows()) {
      setPlatform('win');
    }
  }, []);

  if (platform === 'other') {
    return (
      <a
        href="/download"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all"
      >
        <DownloadIcon />
        Download Nova AI
      </a>
    );
  }

  const downloadArch = platform === 'mac' ? (arch || 'arm64') : 'x64';
  const label = platform === 'mac'
    ? `Download for Mac (${downloadArch === 'arm64' ? 'Apple Silicon' : 'Intel'})`
    : 'Download for Windows';

  return (
    <a
      href={`/api/download?platform=${platform}&arch=${downloadArch}`}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-full text-white font-semibold transition-all"
    >
      <DownloadIcon />
      {label}
    </a>
  );
}
