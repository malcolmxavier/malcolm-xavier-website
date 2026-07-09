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
 * Clips 01 (stats-sketch) and 07 (filter-prototype) require no server —
 * they're opened as local files. Clips 02–06 require `npm run dev` at DEV_BASE.
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
 * ── SHOT PLAN (7 clips) ──────────────────────────────────────────
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
 *   04 · films-reviews-      /films/reviews — faceting AS discovery. Clicks
 *        discovery           genre → studio → decade chips; an injected mono
 *                            URL strip shows the querystring accreting on
 *                            camera (the p46 "every slice is an address"
 *                            beat). Film slice. ~25s.
 *
 *   05 · lists-hub           /films/lists — the year 2×2 hub (Editor's
 *                            Cut / Ratings Cut × New Releases / Backlog),
 *                            then click into a detail page. ~30s.
 *
 *   06 · television-reviews- /television/reviews — same faceting-as-discovery
 *        discovery           flow as clip 04, TV facet vocabulary (genre,
 *                            network, decade). The p46 TV slice. ~25s.
 *
 *   07 · filter-prototype    filter-prototype.html — the hand-built filterable
 *                            dashboard (films / TV / connected toggle, tiles
 *                            recompute per lens). Prototype→product "before"
 *                            for the filtering story. No server. ~25s.
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
const SKETCH    = resolve(ROOT, '_private', '_sketches', 'stats-sketch.html');
const FILTER_PROTOTYPE = resolve(ROOT, '_private', '_sketches', 'filter-prototype.html');
const DEV_BASE  = process.env.DEV_BASE || 'http://localhost:3000';

// ── Orientation mode ──────────────────────────────────────────────
// --mobile (or MOBILE=1) records the VERTICAL 9:16 cut for phones/Reels/
// LinkedIn-mobile instead of the default 16:9 landscape. It changes four
// things: a phone-width viewport (so the site renders its real mobile layout —
// hamburger nav, stacked tiles, the filters-in-a-drawer pattern), a 1080×1920
// output, a touch-dot cursor instead of the desktop arrow, and the reviews
// flow drives the mobile filter DRAWER rather than the (desktop-only) sidebar.
// Mobile output is written to a parallel _demo-videos/mobile/ dir so it never
// clobbers the landscape set.
const MOBILE = process.argv.includes('--mobile') || process.env.MOBILE === '1';

const OUT = MOBILE
  ? resolve(ROOT, '_private', '_demo-videos', 'mobile')
  : resolve(ROOT, '_private', '_demo-videos');
const OUT_REL = MOBILE ? '_private/_demo-videos/mobile' : '_private/_demo-videos';

// Capture geometry. Two Playwright video quirks shape this:
//   1. Video is recorded at the CSS-VIEWPORT resolution; deviceScaleFactor adds
//      no video pixels, and a recordVideo.size LARGER than the viewport pads
//      (frame top-left on a grey canvas) rather than upscaling.
//   2. If recordVideo.size is omitted, it defaults to the viewport scaled to
//      fit within 800×800 (so a 540×960 viewport would cap to 450×800).
// So we set size EQUAL to the mobile viewport (540×960) — source==size fills 1:1
// with no cap and no pad — then the mp4 step and stitcher upscale 2× to
// 1080×1920. 540 is under the 768px `md` breakpoint (mobile layout renders) yet
// wide enough that the 2× upscale stays crisp. Landscape is unchanged.
const VIEWPORT     = MOBILE ? { width: 540, height: 960 } : { width: 1280, height: 720 };
const VIDEO_SIZE   = MOBILE ? { width: 540, height: 960 } : { width: 1280, height: 720 };
// A 2× device scale supersamples the mobile render, so the frames Playwright
// downsamples into the 540×960 video have cleaner text edges before the upscale.
const DEVICE_SCALE = MOBILE ? 2 : 1;

// Scroll pace is a constant VELOCITY in pixels/second, applied uniformly to
// every clip — so a tall page and a short page scroll at the SAME visible
// speed. (The previous model set a fixed duration per scroll regardless of
// page height, which made tall pages race and short pages crawl — that's why
// the sketch looked faster than the production pages.) Tune the feel here:
// 300 px/sec ≈ the approved production-page pace (stats scrolled ~331 px/sec
// in the version Malcolm signed off on), rounded down a hair for readability.
// Pages here run 2,600–6,300px tall, so at this pace a clip takes as long as
// its page needs — which is fine; the point is a CONSISTENT, readable pace.
// Mobile clips are standalone social posts — no narration, and a viewer scrolls
// past in a second if they don't see value fast. So the mobile pace is brisker
// than the signed-off desktop pace, and (below) a per-clip PAN CAP keeps even a
// very tall page inside a ~15–20s clip: we show a representative pass, not an
// exhaustive crawl to the footer. The constant-velocity model is unchanged.
const SCROLL_SPEED    = MOBILE ? 480 : 300;   // px/sec — downward page pans (the main pace)
const SCROLL_SPEED_UP = MOBILE ? 700 : 520;   // px/sec — return-to-top, a brisk rewind
const SIDEBAR_SPEED   = MOBILE ? 240 : 170;   // px/sec — internal filter list tour (text-dense, slower reads)

// Default cap on a mobile page pan, in seconds (distance = speed × cap). Tall
// pages show their top ~cap-seconds of content rather than the whole page, so a
// 9,600px stats page still fits a short social clip. Individual pans can pass a
// shorter `maxSeconds` (e.g. the already-narrowed post-filter grids). No cap on
// desktop.
const MOBILE_PAN_CAP_SECONDS = 11;

