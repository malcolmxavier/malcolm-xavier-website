// ─────────────────────────────────────────────────────────────────
// /television — server component.
//
// Reads URL params, builds the flat CompletedCard[] from the
// snapshot's shows, runs applyCompletedCardFilters + paginate, and
// hands the result to TelevisionShell (client) for filter UI +
// grid + pagination rendering. Filtering is server-side: each
// control change in the shell calls router.replace, which re-runs
// this page with new params.
//
// Snapshot-only at request time: getShows() reads
// lib/feeds/_fixtures/serializd-snapshot.json directly. No live
// API path. Free of rate limits, deterministic latency.
//
// Sub-brand: blue. The wrapper applies data-subbrand="tv" so the
// cluster's tokens (primary blue ramp, Roboto Mono + Roboto Slab)
// take effect for every descendant link, button, and surface.
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
import { SITE_URL } from "@/lib/site-config";
import { getShows } from "@/lib/feeds/serializd";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  paginate,
  parseShowFilters,
  parseShowSort,
  slugifyGenre,
} from "@/lib/feeds/serializd-utils";
import { TelevisionShell } from "./TelevisionShell";
import { SummaryPanel } from "./SummaryPanel";

const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

/**
 * Build the listing meta description from the live snapshot
 * counts. Same posture as /films — refresh the snapshot, the
 * description updates; no hardcoded literal to forget.
 */
function buildListingDescription(
  totalShows: number,
  totalReviews: number,
): string {
  return `${totalShows.toLocaleString()} shows and ${totalReviews.toLocaleString()} reviews across show, season, and episode levels. Logged on Serializd. Filter by rating, genre, or watched year.`;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Per-request metadata. Same crawl-directive pattern as /films:
 *   1. /television (no params) — canonical to itself, indexable.
 *   2. /television?genre=Single — canonical hands off to
 *      /television/genre/<slug>.
 *   3. ?<filter combos> or ?page=N>1 — noindex,follow (filters
 *      and pagination are crawlable but kept out of the index
 *      to avoid thin / duplicate content).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const filters = parseShowFilters(sp);
  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;

  const onlyGenreFilter =
    filters.genres &&
    filters.genres.length === 1 &&
    !filters.ratings &&
    !filters.watchedYears &&
    !filters.watchedWindow &&
    filters.premiereYearMin === undefined &&
    filters.premiereYearMax === undefined &&
    !isPagedBeyondFirst;

  const filterCombinationActive =
    !onlyGenreFilter &&
    (Boolean(filters.ratings && filters.ratings.length > 0) ||
      Boolean(filters.genres && filters.genres.length > 0) ||
      Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
      filters.watchedWindow !== undefined ||
      filters.premiereYearMin !== undefined ||
      filters.premiereYearMax !== undefined);

  const noindex = filterCombinationActive || isPagedBeyondFirst;
  const canonical = onlyGenreFilter
    ? `/television/genre/${slugifyGenre(filters.genres![0])}`
    : "/television";

  const { summary } = getShows();
  const totalReviews =
    summary.totalShowReviews +
    summary.totalSeasonReviews +
    summary.totalEpisodeReviews;
  const description = buildListingDescription(summary.totalShows, totalReviews);

  return {
    title: "Television Reviews",
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Television Reviews—Malcolm Xavier",
      description,
      url: "/television",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Television Reviews—Malcolm Xavier",
      description,
      images: ["/opengraph-image"],
    },
  };
}

// 24 — same divisor logic as /films (clean 1/2/3/4/6 columns).
const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_SAVE_DATA = 12;

