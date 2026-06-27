#!/usr/bin/env node
/**
 * record-demo.mjs — Playwright-based screen recording for the
 * films/TV portfolio demo videos.
 *
 * ── SETUP (one-time) ─────────────────────────────────────────────
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * ── USAGE ────────────────────────────────────────────────────────
 *   node scripts/record-demo.mjs              # all 5 clips
 *   node scripts/record-demo.mjs --clip=01    # one clip by id
 *   DEV_BASE=http://localhost:3001 node scripts/record-demo.mjs
 *
 * Clips 01 (stats-sketch) require no server — opened as a local file.
 * Clips 02–05 require `npm run dev` running at DEV_BASE.
 *
 * ── OUTPUT ───────────────────────────────────────────────────────
 *   _private/_demo-videos/{id}-{name}.webm
 *
 * ── CONVERT TO MP4 (for LinkedIn / on-site embeds) ───────────────
 *   brew install ffmpeg
 *   cd _private/_demo-videos
 *   for f in *.webm; do
 *     ffmpeg -i "$f" -c:v libx264 -crf 20 -pix_fmt yuv420p "${f%.webm}.mp4"
 *   done
 *
 * ── SHOT PLAN (5 clips) ──────────────────────────────────────────
 *
 *   01 · stats-sketch        The interactive HTML prototype built before
 *                            any production code. Films/TV toggle, draggable
 *                            tiles, bare mono type. ~25s.
 *
 *   02 · films-stats         /films/stats final — branded, real data,
 *                            chart tiles with real enrichment. Scrolls
 *                            through the full page. ~30s.
 *
 *   03 · television-stats    /television/stats final. Same scroll pattern.
 *                            Shows the TV sub-brand color. ~30s.
 *
 *   04 · reviews-search      /films/reviews — lens chip interaction
 *                            (Director / Genre / Rating), active filter
 *                            rail. ~25s.
 *
 *   05 · lists-hub           /films/lists — the year 2×2 hub (Editor's
 *                            Cut / Ratings Cut × New Releases / Backlog),
 *                            then click into a detail page. ~30s.
 *
 * ── EDITING NOTES FOR LINKEDIN HOLISTIC CUT ──────────────────────
 *   1. Open clips 01 → 02 back to back (before / after arc on stats)
 *   2. Speed up clip 01 to 1.5× (prototype moves fast; final is
 *      polished and should breathe)
 *   3. Clip 05 (lists hub) shows the editorial design work
 *      (matrix thinking) most clearly — good closing beat
 *   4. Target total: 60–90s for LinkedIn; 20–30s for case-study clips
 */

import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT       = resolve(ROOT, '_private', '_demo-videos');
const SKETCH    = resolve(ROOT, '_private', '_sketches', 'stats-sketch.html');
const DEV_BASE  = process.env.DEV_BASE || 'http://localhost:3000';

// ── Playwright guard ──────────────────────────────────────────────

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(`
  Playwright is not installed. Run:

    npm install --save-dev playwright
    npx playwright install chromium

  Then re-run this script.
`);
  process.exit(1);
}

// ── Clip registry ─────────────────────────────────────────────────

const CLIPS = [
  {
    id:    '01',
    name:  'stats-sketch',
    label: 'Stats sketch — interactive HTML prototype (no server needed)',
    record: recordStatsSketch,
  },
  {
    id:    '02',
    name:  'films-stats',
    label: '/films/stats — final production page',
    record: (page) => recordStatsPage(page, `${DEV_BASE}/films/stats`),
  },
  {
    id:    '03',
    name:  'television-stats',
    label: '/television/stats — final production page',
    record: (page) => recordStatsPage(page, `${DEV_BASE}/television/stats`),
  },
  {
    id:    '04',
    name:  'reviews-search',
    label: '/films/reviews — search, lens chips, filter rail',
    record: (page) => recordReviewsFlow(page, `${DEV_BASE}/films/reviews`),
  },
  {
    id:    '05',
    name:  'lists-hub',
    label: '/films/lists — year 2×2 hub + detail page',
    record: (page) => recordListsFlow(page, DEV_BASE),
  },
];

// ── Full-tour clip (one continuous walkthrough) ──────────────────────
// Not part of the default 5-clip run — it's the LinkedIn holistic cut:
// one camera move through the whole films-and-TV experience, no seams.
// Run with `--tour`. Targets ~35–40s.