// The address-pill (injectUrlBar) is the visible proof of the p46 thesis —
// filter state is a shareable URL. It's reveal-on-change, not a persistent
// overlay, and only appears on the reviews-discovery clips. Flip to false to
// drop it entirely.
const SHOW_URL_BAR = true;

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
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/films/stats`),
  },
  {
    id:    '03',
    name:  'television-stats',
    label: '/television/stats — final production page',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/television/stats`),
  },
  {
    id:    '04',
    name:  'films-reviews-discovery',
    label: '/films/reviews — faceting as discovery, URL accretes on camera',
    record: (page) => recordReviewsDiscovery(page, {
      url:    `${DEV_BASE}/films/reviews`,
      chip:   '.film-filter-chip',
      accent: '#f97316',                       // film cluster orange
      drawerId: 'films-filter-drawer',         // mobile: filters live behind this drawer
      // Human-legible facets tried first so the querystring reads well;
      // the helper falls back to any unpressed chip if a label is absent.
      picks:  ['Horror', 'Drama', 'A24', '1980s', '1990s', 'Comedy'],
    }),
  },
  {
    id:    '05',
    name:  'lists-hub',
    label: '/films/lists — year 2×2 hub + detail page',
    record: (page) => recordListsFlow(page, DEV_BASE),
  },
  {
    id:    '06',
    name:  'television-reviews-discovery',
    label: '/television/reviews — faceting as discovery, URL accretes (TV slice)',
    record: (page) => recordReviewsDiscovery(page, {
      url:    `${DEV_BASE}/television/reviews`,
      chip:   '.show-filter-chip',
      accent: '#3b82f6',                       // television cluster blue
      drawerId: 'television-filter-drawer',    // mobile: filters live behind this drawer
      picks:  ['Drama', 'HBO', 'Netflix', 'Limited', 'Comedy', '2010s'],
    }),
  },
  {
    id:    '07',
    name:  'filter-prototype',
    label: 'filter-prototype.html — hand-built filterable dashboard (no server)',
    record: recordFilterPrototype,
  },
  {
    id:    '08',
    name:  'films-stats-handoff',
    label: '/films/stats → click a chart bar through to the filtered reviews',
    record: (page) => recordStatsHandoff(page, {
      statsUrl:     `${DEV_BASE}/films/stats`,
      reviewsMatch: '/films/reviews?',
      accent:       '#f97316',                 // film cluster orange
      // Legible studio labels first so the carried URL reads like a sentence
      // (?studio=a24); falls back to any reviews deep-link if none are present.
      picks:        ['A24', 'Neon', 'Universal Pictures', 'Warner Bros. Pictures', 'Blumhouse Productions'],
    }),
  },
  {
    id:    '09',
    name:  'television-stats-handoff',
    label: '/television/stats → click a chart bar through to the filtered reviews',
    record: (page) => recordStatsHandoff(page, {
      statsUrl:     `${DEV_BASE}/television/stats`,
      reviewsMatch: '/television/reviews?',
      accent:       '#3b82f6',                 // television cluster blue
      picks:        ['Netflix', 'Disney', 'Apple', 'Amazon', 'Paramount', 'Warner Bros. Discovery'],
    }),
  },
  {
    id:    '10',
    name:  'connected-stats',
    label: '/stats/connected — the cross-brand film × TV dashboard',
    // Same slow-pan treatment as the per-cluster dashboards; its tiles pool
    // both libraries and (by design) don't deep-link out, so there's no
    // handoff here — it's the honest-limits coda for p42 and the tour's close.
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/stats/connected`),
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

// ── Mobile clip set (standalone 15–20s social clips) ─────────────────
// The vertical deliverable is NOT the desktop set. It's a sequence of short,
// self-contained clips that tour the site — production surfaces only (no
// sketches), no continuous tour, no stitched posts. Ordered as a natural
// walkthrough: films (landing → reviews → dashboard → handoff → lists), then
// television (landing → dashboard → handoff), closing on the connected view.
// Reuses the shared record fns, which are mobile-aware (cursorless taps, tight
// holds, capped pans). Used instead of CLIPS whenever --mobile is set.
const MOBILE_CLIPS = [
  { id: '01', name: 'films-landing',      label: '/films — landing',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/films`) },
  { id: '02', name: 'films-reviews',      label: '/films/reviews — faceting as discovery',
    record: (page) => recordReviewsDiscovery(page, {
      url: `${DEV_BASE}/films/reviews`, chip: '.film-filter-chip',
      accent: '#f97316', drawerId: 'films-filter-drawer',
      picks: ['Horror', 'Drama', 'A24', '1980s', '1990s', 'Comedy'] }) },
  { id: '03', name: 'films-stats',        label: '/films/stats — the dashboard',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/films/stats`) },
  { id: '04', name: 'films-handoff',      label: '/films/stats → filtered reviews (the "leave it" beat)',
    record: (page) => recordStatsHandoff(page, {
      statsUrl: `${DEV_BASE}/films/stats`, reviewsMatch: '/films/reviews?', accent: '#f97316',
      picks: ['A24', 'Neon', 'Universal Pictures', 'Warner Bros. Pictures', 'Blumhouse Productions'] }) },
  { id: '05', name: 'films-lists',        label: '/films/lists — the editorial 2×2',
    record: (page) => recordListsFlow(page, DEV_BASE) },
  { id: '06', name: 'television-landing', label: '/television — landing',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/television`) },
  { id: '07', name: 'television-stats',   label: '/television/stats — the dashboard',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/television/stats`) },
  { id: '08', name: 'television-handoff', label: '/television/stats → filtered reviews',
    record: (page) => recordStatsHandoff(page, {
      statsUrl: `${DEV_BASE}/television/stats`, reviewsMatch: '/television/reviews?', accent: '#3b82f6',
      picks: ['Netflix', 'Disney', 'Apple', 'Amazon', 'Paramount', 'Warner Bros. Discovery'] }) },
  { id: '09', name: 'connected',          label: '/stats/connected — the cross-brand close',
    record: (page) => recordSurfacePan(page, `${DEV_BASE}/stats/connected`) },
];

// ── CLI args ──────────────────────────────────────────────────────

const wantTour = process.argv.includes('--tour');

const clipFlag = process.argv.find((a) => a.startsWith('--clip'));
const clipId   = clipFlag
  ? (clipFlag.includes('=')
      ? clipFlag.split('=')[1]
      : process.argv[process.argv.indexOf(clipFlag) + 1])
  : null;

// Mobile records the standalone social clip set (MOBILE_CLIPS). On desktop,
// --tour wins, then --clip=NN, otherwise the full feature set.
const clipSet = MOBILE ? MOBILE_CLIPS : CLIPS;
const toRun = (!MOBILE && wantTour)
  ? [TOUR]
  : (clipId ? clipSet.filter((c) => c.id === clipId) : clipSet);

if (toRun.length === 0) {
  console.error(`  No clip with id "${clipId}". Available: ${clipSet.map((c) => c.id).join(', ')}${MOBILE ? '' : ' (or --tour)'}`);
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────

await mkdir(OUT, { recursive: true });

// Headless by default for unattended capture. Set HEADED=1 to watch the
// recording happen in a visible window (handy when tuning selectors).
const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });

console.log(`\n  Recording ${toRun.length} clip(s) → ${OUT_REL}/\n`);

for (const clip of toRun) {
  console.log(`  ▶ ${clip.id} · ${clip.label}`);

  // Per-clip temp dir keeps Playwright's UUID-named webm isolated so
  // the rename step never picks up a file from a previous clip.
  const tmpDir = resolve(OUT, `_tmp-${clip.id}`);
  await mkdir(tmpDir, { recursive: true });

  const context = await browser.newContext({
    // Landscape: 1280×720 (16:9). Mobile: 432×768 (9:16) at 2.5× scale →
    // 1080×1920 device pixels, matching VIDEO_SIZE for a crisp 1:1 capture.
    viewport:         VIEWPORT,
    // size == viewport → the video fills 1:1 (no 800px cap, no pad). Mobile is
    // upscaled to 1080×1920 later; landscape is already final at 1280×720.
    recordVideo:      { dir: tmpDir, size: VIDEO_SIZE },
    deviceScaleFactor: DEVICE_SCALE,
    // NOTE: we deliberately do NOT set Playwright's `isMobile` emulation. The
    // site's mobile layout (hamburger nav, stacked tiles, filters-in-a-drawer)
    // is driven purely by CSS width media queries (`md` = 768px), which the
    // sub-768 viewport already triggers — no touch/UA emulation needed.
    // Every clip records in dark mode for a consistent look across the set.
    // colorScheme flips the media query; stagePrep also seeds next-themes'
    // localStorage so surfaces that read the stored choice commit to dark too.
    colorScheme:      'dark',
  });

  // Runs before any page script on every navigation: forces dark, hides the
  // Next.js dev-tools indicator, and installs a visible cursor for hovers
  // (a desktop arrow, or a touch-dot in mobile mode).
  await context.addInitScript(stagePrep, { mobile: MOBILE });

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
    console.log(`     ✓ ${OUT_REL}/${clip.id}-${clip.name}.webm`);
  } else {
    console.warn(`     ⚠ No webm written for clip ${clip.id} — check Playwright output above.`);
    await rm(tmpDir, { recursive: true });
  }
}

await browser.close();

console.log(`
  Done. Convert to mp4:

    cd ${OUT_REL}${MOBILE ? `
    # Vertical clips record at native 540×960; upscale to 1080×1920 here.
    for f in *.webm; do
      ffmpeg -i "$f" -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 20 -pix_fmt yuv420p "\${f%.webm}.mp4"
    done

  That's the full vertical set — standalone clips ready to post in sequence.` : `
    for f in *.webm; do
      ffmpeg -i "$f" -c:v libx264 -crf 20 -pix_fmt yuv420p "\${f%.webm}.mp4"
    done

  Then copy finished mp4s to public/demo/ and reference them in <VideoClip>.`}
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
  await page.waitForTimeout(2200);
  await primePage(page);

  // Hold on the Films dashboard at rest so the viewer can read the layout.
  await page.waitForTimeout(1500);

  // Deliberately hover the TV toggle before switching, so the affordance reads.
  const tvBtn = page.locator('.toggle button').nth(1);
  if (await tvBtn.count() > 0) {
    await glideTo(page, tvBtn, { pause: 700 });
    await tvBtn.click();
    await page.waitForTimeout(1600);
  }

  // Hover, then toggle back to Films.
  const filmsBtn = page.locator('.toggle button').first();
  if (await filmsBtn.count() > 0) {
    await glideTo(page, filmsBtn, { pause: 600 });
    await filmsBtn.click();
    await page.waitForTimeout(1400);
  }

  // Slow pan through the whole prototype and back.
  await slowScrollThrough(page, { holdTop: 800 });
}

