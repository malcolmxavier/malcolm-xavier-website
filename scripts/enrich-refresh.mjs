// ─────────────────────────────────────────────────────────────────
// enrich-refresh.mjs — human-in-the-loop refresh for the committed
// enrichment fixture (lib/feeds/_fixtures/enrichment-snapshot.json).
//
// Consolidates the six analysis-scratch passes that built the original
// _private cache into one resumable ritual writing the production
// fixture. Per item:
//
//   FILM  · MDBList /tmdb/movie/{id}            → ratings, studios,
//            country, language, certification, budget, revenue  (the
//            rate-limited resource: 1 MDBList call each)
//         · TMDB /movie/{id}?append_to_response=credits
//            → cast (top-20 billed) + writers (Writing dept) +
//              collection (belongs_to_collection). One call, three
//              fields — the base movie object and credits arrive
//              together. (uncapped)
//         · TMDB /movie/{id}/release_dates → release classification
//            (theatrical / limited / streaming). (uncapped)
//   SHOW  · MDBList /tmdb/show/{id}             → ratings, country,
//            language, per-season audience averages  (1 MDBList call)
//         · TMDB /tv/{id}?append_to_response=aggregate_credits
//            → cast (top-20, with episode counts) + creators. (uncapped)
//   COLLECTIONS · TMDB /collection/{id}         → full member list, so
//            franchise size (released-count gate) is known. (uncapped)
//
// The fixture stores ONLY the enrichment delta — identity + rating
// fields (mine/title/year, and a show's networks/type/status) are
// canonical in the letterboxd/serializd snapshots and joined at read
// time by lib/feeds/enrichment.ts, so they are deliberately NOT
// written here.
//
// Resumable: each field has a "skip if already present" check, so a
// rate-limit cap just means "run again tomorrow." Incremental writes
// after every batch, so an interrupt never loses progress. The shared
// MDBList daily budget is read up front and spent across the two
// MDBList passes only; TMDB passes are uncapped.
//
// Flags:
//   --dry-run   print what each pass WOULD fetch, then exit (no
//               network, no write). Safe to run anytime.
//   --refresh   re-pull everything, ignoring what's already cached.
//
// Run:  npm run enrich:refresh        (resumable, fills gaps)
//       npm run enrich:refresh -- --dry-run
//
// Human-in-the-loop, no cron: cast/language/budget are effectively
// static and MDBList is 1,000/day + burst-limited. Review the diff,
// then commit + push yourself — this never commits.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIX = join(ROOT, "lib", "feeds", "_fixtures");
const FIXTURE_PATH = join(FIX, "enrichment-snapshot.json");
const LB_PATH = join(FIX, "letterboxd-snapshot.json");
const SZ_PATH = join(FIX, "serializd-snapshot.json");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--refresh");

// ─── Pure helpers (exported for tests) ───────────────────────────

/** Writing-department jobs that count as writing the FILM (not its source). */
export const WRITER_JOBS = new Set(["Screenplay", "Writer", "Story", "Teleplay"]);

/** Pull a normalized {source: value} ratings object out of an MDBList record. */
export function ratingsOf(m) {
  const r = {};
  for (const x of m.ratings || []) if (x.value != null) r[x.source] = x.value;
  return {
    imdb: r.imdb ?? null, // /10
    metacritic: r.metacritic ?? null, // /100 (critic)
    metacriticUser: r.metacriticuser ?? null,
    tomatoes: r.tomatoes ?? null, // /100 (RT critic)
    rtAudience: r.popcorn ?? null, // /100 (RT audience)
    letterboxd: r.letterboxd ?? null, // /5
    trakt: r.trakt ?? null,
  };
}

/** Names out of a TMDB-ish array of {name} (or strings). */
export function namesOf(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
}

/** Top-20 billed film cast {id,name} from a TMDB credits payload. */
export function extractFilmCast(credits) {
  return (credits?.cast || [])
    .slice()
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 20)
    .map((c) => ({ id: c.id, name: c.name }));
}

/** Top-20 billed TV cast {id,name,eps} from a TMDB aggregate_credits payload. */
export function extractTvCast(aggregateCredits) {
  return (aggregateCredits?.cast || [])
    .slice()
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 20)
    .map((c) => ({ id: c.id, name: c.name, eps: c.total_episode_count ?? null }));
}

