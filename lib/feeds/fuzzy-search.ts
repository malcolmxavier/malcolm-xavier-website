// ─────────────────────────────────────────────────────────────────
// Reviews-page search matching. Hybrid by design: an exact, accent-
// insensitive SUBSTRING ("contains") pass first — predictable, no
// noise ("black" returns only real black titles, never "Blank
// Narcissus") — and a fuzzy fallback ONLY when substring finds nothing,
// so typos ("jurassik") still resolve to "Jurassic". This is the fix
// for "fuzzy was too fuzzy" (2026-06-04): pure fuzzy can't separate
// "black"→"blank" from "jurassik"→"jurassic" (both one edit), so we
// lead with substring and reserve fuzz for the zero-hit case.
//
// SERVER-ONLY. Fuse must never reach the client bundle — the corpus
// stays off the wire, and letterboxd-utils / serializd-utils (imported
// by the client shells) carry no server-only deps. A server component
// computes the matching id set here and hands it to applyFilters as a
// plain Set; the filter functions never import Fuse.
//
// Used per FIELD (title, director) — the caller searches each field
// separately and intersects the results (see combineMatchSets), so a
// Title + Director search is an AND across fields.
// ─────────────────────────────────────────────────────────────────

import "server-only";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

// Below this length a query is a no-op — a single typed character
// shouldn't filter (and shouldn't trip noindex). Mirrors the length
// gate in parseFilmFilters / parseShowFilters.
export const MIN_QUERY_LENGTH = 2;

const FUSE_OPTIONS: IFuseOptions<unknown> = {
  // The fuzzy fallback only runs when substring found nothing, so it
  // can be fairly tolerant (catch typos) without polluting the common
  // correctly-spelled case. ignoreLocation = match anywhere.
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: MIN_QUERY_LENGTH,
};

// Fuse indexes, cached by (array identity, key set). Nested map because
// the SAME films array is searched with different keys (["title"] vs
// ["tmdb.director"]) — keying on the array alone would cross the wires.
// WeakMap so per-request arrays (TV cards) are collected.
const fuseCache = new WeakMap<object, Map<string, Fuse<unknown>>>();

function getFuse<T>(items: T[], keys: string[]): Fuse<T> {
  let byKeys = fuseCache.get(items as object);
  if (!byKeys) {
    byKeys = new Map();
    fuseCache.set(items as object, byKeys);
  }
  const cacheKey = keys.join("|");
  let fuse = byKeys.get(cacheKey) as Fuse<T> | undefined;
  if (!fuse) {
    fuse = new Fuse(items, { ...FUSE_OPTIONS, keys });
    byKeys.set(cacheKey, fuse as unknown as Fuse<unknown>);
  }
  return fuse;
}

// Lowercase + strip diacritics so "amelie" matches "Amélie".
function normalize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

// Read a possibly-nested key path ("tmdb.director") off an item.
function readPath(item: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, item);
}

/**
 * Return the set of item ids matching `query` across `keys`, or `null`
 * when the query is absent / too short (caller skips filtering on that
 * field). Substring first; fuzzy only if substring matched nothing.
 *
 * @param items  the source array (its identity + keys key the Fuse cache)
 * @param query  the raw user query (trimmed + length-gated here)
 * @param keys   key paths to search, e.g. ["title"] or ["tmdb.director"]
 * @param getId  maps an item to the id used by the filter predicate
 */
export function hybridMatchIds<T>(
  items: T[],
  query: string | undefined,
  keys: string[],
  getId: (item: T) => string,
): Set<string> | null {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) return null;

  // ── Substring pass (primary) ──────────────────────────────
  const needle = normalize(trimmed);
  const ids = new Set<string>();
  for (const item of items) {
    for (const key of keys) {
      if (normalize(readPath(item, key)).includes(needle)) {
        ids.add(getId(item));
        break;
      }
    }
  }
  if (ids.size > 0) return ids;

  // ── Fuzzy fallback (only when substring found nothing) ─────
  const fuzzy = new Set<string>();
  for (const result of getFuse(items, keys).search(trimmed)) {
    fuzzy.add(getId(result.item));
  }
  return fuzzy;
}

/**
 * Combine two per-field match sets with AND semantics:
 *   • both null  → null (no search active)
 *   • one null   → the other (only that field is searched)
 *   • both set   → intersection (item must match BOTH fields)
 */
export function combineMatchSets(
  a: Set<string> | null,
  b: Set<string> | null,
): Set<string> | null {
  if (a === null) return b;
  if (b === null) return a;
  const out = new Set<string>();
  for (const id of a) if (b.has(id)) out.add(id);
  return out;
}