/**
 * Single-surface pan — stats dashboards (/films/stats, /television/stats,
 * /stats/connected) and, on mobile, the landing pages (/films, /television).
 * Opens the page, holds briefly on the hero, then pans through the content.
 * Desktop keeps its original stats behaviour (longer hero hold + a filter-bar
 * attention hover); mobile is tighter and cursorless, and the pan is distance-
 * capped (see slowScrollThrough) so a tall page still fits a short social clip.
 */
async function recordSurfacePan(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await primePage(page);
  // Lead with the hero, but only briefly on mobile — a social viewer won't wait.
  await page.waitForTimeout(MOBILE ? 1000 : 2200);

  // Desktop draws the eye to the filter affordance first; mobile skips it (no
  // cursor to move, and this fn also serves landing pages with no filter bar).
  if (!MOBILE) {
    await glideTo(page, page.locator('.stats-filter-bar button').first(), { pause: 900 });
  }

  // Forward-only representative pan (mobile caps the distance).
  await slowScrollThrough(page, {
    holdTop: MOBILE ? 0 : 700, holdBottom: MOBILE ? 800 : 1300, returnToTop: false,
  });
}

/**
 * Clicks a chart-bar deep-link on the CURRENT stats dashboard through to the
 * filtered reviews page, following the client-side navigation. Shared by the
 * handoff clips (08/09) and the full tour — it's the visual proof that the
 * dashboard figures are live links into the reviews, not dead decoration.
 *
 * Picks a target by preferred label first (a known studio / network) so the
 * resulting URL reads legibly, falling back to any reviews deep-link. Pans
 * the window so the chosen bar sits ~38% down the viewport (enough dashboard
 * visible above it to read) before gliding the cursor over and clicking.
 *
 * Returns true if it clicked through, false if this snapshot had no
 * reviews deep-link to click (so callers can degrade gracefully).
 */
async function clickStatsTileThrough(page, { reviewsMatch, picks = [], parkFraction = 0.38 }) {
  // Choose the click target: prefer a human-legible bar label, else the first
  // reviews deep-link anywhere in the dashboard tiles.
  let target = null;
  for (const label of picks) {
    const a = page.locator(`.stats-tile a[href*="${reviewsMatch}"]`, { hasText: label }).first();
    if (await a.count() > 0) { target = a; break; }
  }
  if (!target) {
    const any = page.locator(`.stats-tile a[href*="${reviewsMatch}"]`).first();
    if (await any.count() > 0) target = any;
  }
  if (!target) return false;

  // Smooth-pan down so the bar is comfortably in frame (constant pace), then
  // glide the cursor to it so the click reads as deliberate rather than a cut.
  const handle = await target.elementHandle();
  const targetY = await handle.evaluate((el, pf) => {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.round(window.scrollY + rect.top - window.innerHeight * pf));
  }, parkFraction);
  const startY = await page.evaluate(() => window.scrollY);
  const dist = Math.abs(targetY - startY);
  if (dist > 4) await smoothScrollWindow(page, targetY, (dist / SCROLL_SPEED) * 1000);
  await page.waitForTimeout(MOBILE ? 400 : 600);

  // Desktop glides the cursor over the bar so the click reads as deliberate;
  // mobile just brings it into frame and taps it (cursorless, no hover).
  if (MOBILE) {
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
  } else {
    await glideTo(page, target, { pause: 1000 });
  }
  // Start listening for the reviews URL before the click fires; the deep-link
  // is a client-side Link nav, so we wait on the pathname, not a full load.
  await Promise.all([
    page.waitForURL((u) => u.pathname.includes('/reviews'), { timeout: 15_000 }).catch(() => {}),
    MOBILE ? target.dispatchEvent('click') : target.click(),
  ]);
  await page.waitForTimeout(400);
  return true;
}

