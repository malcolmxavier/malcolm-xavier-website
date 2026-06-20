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
import {
  getShows,
  getWatchingExclusions,
  getShowLists,
} from "@/lib/feeds/serializd";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds } from "@/lib/feeds/fuzzy-search";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  paginate,
  parseShowFilters,
  parseShowSort,
  slugifyGenre,
  deriveAvailableTypes,
  type ShowFilters,
  type Show,
} from "@/lib/feeds/serializd-utils";
import { slugifyEntity, findEntityBySlug } from "@/lib/feeds/slug";
import { buildOriginHref } from "@/lib/feeds/origin-href";
import {
  curatedShowEntityFacets,
  curatedTvRailNetworks,
  indexableTvFacetNames,
  isIndexableTvFacet,
  TV_FACET_BASEPATH,
  type TvRouteFacet,
} from "@/lib/feeds/facet-index";
import { TelevisionShell } from "../TelevisionShell";

const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

// ── Canonical handoff (single-facet → dedicated route) ─────────────
// Mirror of the film reviews handoff. TV adds two NAME-based facets
// (network, type — the WS3 filters store canonical names, not slugs); the
// route slug for those is slugifyEntity(name). The rest are slug-based.
type ActiveDim =
  | { kind: "genre"; slug: string }
  | { kind: "facet"; facet: TvRouteFacet; value: string; nameBased: boolean }
  | { kind: "other" };

// ShowFilters key → route facet → whether the filter value is a NAME
// (network/type) or a slug.
const TV_ROUTABLE: [keyof ShowFilters, TvRouteFacet, boolean][] = [
  ["creators", "creators", false],
  ["actors", "actors", false],
  ["networks", "networks", true],
  ["languages", "languages", false],
  ["countries", "countries", false],
  ["types", "types", true],
  ["decades", "decades", false],
];

function activeTvDims(filters: ShowFilters): ActiveDim[] {
  const dims: ActiveDim[] = [];
  if (filters.genres?.length) {
    dims.push(
      filters.genres.length === 1
        ? { kind: "genre", slug: slugifyGenre(filters.genres[0]) }
        : { kind: "other" },
    );
  }
  for (const [key, facet, nameBased] of TV_ROUTABLE) {
    const v = filters[key] as string[] | undefined;
    if (v?.length) {
      dims.push(
        v.length === 1
          ? { kind: "facet", facet, value: v[0], nameBased }
          : { kind: "other" },
      );
    }
  }
  if (filters.ratings?.length) dims.push({ kind: "other" });
  if (filters.watchedYears?.length) dims.push({ kind: "other" });
  if (filters.watchedWindow !== undefined) dims.push({ kind: "other" });
  if (filters.titleQuery) dims.push({ kind: "other" });
  if (
    filters.premiereYearMin !== undefined ||
    filters.premiereYearMax !== undefined
  )
    dims.push({ kind: "other" });
  if (filters.cardKind !== undefined) dims.push({ kind: "other" });
  if (filters.conglomerates?.length) dims.push({ kind: "other" });
  return dims;
}