export default async function TelevisionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const params = await searchParams;

  const filters = parseShowFilters(params);
  const sort = parseShowSort(params);
  const rawPage = Number.parseInt(asString(params.page) ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const { shows, summary } = getShows();

  // Build the flat card list FIRST, then filter. The level-specific
  // scope filter (Show + Season require prose) is applied inside
  // buildCompletedCards. Episodes never reach the listing as cards
  // — they surface only on the detail page nested under their
  // parent Season.
  const allCards = buildCompletedCards(shows);

  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Watched years across the dataset, derived from each show's
  // pre-computed watchedYearSet so the chip rail expands as
  // Malcolm's catalog grows. Sorted desc so the chip rail leads
  // with the newest year.
  const watchedYearSetGlobal = new Set<number>();
  for (const show of shows) {
    for (const y of show.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  // Per-level "this year" counts, derived at request time so the
  // numbers track `new Date()` and stay correct across the year
  // boundary (snapshot-frozen counts would silently mismatch
  // `currentYear` between Jan 1 and the next refresh tick).
  //
  // Each mode's number reflects the level's natural unit:
  //   • show:    Show-level reviews this year (typically 0-5)
  //   • season:  Season-level reviews this year (typically 50-100)
  //   • episode: Episode-level reviews this year (typically 100-300)
  // — matching the SummaryPanel's per-mode lifetime stats. The
  // SummaryPanel reads currentYearByLevel[mode] when rendering
  // the lead-stats line so the in-year count stays scoped to the
  // active mode's level.
  const currentYear = new Date().getUTCFullYear();
  const currentYearByLevel = { show: 0, season: 0, episode: 0 } as const;
  const cybl = currentYearByLevel as { show: number; season: number; episode: number };
  for (const show of shows) {
    for (const r of show.reviews) {
      const yr = Number.parseInt(r.watchedDate.slice(0, 4), 10);
      if (yr !== currentYear) continue;
      cybl[r.level]++;
    }
  }

  const applied = applyCompletedCardFilters(allCards, filters, sort);
  const {
    current: pageCards,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage names
  // the listing as a curated review corpus so AI-search retrievers
  // (Perplexity, ChatGPT search) understand /television's role.
  // Same shape as /films's listing JSON-LD.
  const listingUrl = `${SITE_URL}/television`;
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Television Reviews",
        description: `Television Malcolm Xavier has watched and reviewed across show, season, and episode levels — ${summary.totalShows.toLocaleString()} shows logged on Serializd.`,
        url: listingUrl,
        inLanguage: "en-US",
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
            name: "Television",
            item: listingUrl,
          },
        ],
      },
    ],
  };

  // rel=prev/next link tags. React 19 hoists <link> elements
  // rendered in components to <head> automatically.
  const prevHref = page > 1 ? buildPageHref(params, page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(params, page + 1) : null;

  return (
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
      <Container size="lg">
        {/* ─── Hero + Summary ─────────────────────────────────── */}
        <Section padding="lg">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Television</Kicker>
              <Display>
                Show, season, episode — every level of how I watch.
              </Display>
              <Lede>
                I track TV three ways: shows I rate as a unit, seasons I write
                up after the finale, and episodes I log as I go. The grid
                below shows everything I&apos;ve completed at the show or
                season level. Filters are there if you want a recommendation.
              </Lede>
              {/* Hero CTA — single external link to the Serializd
                  profile. The "Watching" affordance lives on the
                  All/Watching toggle above the grid (mirrors
                  /music's All/Collections display toggle), not in
                  the hero, so the hero stays clean editorial
                  copy + one outbound link. */}
              <p style={{ margin: 0 }}>
                <Link href={SERIALIZD_PROFILE_URL}>
                  Follow along on Serializd ↗
                </Link>
              </p>
            </Stack>
            <div className="hidden lg:block">
              <SummaryPanel
                summary={summary}
                currentYearByLevel={cybl}
              />
            </div>
          </div>
        </Section>

        {/* ─── Filter rail + Grid + Pagination (client) ───────── */}
        <Section padding="md" bordered>
          <TelevisionShell
            cards={pageCards}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableWatchedYears={availableWatchedYears}
            originHref={buildOriginHref("/television", params)}
            watchingCount={summary.showsInProgressCount}
          />
        </Section>

        {/* Mobile/tablet panel — sits as a "lifetime stats" footer
            below the grid. lg:hidden hides it on desktop. */}
        <Section padding="md" bordered className="lg:hidden">
          <SummaryPanel
            summary={summary}
            currentYearByLevel={cybl}
          />
        </Section>
      </Container>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Reconstruct the relative URL (pathname + query string) of the
 * current listing — passed to TelevisionShell as originHref so
 * each ShowCard can encode it on its detail-page link. The detail
 * page then knows the user's filter+sort context for
 * adjacent-show navigation.
 *
 * Strips back-nav meta-state markers (`ref`, `from`) so the
 * encoded source URL is always a clean listing URL — never the
 * detail page the user might've arrived from.
 */
function buildOriginHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "ref" || k === "from") continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v[0] !== undefined) sp.set(k, v[0]);
    } else {
      sp.set(k, v);
    }
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Build a relative href for /television at a specific page,
 * preserving any other query-string filters from the current
 * request. Used by the rel=prev/next link tags so paginated
 * crawls follow the same filter scope.
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
  return qs ? `/television?${qs}` : "/television";
}