/**
 * Clips 08 and 09 — the stats-dashboard → filtered-reviews handoff.
 *
 * This is the p42 thesis ("I built a dashboard whose job is to get you to
 * leave it"): the numbers on the dashboard aren't a destination, they're the
 * top of a funnel. We pan down through the dashboard so its richness reads,
 * click a labelled chart bar — a studio on film, a network owner on TV — and
 * land on the reviews filtered to exactly that slice, with the carried filter
 * visible in the injected address pill (the seam held; no re-selecting).
 *
 * `cfg`: { statsUrl, reviewsMatch (href substring for a reviews deep-link),
 * accent (cluster hue for the pill), picks (preferred bar labels in order). }
 */
async function recordStatsHandoff(page, cfg) {
  await page.goto(cfg.statsUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await primePage(page);
  // Hold on the hero so the dashboard title and sub-brand color read first
  // (shorter on mobile — lead with value fast).
  await page.waitForTimeout(MOBILE ? 1000 : 2200);

  // Desktop draws the eye to the filter affordance; mobile is cursorless.
  if (!MOBILE) {
    await glideTo(page, page.locator('.stats-filter-bar button').first(), { pause: 800 });
  }

  const clicked = await clickStatsTileThrough(page, {
    reviewsMatch: cfg.reviewsMatch,
    picks: cfg.picks,
  });
  if (!clicked) {
    // No deep-link tile in this snapshot — degrade to a plain dashboard pan
    // so the clip still records something coherent instead of throwing.
    await slowScrollThrough(page, { holdTop: MOBILE ? 0 : 700, holdBottom: MOBILE ? 800 : 1300, returnToTop: false });
    return;
  }

  // We're on the filtered reviews page now. Prime it, reveal the address pill
  // (its querystring IS the carried filter — the proof the handoff kept the
  // selection intact), hold so it reads, then pan the narrowed grid.
  await primePage(page);
  await injectUrlBar(page, cfg.accent);
  await page.waitForTimeout(MOBILE ? 2000 : 2600);
  // Mobile keeps the landed-grid pan short (the handoff already ran long with
  // the dashboard pan + click-through) so the whole clip stays ~20s.
  await slowScrollThrough(page, {
    holdTop: MOBILE ? 0 : 500, holdBottom: MOBILE ? 800 : 1300, returnToTop: false,
    ...(MOBILE ? { maxSeconds: 6 } : {}),
  });
}

/**
 * Clips 04 and 06 — the reviews pages as a discovery surface.
 *
 * This is the p46 story ("a review nobody can find is a review nobody
 * reads"): faceting the grid narrows the result set AND accretes a
 * shareable querystring. Because Playwright records the page viewport,
 * not the browser chrome, we inject a mono URL strip (injectUrlBar) so
 * the growing address is visible on camera — that's the whole point.
 *
 * `cfg`: { url, chip (CSS class), accent (cluster hue), picks (preferred
 * facet labels, tried in order; falls back to any unpressed chip). }
 */
async function recordReviewsDiscovery(page, cfg) {
  await page.goto(cfg.url, { waitUntil: 'networkidle', timeout: 30_000 });
  await primePage(page);

  // ── Mobile: the sidebar doesn't exist below 768px — filters live in a
  // full-screen drawer. So the choreography differs: show the clean grid, open
  // the drawer and tour/tap the filter vocabulary inside it, close it, THEN
  // reveal the accreted address over the narrowed grid. (The per-tap URL flash
  // makes no sense while a full-screen drawer covers the page, so we surface the
  // shareable address once, after closing — the mobile-honest version of the
  // "every slice is an address" beat.)
  if (MOBILE) {
    await page.waitForTimeout(1000);   // brief hold on the full, unfiltered grid
    // Tighter for a standalone social clip: 2 facets, and skip the internal
    // vocabulary scroll — the open drawer already reveals the filter chips.
    // Cursorless taps throughout (driveMobileFilters).
    const applied = await driveMobileFilters(page, {
      drawerId: cfg.drawerId, chip: cfg.chip, picks: cfg.picks, count: 2, tourVocab: false,
    });
    await page.waitForTimeout(500);
    if (applied > 0) {
      // Inject the pill AFTER filtering so its first paint is the full accreted
      // querystring (?genre=…&studio=…&decade=…) — the shareable slice.
      await injectUrlBar(page, cfg.accent);
      await page.waitForTimeout(2000);
    }
    // No attention-hover on mobile — a short pan of the already-narrowed grid
    // (it's short, and the point's been made; keep the clip punchy).
    await slowScrollThrough(page, { holdTop: 300, holdBottom: 800, returnToTop: false, maxSeconds: 6 });
    return;
  }

  await injectUrlBar(page, cfg.accent);
  // Hold on the full, unfiltered grid so the clean path reads first.
  await page.waitForTimeout(2400);

  // First bring the panel + grid fully into frame (scroll the hero off the
  // top so the sticky sidebar pins under the nav) — THEN tour the filters.
  await bringFiltersIntoView(page);
  await page.waitForTimeout(900);

  // Show off the whole filter vocabulary: the sidebar is sticky with its own
  // overflow, so scroll it internally top→bottom so every dimension (genre,
  // studio/network, decade, …) is visible on camera. Forward-only; the
  // chip-picks below scroll their target back into view.
  await scrollElement(page, 'aside[aria-label="Filter and sort"]', { holdTop: 500, returnToTop: false });

  let applied = 0;

  // Hover the chip (so its state reads) before clicking it — deliberate,
  // not a jump-cut — then let the grid re-query and the URL pill repaint.
  const clickChip = async (chip) => {
    await glideTo(page, chip, { pause: 650 });
    await chip.click();
    applied++;
    await page.waitForTimeout(1600);
  };

  // Prefer human-legible facets so the querystring reads like a sentence
  // (genre, then studio/network, then decade) rather than random slugs.
  for (const label of cfg.picks) {
    if (applied >= 3) break;
    const chip = page
      .locator(`${cfg.chip}:not([aria-pressed="true"])`, { hasText: label })
      .first();
    if (await chip.count() > 0) await clickChip(chip);
  }

  // If none of the preferred labels were present in this data snapshot,
  // fall back to any unpressed chips so the clip still shows accretion.
  while (applied < 3) {
    const chip = page.locator(`${cfg.chip}:not([aria-pressed="true"])`).first();
    if (await chip.count() === 0) break;
    await clickChip(chip);
  }

  // Hover a surviving result so the narrowed set reads as browsable, then
  // pan the whole (short) grid so the shrunken result count is legible.
  // Forward-only (ends on the narrowed grid, footer capped out of frame).
  await glideTo(page, page.locator('main a[href*="/reviews/"], main article a, main a img').first(), { pause: 800 });
  await slowScrollThrough(page, { holdTop: 700, returnToTop: false });
}

/**
 * Injects a floating "address pill" that mirrors the live URL — the visible
 * proof of the p46 thesis that a filtered slice is a shareable address.
 *
 * Reveal-on-change, not a persistent overlay. Filter clicks update the URL
 * via client-side routing (no reload); a 120ms poll notices the change,
 * fades the pill in with the new ?genre=…&network=…&decade=… querystring,
 * holds ~1.7s, then fades it back out. So the clip isn't covered by a
 * standing sticker — the pill only punctuates each filter click to land the
 * point, then gets out of the way. `accent` matches the cluster hue.
 *
 * Gated on SHOW_URL_BAR and only wired into the reviews-discovery clips.
 */
async function injectUrlBar(page, accent = '#f5b301') {
  if (!SHOW_URL_BAR) return;
  await page.evaluate(({ accent, mobile }) => {
    if (document.getElementById('__demo_url_bar')) return;
    const bar = document.createElement('div');
    bar.id = '__demo_url_bar';
    Object.assign(bar.style, {
      position: 'fixed', left: '50%',
      // Landscape parks the pill at the bottom. Mobile pins it just under the
      // sticky nav (~69px) instead — the bottom edge is where the filter
      // drawer's "Show N" CTA lives, and a top pill reads like a phone address
      // bar anyway. Type/padding shrink to fit the 432px-wide frame.
      ...(mobile
        ? { top: '80px', maxWidth: 'calc(100vw - 24px)', gap: '8px',
            font: '600 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
            padding: '9px 13px' }
        : { bottom: '30px', maxWidth: 'calc(100vw - 56px)', gap: '10px',
            font: '600 16px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
            padding: '12px 18px' }),
      transform: 'translateX(-50%)',
      zIndex: '2147483646', pointerEvents: 'none',
      display: 'flex', alignItems: 'center',
      color: '#f7f7f8', background: 'rgba(12,12,14,0.92)',
      borderRadius: '12px',
      border: `2px solid ${accent}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis',
      opacity: '0', transition: 'opacity .32s ease',
    });
    // A small accent dot reads the pill as an address bar; the text is the
    // live path, ellipsized on its own so the dot never clips.
    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '9px', height: '9px', borderRadius: '50%',
      background: accent, flex: '0 0 auto',
    });
    const text = document.createElement('span');
    Object.assign(text.style, { overflow: 'hidden', textOverflow: 'ellipsis' });
    bar.append(dot, text);
    document.body.appendChild(bar);

    // Reveal the pill, then schedule its fade-out. Each new change resets the
    // timer so a rapid sequence of clicks keeps it up until things settle.
    const reveal = () => {
      bar.style.opacity = '1';
      clearTimeout(window.__demo_url_hide);
      window.__demo_url_hide = setTimeout(() => { bar.style.opacity = '0'; }, 1700);
    };
    let last = '';
    const paint = () => {
      const u = new URL(location.href);
      const cur = 'malxavi.com' + u.pathname + (u.search || '');
      if (cur === last) return;      // only surface on an actual URL change
      last = cur;
      text.textContent = cur;
      reveal();
    };
    paint(); // reveal the base address once on load, then it fades
    window.__demo_url_timer = setInterval(paint, 120);
  }, { accent, mobile: MOBILE });
}

/**
 * Clip 07 — the hand-built filterable-dashboard prototype (local file,
 * no server). The prototype→product "before" for the filtering story:
 * a films / TV / connected toggle with tiles that recompute per lens.
 * Filter chips inside it are JS-generated with no stable selectors, so
 * we drive the reliable static [data-view] toggle instead.
 */
async function recordFilterPrototype(page) {
  await page.goto(`file://${FILTER_PROTOTYPE}`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for Google Fonts (the prototype links to fonts.googleapis.com).
  await page.waitForTimeout(2000);
  await primePage(page);

  // Hold on the Films lens at rest so the layout reads.
  await page.waitForTimeout(2200);

  // Walk the three lenses so the viewer sees the tiles recompute per view;
  // hover each toggle first so the switch reads as deliberate.
  for (const view of ['tv', 'connected', 'films']) {
    const btn = page.locator(`[data-view="${view}"]`);
    if (await btn.count() > 0) {
      await glideTo(page, btn, { pause: 650 });
      await btn.click();
      await page.waitForTimeout(1700);
    }
  }

  // Slow pan through the whole prototype and back.
  await slowScrollThrough(page, { holdTop: 700 });
}

/**
 * Clip 05 — /films/lists year 2×2 hub, then a detail page.
 */
async function recordListsFlow(page, base) {
  await page.goto(`${base}/films/lists`, { waitUntil: 'networkidle', timeout: 30_000 });
  await primePage(page);
  await page.waitForTimeout(MOBILE ? 1000 : 2000);

  // Pan the hub so the 2×2 grid reads as a deliberate editorial structure
  // (forward-only; footer capped; mobile caps the distance too).
  await slowScrollThrough(page, { holdTop: MOBILE ? 0 : 700, holdBottom: MOBILE ? 600 : 1300, returnToTop: false });

  // Open the first list card to reveal the ranked detail page — desktop hovers
  // then clicks; mobile taps it cursorlessly and waits for the route change.
  const firstCard = page.locator('a[href*="/films/lists/"]').first();
  if (await firstCard.count() > 0) {
    if (MOBILE) {
      await firstCard.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
      await Promise.all([
        page.waitForURL((u) => /\/films\/lists\/.+/.test(u.pathname), { timeout: 15_000 }).catch(() => {}),
        firstCard.dispatchEvent('click'),
      ]);
    } else {
      await glideTo(page, firstCard, { pause: 800 });
      await firstCard.click();
      await page.waitForLoadState('networkidle');
    }
    await primePage(page);
    await page.waitForTimeout(MOBILE ? 1000 : 1800);
    await slowScrollThrough(page, { holdTop: MOBILE ? 0 : 700, holdBottom: MOBILE ? 800 : 1300, returnToTop: false });
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
  // Per-scene pan: constant-velocity, full-height, forward-only
  // (returnToTop:false) so the tour keeps moving without backtracking.
  const pan = (o = {}) => slowScrollThrough(page, {
    holdTop: 1400, holdBottom: 900, returnToTop: false, ...o,
  });

  // Navigate + prime in one step so every scene's images are decoded before
  // the pan starts — that's what keeps the tour's pace constant instead of
  // stalling (and appearing to speed up) in the image-heavy middle of a page.
  const goScene = async (path) => {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    await primePage(page);
  };

  // Scene 1 — Films landing. Establish the brand, then pan the modules.
  await goScene('/films');
  await pan({ holdTop: 2200 });

  // Scene 2 — Films reviews. Show the filter vocabulary, then apply one facet.
  await goScene('/films/reviews');
  await page.waitForTimeout(1800);
  if (MOBILE) {
    // No sidebar below 768px — open the filter drawer, apply one facet, close.
    await driveMobileFilters(page, {
      drawerId: 'films-filter-drawer', chip: '.film-filter-chip',
      picks: ['Horror', 'Drama', 'A24'], count: 1, tourVocab: true,
    });
  } else {
    await bringFiltersIntoView(page);
    await page.waitForTimeout(700);
    await scrollElement(page, 'aside[aria-label="Filter and sort"]', { holdTop: 400, returnToTop: false });
    const chip = page.locator('.film-filter-chip:not([aria-pressed="true"])').first();
    if (await chip.count() > 0) {
      await glideTo(page, chip, { pause: 600 });
      await chip.click();
      await page.waitForTimeout(1400);
    }
  }
  await pan();

  // Scene 3 — Films stats. The "after" of the prototype-to-product arc.
  await goScene('/films/stats');
  await pan();

  // Scene 3b — the handoff: click a chart bar through to the filtered reviews,
  // so the tour actually shows the dashboard→reviews click-through (not just
  // the two surfaces side by side). Pan the narrowed grid on arrival.
  const clickedThrough = await clickStatsTileThrough(page, {
    reviewsMatch: '/films/reviews?',
    picks: ['A24', 'Neon', 'Universal Pictures', 'Warner Bros. Pictures', 'Blumhouse Productions'],
  });
  if (clickedThrough) {
    await primePage(page);
    await pan({ holdTop: 1200 });
  }

  // Scene 4 — Films lists. The editorial 2×2 matrix.
  await goScene('/films/lists');
  await pan();

  // Scene 5 — Television landing. Pivot to the TV sub-brand.
  await goScene('/television');
  await pan();

  // Scene 6 — Television stats. The TV-blue dashboard.
  await goScene('/television/stats');
  await pan();

  // Scene 7 — Connected film × TV. The one surface that pools both libraries;
  // the tour's closing frame (p41 direction: "end on the connected view").
  await goScene('/stats/connected');
  await pan({ holdBottom: 1600 });            // final resting frame
}

// ── Utility ───────────────────────────────────────────────────────

/**
 * Glides the mouse to the center of `target` (a selector string or a
 * Locator) over several steps so the injected cursor visibly travels
 * there, then holds. Every hover in the demos goes through this — it's
 * how we're intentional about where attention lands. Guarded: a missing
 * or off-screen target is a no-op, never a throw.
 */
async function glideTo(page, target, { steps = 26, pause = 800 } = {}) {
  const loc = typeof target === 'string' ? page.locator(target).first() : target;
  try {
    if ((await loc.count()) === 0) return false;
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    if (!box) return false;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
    await page.waitForTimeout(pause);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mobile activation: the cursorless equivalent of glideTo-then-click. A phone
 * has no pointer, so we must NOT move a mouse (that would draw the synthetic
 * cursor and trigger a :hover state — the exact "hover elements in view" we're
 * avoiding). Instead we bring the target into frame and dispatch a real click
 * event directly on it — no pointer travel, no hover. `pre` lets the scroll
 * settle before the tap; `post` is the beat after (state change reads on
 * camera). Guarded: a missing/detached target is a no-op, never a throw.
 */
async function tap(page, target, { pre = 150, post = 500 } = {}) {
  const loc = typeof target === 'string' ? page.locator(target).first() : target;
  try {
    if ((await loc.count()) === 0) return false;
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    if (pre) await page.waitForTimeout(pre);
    await loc.dispatchEvent('click');
    if (post) await page.waitForTimeout(post);
    return true;
  } catch {
    return false;
  }
}

/**
 * Smoothly scrolls the window to an absolute Y over `duration` ms using a
 * requestAnimationFrame loop *inside the page*. The browser renders every
 * intermediate frame, so the recording captures continuous motion — where a
 * fixed-step scrollTo loop produced visible chunky jumps. Linear velocity
 * keeps the traversal pace constant (matching the approved pace).
 */
async function smoothScrollWindow(page, targetY, duration) {
  await page.evaluate(({ targetY, duration }) => new Promise((resolve) => {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2 || duration <= 0) { window.scrollTo(0, targetY); resolve(); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, startY + dist * t);
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  }), { targetY, duration });
}

/**
 * Same rAF smooth-scroll, but drives an element's internal scrollTop (the
 * sticky filter sidebar, which owns its own overflow).
 */
async function smoothScrollElement(page, selector, targetTop, duration) {
  await page.evaluate(({ selector, targetTop, duration }) => new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (!el) { resolve(); return; }
    const startTop = el.scrollTop;
    const dist = targetTop - startTop;
    if (Math.abs(dist) < 2 || duration <= 0) { el.scrollTop = targetTop; resolve(); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.scrollTop = startTop + dist * t;
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  }), { selector, targetTop, duration });
}

/**
 * Forces every image to fully load and DECODE without moving the viewport, so
 * the recorded scroll never stutters when it reaches an image-heavy region
 * (the poster grids). This is what fixes the "speeds up halfway" artifact:
 *   • img.decode() initiates the load for native-lazy images and resolves
 *     only once the bitmap is ready — so no mid-scroll decode jank stalls the
 *     rAF loop and makes it jump to catch up.
 *   • With all images loaded, the document height is final BEFORE we measure
 *     the scroll distance, so a constant-velocity pan can't drift.
 * Flipping loading→eager belt-and-suspenders the below-fold images. Failures
 * (an <img> with no resolvable src yet) are swallowed.
 */
async function primePage(page) {
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    for (const img of imgs) {
      try { img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); } catch { /* detached */ }
    }
    await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : null)));
  });
  // Let any newly-kicked-off requests settle so the measured height is stable.
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(200);
}

