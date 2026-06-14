// ─────────────────────────────────────────────────────────────────
// /films/reviews — server component (the review corpus / grid).
//
// Relocated here from /films when /films became the editorial landing
// (Phase 1). This is the filterable corpus — one view among the
// cluster's siblings (landing, reviews, future stats). Canonical for
// the corpus lives here now; /films/genre/<slug> stays the dedicated
// single-genre SEO entry and the ?genre=Single handoff still points
// at it.
//
// Reads URL params, runs applyFilters + paginate, and hands the
// result to FilmsShell (client) for filter UI + grid + pagination
// rendering. All filtering is server-side — each control change in
// FilmsShell calls router.replace, which re-runs this page with new
// params. Page-size detection mirrors /music: 30 desktop+tablet, 6
// Save-Data; the visual mobile-density split is handled by the
// responsive grid at ~160px min column width.
//
// Snapshot-only at request time: getFilms() reads
// lib/feeds/_fixtures/letterboxd-snapshot.json directly. No live
// API path. Free of rate limits, deterministic latency.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ELSEWHERE } from "@/lib/elsewhere";
import { SITE_URL } from "@/lib/site-config";
import { getFilms } from "@/lib/feeds/letterboxd";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds, combineMatchSets } from "@/lib/feeds/fuzzy-search";
import {
  applyFilters,
  asString,
  filmEntityFacets,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  slugifyGenre,
  type FilmFilters,
} from "@/lib/feeds/letterboxd-utils";
import { findEntityBySlug } from "@/lib/feeds/slug";
import {
  indexableFilmFacetNames,
  FILM_FACET_BASEPATH,
  type FilmRouteFacet,
} from "@/lib/feeds/facet-index";
import type { Film } from "@/lib/feeds/letterboxd-utils";
import { FilmsShell } from "../FilmsShell";
import { SummaryPanel } from "../SummaryPanel";

// ── Canonical handoff (single-facet → dedicated route) ─────────────
// The reviews corpus is only indexable bare. A clean single-facet state
// hands its canonical off to the dedicated route (the indexed twin): genre
// always (every genre has a route); a Wave B routable facet only when its
// value clears the floor (sub-floor values have no route, so they stay a
// noindex self-canonical filter state). Anything else — combos, pagination,
// non-routable facets (conglomerate/releaseType/budgetTier) — is
// noindex,follow self-canonical. Mirrors the genre handoff, generalized.
type ActiveDim =
  | { kind: "genre"; slug: string }
  | { kind: "facet"; facet: FilmRouteFacet; slug: string }
  | { kind: "other" };

// The slug-based routable Wave B facets (FilmFilters key → route facet).
// director is excluded — its exact facet has no clean ?param= state.
const FILM_ROUTABLE: [keyof FilmFilters, FilmRouteFacet][] = [
  ["languages", "languages"],
  ["countries", "countries"],
  ["decades", "decades"],
  ["actors", "actors"],
  ["writers", "writers"],
  ["studios", "studios"],
];

/** Every active filter dimension, tagged so we can tell a single routable
 *  facet from a combo. A multi-value facet counts as "other" (combos don't
 *  hand off). */
function activeFilmDims(filters: FilmFilters): ActiveDim[] {
  const dims: ActiveDim[] = [];
  if (filters.genres?.length) {
    dims.push(
      filters.genres.length === 1
        ? { kind: "genre", slug: slugifyGenre(filters.genres[0]) }
        : { kind: "other" },
    );
  }
  for (const [key, facet] of FILM_ROUTABLE) {
    const v = filters[key] as string[] | undefined;
    if (v?.length) {
      dims.push(v.length === 1 ? { kind: "facet", facet, slug: v[0] } : { kind: "other" });
    }
  }
  if (filters.ratings?.length) dims.push({ kind: "other" });
  if (filters.runtimeBuckets?.length) dims.push({ kind: "other" });
  if (filters.watchedYears?.length) dims.push({ kind: "other" });
  if (filters.watchedWindow !== undefined) dims.push({ kind: "other" });
  if (filters.titleQuery) dims.push({ kind: "other" });
  if (filters.directorQuery) dims.push({ kind: "other" });
  if (filters.releaseYearMin !== undefined || filters.releaseYearMax !== undefined) dims.push({ kind: "other" });
  if (filters.conglomerates?.length) dims.push({ kind: "other" });
  if (filters.releaseTypes?.length) dims.push({ kind: "other" });
  if (filters.budgetTiers?.length) dims.push({ kind: "other" });
  if (filters.collections?.length) dims.push({ kind: "other" });
  if (filters.directors?.length) dims.push({ kind: "other" });
  return dims;
}