const TOUR = {
  id:    'tour',
  name:  'full-tour',
  label: 'Full experience walkthrough — films + TV, one continuous take (~38s)',
  record: (page) => recordFullTour(page, DEV_BASE),
};

// ── CLI args ──────────────────────────────────────────────────────

const wantTour = process.argv.includes('--tour');

const clipFlag = process.argv.find((a) => a.startsWith('--clip'));
const clipId   = clipFlag
  ? (clipFlag.includes('=')
      ? clipFlag.split('=')[1]
      : process.argv[process.argv.indexOf(clipFlag) + 1])
  : null;

// --tour wins; then --clip=NN; otherwise the full 5-clip feature set.
const toRun = wantTour
  ? [TOUR]
  : (clipId ? CLIPS.filter((c) => c.id === clipId) : CLIPS);

if (toRun.length === 0) {
  console.error(`  No clip with id "${clipId}". Available: ${CLIPS.map((c) => c.id).join(', ')} (or --tour)`);
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────

await mkdir(OUT, { recursive: true });

// Headless by default for unattended capture. Set HEADED=1 to watch the
// recording happen in a visible window (handy when tuning selectors).
const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });

console.log(`\n  Recording ${toRun.length} clip(s) → _private/_demo-videos/\n`);

for (const clip of toRun) {
  console.log(`  ▶ ${clip.id} · ${clip.label}`);

  // Per-clip temp dir keeps Playwright's UUID-named webm isolated so
  // the rename step never picks up a file from a previous clip.
  const tmpDir = resolve(OUT, `_tmp-${clip.id}`);
  await mkdir(tmpDir, { recursive: true });

  const context = await browser.newContext({
    // 1280×720 = 16:9, the right shape for LinkedIn video posts.
    viewport:      { width: 1280, height: 720 },
    recordVideo:   { dir: tmpDir, size: { width: 1280, height: 720 } },
    colorScheme:   'light',
  });

  const page = await context.newPage();
  try {
    await clip.record(page);
    await page.waitForTimeout(500); // hold on the final frame
  } finally {
    // context.close() triggers Playwright to flush and write the webm.
    await context.close();
  }

  // Rename from Playwright's UUID to our clip convention.
  const files = (await readdir(tmpDir)).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const dest = resolve(OUT, `${clip.id}-${clip.name}.webm`);
    await rename(resolve(tmpDir, files[0]), dest);
    // Clean up the temp dir (now empty).
    await rm(tmpDir, { recursive: true });
    console.log(`     ✓ _private/_demo-videos/${clip.id}-${clip.name}.webm`);
  } else {
    console.warn(`     ⚠ No webm written for clip ${clip.id} — check Playwright output above.`);
    await rm(tmpDir, { recursive: true });
  }
}

await browser.close();

console.log(`
  Done. Convert to mp4:

    cd _private/_demo-videos
    for f in *.webm; do
      ffmpeg -i "$f" -c:v libx264 -crf 20 -pix_fmt yuv420p "\${f%.webm}.mp4"
    done

  Then copy finished mp4s to public/demo/ and reference them in <VideoClip>.
`);

// ── Recording functions ────────────────────────────────────────────

/**
 * Clip 01 — the interactive HTML prototype (local file, no server).
 * Shows: films/TV toggle, a slow pan across the tile grid.
 */
async function recordStatsSketch(page) {
  await page.goto(`file://${SKETCH}`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for Google Fonts to load (the sketch links to fonts.googleapis.com).
  await page.waitForTimeout(2000);

  // Hold on the Films dashboard at rest so the viewer can read the layout.
  await page.waitForTimeout(2500);

  // Toggle to TV view.
  const tvBtn = page.locator('.toggle button').nth(1);
  if (await tvBtn.count() > 0) {
    await tvBtn.click();
    await page.waitForTimeout(2000);
  }

  // Toggle back to Films.
  const filmsBtn = page.locator('.toggle button').first();
  if (await filmsBtn.count() > 0) {
    await filmsBtn.click();
    await page.waitForTimeout(1500);
  }

  // Slow pan down to reveal the lower tile rows, then back.
  await smoothScroll(page, 500, 5);
  await page.waitForTimeout(800);
  await smoothScroll(page, -500, 4);
  await page.waitForTimeout(1000);
}

/**
 * Clips 02 and 03 — /films/stats and /television/stats production pages.
 * Slow scroll from the hero through all chart tiles.
 */
async function recordStatsPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  // Hold on the hero so the page title and sub-brand color read clearly.
  await page.waitForTimeout(2500);

  // Slow scroll through all chart tiles and back to top.
  await smoothScroll(page, 1800, 10);
  await page.waitForTimeout(1000);
  await smoothScroll(page, -1800, 6);
  await page.waitForTimeout(1500);
}