/**
 * Brings the reviews filter panel + results grid fully into frame before we
 * tour the sidebar: scroll the window down so the sticky sidebar pins just
 * under the nav (the hero scrolls off the top). Constant-velocity like every
 * other scroll, just a touch quicker since it's a reposition, not a reveal.
 */
async function bringFiltersIntoView(page) {
  const { targetY, startY } = await page.evaluate(() => {
    const startY = window.scrollY;
    const aside = document.querySelector('aside[aria-label="Filter and sort"]');
    if (!aside) return { targetY: Math.round(window.innerHeight * 0.55), startY };
    const rect = aside.getBoundingClientRect();
    // 80px ≈ the sticky nav offset (top:5rem) the sidebar pins beneath.
    return { targetY: Math.max(0, Math.round(startY + rect.top - 80)), startY };
  });
  const dist = Math.abs(targetY - startY);
  await smoothScrollWindow(page, targetY, Math.max(600, (dist / 320) * 1000));
}

/**
 * Scrolls smoothly through the page at a CONSTANT VELOCITY (SCROLL_SPEED
 * px/sec), so every clip scrolls at the same visible pace regardless of page
 * height. Distance drives the duration, not the other way around. Set
 * returnToTop:false to end at the bottom.
 *
 * stopBeforeFooter (default true) caps the scroll just above the site
 * <footer> so the pan ends on the last real content — we don't narrate the
 * privacy/disclaimer boilerplate, so showing it is just time and noise.
 */
