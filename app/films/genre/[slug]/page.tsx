// ─────────────────────────────────────────────────────────────────
// /films/genre/[slug] — single-genre long-tail SEO entry point.
//
// Static, pre-rendered at build time via generateStaticParams (one
// page per active TMDB genre in the snapshot). Renders the same
// FilmsShell as /films but with filters.genres = [<genre>] applied
// at request time, so user interaction lights up the same chip
// rail / sidebar / pagination as the main listing.
//
// Why a dedicated route instead of just /films?genre=Horror:
//   • Crawlable URL — search engines treat /films/genre/horror as a
//     real entity rather than a query-string variation of /films.
//   • Long-tail SEO — "malcolm xavier horror reviews" can rank
//     against this page directly, with its own title/description/
//     CollectionPage JSON-LD framing.
//   • Canonical anchor — /films?genre=Horror declares this URL as
//     its canonical, consolidating crawl signals onto one page.
//
// The dedicated genre route is the LANDING surface only. Once the
// user starts toggling chips, FilmsShell.navigate() flips them
// over to the query-string form (/films?genre=Horror,Comedy etc.)
// since multi-filter combinations don't have dedicated routes.
// See FilmsShell's navigate function for the rewrite logic.
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
import { ELSEWHERE } from "@/lib/elsewhere";
import { SITE_URL } from "@/lib/site-config";
import { getFilms } from "@/lib/feeds/letterboxd";
import {
  applyFilters,
  findGenreBySlug,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  slugifyGenre,
} from "@/lib/feeds/letterboxd-utils";
import { FilmsShell } from "../../FilmsShell";
import { SummaryPanel } from "../../SummaryPanel";

const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

// Mirror /films page-size logic — 24 desktop+tablet, 12 Save-Data.
// Keeps row math clean (1/2/3/4/6 cols all divide evenly).
const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_SAVE_DATA = 12;

type Params = { slug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * One static page per genre present in the snapshot. Build-time
 * pre-render so crawlers and direct hits land on a fully-server-
 * rendered page without an SSR request to the snapshot reader.
 */
export function generateStaticParams() {
  const { summary } = getFilms();
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
  const { summary } = getFilms();
  const genre = findGenreBySlug(summary.genreDistribution, slug);
  if (!genre) {
    // notFound() in the page component handles the 404; return
    // minimal metadata so the not-found surface still has a clean
    // title rather than the genre-page template.
    return { title: "Genre not found" };
  }

  // Pagination + further-filter detection — same pattern as /films.
  // page>1 OR any query-string filter beyond the route's pinned
  // genre means we should noindex,follow (let crawlers walk to
  // detail pages, but keep the noisy filter combos out of the
  // index). The bare /films/genre/<slug> URL is the indexable
  // canonical for the genre.
  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;
  const filters = parseFilmFilters(sp);
  const additionalFiltersActive =
    Boolean(filters.ratings && filters.ratings.length > 0) ||
    (Boolean(filters.genres && filters.genres.length > 0) &&
      // The route's own genre may also appear in the query string
      // (e.g. when client nav lands here with ?genre=Horror); that
      // single matching entry isn't an "additional" filter.
      !(
        filters.genres!.length === 1 &&
        slugifyGenre(filters.genres![0]) === slug
      )) ||
    Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined ||
    filters.releaseYearMin !== undefined ||
    filters.releaseYearMax !== undefined;

  const noindex = additionalFiltersActive || isPagedBeyondFirst;
  const count = summary.genreDistribution[genre] ?? 0;
  const description = `${count} ${genre} films logged, rated, and reviewed by Malcolm Xavier — pulled from his Letterboxd journal with TMDB metadata.`;
  const canonical = `/films/genre/${slug}`;
  return {
    title: {
      // .absolute bypasses the root layout's "%s—Malcolm Xavier"
      // template; the long-tail anchor lives in the title itself
      // ("{Genre} reviews by Malcolm Xavier").
      absolute: `${genre} Reviews by Malcolm Xavier`,
    },
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${genre} Reviews by Malcolm Xavier`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${genre} Reviews by Malcolm Xavier`,
      description,
    },
  };
}