/** Resolve the canonical URL + index directive for a TV filter state. */
function tvReviewsCanonical(
  filters: ShowFilters,
  isPaged: boolean,
  shows: Show[],
): { canonical: string; noindex: boolean } {
  const dims = activeTvDims(filters);
  if (!isPaged && dims.length === 1) {
    const d = dims[0];
    if (d.kind === "genre") {
      return { canonical: `/television/genre/${d.slug}`, noindex: false };
    }
    if (d.kind === "facet") {
      const base = TV_FACET_BASEPATH[d.facet];
      if (d.nameBased) {
        if (isIndexableTvFacet(d.facet, d.value, shows)) {
          return {
            canonical: `/television/${base}/${slugifyEntity(d.value)}`,
            noindex: false,
          };
        }
      } else if (
        findEntityBySlug(indexableTvFacetNames(d.facet, shows), d.value)
      ) {
        return { canonical: `/television/${base}/${d.value}`, noindex: false };
      }
    }
  }
  return {
    canonical: "/television/reviews",
    noindex: dims.length > 0 || isPaged,
  };
}

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

  // Genre still gets a scoped social title (the most common handoff); the
  // canonical + index directive now generalize to every single routable
  // facet via tvReviewsCanonical.
  const onlyGenreFilter =
    filters.genres?.length === 1 &&
    activeTvDims(filters).length === 1 &&
    !isPagedBeyondFirst;

  const { shows } = getShowsWithEnrichment();
  const { canonical, noindex } = tvReviewsCanonical(
    filters,
    isPagedBeyondFirst,
    shows,
  );

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
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  // Enrichment-joined corpus: each show carries `.enrichment` (cast,
  // creators, language, country) so the Wave B facet predicates can run.
  // Stripped from the card slice before it crosses to the client shell.
  const { shows, summary } = getShowsWithEnrichment();

  // Low-cardinality Wave B facet groups for the sidebar chip rails
  // (language, country, network group, decade), shared with the genre
  // route. Actors/creators are high-card — deep-links now, typeahead 6c.
  const entityFacets = curatedShowEntityFacets(shows);

  // Build the flat card list FIRST, then filter. The level-specific
  // scope filter (Show + Season require prose) is applied inside
  // buildCompletedCards. Episodes never reach the listing as cards
  // — they surface only on the detail page nested under their
  // parent Season.
  const allCards = buildCompletedCards(shows);

  const availableGenres: [string, number][] = Object.entries(
    summary.genreDistribution,
  ).sort((a, b) => a[0].localeCompare(b[0]));

  // Networks (canonical primary) and TMDB types present in the
  // dataset, frequency-sorted — drive the new filter chip rails.
  const availableNetworks = curatedTvRailNetworks(shows);
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
  const matchIds = hybridMatchIds(
    shows,
    filters.titleQuery,
    ["name"],
    (s) => s.id,
  );
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
        {/* ─── Hero ───────────────────────────────────────────────
            Single-column editorial hero. The lifetime-stats panel moved
            to the /television landing's "By the numbers" band, so the
            reviews page leads straight into the grid below. */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Television</Kicker>
            <Display>Don&apos;t change the channel.</Display>
            <Lede wide>
              I watch 100+ seasons of television a year and log my reviews on
              Serializd. Open any card for the full review hierarchy. And if you
              want a recommendation, the filters are there for you.
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
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Catalog stat-bar + Filter rail + Grid + Pagination ─ */}
        <Section padding="md" bordered>
          {/* The catalog kicker surfaces the three-level review system as
              concrete numbers, passed into the shell as gridHeaderLead so it
              pins at the top of the sticky grid-header band. Order (Seasons /
              Shows / Episodes) matches the landing StatsBand mode toggle's
              default mode so the cluster's vocabulary stays consistent across
              surfaces. Renders Kicker-styled (mono uppercase, --text-caption)
              so the line reads as an editorial label, not a SaaS stat-bar.
              Source is titlecase to match the StatsBand toggle's register;
              CSS textTransform:uppercase renders both identically. */}
          <TelevisionShell
            // The catalog stat-bar rides INSIDE the shell's sticky grid-
            // header band (gridHeaderLead) so the three-level counts pin
            // with the nav + chips instead of scrolling away above the grid.
            gridHeaderLead={
              <Kicker>
                The catalog: {summary.totalSeasonReviews.toLocaleString()}{" "}
                Seasons · {summary.totalShowReviews.toLocaleString()} Shows ·{" "}
                {summary.totalEpisodeReviews.toLocaleString()} Episodes
              </Kicker>
            }
            cards={clientCards}
            allCount={allCards.length}
            showLists={getShowLists().length > 0}
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
      </Container>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

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
