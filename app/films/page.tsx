// ─────────────────────────────────────────────────────────────────
// /films — server component.
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
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ELSEWHERE } from "@/lib/elsewhere";
import { SITE_URL } from "@/lib/site-config";
import { getFilms } from "@/lib/feeds/letterboxd";
import {
  applyFilters,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  slugifyGenre,
} from "@/lib/feeds/letterboxd-utils";
import { FilmsShell } from "./FilmsShell";
import { SummaryPanel } from "./SummaryPanel";

// Pulled from the central registry so a URL change in Footer or
// Contact (the other two surfaces that link out to Letterboxd) is
// a single edit. Falls back to the canonical profile URL if the
// entry is somehow missing — keeps the page from rendering a
// broken CTA in that edge case.
const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

const LISTING_DESCRIPTION =
  "741 films and counting, logged, rated, and reviewed. Every Letterboxd entry preserved—horror, arthouse, blockbusters. Filter by rating, genre, or year.";

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

  // Detect "single genre, nothing else" — the case where canonical
  // should hand off to the dedicated /films/genre/<slug> route.
  const onlyGenreFilter =
    filters.genres &&
    filters.genres.length === 1 &&
    !filters.ratings &&
    !filters.watchedYears &&
    !filters.watchedWindow &&
    filters.releaseYearMin === undefined &&
    filters.releaseYearMax === undefined &&
    !isPagedBeyondFirst;

  const filterCombinationActive =
    !onlyGenreFilter &&
    (Boolean(filters.ratings && filters.ratings.length > 0) ||
      Boolean(filters.genres && filters.genres.length > 0) ||
      Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
      filters.watchedWindow !== undefined ||
      filters.releaseYearMin !== undefined ||
      filters.releaseYearMax !== undefined);

  const noindex = filterCombinationActive || isPagedBeyondFirst;

  const canonical = onlyGenreFilter
    ? `/films/genre/${slugifyGenre(filters.genres![0])}`
    : "/films";

  return {
    title: "Film Reviews",
    description: LISTING_DESCRIPTION,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Film Reviews—Malcolm Xavier",
      description: LISTING_DESCRIPTION,
      url: "/films",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Film Reviews—Malcolm Xavier",
      description: LISTING_DESCRIPTION,
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
  const { films, summary } = getFilms();

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

  const applied = applyFilters(films, filters, sort);
  const {
    current: pageFilms,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage names
  // the listing as a curated review corpus so AI-search retrievers
  // (Perplexity, ChatGPT search) understand /films's role; the
  // about: { @type: Movie } tag anchors the entity to the broad
  // Movie vocabulary. BreadcrumbList is a single-level trail
  // ("Films") since the listing is the cluster root. Closes
  // films-listing-no-collectionpage-jsonld.
  const listingUrl = `${SITE_URL}/films`;
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Film Reviews",
        description:
          "Every film Malcolm Xavier has logged, rated, and reviewed on Letterboxd—741 entries spanning horror, arthouse, and blockbusters.",
        url: listingUrl,
        inLanguage: "en-US",
        about: { "@type": "Movie" },
        author: {
          "@type": "Person",
          name: "Malcolm Xavier",
          "@id": `${SITE_URL}/#person`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Films",
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
          {/* No items-start: with default grid stretch alignment,
              both columns share the row's height (= the taller
              column's intrinsic height). The panel uses lg:h-full
              to fill that height; its chart flex-grows to claim
              whatever vertical space the hero column dictates. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Films</Kicker>
              <Display>Every film, every rating, every reaction.</Display>
              <Lede>
                I watch 300+ films a year and log my reviews on Letterboxd. This is the
                full backlog. Open any card for the full review. And if you want a
                recommendation, the filters are right there.
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
            <div className="hidden lg:block">
              <SummaryPanel summary={summary} currentYearCount={currentYearCount} />
            </div>
          </div>
        </Section>

        {/* ─── Filter rail + Grid + Pagination (client) ─────── */}
        <Section padding="md" bordered>
          <FilmsShell
            films={pageFilms}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableWatchedYears={availableWatchedYears}
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

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

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
  return qs ? `/films?${qs}` : "/films";
}
