// ─────────────────────────────────────────────────────────────────
// /television/genre/[slug] — single-genre long-tail SEO entry point.
//
// Static, pre-rendered at build time via generateStaticParams (one
// page per active TMDB-TV genre in the snapshot). Renders the same
// TelevisionShell as /television but with filters.genres = [<genre>]
// applied at request time, so user interaction lights up the same
// chip rail / sidebar / pagination as the main listing.
//
// Mirror of /films/genre/[slug]'s posture and rationale —
// dedicated routes for genres are crawlable URLs, long-tail SEO
// targets, and canonical anchors that consolidate query-string
// variants. See that file's header for the full reasoning.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { getShows, getWatchingExclusions } from "@/lib/feeds/serializd";
import { hybridMatchIds } from "@/lib/feeds/fuzzy-search";
import { modesForReview } from "@/lib/feeds/serializd-mode-counts.mjs";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  deriveAvailableNetworks,
  deriveAvailableTypes,
  findGenreBySlug,
  genreInProse,
  paginate,
  parseShowFilters,
  parseShowSort,
  slugifyGenre,
} from "@/lib/feeds/serializd-utils";
import { TelevisionShell } from "../../TelevisionShell";
import { SummaryPanel } from "../../SummaryPanel";

const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_SAVE_DATA = 12;

type Params = { slug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * One static page per genre present in the snapshot. Pre-renders
 * crawlable URLs at build time so a direct hit on /television/
 * genre/drama serves a fully-rendered page without any SSR
 * snapshot-reader work.
 */
export function generateStaticParams() {
  const { summary } = getShows();
  return Object.keys(summary.genreDistribution).map((genre) => ({
    slug: slugifyGenre(genre),
  }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const { summary } = getShows();
  const genre = findGenreBySlug(summary.genreDistribution, slug);
  if (!genre) {
    return { title: "Genre not found" };
  }

  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;
  const filters = parseShowFilters(sp);
  // The route's own genre may also appear in the query string when
  // client nav lands here with ?genre=<slug>; that single matching
  // entry isn't an "additional" filter and shouldn't trip noindex.
  const additionalFiltersActive =
    Boolean(filters.ratings && filters.ratings.length > 0) ||
    (Boolean(filters.genres && filters.genres.length > 0) &&
      !(
        filters.genres!.length === 1 &&
        slugifyGenre(filters.genres![0]) === slug
      )) ||
    Boolean(filters.networks && filters.networks.length > 0) ||
    Boolean(filters.types && filters.types.length > 0) ||
    Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined ||
    Boolean(filters.titleQuery) ||
    filters.premiereYearMin !== undefined ||
    filters.premiereYearMax !== undefined ||
    filters.cardKind !== undefined;

  const noindex = additionalFiltersActive || isPagedBeyondFirst;
  const count = summary.genreDistribution[genre] ?? 0;
  const description = `${count} ${genre.toLowerCase()} ${count === 1 ? "show" : "shows"} rated and reviewed at the show, season, and episode level—logged on Serializd. Every card links to its full review hierarchy with TMDB metadata, star ratings, and prose.`;
  const canonical = `/television/genre/${slug}`;
  const titleBase = `${genre} TV Reviews`;
  const socialTitle = `${titleBase}—Malcolm Xavier`;
  return {
    title: titleBase,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: socialTitle,
      description,
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

export default async function TvGenrePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const sp = await searchParams;

  const { shows, summary } = getShows();
  const genre = findGenreBySlug(summary.genreDistribution, slug);
  if (!genre) notFound();

  const baseFilters = parseShowFilters(sp);
  // Force-set the genre filter to the route's pinned genre. Other
  // URL params (rating, watchedYear, cardKind, etc.) compose
  // normally — the genre-route pin doesn't preclude further
  // filtering, it just guarantees the genre is always part of the
  // active filter set.
  const filters = { ...baseFilters, genres: [genre] };
  const sort = parseShowSort(sp);
  const rawPage = Number.parseInt(asString(sp.page) ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const allCards = buildCompletedCards(shows);

  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const availableNetworks = deriveAvailableNetworks(shows);
  const availableTypes = deriveAvailableTypes(shows);
  const watchedYearSetGlobal = new Set<number>();
  for (const show of shows) {
    for (const y of show.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  // Derive per-mode current-year counts + averages (same posture as
  // /television's listing) so the SummaryPanel's per-mode in-year
  // numbers stay scoped to the active toggle. Routes through
  // modesForReview so the miniseries double-count rule is honored
  // here just like it is on the listing — this is the editorial
  // contract for /television counts (see
  // lib/feeds/serializd-mode-counts.mjs).
  const currentYear = new Date().getUTCFullYear();
  const cybl = { show: 0, season: 0, episode: 0 };
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
  // Watching count for the toggle badge — must match
  // /television/watching after the perpetual-show exclusions
  // (see overrides.json#excludeFromWatching). Mirrors the listing
  // page's derivation so both surfaces stay in sync.
  const watchingExclusions = getWatchingExclusions();
  const watchingCount = shows.filter(
    (s) =>
      !watchingExclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;

  // Title search (?title=) composes with the pinned genre — match SHOW
  // ids by name (hybrid), then drop non-matching cards.
  const matchIds = hybridMatchIds(shows, filters.titleQuery, ["name"], (s) => s.id);
  const applied = applyCompletedCardFilters(allCards, filters, sort, matchIds);
  const {
    current: pageCards,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // CollectionPage + BreadcrumbList JSON-LD scoped to the genre.
  const detailUrl = `${SITE_URL}/television/genre/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${genre} TV Reviews by Malcolm Xavier`,
        description: `${summary.genreDistribution[genre] ?? 0} ${genre} TV shows logged, rated, and reviewed by Malcolm Xavier.`,
        url: detailUrl,
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
            item: `${SITE_URL}/television`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: genre,
            item: detailUrl,
          },
        ],
      },
    ],
  };

  return (
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        <Section padding="lg">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Television · {genre}</Kicker>
              <Display>
                Every {genreInProse(genre)} show, every level, every
                review.
              </Display>
              <Lede>
                I&apos;ve logged {summary.genreDistribution[genre] ?? 0}{" "}
                {genreInProse(genre)}{" "}
                {(summary.genreDistribution[genre] ?? 0) === 1
                  ? "show"
                  : "shows"}{" "}
                on Serializd. Open any card for the full
                hierarchy—show review, season notes, and
                episode-by-episode where they exist.
              </Lede>
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                  eventData={{
                    kind: "profile-follow",
                    surface: "genre-hero",
                  }}
                >
                  <Link href={SERIALIZD_PROFILE_URL}>
                    Follow along on Serializd ↗
                  </Link>
                </TrackOnClick>
              </p>
            </Stack>
            <div className="hidden lg:block">
              <SummaryPanel
                summary={summary}
                currentYearByLevel={cybl}
                currentYearAvgByLevel={currentYearAvgByLevel}
              />
            </div>
          </div>
        </Section>

        <Section padding="md" bordered>
          <TelevisionShell
            cards={pageCards}
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
            routeGenre={genre}
            originHref={buildOriginHref(`/television/genre/${slug}`, sp)}
            watchingCount={watchingCount}
          />
        </Section>

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

/**
 * Reconstruct the relative URL (pathname + query string) of the
 * current listing — passed to TelevisionShell as originHref. See
 * /television/page.tsx for the full rationale; duplicated here to
 * keep each route self-contained (the helper is small enough not
 * to warrant a shared module).
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
