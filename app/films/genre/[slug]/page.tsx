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
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds, combineMatchSets } from "@/lib/feeds/fuzzy-search";
import {
  applyFilters,
  asString,
  findGenreBySlug,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  slugifyGenre,
} from "@/lib/feeds/letterboxd-utils";
import { curatedFilmEntityFacets } from "@/lib/feeds/facet-index";
import { buildOriginHref } from "@/lib/feeds/origin-href";
import { FilmsShell } from "../../FilmsShell";

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
    Boolean(filters.runtimeBuckets && filters.runtimeBuckets.length > 0) ||
    Boolean(filters.watchedYears && filters.watchedYears.length > 0) ||
    filters.watchedWindow !== undefined ||
    Boolean(filters.titleQuery) ||
    Boolean(filters.directorQuery) ||
    filters.releaseYearMin !== undefined ||
    filters.releaseYearMax !== undefined;

  const noindex = additionalFiltersActive || isPagedBeyondFirst;
  const count = summary.genreDistribution[genre] ?? 0;
  // Voice-matched to the /films listing description (no
  // third-person Malcolm reference; ownership implicit). "TV Movie"
  // is special-cased to "TV movies" so we don't emit the awkward
  // double-noun "tv movie films."
  const genreNoun =
    genre === "TV Movie" ? "TV movies" : `${genre.toLowerCase()} films`;
  const description = `${count} ${genreNoun} and counting, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`;
  const canonical = `/films/genre/${slug}`;
  // Title relies on the root layout's "%s—Malcolm Xavier" template
  // so the byline format matches /films listing's title exactly.
  // OG/Twitter titles spell out the byline since social card titles
  // bypass the template.
  const titleBase = `${genre} Reviews`;
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
      // Inherit the sitewide programmatic OG card. Without this,
      // Next.js 16's metadata.openGraph replaces (rather than
      // merges with) the parent's, leaving the genre-route
      // unfurl as title + URL with no image. See /films's
      // mirror of this comment for the full rationale.
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

  // Enriched corpus so Wave B facets compose on a genre route too (e.g.
  // /films/genre/horror?studio=a24). Enrichment is stripped from the
  // page slice before it reaches the shell.
  const { films, summary } = getFilmsWithEnrichment();
  const genre = findGenreBySlug(summary.genreDistribution, slug);
  if (!genre) notFound();
  const entityFacets = curatedFilmEntityFacets(films);

  // Parse filters from the URL, then force-set the genre filter to
  // the route's genre so the page is always scoped. Other URL params
  // (rating, watchedYear, etc.) compose normally — the genre-route
  // pin doesn't preclude further filtering, it just guarantees the
  // genre is always part of the active filter set.
  const baseFilters = parseFilmFilters(sp);
  const filters = { ...baseFilters, genres: [genre] };
  const sort = parseFilmSort(sp);
  const rawPage = Number.parseInt(asString(sp.page) ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const availableGenres: [string, number][] = Object.entries(
    summary.genreDistribution,
  ).sort((a, b) => a[0].localeCompare(b[0]));
  const watchedYearSetGlobal = new Set<number>();
  for (const film of films) {
    for (const y of film.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  // Search (?title= / ?director=) composes with the pinned genre —
  // match per field (hybrid), intersect, then applyFilters drops the
  // rest.
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

  // Strip the server-only enrichment delta before the slice crosses to
  // the client shell (the grid renders none of it).
  const clientFilms = pageFilms.map((a) => ({
    ...a,
    film: { ...a.film, enrichment: undefined },
  }));

  // rel=prev/next link tags for crawlers that still consume them
  // (Bing). React 19 hoists <link> rendered in components to <head>.
  const prevHref = page > 1 ? buildPageHref(slug, sp, page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(slug, sp, page + 1) : null;

  // CollectionPage + BreadcrumbList JSON-LD. CollectionPage tells AI
  // retrievers this URL is a curated review corpus scoped to one
  // genre. BreadcrumbList helps SERP rich results render
  // Films › {Genre} as a URL trail.
  //
  // The previous `about: { "@type": "Movie", genre: [genre] }` was
  // removed because Google's Rich Results validator parses bare
  // Movie entities as standalone rich-result items and flags them
  // invalid (no required Movie fields). The CollectionPage's name
  // + description already convey the genre scope.
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
        {/* Single-column hero — the lifetime-stats panel moved to the
            /films landing's "By the numbers" band. */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Films · {genre}</Kicker>
            {/* Same TV-Movie special-case as the Lede below —
                  "every tv movie film" is a double-noun trip.
                  Renders "Every TV movie, every rating, every
                  reaction." for that one genre, normal "every X
                  film" for the other 18. */}
            <Display>
              {genre === "TV Movie"
                ? "Every TV movie, every rating, every reaction."
                : `Every ${genre.toLowerCase()} film, every rating, every reaction.`}
            </Display>
            {/* First-person voice matches /films listing's Lede.
                  The genre name lowercases inside the sentence
                  (sentence-case) like the Display headline above;
                  "TV Movie" is special-cased to "TV movies" so we
                  don't render the awkward double-noun "tv movie
                  films." Count is lifetime via genreDistribution
                  (the genre's whole-corpus total, not the filtered
                  totalResults). */}
            <Lede wide>
              I’ve logged {summary.genreDistribution[genre] ?? 0}{" "}
              {genre === "TV Movie"
                ? "TV movies"
                : `${genre.toLowerCase()} films`}{" "}
              on Letterboxd. Open any card for the full review.
            </Lede>
            <p style={{ margin: 0 }}>
              <TrackOnClick
                event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                eventData={{
                  kind: "profile-follow",
                  surface: "films-genre-hero",
                }}
              >
                <Link href={LETTERBOXD_PROFILE_URL}>
                  Follow along on Letterboxd ↗
                </Link>
              </TrackOnClick>
            </p>
          </Stack>
        </Section>

        <Section padding="md" bordered>
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
            routeGenre={genre}
            originHref={buildOriginHref(`/films/genre/${slug}`, sp)}
          />
        </Section>
      </Container>
    </div>
  );
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
