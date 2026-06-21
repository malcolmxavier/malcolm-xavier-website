// Exclusion-aware URL encoding for the stats-page filters
// (STATS-FILTERS-SPEC §7, Locked decision 4).
//
// The query model needs include AND exclude per dimension. The locked
// encoding is a comma-separated value list where each EXCLUDED value carries
// a leading "!":
//
//     ?country=!us,!uk          → exclude US and UK
//     ?genre=horror,!us         → include horror, exclude us (same dimension)
//     ?genre=horror,thriller    → include horror OR thriller
//
// This module is the single source of truth for splitting one dimension's
// raw param value into its include / exclude slug arrays, and for
// serializing a pair of arrays back into that param value. It is pure and
// client-safe — NOT wired into route handlers here; it's the reusable helper
// the stats route parser (a later build step) will call.

// The leading marker that flags a value as excluded. Locked: "!".
const EXCLUDE_MARKER = "!";

// The result of parsing one dimension's raw param value.
export interface IncludeExclude {
  // Values the user wants present (OR within the dimension).
  include: string[];
  // Values the user wants absent (AND NOT).
  exclude: string[];
}

// Parse one dimension's raw query value (e.g. "horror,!us,!uk") into its
// include and exclude slug arrays.
//
// Rules:
// - Split on commas; trim each token; drop empties (so "a,,b" and trailing
//   commas are tolerated, matching the existing parseCsvStrings convention).
// - A token starting with "!" is an exclude; the marker is stripped from the
//   stored slug. A bare "!" (marker with no value) is ignored.
// - Order is preserved within each bucket (the rails render in URL order).
// - Duplicates are de-duped within each bucket (first occurrence wins), so a
//   tampered "?genre=horror,horror" doesn't double-render.
export function parseDimension(raw: string | undefined | null): IncludeExclude {
  const include: string[] = [];
  const exclude: string[] = [];
  if (!raw) return { include, exclude };

  const seenInclude = new Set<string>();
  const seenExclude = new Set<string>();

  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token) continue;

    if (token.startsWith(EXCLUDE_MARKER)) {
      // Strip the leading marker to recover the slug. A bare "!" → empty → skip.
      const slug = token.slice(EXCLUDE_MARKER.length).trim();
      if (!slug || seenExclude.has(slug)) continue;
      seenExclude.add(slug);
      exclude.push(slug);
    } else {
      if (seenInclude.has(token)) continue;
      seenInclude.add(token);
      include.push(token);
    }
  }

  return { include, exclude };
}

// Serialize include / exclude slug arrays back into one dimension's param
// value. Includes are written bare; excludes get the leading "!". Includes
// come first, then excludes, each in array order — a deterministic ordering
// so a round-trip (serialize → parse → serialize) is stable and shareable
// URLs are canonical. Returns an empty string when both arrays are empty, so
// the caller can drop the param entirely (an empty param is not emitted).
export function serializeDimension(
  include: ReadonlyArray<string>,
  exclude: ReadonlyArray<string>,
): string {
  const parts: string[] = [];
  for (const slug of include) {
    const s = slug.trim();
    if (s) parts.push(s);
  }
  for (const slug of exclude) {
    const s = slug.trim();
    if (s) parts.push(`${EXCLUDE_MARKER}${s}`);
  }
  return parts.join(",");
}
