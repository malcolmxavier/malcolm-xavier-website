// ─────────────────────────────────────────────────────────────────
// Provenance + bucketing helpers (language, country, budget, era).
//
// Ported from the stats sketch (build-stats-sketch.mjs lines 463–465,
// 606–627, 720–721, 758). TMDB stores language as a lowercase ISO-639
// code ("ja") and country as a 2-letter code with inconsistent case
// ("US" on films, "us" on shows) — these normalize the case and map
// the codes to display names. Budget and release-year bucketers turn
// raw numbers into the tier/era labels the dashboards group by.
//
// NOTE: genre is intentionally NOT canonicalized — the sketch (and
// production) count raw TMDB genres verbatim, so there's no genre map
// here (locked 2026-06-11).
//
// Resolution order for country/language is: curated override map (below)
// → Intl.DisplayNames (full ISO coverage via the runtime's ICU data) →
// the raw code. The override map is the source of truth for friendly/short
// names ("UK" not "United Kingdom") AND for slug stability on the indexed
// country/language routes (so an ICU update can't silently rename a route);
// every other code a world-cinema corpus throws at us — "ga", "NL", … —
// resolves via ICU instead of surfacing as a raw code the way it used to.
// Mapping runs server-side (the distribution builders), so ICU-version
// variance never causes a hydration mismatch.
//
// Pure functions, one built-in dep (Intl).
// ─────────────────────────────────────────────────────────────────

/**
 * Country ISO-3166 (uppercase) → display name. The curated source of
 * truth for the friendly/short names (and the stable slugs the indexed
 * country routes depend on); any code NOT listed resolves via Intl below.
 * Keep entries even where they match ICU so an indexed route's slug can't
 * shift if a future ICU update renames a region.
 */
export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "UK",
  FR: "France",
  JP: "Japan",
  CA: "Canada",
  ES: "Spain",
  IT: "Italy",
  KR: "South Korea",
  DE: "Germany",
  AU: "Australia",
  RU: "Russia",
  CL: "Chile",
  IE: "Ireland",
  DK: "Denmark",
  NO: "Norway",
  SE: "Sweden",
  MX: "Mexico",
  IN: "India",
  CN: "China",
  HK: "Hong Kong",
  BR: "Brazil",
  BE: "Belgium",
  // ICU renders this "Palestinian Territories"; the shorter form reads
  // better as a facet label.
  PS: "Palestine",
};

/**
 * Language ISO-639 (lowercase) → display name. Curated source of truth for
 * the indexable languages' slugs; unlisted codes resolve via Intl below.
 * Includes TMDB's two non-ISO codes ICU can't resolve: "xx" (no spoken
 * language) and "cn" (Cantonese, which ISO-639-1 has no code for).
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  ja: "Japanese",
  es: "Spanish",
  it: "Italian",
  no: "Norwegian",
  da: "Danish",
  he: "Hebrew",
  ko: "Korean",
  de: "German",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  fa: "Persian",
  nl: "Dutch",
  zh: "Chinese",
  sv: "Swedish",
  xx: "No language",
  cn: "Cantonese",
};

// Lazily-built ICU resolvers. fallback:"none" makes `.of()` return
// undefined for codes ICU doesn't know, so we can fall back to the raw
// code ourselves rather than echoing ICU's "code" fallback.
const REGION_DISPLAY = makeDisplayNames("region");
const LANGUAGE_DISPLAY = makeDisplayNames("language");

function makeDisplayNames(
  type: "region" | "language",
): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(["en"], { type, fallback: "none" });
  } catch {
    return null; // very old runtime without Intl.DisplayNames
  }
}

/** ICU display name for a code, or undefined (unknown / malformed / no ICU). */
function intlName(
  display: Intl.DisplayNames | null,
  code: string,
): string | undefined {
  if (!display || !code) return undefined;
  try {
    return display.of(code) ?? undefined;
  } catch {
    return undefined; // RangeError on a malformed code
  }
}

/** Look up a display name in a code→name map; unmapped codes pass through. */
export function nameFor(code: string, map: Record<string, string>): string {
  return map[code] || code;
}

/** Normalize a raw country value to its canonical uppercase code (case-merge). */
export function normalizeCountry(raw: string | null | undefined): string {
  return String(raw || "").toUpperCase();
}

/** Normalize a raw language value to its canonical lowercase code (case-merge). */
export function normalizeLanguage(raw: string | null | undefined): string {
  return String(raw || "").toLowerCase();
}

/** Display name for a raw country value: override → ICU → raw code. */
export function countryName(raw: string | null | undefined): string {
  const code = normalizeCountry(raw);
  return COUNTRY_NAMES[code] ?? intlName(REGION_DISPLAY, code) ?? code;
}

/** Display name for a raw language value: override → ICU → raw code. */
export function languageName(raw: string | null | undefined): string {
  const code = normalizeLanguage(raw);
  return LANGUAGE_NAMES[code] ?? intlName(LANGUAGE_DISPLAY, code) ?? code;
}

// ─── Budget tiers ────────────────────────────────────────────────

/** Budget-tier labels, indexed by budgetTierIndex(). */
export const BUDGET_TIER_LABELS = [
  "micro <$5M",
  "indie $5–30M",
  "mid $30–100M",
  "blockbuster >$100M",
] as const;

/** Budget (USD) → tier index 0–3. */
export function budgetTierIndex(budget: number): number {
  return budget < 5e6 ? 0 : budget < 30e6 ? 1 : budget < 1e8 ? 2 : 3;
}

/** Budget (USD) → tier label. */
export function budgetTierLabel(budget: number): string {
  return BUDGET_TIER_LABELS[budgetTierIndex(budget)];
}

// ─── Release eras ────────────────────────────────────────────────

/** Release-era labels, indexed by releaseEraIndex(). */
export const RELEASE_ERAS = ["<2010", "2010s", "2020s"] as const;

/** Release year → era index 0–2. */
export function releaseEraIndex(year: number): number {
  return year < 2010 ? 0 : year < 2020 ? 1 : 2;
}

/** Release year → era label. */
export function releaseEraLabel(year: number): string {
  return RELEASE_ERAS[releaseEraIndex(year)];
}