/** Resolve the canonical URL + index directive for a filter state. */
function filmReviewsCanonical(
  filters: FilmFilters,
  isPaged: boolean,
  films: Film[],
): { canonical: string; noindex: boolean } {
  const dims = activeFilmDims(filters);
  if (!isPaged && dims.length === 1) {
    const d = dims[0];
    if (d.kind === "genre") {
      return { canonical: `/films/genre/${d.slug}`, noindex: false };
    }
    if (d.kind === "facet") {
      const names = indexableFilmFacetNames(d.facet, films);
      if (findEntityBySlug(names, d.slug)) {
        return {
          canonical: `/films/${FILM_FACET_BASEPATH[d.facet]}/${d.slug}`,
          noindex: false,
        };
      }
    }
  }
  return {
    canonical: "/films/reviews",
    noindex: dims.length > 0 || isPaged,
  };
}

// Pulled from the central registry so a URL change in Footer or
// Contact (the other two surfaces that link out to Letterboxd) is
// a single edit. Falls back to the canonical profile URL if the
// entry is somehow missing — keeps the page from rendering a
// broken CTA in that edge case.
const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

/**
 * Build the listing meta description from the live snapshot total
 * so the count never goes stale across snapshot refreshes. The
 * function is called from both `generateMetadata` and the
 * CollectionPage JSON-LD so they stay in lockstep — refresh the
 * snapshot, both update; no hardcoded literal to forget.
 */
function buildListingDescription(totalFilms: number): string {
  return `${totalFilms.toLocaleString()} films and counting, logged, rated, and reviewed. Every Letterboxd entry preserved—horror, arthouse, blockbusters. Filter by rating, genre, or year.`;
}