async function slowScrollThrough(page, opts = {}) {
  const {
    holdTop = 1500, holdBottom = 1300, returnToTop = true, stopBeforeFooter = true,
    speed = SCROLL_SPEED, speedUp = SCROLL_SPEED_UP,
    maxSeconds,   // mobile-only per-pan cap override (default MOBILE_PAN_CAP_SECONDS)
  } = opts;

  await page.waitForTimeout(holdTop);

  // Real scrollable distance = full document height − one viewport, then
  // capped so the footer never enters frame (when stopBeforeFooter). Measured
  // AFTER primePage, so all images are loaded and the height is final.
  let maxY = await page.evaluate((stopBeforeFooter) => {
    const doc = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
    ) - window.innerHeight;
    if (!stopBeforeFooter) return doc;
    const footer = document.querySelector('footer');
    if (!footer) return doc;
    const footerTop = footer.getBoundingClientRect().top + window.scrollY;
    return Math.min(doc, Math.max(0, footerTop - window.innerHeight));
  }, stopBeforeFooter);

  // Mobile: cap the pan distance so a very tall page still fits a short social
  // clip — a representative pass, not an exhaustive crawl. Velocity is unchanged
  // (still constant px/sec); we just stop sooner. No cap on desktop.
  if (MOBILE) maxY = Math.min(maxY, Math.round(speed * (maxSeconds ?? MOBILE_PAN_CAP_SECONDS)));

  if (maxY <= 4) { await page.waitForTimeout(holdBottom); return; }

  // duration = distance ÷ velocity → constant px/sec across all pages.
  await smoothScrollWindow(page, maxY, (maxY / speed) * 1000);
  await page.waitForTimeout(holdBottom);

  if (!returnToTop) return;
  const startUp = await page.evaluate(() => window.scrollY);
  await smoothScrollWindow(page, 0, (startUp / speedUp) * 1000);
  await page.waitForTimeout(700);
}

