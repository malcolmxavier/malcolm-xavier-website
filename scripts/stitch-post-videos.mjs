#!/usr/bin/env node
/**
 * stitch-post-videos.mjs — concatenate the per-surface demo clips into the
 * single video each LinkedIn post needs (LinkedIn allows one video per post).
 *
 * The individual clips are produced by record-demo.mjs. Some launch-week
 * posts tell a multi-surface story and therefore need several clips joined
 * into one file. This script owns that post→clips mapping so it's explicit
 * and re-runnable.
 *
 * ── USAGE ────────────────────────────────────────────────────────
 *   node scripts/stitch-post-videos.mjs            # build all groups
 *   node scripts/stitch-post-videos.mjs p46        # build one by key
 *
 * ── OUTPUT ───────────────────────────────────────────────────────
 *   _private/_demo-videos/post-<key>.mp4
 *
 * Clips are normalized to 30fps and 1280×720 before joining (the source
 * webms record at a variable frame rate; a straight concat would glitch on
 * the timestamp seams). Scenes are joined with a fast 0.4s crossfade rather
 * than a hard cut — the crossfade overlaps the brief hold-frames at each
 * clip's head/tail, so the transition reads quick and intentional instead of
 * lingering on a static frame at the seam.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --mobile stitches the VERTICAL cut: it reads the mobile clips from the
// parallel _demo-videos/mobile/ dir and normalizes every scene to a 1080×1920
// (9:16) canvas instead of 1280×720. Landscape behaviour is unchanged.
const MOBILE = process.argv.includes('--mobile');
const OUT = MOBILE
  ? resolve(__dirname, '..', '_private', '_demo-videos', 'mobile')
  : resolve(__dirname, '..', '_private', '_demo-videos');
const CANVAS_W = MOBILE ? 1080 : 1280;
const CANVAS_H = MOBILE ? 1920 : 720;

// Crossfade duration between scenes, in seconds. Short = snappy transition.
const XFADE = 0.4;

// ── Post → ordered clips ──────────────────────────────────────────
// Keys are the LinkedIn post they back. Values are clip basenames (no
// extension) in narrative order. Single-clip posts (p41 tour, p43 lists)
// need no stitching and aren't listed here.
const GROUPS = {
  // p42 Wed — "a dashboard whose job is to get you to leave it": the sketch
  // (prototype), then each cluster's dashboard handing off into its filtered
  // reviews (film, then TV), then the connected view as the honest-limits coda.
  p42: ['01-stats-sketch', '08-films-stats-handoff', '09-television-stats-handoff', '10-connected-stats'],
  // p46 Fri — filtering-as-discovery: arrive from a stats tile into the
  // filtered film reviews, keep faceting there (URL accreting on camera), then
  // the TV slice. No prototype — this post is the reviews' own engine, and its
  // direction calls for the tile click-through, not the sketch.
  p46: ['08-films-stats-handoff', '04-films-reviews-discovery', '06-television-reviews-discovery'],
};

// ── Build one group ───────────────────────────────────────────────

// Probe a clip's duration in seconds (ffprobe). xfade needs each clip's
// length to place the next crossfade at the right offset.
function probeDuration(path) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', path,
  ], { encoding: 'utf8' });
  const d = parseFloat((r.stdout || '').trim());
  return Number.isFinite(d) ? d : null;
}

function buildGroup(key, clips) {
  const inputs = clips.map((c) => resolve(OUT, `${c}.mp4`));
  const missing = inputs.filter((p) => !existsSync(p));
  if (missing.length > 0) {
    console.warn(`  ⚠ ${key}: missing input(s):\n     ${missing.join('\n     ')}`);
    return false;
  }

  const durations = inputs.map(probeDuration);
  if (durations.some((d) => d === null)) {
    console.error(`  ✗ ${key}: could not probe one or more clip durations (is ffprobe installed?)`);
    return false;
  }

  // Normalize each input (fps + size + square pixels + pixel format) so the
  // crossfade sees identical streams on both sides of every seam.
  const norm = clips
    .map((_, i) =>
      `[${i}:v]fps=30,scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=decrease,` +
      `pad=${CANVAS_W}:${CANVAS_H}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[v${i}]`)
    .join(';');

  // Chain xfade across the normalized streams. Each crossfade starts XFADE
  // seconds before the running total ends (so it overlaps the outgoing clip's
  // tail), and the running total shrinks by XFADE per seam.
  let chain = norm;
  let prev = '[v0]';
  let acc = durations[0];
  for (let i = 1; i < clips.length; i++) {
    const out = i === clips.length - 1 ? '[v]' : `[x${i}]`;
    const offset = (acc - XFADE).toFixed(3);
    chain += `;${prev}[v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset}${out}`;
    acc = acc + durations[i] - XFADE;
    prev = out;
  }
  // Single-clip group (no seam): nothing to crossfade — map the lone stream.
  const outLabel = clips.length === 1 ? '[v0]' : '[v]';

  const dest = resolve(OUT, `post-${key}.mp4`);
  const args = [
    '-y', '-loglevel', 'error',
    ...inputs.flatMap((p) => ['-i', p]),
    '-filter_complex', chain,
    '-map', outLabel,
    '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    dest,
  ];

  const r = spawnSync('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) {
    console.error(`  ✗ ${key}: ffmpeg exited ${r.status}`);
    return false;
  }
  console.log(`  ✓ post-${key}.mp4  ←  ${clips.join(' + ')}  (${acc.toFixed(1)}s)`);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────

// Skip flags (e.g. --mobile) so an optional group key can be passed alongside.
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const keys = only ? [only] : Object.keys(GROUPS);

if (only && !GROUPS[only]) {
  console.error(`  No group "${only}". Available: ${Object.keys(GROUPS).join(', ')}`);
  process.exit(1);
}

const OUT_REL = MOBILE ? '_private/_demo-videos/mobile' : '_private/_demo-videos';
console.log(`\n  Stitching ${keys.length} ${MOBILE ? 'vertical ' : ''}post video(s) → ${OUT_REL}/\n`);
for (const key of keys) buildGroup(key, GROUPS[key]);
console.log('');