/**
 * Per-request metadata. Three crawl directives compose here:
 *
 *   1. /films (no params) — canonical to itself, indexable. The
 *      base listing is the canonical entity for the corpus.
 *
 *   2. /films?genre=Single (one genre, nothing else) — canonical
 *      to /films/genre/<slug>, the dedicated SEO entry point for
 *      that genre. Consolidates crawl signal; we don't want two
 *      indexable URLs for the same content.
 *
 *   3. /films?<anything-else> or ?page=N>1 — noindex,follow.
 *      Filter combinations and pagination are crawlable for
 *      discovery (follow keeps the link graph alive) but kept
 *      out of the index to avoid thin / duplicate content.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const filters = parseFilmFilters(sp);
  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;

  // Canonical + index directive: a clean single-facet state hands its
  // canonical to the dedicated route (genre always; a Wave B facet when its
  // value clears the floor); everything else is noindex,follow self-
  // canonical. See filmReviewsCanonical above.
  const { films } = getFilmsWithEnrichment();
  const { canonical, noindex } = filmReviewsCanonical(
    filters,
    isPagedBeyondFirst,
    films,
  );

  // Read the snapshot total here (cheap — module-cached after the
  // first request) so the description's count tracks the live
  // snapshot rather than a baked-in literal that goes stale every
  // refresh.
  const description = buildListingDescription(getFilms().summary.totalFilms);

  return {
    title: "Film Reviews",
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Film Reviews—Malcolm Xavier",
      description,
      // Track the canonical so unfurlers and crawlers receive the
      // same "true URL" signal: /films on the listing,
      // /films/genre/<slug> when ?genre=Single hands off. Class-
      // audit fix from tv-og-url-genre-redirect-mismatch.
      url: canonical,
      type: "website",
      // Next.js metadata `openGraph` replaces (not merges) the
      // parent's, so without explicit images here /films would
      // inherit nothing — the LinkedIn / iMessage / Slack unfurl
      // would show title + URL only, no card art. Point at the
      // sitewide programmatic OG card (Satori-rendered at
      // /opengraph-image) so the cluster reads as part of the
      // brand identity rather than a bare URL.
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Film Reviews—Malcolm Xavier",
      description,
      images: ["/opengraph-image"],
    },
  };
}

// 24 is the unified page size across mobile, tablet, and desktop.
// It divides cleanly into 1/2/3/4/6 columns — every column count
// the responsive grid produces inside the films container — so no
// row ever ends incomplete. /music's mobile-vs-desktop split isn't
// needed here: film cards are lighter (poster-only, no track meta)
// so the same density reads comfortably across viewports.
const PAGE_SIZE_DEFAULT = 24;
// Save-Data is an opt-in user signal — when present, we serve half
// the cards so the bandwidth-conscious user gets a smaller page.
// 12 keeps row math clean (1/2/3/4/6 cols all divide evenly).
const PAGE_SIZE_SAVE_DATA = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FilmsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const params = await searchParams;

  // Filter + sort + page state all live in the URL — single source
  // of truth across server renders and client navigations.
  const filters = parseFilmFilters(params);
  const sort = parseFilmSort(params);
  const rawPage = Number.parseInt(asString(params.page) ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // Save-Data shrinks the page size; the responsive grid handles
  // the visual mobile-vs-desktop split via auto-fill, so we don't
  // need separate viewport-based variants.
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  // capturedAt is intentionally not surfaced here — the snapshot's
  // freshness signal lives on /api/letterboxd/health, not on the
  // listing page itself. Destructured-and-ignored is cleaner than
  // omitting it from the destructure (which would still pull the
  // string into memory but lose the named reference for diffing).
  // Enrichment-joined corpus: each film carries `.enrichment` (cast,
  // writers, studios, language, country, budget, release, collection) so
  // the Wave B facet predicates in applyFilters can run. The per-card
  // enrichment is stripped before the page slice crosses to the client
  // (the grid doesn't render it). getFilms() stays the snapshot-only path
  // for everything else (e.g. generateMetadata's count).
  const { films, summary } = getFilmsWithEnrichment();

  // Wave B available-value distributions (name → count), shared
  // vocabulary with the filter predicate. Low-cardinality facets feed the
  // sidebar chip rails below; high-cardinality ones are computed for 6c's
  // typeahead but not surfaced yet.
  // Low-cardinality Wave B facet groups for the sidebar chip rails
  // (shared with the genre route). High-card facets are reached via stats
  // deep-links now and a constrained typeahead in 6c.
  const entityFacets = filmEntityFacets(films);

  // Genres available in the dataset, sorted by usage descending so
  // the chip rail leads with the most-common ones. Pulled from the
  // pre-aggregated summary so this is O(genres) not O(films).
  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Watched years available in the dataset. Derived from each film's
  // pre-computed watchedYearSet (built at snapshot-write time from
  // each review's watchedDate) so this is O(films) but iterates a
  // tiny set per film. Sorted desc so the chip rail leads with the
  // newest year. Going dynamic here closes
  // films-review-date-options-hardcoded-years — when 2027 ships,
  // the chip rail won't silently drop 2027 watches from filterability.
  const watchedYearSetGlobal = new Set<number>();
  for (const film of films) {
    for (const y of film.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  // Re-derive "watched this year" at request time so the count
  // matches the displayed year label (which is itself derived from
  // `new Date()`). The snapshot's pre-aggregated `summary.thisYearCount`
  // is frozen at refresh time and goes stale across the year
  // boundary — Jan 1 would otherwise display "{lastYear's count} in
  // {newYear}" until the next snapshot refresh.
  const currentYear = new Date().getUTCFullYear();
  const currentYearCount = films.filter((f) =>
    f.watchedYearSet.includes(currentYear),
  ).length;

  // Search (?title= / ?director=) — match film ids per field server-side
  // (hybrid substring→fuzzy; Fuse stays off the client bundle), then
  // intersect (Title AND Director) and let applyFilters drop the rest.
  // null when neither query is active → no search filter.
  const titleMatch = hybridMatchIds(
    films,
    filters.titleQuery,
    ["title"],
    (f) => f.id,
  );
  const directorMatch = hybridMatchIds(
    films,
    filters.directorQuery,
    ["tmdb.director"],
    (f) => f.id,
  );
  const matchIds = combineMatchSets(titleMatch, directorMatch);
  const applied = applyFilters(films, filters, sort, matchIds);
  const {
    current: pageFilms,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // Drop the server-only enrichment delta before the slice crosses to
  // the client shell — the grid renders none of it, and the cast/writer
  // arrays would bloat the RSC payload. Filtering already ran above.
  const clientFilms = pageFilms.map((a) => ({
    ...a,
    film: { ...a.film, enrichment: undefined },
  }));

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage names
  // the listing as a curated review corpus so AI-search retrievers
  // (Perplexity, ChatGPT search) understand /films's role.
  // BreadcrumbList is a single-level trail ("Films") since the
  // listing is the cluster root. Closes
  // films-listing-no-collectionpage-jsonld.
  //
  // The previous `about: { "@type": "Movie" }` field was removed
  // because Google's Rich Results validator parses bare Movie
  // entities as standalone rich-result items and flags them
  // invalid (they lack required Movie fields like image, dateCreated).
  // CollectionPage already conveys the listing's subject through
  // its name + description; the bare `about` was redundant.
  // The corpus now lives at /films/reviews (the cluster root /films
  // is the editorial landing). landingUrl anchors the breadcrumb's
  // first crumb; listingUrl is this page (the CollectionPage entity).
  const landingUrl = `${SITE_URL}/films`;
  const listingUrl = `${SITE_URL}/films/reviews`;
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Film Reviews",
        description: `Every film Malcolm Xavier has logged, rated, and reviewed on Letterboxd—${summary.totalFilms.toLocaleString()} entries spanning horror, arthouse, and blockbusters.`,
        url: listingUrl,
        inLanguage: "en-US",
        author: {
          "@type": "Person",
          name: "Malcolm Xavier",
          "@id": `${SITE_URL}/#person`,
        },
      },
      {
        // Two-level trail: the editorial landing (Films) → the corpus
        // (Reviews). Matches the cluster rail's Overview · Reviews IA.
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Films",
            item: landingUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Reviews",
            item: listingUrl,
          },
        ],
      },
    ],
  };

  // rel=prev/next link tags for pagination. Google deprecated these
  // in 2019 but Bing still uses them, and they're a low-cost crawl
  // signal. React 19 hoists <link> elements rendered in components
  // to <head> automatically. Closes films-rel-prev-next-pagination-head.
  const prevHref = page > 1 ? buildPageHref(params, page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(params, page + 1) : null;

  return (
    <div data-subbrand="film">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
      <Container size="lg">
        {/* ─── Hero + Summary (side-by-side on lg+, stacked below) ─
            On lg+ the hero and panel share one row; on smaller
            viewports the panel drops below the hero copy in natural
            reading order. The 3:2 column ratio gives the editorial
            voice (Display + Lede) more horizontal room than the
            stats sidebar — the chart still reads cleanly at the
            narrower 2-fr column width. */}
        <Section padding="lg">
          {/* Default grid stretch: both columns share the row height,
              set by the taller LEFT column (kicker + display + lede +
              follow + the cluster nav). The right column's chart then
              flex-grows to fill that height (see SummaryPanel), so the
              chart's size tracks the left column's content — films and TV
              end up with different chart heights, which is intended. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Films</Kicker>
              <Display>Every film, every rating, every reaction.</Display>
              <Lede>
                I watch 300+ films a year and log my reviews on Letterboxd. This is the
                full backlog. Open any card for the full review. And if you want a
                recommendation, the filters are there for you.
              </Lede>
              {/* Follow CTA — sits inside the Stack so it picks up the
                  Lede's gap rhythm. ↗ marks it external per the
                  CTA-arrow convention. URL pulled from the ELSEWHERE
                  registry so it stays in sync with Footer + Contact. */}
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                  eventData={{ kind: "profile-follow", surface: "films-hero" }}
                >
                  <Link href={LETTERBOXD_PROFILE_URL}>
                    Follow along on Letterboxd ↗
                  </Link>
                </TrackOnClick>
              </p>
              {/* Cluster sub-nav, inline in the hero's left column. Its
                  height is part of what makes this column the taller of
                  the two, which the stats chart on the right stretches to
                  match. "Reviews" is the active tab; "Overview" links back
                  to the editorial landing. */}
              <ClusterRail
                base="/films"
                active="reviews"
                subbrand="film"
                label="Films sections"
                className="mt-2"
              />
            </Stack>
            {/* SummaryPanel renders alongside the hero only on lg+
                so the desktop hero+panel side-by-side stays intact.
                Below lg the panel relocates to a "lifetime stats"
                footer below the grid (see the second instance after
                FilmsShell) — keeps ~300px of vertical chrome out of
                the way at narrow widths so the card grid lands
                closer to the fold on mobile and tablet. The
                duplicate render is server-only and cheap; the
                inactive variant gets display:none which removes
                the underlying <aside> landmark from the AT tree
                so SR users only ever encounter one. */}
            {/* Hidden below lg (the panel relocates to a footer). On lg+
                a flex column so the SummaryPanel's chart can flex-grow to
                fill this cell's height — which the grid has stretched to
                match the taller left (hero) column. */}
            <div className="hidden lg:flex lg:flex-col">
              <SummaryPanel summary={summary} currentYearCount={currentYearCount} />
            </div>
          </div>
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Filter rail + Grid + Pagination (client) ─────── */}
        <Section padding="md" bordered>
          {/* The All · Collections grid-nav renders INSIDE FilmsShell, at the
              top of the grid column (above the grid, not above the filter
              sidebar) — see gridNavAllCount. */}
          <FilmsShell
            films={clientFilms}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableWatchedYears={availableWatchedYears}
            entityFacets={entityFacets}
            gridNavAllCount={summary.totalFilms}
          />
        </Section>

        {/* Mobile/tablet panel — sits as a "lifetime stats" footer
            below the grid. lg:hidden hides it on desktop (where
            the hero-aligned instance above takes over). */}
        <Section padding="md" bordered className="lg:hidden">
          <SummaryPanel summary={summary} currentYearCount={currentYearCount} />
        </Section>
      </Container>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Build a relative href for /films at a specific page, preserving
 * any other query-string filters from the current request. Used by
 * the rel=prev/next link tags so paginated crawls follow the same
 * filter scope (e.g. /films?genre=Horror,Comedy&page=3).
 */
function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page") continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v[0] !== undefined) sp.set(k, v[0]);
    } else {
      sp.set(k, v);
    }
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/films/reviews?${qs}` : "/films/reviews";
}