/**
 * Scrolls a specific scrollable element (by CSS selector) smoothly through
 * its own internal overflow at a constant velocity (SIDEBAR_SPEED px/sec) —
 * used for the reviews filter sidebar, which is position:sticky with
 * overflow-y:auto, so a window pan slides the results grid but leaves the
 * lower filter rails pinned out of view. Shows off the full filter vocabulary
 * (genre → studio/network → decade → …). No-op if absent or doesn't overflow.
 */
async function scrollElement(page, selector, opts = {}) {
  const {
    holdTop = 700, holdBottom = 500, returnToTop = true,
    speed = SIDEBAR_SPEED, speedUp = SIDEBAR_SPEED * 2,
  } = opts;

  const maxY = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.scrollHeight - el.clientHeight : 0;
  }, selector);
  if (!maxY || maxY <= 4) return;

  await page.waitForTimeout(holdTop);
  await smoothScrollElement(page, selector, maxY, (maxY / speed) * 1000);
  await page.waitForTimeout(holdBottom);

  if (!returnToTop) return;
  await smoothScrollElement(page, selector, 0, (maxY / speedUp) * 1000);
}

/**
 * ── Mobile filter-drawer helpers ──────────────────────────────────
 *
 * Below the site's 768px breakpoint the reviews filter sidebar is
 * `display:none` (hidden md:block); its filters instead live in a full-screen
 * dialog opened by a "Filters" button (`button[aria-controls="<drawerId>"]`).
 * These helpers drive that drawer so the mobile clips still show the faceting
 * story. They're only called from the MOBILE branches.
 */

/** Opens the mobile filter drawer via its trigger button. Returns true if the
 * drawer became visible. No-op-safe: a missing trigger just returns false. */
async function openFilterDrawer(page, drawerId) {
  const trigger = page.locator(`button[aria-controls="${drawerId}"]`).first();
  if (await trigger.count() === 0) return false;
  await tap(page, trigger, { pre: 150, post: 0 });   // cursorless open
  // Wait for the dialog to actually paint before interacting with its chips.
  const ok = await page
    .waitForSelector(`#${drawerId}`, { state: 'visible', timeout: 5000 })
    .then(() => true).catch(() => false);
  await page.waitForTimeout(500);
  return ok;
}

/** Closes the drawer via its primary "Show N films/shows" CTA (falling back to
 * the ✕ close button), then waits for it to leave the DOM. Closing is required
 * on mobile — per-chip taps do NOT auto-dismiss the drawer, so the narrowed
 * grid stays hidden behind it until we close. */
