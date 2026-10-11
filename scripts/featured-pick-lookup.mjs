#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// featured-pick-lookup — find the id a "Currently recommending" pick
// needs, and refuse a title the site can't show yet.
//
// Usage:
//   node scripts/featured-pick-lookup.mjs film <title words>
//   node scripts/featured-pick-lookup.mjs tv   <title words>
//
// The pick in lib/feeds/featured-pick.ts is an id, not a title: a
// Letterboxd slug for a film, a Serializd show id for TV. If that id
// isn't in the site's snapshot (no review logged yet, or logged after
// the last hourly refresh), the module hides itself silently. This
// script reads the same snapshot fixtures the site builds from, so
// "found" here means the pick will render, and "not found" means it
// would vanish.
//
// Prints JSON: { kind, query, matches: [...] }. Exit code 0 when at
// least one title matches, 1 when none do (the caller should stop and
// say the title hasn't landed yet), 2 on bad usage.
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [kind, ...words] = process.argv.slice(2);
const query = words.join(" ").trim();

if (!["film", "tv"].includes(kind) || !query) {
  console.error("usage: featured-pick-lookup.mjs <film|tv> <title words>");
  process.exit(2);
}

// Compare titles loosely: case, accents, and punctuation shouldn't
// stop "mockingjay part 1" from finding "Mockingjay – Part 1".
const norm = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const q = norm(query);

function load(file) {
  const data = JSON.parse(
    readFileSync(join(root, "lib/feeds/_fixtures", file), "utf8"),
  );
  return data.films ?? data.shows ?? data;
}

// An exact title match sorts first, then titles containing the query.
function rank(items, titleOf) {
  return items
    .map((item) => ({ item, t: norm(titleOf(item)) }))
    .filter(({ t }) => t.includes(q))
    .sort((a, b) => (a.t === q ? 0 : 1) - (b.t === q ? 0 : 1))
    .map(({ item }) => item);
}

let matches;
if (kind === "film") {
  matches = rank(load("letterboxd-snapshot.json"), (f) => f.title).map(
    (f) => ({
      title: f.title,
      year: f.releaseYear ?? null,
      // The value FILM_PICK.slug takes.
      slug: f.letterboxdSlug,
      reviews: f.reviews?.length ?? 0,
      latestWatched: f.latestWatchedDate ?? null,
      pageUrl: `/films/${f.letterboxdSlug}-${f.releaseYear}`,
    }),
  );
} else {
  matches = rank(load("serializd-snapshot.json"), (s) => s.name ?? s.title).map(
    (s) => ({
      title: s.name ?? s.title,
      year: s.premiereYear ?? null,
      // The value TV_PICK.showId takes.
      showId: s.serializdShowId,
      reviews: s.reviews?.length ?? 0,
      latestWatched:
        (s.reviews ?? [])
          .map((r) => String(r.watchedDate ?? "").slice(0, 10))
          .sort()
          .at(-1) ?? null,
      pageUrl: s.slug ? `/television/${s.slug}` : null,
    }),
  );
}

console.log(JSON.stringify({ kind, query, matches }, null, 2));
process.exit(matches.length > 0 ? 0 : 1);