/** Deduped film writers (Writing dept, writing jobs only) from credits.crew. */
export function extractWriters(crew) {
  const seen = new Set();
  const writers = [];
  for (const c of crew || []) {
    if (c.department === "Writing" && WRITER_JOBS.has(c.job) && !seen.has(c.id)) {
      seen.add(c.id);
      writers.push({ id: c.id, name: c.name });
    }
  }
  return writers;
}

/** {id,name} collection ref from a movie's belongs_to_collection, else null. */
export function extractCollection(movie) {
  return movie?.belongs_to_collection
    ? { id: movie.belongs_to_collection.id, name: movie.belongs_to_collection.name }
    : null;
}

/**
 * Classify a film's release from TMDB /release_dates:
 *   any region type 3 → "theatrical"; else type 2 → "limited";
 *   else any dates → "streaming"; else "unknown". `gap` is the days
 *   from US theatrical (type 3/2) to US digital (type 4).
 */
export function classifyRelease(releaseDates) {
  const all = (releaseDates?.results || []).flatMap((x) =>
    x.release_dates.map((d) => ({ region: x.iso_3166_1, type: d.type, date: d.release_date })),
  );
  const us = all.filter((d) => d.region === "US");
  const has = (t) => all.some((d) => d.type === t);
  const wide = has(3);
  const ltd = has(2);
  const cls = wide ? "theatrical" : ltd ? "limited" : all.length ? "streaming" : "unknown";
  const first = (t) => {
    const ds = us.filter((d) => d.type === t).map((d) => d.date).sort();
    return ds[0] || null;
  };
  const theat = first(3) || first(2);
  const digi = first(4);
  const gap =
    theat && digi ? Math.round((new Date(digi) - new Date(theat)) / 86_400_000) : null;
  return { cls, wide, ltd, gap };
}

/** A season-averages array {n,avg} from an MDBList show record. */
export function seasonsOf(m) {
  return Array.isArray(m?.seasons)
    ? m.seasons.map((x) => ({ n: x.season_number, avg: x.avg }))
    : [];
}

// ── "Needs enrichment" predicates (exported, pure, for tests) ──

/** A film needs the MDBList pass when it has no ratings yet. */
export function filmNeedsMdb(entry) {
  return !entry || entry.ratings == null;
}
/** A film needs the TMDB-credits pass when cast/writers/collection is unfilled. */
export function filmNeedsCredits(entry) {
  return (
    !entry ||
    !(entry.cast?.length) ||
    entry.writers === undefined ||
    entry.collection === undefined
  );
}
/** A film needs release classification when it has none. */
export function filmNeedsRelease(entry) {
  return !entry || entry.release === undefined;
}
/** A show needs the MDBList pass when it has no ratings yet. */
export function showNeedsMdb(entry) {
  return !entry || entry.ratings == null;
}
/** A show needs the TMDB-credits pass when cast/creators is unfilled. */
export function showNeedsCredits(entry) {
  return !entry || !(entry.cast?.length) || entry.creators === undefined;
}

// ─── Network (fetch with one 429 backoff) ────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (a, n) => {
  const o = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
};

/**
 * GET JSON, returning null on any non-OK response — except a 429,
 * which we honor once (Retry-After, default 5s) then retry. Exported
 * with an injectable fetch impl so the backoff is unit-testable.
 */