async function closeFilterDrawer(page, drawerId) {
  // The footer CTA reads "Show 42 films" / "Show 12 shows" — match on the verb
  // so we don't depend on the (data-dependent) count.
  let btn = page.locator(`#${drawerId} button`, { hasText: /^\s*Show\s+\d/i }).first();
  if (await btn.count() === 0) {
    btn = page.locator(`#${drawerId} button[aria-label="Close filters"]`).first();
  }
  if (await btn.count() > 0) {
    await tap(page, btn, { pre: 150, post: 0 });   // cursorless close
  }
  await page.waitForSelector(`#${drawerId}`, { state: 'hidden', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Gently scrolls the drawer's scrollable body top→bottom→top so the full
 * filter vocabulary reads on camera — the mobile analogue of the desktop
 * sidebar tour. Tags the actual overflow container (its inline style has no
 * stable selector) and reuses the constant-velocity element scroller. */
async function scrollDrawerBody(page, drawerId) {
  const tagged = await page.evaluate((id) => {
    const root = document.getElementById(id);
    if (!root) return false;
    // The scrollable body is whichever descendant owns the overflow AND has
    // content taller than itself; tag it so Playwright can address it.
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const s = getComputedStyle(el);
      const scrolls = s.overflowY === 'auto' || s.overflowY === 'scroll';
      if (scrolls && el.scrollHeight - el.clientHeight > 8) {
        el.setAttribute('data-demo-scroller', '');
        return true;
      }
    }
    return false;
  }, drawerId);
  if (!tagged) return;
  await scrollElement(page, '[data-demo-scroller]', { holdTop: 500, holdBottom: 400, returnToTop: true });
}

/**
 * Full mobile filter interaction: open the drawer, optionally tour the filter
 * list and reveal any "More filters" long-tail, tap up to `count` chips
 * (preferring the human-legible `picks`, falling back to any unpressed chip),
 * then close the drawer. Returns how many chips were applied so the caller can
 * decide whether to surface the address pill. All steps are no-op-safe.
 */
async function driveMobileFilters(page, { drawerId, chip, picks = [], count = 3, tourVocab = true }) {
  if (!(await openFilterDrawer(page, drawerId))) return 0;

  if (tourVocab) await scrollDrawerBody(page, drawerId);

  // The drawer collapses long-tail facets behind a "More filters" disclosure to
  // stay short — open it so every dimension (and our preferred picks) is tappable.
  const more = page.locator(`#${drawerId} button`, { hasText: /more filters/i }).first();
  if (await more.count() > 0) {
    await tap(page, more, { pre: 150, post: 400 });
  }

  let applied = 0;
  const tapChip = async (loc) => {
    // Cursorless tap; the post-pause lets the grid re-query behind the drawer.
    await tap(page, loc, { pre: 150, post: 1000 });
    applied++;
  };

  // Scope every chip lookup to the drawer so we never grab an active-filter rail
  // chip sitting behind the (full-screen) dialog.
  for (const label of picks) {
    if (applied >= count) break;
    const c = page.locator(`#${drawerId} ${chip}:not([aria-pressed="true"])`, { hasText: label }).first();
    if (await c.count() > 0) await tapChip(c);
  }
  while (applied < count) {
    const c = page.locator(`#${drawerId} ${chip}:not([aria-pressed="true"])`).first();
    if (await c.count() === 0) break;
    await tapChip(c);
  }

  await closeFilterDrawer(page, drawerId);
  return applied;
}

/**
 * Runs in the browser before any page script, on every navigation
 * (registered via context.addInitScript). Three demo-staging jobs:
 *   1. Force dark — seed next-themes' localStorage key so the site commits
 *      to dark instead of only following the OS media query.
 *   2. Hide the Next.js dev-tools indicator (the floating "N" bottom-left)
 *      and the build-activity watcher — dev chrome, not part of the product.
 *   3. Install a visible cursor. Playwright's video doesn't render the real
 *      pointer, so hovers would be invisible; this dot follows every move.
 */
function stagePrep(arg) {
  const mobile = !!(arg && arg.mobile);
  try { localStorage.setItem('theme', 'dark'); } catch { /* file:// has no storage */ }

  const install = () => {
    // 1 + 2 — a style tag that hides dev chrome whenever it mounts.
    if (!document.getElementById('__demo_style')) {
      const s = document.createElement('style');
      s.id = '__demo_style';
      s.textContent =
        'nextjs-portal,[data-next-badge-root],[data-nextjs-dev-tools-button],' +
        '#__next-build-watcher,[data-nextjs-toast]{display:none!important;}' +
        // The site sets `scroll-behavior:smooth` (gated on prefers-reduced-motion,
        // which Playwright leaves at no-preference). That makes every programmatic
        // window.scrollTo / element.scrollTop in our rAF pans ANIMATE and ease
        // instead of jumping exactly where told — so the constant-velocity loop
        // fights the browser's own smooth-scroll and the velocity ramps (a visible
        // "acceleration", worst at the faster mobile pace). Force instant scrolling
        // everywhere so OUR loop is the sole source of motion: deterministic, linear.
        '*{scroll-behavior:auto!important}';
      (document.head || document.documentElement).appendChild(s);
    }
    // 3 — the synthetic cursor. Playwright's video doesn't render the real
    // pointer, so DESKTOP installs a macOS-style arrow that follows the mouse
    // (hovers would otherwise be invisible). MOBILE installs NO cursor at all:
    // we're showing the phone experience, which has no pointer and no hover —
    // mobile interactions are cursorless taps (see the `tap` helper), so any
    // floating pointer/hover indicator would be wrong. Hidden until first move.
    if (!mobile && document.body && !document.getElementById('__demo_cursor')) {
      const c = document.createElement('div');
      c.id = '__demo_cursor';
      Object.assign(c.style, {
        position: 'fixed', top: '0', left: '0', width: '26px', height: '26px',
        zIndex: '2147483647', pointerEvents: 'none', opacity: '0',
        transform: 'translate(-3px,-2px)',
        transition: 'top .05s linear, left .05s linear',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.55))',
      });
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 2 L4 18.5 L8.4 14.3 L11.3 20.2 L13.9 19 L11 13.2 L16.8 13.2 Z" ' +
        'fill="#ffffff" stroke="#0b0b0c" stroke-width="1.2" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
      window.addEventListener('mousemove', (e) => {
        c.style.opacity = '1';
        c.style.left = e.clientX + 'px';
        c.style.top = e.clientY + 'px';
      }, true);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
  // Re-assert briefly in case the app (or the dev indicator) mounts late.
  let n = 0;
  const iv = setInterval(() => { install(); if (++n > 12) clearInterval(iv); }, 400);
}
