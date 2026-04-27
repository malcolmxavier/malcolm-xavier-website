import { execSync } from 'node:child_process';

/**
 * Date the site was last updated.
 *
 * Resolved at build time from the latest git commit's committer date.
 * On Vercel, every push triggers a build, so this naturally tracks the
 * day code was last pushed. Multiple pushes within the same calendar
 * day all show the same formatted date.
 *
 * Falls back to build start time if git is unavailable for any reason
 * (e.g. unusual build environments without .git access).
 */
function readGitDate(): Date | null {
  try {
    // %cs = committer date in short ISO form (YYYY-MM-DD), in the committer's
    // timezone. Pinning to UTC midnight keeps the calendar day stable no
    // matter where the build runs.
    const ymd = execSync('git log -1 --format=%cs', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    return new Date(ymd + 'T00:00:00Z');
  } catch {
    return null;
  }
}

export const LAST_UPDATED: Date = readGitDate() ?? new Date();

export function formatLastUpdated(d: Date = LAST_UPDATED): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