export async function getJson(url, { fetchImpl = fetch, retries = 1 } = {}) {
  try {
    const res = await fetchImpl(url);
    if (res.status === 429 && retries > 0) {
      const wait = Number.parseInt(res.headers?.get?.("retry-after") ?? "5", 10);
      await sleep((Number.isFinite(wait) ? wait : 5) * 1000);
      return getJson(url, { fetchImpl, retries: retries - 1 });
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Script state (only touched in main) ─────────────────────────

function loadFixture() {
  if (FORCE || !existsSync(FIXTURE_PATH)) {
    return { capturedAt: null, meta: {}, films: {}, shows: {}, collectionDetails: {} };
  }
  const f = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  f.films ||= {};
  f.shows ||= {};
  f.collectionDetails ||= {};
  return f;
}

function save(fixture) {
  // serializeFixture is the single source of truth for the on-disk shape:
  // stable key order (capturedAt, meta, then the big maps), recomputed meta
  // summary, and the trailing newline. Reusing it here keeps the CLI's
  // batch-save and the bulk writer from drifting apart (the two used to build
  // the ordered object independently).
  writeFileSync(FIXTURE_PATH, serializeFixture(fixture));
}

export async function mdbRemaining(key) {
  const u = await getJson("https://api.mdblist.com/user?apikey=" + key);
  return u?.rate_limit_remaining ?? 0;
}

/**
 * Build the five per-pass work-lists from the snapshot candidates and
 * what's already in the fixture. Shared by the CLI dry-run, the in-memory
 * core, and the cron route (which uses it to find under-enriched titles
 * and to short-circuit when there's nothing to do).
 */
export function workLists(films, shows, fixture, force = false) {
  const F = fixture.films;
  const S = fixture.shows;
  return {
    mdbFilms: films.filter((f) => force || filmNeedsMdb(F[f.tmdb.id])),
    credFilms: films.filter((f) => force || filmNeedsCredits(F[f.tmdb.id])),
    relFilms: films.filter((f) => force || filmNeedsRelease(F[f.tmdb.id])),
    mdbShows: shows.filter((s) => force || showNeedsMdb(S[s.tmdb.id])),
    credShows: shows.filter((s) => force || showNeedsCredits(S[s.tmdb.id])),
  };
}

/**
 * Enrich a fixture in memory — the shared core behind both the CLI and
 * the /api/cron/enrich-refresh route. Runs the six passes against the
 * given film/show candidates, mutating `fixture` in place and returning
 * it plus per-pass counts. No disk I/O, no process.exit, no globals:
 * every input (keys, fetch, budget, the post-batch hook) is injected so
 * the cron can drive it with a real or mocked fetch and the CLI can keep
 * its incremental disk-save behaviour.
 *
 * @param {object}   o
 * @param {object[]} o.films      candidate films (each with `.tmdb.id`)
 * @param {object[]} o.shows      candidate shows (each with `.tmdb.id`)
 * @param {object}   o.fixture    { films, shows, collectionDetails }, mutated
 * @param {string}   o.mdbKey     MDBList API key
 * @param {string}   o.tmdbKey    TMDB API key
 * @param {Function} [o.fetchImpl] injectable fetch (defaults to global)
 * @param {number}   [o.mdbBudget] max MDBList calls this run (films + shows)
 * @param {boolean}  [o.force]    re-pull even already-filled entries
 * @param {Function} [o.onBatch]  called with (fixture) after each batch —
 *                                the CLI saves to disk; the cron passes a no-op
 * @param {Function} [o.log]      progress sink (CLI: console.log; cron: no-op)
 */
export async function enrichFixture({
  films = [],
  shows = [],
  fixture,
  mdbKey,
  tmdbKey,
  fetchImpl = fetch,
  mdbBudget = Infinity,
  force = false,
  onBatch = () => {},
  log = () => {},
}) {
  const F = fixture.films;
  const S = fixture.shows;
  const { mdbFilms, credFilms, relFilms, mdbShows, credShows } = workLists(
    films,
    shows,
    fixture,
    force,
  );

  // MDBList is the only rate-limited resource — one shared budget spent
  // across the two MDBList passes (films first, shows next), stopping
  // cleanly when exhausted (resumable on the next run/tick).
  const budget = { n: mdbBudget };
  const opts = { onBatch, log, fixture };

  // ── Pass A · films · MDBList ratings/studios/country/language/… ──
  const filmsMdb = await runBudgeted(mdbFilms, budget, async (f) => {
    const id = f.tmdb.id;
    const m = await getJson(`https://api.mdblist.com/tmdb/movie/${id}?apikey=${mdbKey}`, { fetchImpl });
    if (!m) return false;
    F[id] = {
      ...(F[id] || {}),
      ratings: ratingsOf(m),
      studios: namesOf(m.production_companies),
      country: m.country ?? F[id]?.country ?? null,
      language: m.language ?? F[id]?.language ?? null,
      certification: m.certification ?? F[id]?.certification ?? null,
      budget: m.budget ?? F[id]?.budget ?? null,
      revenue: m.revenue ?? F[id]?.revenue ?? null,
    };
    return true;
  }, "films · MDBList", opts);

  // ── Pass B · films · TMDB credits → cast + writers + collection ──
  await runUncapped(credFilms, async (f) => {
    const id = f.tmdb.id;
    const m = await getJson(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}&append_to_response=credits`,
      { fetchImpl },
    );
    if (!m) return;
    F[id] = {
      ...(F[id] || {}),
      cast: extractFilmCast(m.credits),
      writers: extractWriters(m.credits?.crew),
      collection: extractCollection(m),
    };
  }, "films · TMDB credits", opts);

  // ── Pass C · films · TMDB release classification ──
  await runUncapped(relFilms, async (f) => {
    const id = f.tmdb.id;
    const r = await getJson(
      `https://api.themoviedb.org/3/movie/${id}/release_dates?api_key=${tmdbKey}`,
      { fetchImpl },
    );
    F[id] = { ...(F[id] || {}), release: classifyRelease(r) };
  }, "films · TMDB release", opts);

  // ── Pass D · shows · MDBList ratings/country/language/seasons ──
  const showsMdb = await runBudgeted(mdbShows, budget, async (s) => {
    const id = s.tmdb.id;
    const m = await getJson(`https://api.mdblist.com/tmdb/show/${id}?apikey=${mdbKey}`, { fetchImpl });
    if (!m) return false;
    S[id] = {
      ...(S[id] || {}),
      ratings: ratingsOf(m),
      country: m.country ?? S[id]?.country ?? null,
      language: m.language ?? S[id]?.language ?? null,
      seasons: seasonsOf(m),
    };
    return true;
  }, "shows · MDBList", opts);

  // ── Pass E · shows · TMDB aggregate_credits → cast + creators ──
  await runUncapped(credShows, async (s) => {
    const id = s.tmdb.id;
    const m = await getJson(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbKey}&append_to_response=aggregate_credits`,
      { fetchImpl },
    );
    if (!m) return;
    S[id] = {
      ...(S[id] || {}),
      cast: extractTvCast(m.aggregate_credits),
      creators: namesOf(m.created_by).map((name, i) => ({
        id: m.created_by[i].id,
        name,
      })),
    };
  }, "shows · TMDB credits", opts);

  // ── Pass F · collections · TMDB member lists + annotate total ──
  const colIds = new Set();
  for (const f of Object.values(F)) if (f.collection) colIds.add(f.collection.id);
  const watchedIds = new Set(Object.keys(F).map(Number));
  const todoCols = [...colIds].filter((id) => force || !fixture.collectionDetails[id]);
  log(`collections · TMDB details: ${todoCols.length}`);
  for (const id of todoCols) {
    const c = await getJson(
      `https://api.themoviedb.org/3/collection/${id}?api_key=${tmdbKey}`,
      { fetchImpl },
    );
    if (c) {
      const parts = (c.parts || [])
        .map((p) => ({
          id: p.id,
          title: p.title,
          year: (p.release_date || "").slice(0, 4),
          watched: watchedIds.has(p.id),
        }))
        .sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999"));
      fixture.collectionDetails[id] = { name: c.name, total: parts.length, parts };
    }
    await sleep(50);
    onBatch(fixture);
  }
  // Annotate each film's collection with the franchise's true size.
  for (const f of Object.values(F)) {
    if (f.collection && fixture.collectionDetails[f.collection.id]) {
      f.collection.total = fixture.collectionDetails[f.collection.id].total;
    }
  }

  return {
    fixture,
    stats: {
      filmsMdb,
      filmsCredits: credFilms.length,
      filmsRelease: relFilms.length,
      showsMdb,
      showsCredits: credShows.length,
      collections: todoCols.length,
    },
  };
}

/**
 * Stable serialization matching the committed snapshots — ordered keys
 * (capturedAt, meta, then the big maps) + trailing newline. Shared by
 * the CLI's disk save and the cron's GitHub commit so a manual run and a
 * cron run produce byte-identical files (clean diffs).
 */
export function serializeFixture(fixture) {
  const ordered = {
    capturedAt: new Date().toISOString(),
    meta: {
      films: Object.keys(fixture.films).length,
      shows: Object.keys(fixture.shows).length,
      collections: Object.keys(fixture.collectionDetails).length,
    },
    films: fixture.films,
    shows: fixture.shows,
    collectionDetails: fixture.collectionDetails,
  };
  return JSON.stringify(ordered, null, 2) + "\n";
}

async function main() {
  const lb = JSON.parse(readFileSync(LB_PATH, "utf8"));
  const sz = JSON.parse(readFileSync(SZ_PATH, "utf8"));
  const fixture = loadFixture();

  const films = lb.films.filter((f) => f.tmdb);
  const shows = sz.shows.filter((s) => s.tmdb);

  // Dry run reads only the fixture + snapshots — no keys, no network.
  if (DRY_RUN) {
    const { mdbFilms, credFilms, relFilms, mdbShows, credShows } = workLists(
      films,
      shows,
      fixture,
      FORCE,
    );
    console.log("DRY RUN — no network, no write. Work that a refresh would do:");
    console.log(`  films · MDBList ratings:       ${mdbFilms.length}`);
    console.log(`  films · TMDB cast/writers/col:  ${credFilms.length}`);
    console.log(`  films · TMDB release class:     ${relFilms.length}`);
    console.log(`  shows · MDBList ratings:        ${mdbShows.length}`);
    console.log(`  shows · TMDB cast/creators:     ${credShows.length}`);
    console.log(
      `  MDBList budget needed (films+shows): ${mdbFilms.length + mdbShows.length}`,
    );
    return;
  }

  // The live passes need the API keys — check now (after dry-run).
  const MDB = process.env.MDBLIST_API_KEY;
  const TMDB = process.env.TMDB_API_KEY;
  if (!MDB || !TMDB) {
    console.error(
      "Missing MDBLIST_API_KEY or TMDB_API_KEY. Add them to .env.local and run\n" +
        "  npm run enrich:refresh   (which loads .env.local via --env-file).",
    );
    process.exit(1);
  }

  const rem = await mdbRemaining(MDB);
  const mdbBudget = Math.max(0, rem - 8); // small safety margin
  console.log(`MDBList window remaining: ${rem} → spending up to ${mdbBudget} this pass`);

  // The CLI saves incrementally (resumable) and once more at the end.
  await enrichFixture({
    films,
    shows,
    fixture,
    mdbKey: MDB,
    tmdbKey: TMDB,
    mdbBudget,
    force: FORCE,
    onBatch: save,
    log: (m) => console.log(m),
  });
  save(fixture);

  console.log(
    `\nDone. films ${Object.keys(fixture.films).length} · shows ${Object.keys(fixture.shows).length} · ` +
      `collections ${Object.keys(fixture.collectionDetails).length}. ` +
      "Review the diff, then commit + push.",
  );
}

/**
 * Run a budget-limited (MDBList) pass: batches of 2 with a politeness
 * gap, an `onBatch` hook after each batch (CLI → disk save; cron → no-op),
 * stop when the shared budget runs out. `handler` returns true on a
 * successful fill; returns the number filled this pass.
 */
async function runBudgeted(items, budget, handler, label, { onBatch = () => {}, log = () => {}, fixture } = {}) {
  log(`${label}: ${items.length} to do (budget ${budget.n})`);
  let done = 0;
  let miss = 0;
  for (const batch of chunk(items, 2)) {
    if (budget.n <= 0) {
      log("  budget exhausted — stopping (resumable next run)");
      break;
    }
    const take = batch.slice(0, budget.n);
    budget.n -= take.length;
    const res = await Promise.all(take.map(handler));
    done += res.filter(Boolean).length;
    miss += res.filter((x) => !x).length;
    onBatch(fixture);
    await sleep(150);
  }
  log(`${label}: ${done} filled, ${miss} missing this pass`);
  return done;
}

/**
 * Run an uncapped (TMDB) pass: batches of 8, an `onBatch` hook after each
 * batch, gentle gap. TMDB is free/uncapped so no budget accounting.
 * Returns the number of items processed.
 */
async function runUncapped(items, handler, label, { onBatch = () => {}, log = () => {}, fixture } = {}) {
  log(`${label}: ${items.length} to do`);
  let done = 0;
  for (const batch of chunk(items, 8)) {
    await Promise.all(batch.map(handler));
    done += batch.length;
    onBatch(fixture);
    await sleep(60);
  }
  return done;
}

// Only run when invoked directly (so tests can import the pure helpers).
const isDirect =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  main().catch((err) => {
    console.error("\n[enrich-refresh] FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