/**
 * Clip 04 — /films/reviews lens chip interaction.
 * Selectors are best-effort; adjust if the chip markup changes.
 */
async function recordReviewsFlow(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Click the first available lens chip. The class names here are the
  // ones used on entity-routes; update if the selector changes post-merge.
  const chip = page.locator('[data-lens-key], .lens-chip, button[data-lens]').first();
  if (await chip.count() > 0) {
    await chip.click();
    await page.waitForTimeout(1500);
    // Click a second chip to show the active-filter rail behavior.
    const second = page.locator('[data-lens-key], .lens-chip, button[data-lens]').nth(1);
    if (await second.count() > 0) {
      await second.click();
      await page.waitForTimeout(1200);
    }
  }

  await smoothScroll(page, 800, 5);
  await page.waitForTimeout(800);
  await smoothScroll(page, -800, 4);
  await page.waitForTimeout(1000);
}

/**
 * Clip 05 — /films/lists year 2×2 hub, then a detail page.
 */
async function recordListsFlow(page, base) {
  await page.goto(`${base}/films/lists`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Pan slowly so the 2×2 grid reads as a deliberate editorial structure.
  await smoothScroll(page, 700, 6);
  await page.waitForTimeout(1000);

  // Click the first list card to show the ranked detail page.
  const firstCard = page.locator('a[href*="/films/lists/"]').first();
  if (await firstCard.count() > 0) {
    await firstCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await smoothScroll(page, 500, 4);
    await page.waitForTimeout(1000);
  }
}

/**
 * Full-tour — one continuous walkthrough of the whole films/TV
 * experience for the LinkedIn holistic cut. Navigates between routes
 * in a single recording session so there are no edit seams.
 *
 * The scene timings below sum to ~38s of on-camera time (plus a few
 * seconds of page-load between navigations). Adjust the hold/scroll
 * waits here to lengthen or tighten the final runtime.
 */
async function recordFullTour(page, base) {
  // Scene 1 — Films landing. Establish the brand, then pan the modules.
  await page.goto(`${base}/films`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2500);            // hold on the hero
  await smoothScroll(page, 1400, 9);          // pan down through the modules
  await page.waitForTimeout(800);
  await smoothScroll(page, -1400, 5);         // back to top
  await page.waitForTimeout(800);

  // Scene 2 — Films reviews. Show the search front door + a lens chip.
  await page.goto(`${base}/films/reviews`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  const chip = page.locator('[data-lens-key], .lens-chip, button[data-lens]').first();
  if (await chip.count() > 0) {
    await chip.click();
    await page.waitForTimeout(1500);
  }
  await smoothScroll(page, 700, 5);
  await page.waitForTimeout(600);

  // Scene 3 — Films stats. The "after" of the prototype-to-product arc.
  await page.goto(`${base}/films/stats`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await smoothScroll(page, 1400, 9);
  await page.waitForTimeout(800);

  // Scene 4 — Films lists. The editorial 2×2 matrix.
  await page.goto(`${base}/films/lists`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await smoothScroll(page, 700, 5);
  await page.waitForTimeout(800);

  // Scene 5 — Television landing. Pivot to the TV sub-brand.
  await page.goto(`${base}/television`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await smoothScroll(page, 900, 6);
  await page.waitForTimeout(800);

  // Scene 6 — Television stats. Close on the TV-blue dashboard.
  await page.goto(`${base}/television/stats`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);
  await smoothScroll(page, 1200, 8);
  await page.waitForTimeout(1500);            // final resting frame
}

// ── Utility ───────────────────────────────────────────────────────

/**
 * Smooth-scroll a page by `totalPx` over `steps` increments.
 * Each step waits 200ms so the scroll renders on camera.
 */
async function smoothScroll(page, totalPx, steps) {
  const step = Math.round(totalPx / steps);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), step);
    await page.waitForTimeout(200);
  }
}
