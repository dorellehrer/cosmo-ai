import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_API } from '@/lib/rate-limit';

/**
 * GET /api/download
 * Resolves the latest GitHub Release and redirects to the correct asset.
 * Query params:
 *   - platform: 'mac' | 'win'  (required)
 *   - arch: 'arm64' | 'x64'    (default: 'arm64' for mac, 'x64' for win)
 *
 * This avoids hardcoding version numbers in the download page —
 * it always serves the latest published release.
 */

const GITHUB_OWNER = 'dorellehrer';
const GITHUB_REPO = 'cosmo-ai';

// Simple in-memory cache for the GitHub release data (5 min TTL)
let cachedRelease: { data: GitHubRelease; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: GitHubAsset[];
  html_url: string;
}

async function getLatestRelease(): Promise<GitHubRelease | null> {
  // Return cached if still valid
  if (cachedRelease && Date.now() < cachedRelease.expiresAt) {
    return cachedRelease.data;
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Nova-AI-Download',
    };

    // Use GitHub token if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`GitHub API returned ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as GitHubRelease;
    cachedRelease = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
}

function findAsset(
  assets: GitHubAsset[],
  platform: string,
  arch: string
): GitHubAsset | undefined {
  if (platform === 'mac') {
    // Look for DMG first, then ZIP fallback
    const dmg = assets.find((a) => {
      const name = a.name.toLowerCase();
      if (!name.endsWith('.dmg')) return false;
      if (arch === 'arm64') return name.includes('arm64');
      // x64: match DMG without 'arm64' in name
      return !name.includes('arm64');
    });
    if (dmg) return dmg;

    // Fallback to ZIP
    return assets.find((a) => {
      const name = a.name.toLowerCase();
      if (!name.endsWith('.zip') || name.endsWith('.blockmap')) return false;
      if (arch === 'arm64') return name.includes('arm64');
      return !name.includes('arm64');
    });
  }

  if (platform === 'win') {
    return assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  // Rate limit
  const rateLimitResult = checkRateLimit(
    request.headers.get('x-forwarded-for') || 'anonymous',
    RATE_LIMIT_API
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const arch = searchParams.get('arch') || (platform === 'mac' ? 'arm64' : 'x64');

  if (!platform || !['mac', 'win'].includes(platform)) {
    return NextResponse.json(
      { error: 'Missing or invalid platform. Use ?platform=mac or ?platform=win' },
      { status: 400 }
    );
  }

  if (!['arm64', 'x64'].includes(arch)) {
    return NextResponse.json(
      { error: 'Invalid arch. Use arm64 or x64.' },
      { status: 400 }
    );
  }

  const release = await getLatestRelease();
  if (!release) {
    return NextResponse.json(
      { error: 'No releases found. Check back soon!' },
      { status: 404 }
    );
  }

  const asset = findAsset(release.assets, platform, arch);
  if (!asset) {
    return NextResponse.json(
      {
        error: `No ${platform} (${arch}) asset found in release ${release.tag_name}`,
        release_url: release.html_url,
      },
      { status: 404 }
    );
  }

  // Log the download for analytics
  console.log(
    `[download] platform=${platform} arch=${arch} version=${release.tag_name} asset=${asset.name} size=${asset.size}`
  );

  // Redirect to the actual GitHub release asset
  return NextResponse.redirect(asset.browser_download_url, 307);
}
