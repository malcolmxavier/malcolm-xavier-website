// ─────────────────────────────────────────────────────────────────
// list-taxonomy.ts — the shared "matrix engine" for editorial lists.
//
// Both clusters' lists (Letterboxd films, Serializd TV) are organized
// as a YEAR × SCOPE × METHOD matrix, plus topical one-offs:
//
//   • Year   — 2023, 2024, 2025 … (parsed from the list title)
//   • Scope  — "New Releases" (premiered that year) vs "Backlog"
//              (watched that year, but premiered earlier — Malcolm's
//              "Unbiased … recency bias be damned" lists)
//   • Method — "Editor's Cut" (star rating disregarded, fully
//              editorialized) vs "Ratings Cut" (ranked by star rating)
//   • Featured — topical lists that don't fit the grid (e.g. "2026
//              Best Picture Nominees Ranked")
//
// The four same-year cells are GENUINELY DIFFERENT rankings (the method
// pairs share only ~70% of titles; the scope pairs share none), so the
// hub shows the full labeled 2×2 rather than collapsing them — the
// labels are what make four similar-titled lists legible at a glance.
//
// Classification reads the list TITLE (keyed on "Unbiased" / "Fully
// Editorialized" / "Top N"). Malcolm will align the Letterboxd/Serializd
// source titles to this convention at launch; if the title wording
// changes then, revisit the keywords here — there's deliberately no
// reconciliation layer between source titles and these labels.
//
// Pure + dependency-free, so it's safe to import from client components.
// ─────────────────────────────────────────────────────────────────

/** Scope axis: a current-year list vs a catalog ("Unbiased") list. */
export type ListScope = "new" | "backlog";
/** Method axis: fully editorialized vs ranked by star rating. */
export type ListMethod = "editorial" | "rating";
/** Whether a list sits in the year grid or stands alone (topical). */
export type ListKind = "matrix" | "featured";

export type ListFacets = {
  /** Four-digit year parsed from the title, or null if none. */
  year: number | null;
  /** Scope axis (meaningful only for `kind: "matrix"`). */
  scope: ListScope;
  /** Method axis (meaningful only for `kind: "matrix"`). */
  method: ListMethod;
  /** Grid member vs topical one-off. */
  kind: ListKind;
};

/**
 * Classify a list from its title. A list joins the year grid only when
 * it both names a year AND reads as a "Top N" ranking; anything else
 * (e.g. "2026 Best Picture Nominees Ranked") is a topical one-off.
 */
export function classifyList(title: string): ListFacets {
  const name = (title ?? "").trim();
  const yearMatch = name.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  const scope: ListScope = /^unbiased\b/i.test(name) ? "backlog" : "new";
  const method: ListMethod = /fully\s+editorialized/i.test(name)
    ? "editorial"
    : "rating";

  // Grid membership needs a year and a "Top N" shape; without both the
  // list can't be placed in a cell, so it's Featured.
  const isTopN = /\btop\s*\d+\b/i.test(name);
  const kind: ListKind = year !== null && isTopN ? "matrix" : "featured";

  return { year, scope, method, kind };
}

/** Title Case browse label for the scope axis. */
export function scopeLabel(scope: ListScope): string {
  return scope === "new" ? "New Releases" : "Backlog";
}

/** Title Case browse label for the method axis. */
export function methodLabel(method: ListMethod): string {
  return method === "editorial" ? "Editor's Cut" : "Ratings Cut";
}

/** One scope row's two method cells (either may be absent). */
export type ListCell<T> = { editorial: T | null; rating: T | null };

/** One year's 2×2: a New-Releases row and a Backlog row. */
export type ListYearGroup<T> = {
  year: number;
  new: ListCell<T>;
  backlog: ListCell<T>;
};

/** Result of grouping: the year grid (newest first) + the featured bucket. */
export type GroupedLists<T> = {
  years: ListYearGroup<T>[];
  featured: T[];
};

/**
 * Group a cluster's lists into the year grid + a featured bucket.
 * Generic over the list type via a `getName` accessor (FilmList uses
 * `title`, ShowList uses `name`). Matrix lists slot into their
 * year/scope/method cell; if two lists collide on the same cell the
 * first wins and the rest fall through to `featured` (so nothing is
 * silently dropped). Featured lists keep their input order.
 */
export function groupListsByYear<T>(
  lists: T[],
  getName: (list: T) => string,
): GroupedLists<T> {
  const byYear = new Map<number, ListYearGroup<T>>();
  const featured: T[] = [];

  const emptyGroup = (year: number): ListYearGroup<T> => ({
    year,
    new: { editorial: null, rating: null },
    backlog: { editorial: null, rating: null },
  });

  for (const list of lists) {
    const { year, scope, method, kind } = classifyList(getName(list));
    if (kind !== "matrix" || year === null) {
      featured.push(list);
      continue;
    }
    if (!byYear.has(year)) byYear.set(year, emptyGroup(year));
    const cell = byYear.get(year)![scope];
    if (cell[method] === null) {
      cell[method] = list;
    } else {
      // Cell already taken — don't lose the list; surface it as featured.
      featured.push(list);
    }
  }

  const years = [...byYear.values()].sort((a, b) => b.year - a.year);
  return { years, featured };
}

/**
 * Flat browse order for the landing teaser (which shows the top few):
 * featured one-offs first (they're the most distinctive), then the grid
 * newest-year-first, and within a year the editorialized cuts before the
 * ratings cuts, New Releases before Backlog. Stable + deterministic.
 */
export function orderForTeaser<T>(
  lists: T[],
  getName: (list: T) => string,
): T[] {
  const { years, featured } = groupListsByYear(lists, getName);
  const ordered: T[] = [...featured];
  for (const y of years) {
    for (const cell of [y.new, y.backlog]) {
      if (cell.editorial) ordered.push(cell.editorial);
    }
    for (const cell of [y.new, y.backlog]) {
      if (cell.rating) ordered.push(cell.rating);
    }
  }
  return ordered;
}
