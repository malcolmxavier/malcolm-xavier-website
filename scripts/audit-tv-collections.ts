// ─────────────────────────────────────────────────────────────────
// TV collection audit — a CONSERVATIVE, on-demand candidate surfacer.
//
// TV franchise families are hand-curated (lib/feeds/stats/tv-franchise.ts)
// because TMDB has no show-family signal. This script flags shows in the
// corpus that are NOT yet in a family but LOOK like they belong to one, so
// curation doesn't rely on memory. It is deliberately decoupled from the
// snapshot-refresh job and meant for a LONGER cadence (≈ monthly, or ad-hoc
// after logging a batch of new shows), per Malcolm — most shows aren't
// connected, so running it every refresh would be noise.
//
// It is intentionally LOW-NOISE: it only flags strong title-pattern signals
// (a shared pre-colon segment, or a shared ≥3-word leading prefix). It will
// NOT catch editorial-only families whose titles don't rhyme — e.g.
// Grey's Anatomy ↔ Station 19, Game of Thrones ↔ House of the Dragon,
// Interview with the Vampire ↔ The Vampire Lestat. Those stay fully manual.
//
// Run:  npm run tv:collection-audit
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  TV_FAMILY_BY_SHOW,
  tvFamilyName,
} from "../lib/feeds/stats/tv-franchise";

const here = dirname(fileURLToPath(import.meta.url));
const snapshotPath = resolve(
  here,
  "../lib/feeds/_fixtures/serializd-snapshot.json",
);

type SnapshotShow = {
  id: string;
  name: string;
  tmdb: { id?: number } | null;
};

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
  shows: SnapshotShow[];
};
const shows = snapshot.shows;

const tmdbId = (s: SnapshotShow): number =>
  s.tmdb?.id ?? Number(String(s.id).replace("tmdb-tv-", ""));

const curatedIds = new Set(Object.keys(TV_FAMILY_BY_SHOW).map(Number));

// ── Title-pattern keys (conservative) ─────────────────────────────
// Strip a leading article, then take the pre-colon/dash segment. This is
// the distinctive franchise stem for colon spinoffs ("9-1-1: Lone Star",
// "The Valley: Persian Style", "Jury Duty Presents: …").
function preColon(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .split(/\s*[:–—-]\s*/)[0]
    .trim();
}

// The leading ≥3-word prefix, for franchises that share a long stem without
// a colon ("The Real Housewives of Atlanta" → "the real housewives of").
function wordPrefix(name: string, words = 4): string {
  const w = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return w.length >= 3 ? w.slice(0, Math.min(words, w.length)).join(" ") : "";
}

// A title's conservative "stem set" — the signals strong enough to assert a
// franchise relationship without tripping on incidental word overlap.
function stems(name: string): string[] {
  const out = new Set<string>();
  const pc = preColon(name);
  // A pre-colon stem only counts when the title actually HAS a separator
  // (so a plain title isn't its own stem) and the stem is distinctive.
  if (pc && pc !== name.toLowerCase().replace(/^the\s+/, "") && pc.length >= 3) {
    out.add(pc);
  }
  const wp = wordPrefix(name);
  if (wp.split(" ").length >= 3) out.add(wp);
  return [...out];
}

const curated = shows.filter((s) => curatedIds.has(tmdbId(s)));
const uncurated = shows.filter((s) => !curatedIds.has(tmdbId(s)));

// Map each curated show's stems → its family name(s), so an uncurated show
// sharing a stem can be attributed to the likely family.
const stemToFamily = new Map<string, Set<string>>();
for (const s of curated) {
  const fams = (TV_FAMILY_BY_SHOW[tmdbId(s)] ?? []).map(tvFamilyName);
  for (const stem of stems(s.name)) {
    if (!stemToFamily.has(stem)) stemToFamily.set(stem, new Set());
    for (const f of fams) stemToFamily.get(stem)!.add(f);
  }
}

// ── Signal A: uncurated show shares a stem with an EXISTING family ─
const joinsExisting: { name: string; families: string[] }[] = [];
for (const s of uncurated) {
  const fams = new Set<string>();
  for (const stem of stems(s.name)) {
    for (const f of stemToFamily.get(stem) ?? []) fams.add(f);
  }
  if (fams.size) joinsExisting.push({ name: s.name, families: [...fams] });
}

// ── Signal B: 2+ uncurated shows share a stem (a possible NEW family) ─
const stemToUncurated = new Map<string, string[]>();
for (const s of uncurated) {
  for (const stem of stems(s.name)) {
    if (!stemToUncurated.has(stem)) stemToUncurated.set(stem, []);
    stemToUncurated.get(stem)!.push(s.name);
  }
}
const newClusters = [...stemToUncurated.entries()]
  .filter(([, names]) => names.length >= 2)
  .sort((a, b) => b[1].length - a[1].length);

// ── Report ────────────────────────────────────────────────────────
const line = "─".repeat(64);
console.log(`\n${line}\nTV collection audit — ${uncurated.length} uncurated of ${shows.length} shows`);
console.log(`(conservative title-pattern signals only; editorial families need your eye)\n${line}\n`);

if (joinsExisting.length) {
  console.log("▸ Likely belong to an EXISTING family (add to TV_FAMILY_BY_SHOW):");
  for (const j of joinsExisting) {
    console.log(`    • ${j.name}  →  ${j.families.join(" / ")}`);
  }
  console.log("");
} else {
  console.log("▸ No uncurated show matches an existing family. ✓\n");
}

if (newClusters.length) {
  console.log("▸ Possible NEW families (2+ uncurated shows sharing a stem):");
  for (const [stem, names] of newClusters) {
    console.log(`    • "${stem}": ${names.join(", ")}`);
  }
  console.log("");
} else {
  console.log("▸ No new-family clusters among uncurated shows. ✓\n");
}

console.log(`${line}\nReminder: titles that don't rhyme (Grey's ↔ Station 19,`);
console.log(`GoT ↔ House of the Dragon) won't show here — curate those by hand.\n${line}\n`);
