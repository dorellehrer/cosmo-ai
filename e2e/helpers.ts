import fs from 'fs';

/**
 * Returns true if a real authenticated session exists.
 * When the DB is unreachable locally, auth.setup writes an empty state file
 * with no cookies — authenticated tests should skip in that case.
 */
export function hasValidAuthState(path = '.auth/user.json'): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return data.cookies?.length > 0 || data.origins?.length > 0;
  } catch {
    return false;
  }
}
