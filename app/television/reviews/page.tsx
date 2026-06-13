// ─────────────────────────────────────────────────────────────────
// /television/reviews — server component (the review corpus / grid).
//
// Relocated here from /television when /television became the
// editorial landing (Phase 1). The filterable corpus — one view among
// the cluster's siblings (landing, reviews, watching, future stats).
// Canonical for the corpus lives here; /television/genre/<slug> stays
// the dedicated single-genre SEO entry and the ?genre=Single handoff
// still points at it. The miniseries double-count rule (modesForReview)
// is preserved verbatim below.
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
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { getShows, getWatchingExclusions } from "@/lib/feeds/serializd";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds } from "@/lib/feeds/fuzzy-search";
import { modesForReview } from "@/lib/feeds/serializd-mode-counts.mjs";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  paginate,
  parseShowFilters,
  parseShowSort,
  showEntityFacets,
  slugifyGenre,
  deriveAvailableNetworks,
  deriveAvailableTypes,
} from "@/lib/feeds/serializd-utils";
import { TelevisionShell } from "../TelevisionShell";
import { SummaryPanel } from "../SummaryPanel";

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
  return `${totalShows.toLocaleString()} shows and ${totalReviews.toLocaleString()} reviews and counting, across show, season, and episode levels. Logged on Serializd. Filter by rating, genre, watched year, or review level.`;
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
    !filters.networks &&
    !filters.types &&
    !filters.watchedYears &&
    !filters.watchedWindow &&
    !filters.titleQuery &&
    filters.premiereYearMin === undefined &&
    filters.premiereYearMax === undefined &&
    !isPagedBeyondFirst;

  const filterCombinationActive =
    !onlyGenreFilter &&
    (Boolean(filters.ratings && filters.ratings.length > 0) ||
      Boolean(filters.genres && filters.genres.length > 0) ||
      Boolean(filters.networks && filters.networks.length > 0) ||
      Boolean(filters.types && filters.types.length > 0) ||
      Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
      filters.watchedWindow !== undefined ||
      Boolean(filters.titleQuery) ||
      filters.premiereYearMin !== undefined ||
      filters.premiereYearMax !== undefined);

  const noindex = filterCombinationActive || isPagedBeyondFirst;
  const canonical = onlyGenreFilter
    ? `/television/genre/${slugifyGenre(filters.genres![0])}`
    : "/television/reviews";

  const { summary } = getShows();
  const totalReviews =
    summary.totalShowReviews +
    summary.totalSeasonReviews +
    summary.totalEpisodeReviews;
  const description = buildListingDescription(summary.totalShows, totalReviews);

  // When ?genre=Single hands off, surface a genre-scoped social
  // title so a share of /television?genre=Drama unfurls with
  // "Drama TV Reviews—Malcolm Xavier" instead of the generic
  // listing title. Listing-without-params keeps the parent title.
  const socialTitle = onlyGenreFilter
    ? `${filters.genres![0]} TV Reviews—Malcolm Xavier`
    : "Television Reviews—Malcolm Xavier";

  return {
    title: "Television Reviews",
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: socialTitle,
      description,
      // Track the canonical so unfurlers and crawlers receive the
      // same "true URL" signal: /television on the listing,
      // /television/genre/<slug> when ?genre=Single hands off.
      // Without this, og:url stays on /television while canonical
      // points elsewhere — a contradictory pair flagged by
      // tv-og-url-genre-redirect-mismatch.
      url: canonical,
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
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

  // Enrichment-joined corpus: each show carries `.enrichment` (cast,
  // creators, language, country) so the Wave B facet predicates can run.
  // Stripped from the card slice before it crosses to the client shell.
  const { shows, summary } = getShowsWithEnrichment();

  // Low-cardinality Wave B facet groups for the sidebar chip rails
  // (language, country, network group, decade), shared with the genre
  // route. Actors/creators are high-card — deep-links now, typeahead 6c.
  const entityFacets = showEntityFacets(shows);

  // Build the flat card list FIRST, then filter. The level-specific
  // scope filter (Show + Season require prose) is applied inside
  // buildCompletedCards. Episodes never reach the listing as cards
  // — they surface only on the detail page nested under their
  // parent Season.
  const allCards = buildCompletedCards(shows);

  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Networks (canonical primary) and TMDB types present in the
  // dataset, frequency-sorted — drive the new filter chip rails.
  const availableNetworks = deriveAvailableNetworks(shows);
  const availableTypes = deriveAvailableTypes(shows);

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

  // Per-mode "this year" counts, derived at request time so the
  // numbers track `new Date()` and stay correct across the year
  // boundary (snapshot-frozen counts would silently mismatch
  // `currentYear` between Jan 1 and the next refresh tick).
  //
  // Per-mode bucketing routes through modesForReview — the same
  // helper that drives lifetime totals in aggregateSummary. This
  // keeps the miniseries double-count rule consistent across both
  // surfaces (a Show review on a miniseries-pinned show counts in
  // both Shows and Seasons modes, etc.). Don't increment cybl[r.level]
  // directly — that path bypasses the double-count rule and produces
  // in-year totals that under-report relative to the lifetime totals
  // displayed alongside them. The rule is the editorial source of
  // truth for /television's per-mode arithmetic; see
  // lib/feeds/serializd-mode-counts.mjs.
  const currentYear = new Date().getUTCFullYear();
  const cybl = { show: 0, season: 0, episode: 0 };
  // Parallel sum + count per mode so the SummaryPanel can render
  // an in-year average next to the lifetime one. Same modesForReview
  // routing as the count loop below so the in-year avg honors the
  // miniseries double-count rule (a miniseries Season's rating
  // contributes to the Shows-mode average too). Null when a mode
  // has zero rated reviews this year — SummaryPanel suppresses the
  // parenthetical in that case rather than displaying NaN★.
  const cyblRatingSums = { show: 0, season: 0, episode: 0 };
  const cyblRatingCounts = { show: 0, season: 0, episode: 0 };
  for (const show of shows) {
    for (const r of show.reviews) {
      const yr = Number.parseInt(r.watchedDate.slice(0, 4), 10);
      if (yr !== currentYear) continue;
      for (const mode of modesForReview(r.level, show.isMiniseries)) {
        cybl[mode]++;
        if (r.rating !== null) {
          cyblRatingSums[mode] += r.rating;
          cyblRatingCounts[mode]++;
        }
      }
    }
  }
  const currentYearAvgByLevel: { show: number | null; season: number | null; episode: number | null } = {
    show: cyblRatingCounts.show > 0 ? cyblRatingSums.show / cyblRatingCounts.show : null,
    season: cyblRatingCounts.season > 0 ? cyblRatingSums.season / cyblRatingCounts.season : null,
    episode: cyblRatingCounts.episode > 0 ? cyblRatingSums.episode / cyblRatingCounts.episode : null,
  };

  // Watching count for the All/Watching toggle badge — must match
  // what /television/watching renders post-exclusion (perpetual
  // shows like SNL/WWHL are filtered there). Re-derived from the
  // same exclusion source so both surfaces stay in sync without
  // a snapshot rebuild.
  const watchingExclusions = getWatchingExclusions();
  const watchingCount = shows.filter(
    (s) =>
      !watchingExclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;

  // Title search (?title=) — match SHOW ids by name server-side (hybrid
  // substring→fuzzy, over the unique shows so no duplicate-name skew),
  // then drop non-matching cards. null when no/short query. TV has no
  // director field, so title is the only search dimension.
  const matchIds = hybridMatchIds(shows, filters.titleQuery, ["name"], (s) => s.id);
  const applied = applyCompletedCardFilters(allCards, filters, sort, matchIds);
  const {
    current: pageCards,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // Drop the server-only enrichment delta before the card slice crosses
  // to the client shell — the grid renders none of it. Filtering already
  // ran above on the enriched corpus.
  const clientCards = pageCards.map((c) => ({
    ...c,
    show: { ...c.show, enrichment: undefined },
  }));

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage names
  // the listing as a curated review corpus so AI-search retrievers
  // (Perplexity, ChatGPT search) understand /television's role.
  // Same shape as /films's listing JSON-LD.
  // The corpus now lives at /television/reviews (the cluster root
  // /television is the editorial landing). landingUrl anchors the
  // breadcrumb's first crumb; listingUrl is this CollectionPage.
  const landingUrl = `${SITE_URL}/television`;
  const listingUrl = `${SITE_URL}/television/reviews`;
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Television Reviews",
        description: `Television Malcolm Xavier has watched and reviewed across show, season, and episode levels—${summary.totalShows.toLocaleString()} shows logged on Serializd.`,
        url: listingUrl,
        inLanguage: "en-US",
        // about ties the page to Malcolm's Person entity so AI-search
        // retrievers (Perplexity, ChatGPT search) constructing answers
        // about "Malcolm Xavier's television watching" pick up the
        // entity link. author already covers authorship; about
        // declares subject.
        about: { "@id": `${SITE_URL}/#person` },
        author: {
          "@type": "Person",
          name: "Malcolm Xavier",
          "@id": `${SITE_URL}/#person`,
        },
      },
      {
        // Two-level trail: the editorial landing (Television) → the
        // corpus (Reviews). Matches the cluster rail's IA.
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Television",
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
          {/* Default grid stretch: both columns share the row height, set
              by the taller LEFT column (kicker + display + lede + follow +
              cluster nav). The right column's chart flex-grows to fill that
              height (see SummaryPanel), so it matches the left column. TV's
              chart ends up shorter than films' — that's expected. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Television</Kicker>
              <Display>Don&apos;t change the channel.</Display>
              <Lede>
                I watch 100+ seasons of television a year and log my
                reviews on Serializd. Open any card for the full review
                hierarchy. And if you want a recommendation, the
                filters are there for you.
              </Lede>
              {/* Hero CTA — single external link to the Serializd
                  profile. The "Watching" affordance lives on the
                  All/Watching toggle above the grid (mirrors
                  /music's All/Collections display toggle), not in
                  the hero, so the hero stays clean editorial
                  copy + one outbound link. */}
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                  eventData={{
                    kind: "profile-follow",
                    surface: "listing-hero",
                  }}
                >
                  <Link href={SERIALIZD_PROFILE_URL}>
                    Follow along on Serializd ↗
                  </Link>
                </TrackOnClick>
              </p>
              {/* Cluster sub-nav, inline in the hero's left column — part of
                  what makes this column the taller of the two, which the
                  stats chart on the right stretches to match. "Reviews" is
                  active; "Overview" links back to the editorial landing. */}
              <ClusterRail
                base="/television"
                active="reviews"
                subbrand="tv"
                label="Television sections"
                className="mt-2"
              />
            </Stack>
            {/* Hidden below lg (panel relocates to a footer). On lg+ a flex
                column so the SummaryPanel's chart can flex-grow to fill this
                cell's height — which the grid stretched to match the taller
                left (hero) column. Matches /films/reviews. */}
            <div className="hidden lg:flex lg:flex-col">
              <SummaryPanel
                summary={summary}
                currentYearByLevel={cybl}
                currentYearAvgByLevel={currentYearAvgByLevel}
              />
            </div>
          </div>
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Catalog stat-bar + Filter rail + Grid + Pagination ─ */}
        <Section padding="md" bordered>
          {/* The catalog kicker surfaces the three-level review
              system as concrete numbers above the grid. Order
              (Seasons / Shows / Episodes) matches the SummaryPanel
              mode toggle's default mode so the cluster's vocabulary
              stays consistent across surfaces. Renders Kicker-styled
              (mono uppercase, --text-caption color) so the line
              reads as an editorial label, not a SaaS stat-bar.
              Source is titlecase to match the SummaryPanel toggle's
              source register; CSS textTransform:uppercase renders
              both surfaces identically at runtime. Source-level
              alignment from the 2026-05-07 re-review. */}
          <div style={{ marginBottom: "var(--scale-500)" }}>
            <Kicker>
              The catalog:{" "}
              {summary.totalSeasonReviews.toLocaleString()} Seasons ·{" "}
              {summary.totalShowReviews.toLocaleString()} Shows ·{" "}
              {summary.totalEpisodeReviews.toLocaleString()} Episodes
            </Kicker>
          </div>
          <TelevisionShell
            cards={clientCards}
            allCount={allCards.length}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableNetworks={availableNetworks}
            availableTypes={availableTypes}
            availableWatchedYears={availableWatchedYears}
            entityFacets={entityFacets}
            originHref={buildOriginHref("/television/reviews", params)}
            watchingCount={watchingCount}
          />
        </Section>

        {/* Mobile/tablet panel — sits as a "lifetime stats" footer
            below the grid. lg:hidden hides it on desktop. */}
        <Section padding="md" bordered className="lg:hidden">
          <SummaryPanel
            summary={summary}
            currentYearByLevel={cybl}
            currentYearAvgByLevel={currentYearAvgByLevel}
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
  return qs ? `/television/reviews?${qs}` : "/television/reviews";
}