export default async function FilmGenrePage({
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

  const { films, summary } = getFilms();
  const genre = findGenreBySlug(summary.genreDistribution, slug);
  if (!genre) notFound();

  // Parse filters from the URL, then force-set the genre filter to
  // the route's genre so the page is always scoped. Other URL params
  // (rating, watchedYear, etc.) compose normally — the genre-route
  // pin doesn't preclude further filtering, it just guarantees the
  // genre is always part of the active filter set.
  const baseFilters = parseFilmFilters(sp);
  const filters = { ...baseFilters, genres: [genre] };
  const sort = parseFilmSort(sp);
  const rawPage = Number.parseInt(asString(sp.page) ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const reviewYearSetGlobal = new Set<number>();
  for (const film of films) {
    for (const y of film.reviewYearSet) reviewYearSetGlobal.add(y);
  }
  const availableReviewYears = Array.from(reviewYearSetGlobal).sort(
    (a, b) => b - a,
  );

  const applied = applyFilters(films, filters, sort);
  const {
    current: pageFilms,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // rel=prev/next link tags for crawlers that still consume them
  // (Bing). React 19 hoists <link> rendered in components to <head>.
  const prevHref = page > 1 ? buildPageHref(slug, sp, page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(slug, sp, page + 1) : null;

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage tells AI
  // retrievers this URL is a curated review corpus scoped to one
  // genre; about: { @type: Movie, genre: [genre] } anchors the
  // entity to TMDB's genre vocabulary. BreadcrumbList helps SERP
  // rich results render Films › {Genre} as a URL trail.
  const detailUrl = `${SITE_URL}/films/genre/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${genre} Reviews by Malcolm Xavier`,
        description: `${summary.genreDistribution[genre] ?? 0} ${genre} films logged, rated, and reviewed by Malcolm Xavier.`,
        url: detailUrl,
        inLanguage: "en-US",
        about: {
          "@type": "Movie",
          genre: [genre],
        },
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
            item: `${SITE_URL}/films`,
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
    <div data-subbrand="film">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {prevHref ? <link rel="prev" href={prevHref} /> : null}
      {nextHref ? <link rel="next" href={nextHref} /> : null}
      <Container size="lg">
        <Section padding="lg">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Stack gap="500">
              <Kicker accent>Films · {genre}</Kicker>
              <Display>
                Every {genre.toLowerCase()} film, every rating, every reaction.
              </Display>
              <Lede>
                {summary.genreDistribution[genre] ?? 0} {genre} films logged
                from {totalResults === 1 ? "one review" : "Malcolm's Letterboxd journal"}.
                Open any card for the full review.
              </Lede>
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                  eventData={{ kind: "profile-follow", surface: "films-genre-hero" }}
                >
                  <Link href={LETTERBOXD_PROFILE_URL}>
                    Follow along on Letterboxd ↗
                  </Link>
                </TrackOnClick>
              </p>
            </Stack>
            <SummaryPanel summary={summary} />
          </div>
        </Section>

        <Section padding="md" bordered>
          <FilmsShell
            films={pageFilms}
            totalPages={totalPages}
            currentPage={page}
            totalResults={totalResults}
            filters={filters}
            sort={sort}
            availableGenres={availableGenres}
            availableReviewYears={availableReviewYears}
            routeGenre={genre}
          />
        </Section>
      </Container>
    </div>
  );
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Build a relative href for /films/genre/<slug> at a specific
 * page, preserving any other query-string filters. Used by the
 * rel=prev/next link tags so paginated crawls stay scoped to the
 * route's genre + any composed filter state.
 */
function buildPageHref(
  slug: string,
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
  const base = `/films/genre/${slug}`;
  return qs ? `${base}?${qs}` : base;
}
