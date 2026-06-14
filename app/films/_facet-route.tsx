// ─────────────────────────────────────────────────────────────────
// Shared renderer for the film entity-facet routes (WS6b).
//
// /films/director/[slug], /films/actor/[slug], /films/writer/[slug],
// /films/studio/[slug], /films/language/[slug], /films/country/[slug],
// /films/decade/[slug] are all the SAME page — the genre route's body
// (app/films/genre/[slug]/page.tsx), pinned to a different facet. Rather
// than hand-copy ~400 lines seven times, each thin route binds this
// renderer to its facet key (see e.g. app/films/director/[slug]/page.tsx).
//
// Why dedicated routes at all (vs /films/reviews?studio=a24): the locked
// indexation rule (PLAN.md) — a `?param=` URL is noindex,follow; the
// crawlable, canonical, shareable surface for a facet is a path-based
// route, exactly like genre. This module is genre's pattern, generalized.
//
// The set of slugs each route pre-renders (and the sub-floor 404s) come
// from lib/feeds/facet-index.ts — the ONE floor/allowlist gate shared with
// the sitemap, the canonical handoff, and the stats deep-links.
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
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds, combineMatchSets } from "@/lib/feeds/fuzzy-search";
import {
  applyFilters,
  asString,
  filmEntityFacets,
  paginate,
  parseFilmFilters,
  parseFilmSort,
  type FilmFilters,
} from "@/lib/feeds/letterboxd-utils";
import { slugifyEntity, findEntityBySlug } from "@/lib/feeds/slug";
import {
  indexableFilmFacets,
  FILM_FACET_BASEPATH,
  FILM_FACET_PARAM,
  type FilmRouteFacet,
} from "@/lib/feeds/facet-index";
import { FilmsShell } from "./FilmsShell";
import { SummaryPanel } from "./SummaryPanel";

const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

// Mirror /films page-size logic — 24 desktop+tablet, 12 Save-Data.
const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_SAVE_DATA = 12;

type Params = { slug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RouteArgs = { params: Promise<Params>; searchParams: SearchParams };

// ── Per-facet pin config ──────────────────────────────────────────
// Just the FilmFilters key each facet pins; the URL segment + query param
// come from the shared facet-index maps (FILM_FACET_BASEPATH /
// FILM_FACET_PARAM) so the routes, sitemap, stats deep-links, and
// canonical handoff can't drift. `param` is undefined for director (the
// ?director= param is the fuzzy search box; the route pins internally).
const PIN_KEY: Record<FilmRouteFacet, keyof FilmFilters> = {
  directors: "directors",
  actors: "actors",
  writers: "writers",
  studios: "studios",
  languages: "languages",
  countries: "countries",
  decades: "decades",
};

// All recognized film filter query params — used to detect "any filter
// beyond the route's own pin," which trips noindex (same posture as the
// genre route: the bare facet URL is the indexable canonical; composed
// filter states are noindex,follow).
const FILM_FILTER_PARAMS = [
  "rating", "genre", "runtime", "watchedYear", "watchedWindow", "title",
  "director", "releaseYearMin", "releaseYearMax", "actor", "writer", "studio",
  "conglomerate", "language", "country", "releaseType", "budgetTier", "decade",
  "collection",
];

/** True if any filter param is active beyond the route's own pin (the pin
 *  param set to exactly the route's slug doesn't count). For director —
 *  which has no param — ANY filter param present is "additional." */
function hasAdditionalFilters(
  sp: Record<string, string | string[] | undefined>,
  param: string | undefined,
  slug: string,
): boolean {
  for (const p of FILM_FILTER_PARAMS) {
    const v = asString(sp[p]);
    if (!v) continue;
    if (param && p === param && v === slug) continue; // the pin itself
    return true;
  }
  return false;
}

// ── Templated copy, by entity class ───────────────────────────────
// Voice-matched to the genre route (first person, "logged," "Open any
// card…"). Per Malcolm's 2026-06-13 call: ship templated copy now, refine
// wording later. count is always ≥ the facet's floor (≥ 2), so always plural.
type Copy = {
  kicker: string;
  display: string;
  lede: string;
  metaTitle: string; // layout appends "—Malcolm Xavier"
  metaDesc: string;
  breadcrumb: string;
  collectionName: string;
  collectionDesc: string;
};

function buildCopy(facet: FilmRouteFacet, name: string, count: number): Copy {
  switch (facet) {
    case "directors":
      return {
        kicker: `Films · Directed by ${name}`,
        display: `Every ${name} film I've logged.`,
        lede: `I've logged ${count} films directed by ${name}. Open any card for the full review.`,
        metaTitle: `Films Directed by ${name}`,
        metaDesc: `${count} films directed by ${name}, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: name,
        collectionName: `Films Directed by ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films directed by ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "actors":
      return {
        kicker: `Films · ${name}`,
        display: `Every ${name} film I've logged.`,
        lede: `I've logged ${count} films starring ${name}. Open any card for the full review.`,
        metaTitle: `${name} Film Reviews`,
        metaDesc: `${count} films starring ${name}, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: name,
        collectionName: `Films Starring ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films starring ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "writers":
      return {
        kicker: `Films · Written by ${name}`,
        display: `Every ${name} film I've logged.`,
        lede: `I've logged ${count} films written by ${name}. Open any card for the full review.`,
        metaTitle: `Films Written by ${name}`,
        metaDesc: `${count} films written by ${name}, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: name,
        collectionName: `Films Written by ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films written by ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "studios":
      return {
        kicker: `Films · ${name}`,
        display: `Everything ${name} I've logged.`,
        lede: `I've logged ${count} ${name} films. Open any card for the full review.`,
        metaTitle: `${name} Films`,
        metaDesc: `${count} ${name} films, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: name,
        collectionName: `${name} Films, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films from ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "languages":
      return {
        kicker: `Films · ${name}-language`,
        display: `Every ${name}-language film, every rating, every reaction.`,
        lede: `I've logged ${count} ${name}-language films on Letterboxd. Open any card for the full review.`,
        metaTitle: `${name}-Language Film Reviews`,
        metaDesc: `${count} ${name}-language films, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: `${name}-language`,
        collectionName: `${name}-Language Films, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} ${name}-language films, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "countries":
      return {
        kicker: `Films · ${name}`,
        display: `Every film I've logged from ${name}.`,
        lede: `I've logged ${count} films from ${name} on Letterboxd. Open any card for the full review.`,
        metaTitle: `Films from ${name}`,
        metaDesc: `${count} films from ${name}, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: name,
        collectionName: `Films from ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films from ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "decades":
      return {
        kicker: `Films · The ${name}`,
        display: `Every film I've logged from the ${name}.`,
        lede: `I've logged ${count} films released in the ${name}. Open any card for the full review.`,
        metaTitle: `${name} Film Reviews`,
        metaDesc: `${count} films from the ${name}, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`,
        breadcrumb: `The ${name}`,
        collectionName: `${name} Films, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} films from the ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
  }
}

/**
 * Resolve a route slug to its canonical entity name + logged count, but
 * ONLY among the floor-clearing (indexable) values. An unknown slug — or a
 * real-but-sub-floor entity (no dedicated page by the no-thin-page rule) —
 * resolves to null, which the callers turn into a 404.
 */
function resolveFacet(
  facet: FilmRouteFacet,
  slug: string,
): { name: string; count: number } | null {
  const { films } = getFilmsWithEnrichment();
  const indexable = indexableFilmFacets(facet, films);
  const name = findEntityBySlug(indexable.map(([n]) => n), slug);
  if (!name) return null;
  const count = indexable.find(([n]) => n === name)![1];
  return { name, count };
}

/** generateStaticParams for a facet route — one page per floor-clearing
 *  value (so the build pre-renders exactly the indexable pages). */
export function filmFacetStaticParams(facet: FilmRouteFacet) {
  const { films } = getFilmsWithEnrichment();
  return indexableFilmFacets(facet, films).map(([name]) => ({
    slug: slugifyEntity(name),
  }));
}

/** generateMetadata for a facet route. */
export async function filmFacetMetadata(
  facet: FilmRouteFacet,
  { params, searchParams }: RouteArgs,
): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const resolved = resolveFacet(facet, slug);
  if (!resolved) return { title: "Not found" };

  const basePath = FILM_FACET_BASEPATH[facet];
  const param = FILM_FACET_PARAM[facet];
  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;
  const noindex =
    hasAdditionalFilters(sp, param, slug) || isPagedBeyondFirst;

  const copy = buildCopy(facet, resolved.name, resolved.count);
  const canonical = `/films/${basePath}/${slug}`;
  const socialTitle = `${copy.metaTitle}—Malcolm Xavier`;
  return {
    title: copy.metaTitle,
    description: copy.metaDesc,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: socialTitle,
      description: copy.metaDesc,
      url: canonical,
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: copy.metaDesc,
      images: ["/opengraph-image"],
    },
  };
}

/** The shared page for every film facet route. */
export async function FilmFacetPage(
  facet: FilmRouteFacet,
  { params, searchParams }: RouteArgs,
) {
  const { slug } = await params;
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const sp = await searchParams;

  const { films, summary } = getFilmsWithEnrichment();
  const resolved = resolveFacet(facet, slug);
  if (!resolved) notFound();
  const { name, count } = resolved;
  const basePath = FILM_FACET_BASEPATH[facet];
  const param = FILM_FACET_PARAM[facet];
  const pinKey = PIN_KEY[facet];
  const entityFacets = filmEntityFacets(films);

  // Parse the URL filters, then force-set the route's facet (by slug, the
  // form applyFilters' facetHit compares) so the page is always scoped to
  // this entity. Other params (rating, genre, …) compose normally.
  const baseFilters = parseFilmFilters(sp);
  const filters: FilmFilters = { ...baseFilters, [pinKey]: [slug] };
  const sort = parseFilmSort(sp);
  const rawPage = Number.parseInt(asString(sp.page) ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const availableGenres = Object.entries(summary.genreDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const watchedYearSetGlobal = new Set<number>();
  for (const film of films) {
    for (const y of film.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  const currentYear = new Date().getUTCFullYear();
  const currentYearCount = films.filter((f) =>
    f.watchedYearSet.includes(currentYear),
  ).length;

  // Search (?title= / ?director=) composes with the pinned facet.
  const titleMatch = hybridMatchIds(films, filters.titleQuery, ["title"], (f) => f.id);
  const directorMatch = hybridMatchIds(films, filters.directorQuery, ["tmdb.director"], (f) => f.id);
  const matchIds = combineMatchSets(titleMatch, directorMatch);
  const applied = applyFilters(films, filters, sort, matchIds);
  const {
    current: pageFilms,
    totalPages,
    totalResults,
    page,
  } = paginate(applied, requestedPage, pageSize);

  // Strip the server-only enrichment delta before the slice crosses to the
  // client shell (the grid renders none of it).
  const clientFilms = pageFilms.map((a) => ({
    ...a,
    film: { ...a.film, enrichment: undefined },
  }));

  const prevHref = page > 1 ? buildPageHref(basePath, slug, sp, page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(basePath, slug, sp, page + 1) : null;

  const copy = buildCopy(facet, name, count);
  const detailUrl = `${SITE_URL}/films/${basePath}/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: copy.collectionName,
        description: copy.collectionDesc,
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
          { "@type": "ListItem", position: 1, name: "Films", item: `${SITE_URL}/films` },
          { "@type": "ListItem", position: 2, name: copy.breadcrumb, item: detailUrl },
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
              <Kicker accent>{copy.kicker}</Kicker>
              <Display>{copy.display}</Display>
              <Lede>{copy.lede}</Lede>
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                  eventData={{ kind: "profile-follow", surface: "films-facet-hero" }}
                >
                  <Link href={LETTERBOXD_PROFILE_URL}>
                    Follow along on Letterboxd ↗
                  </Link>
                </TrackOnClick>
              </p>
            </Stack>
            <div className="hidden lg:block">
              <SummaryPanel summary={summary} currentYearCount={currentYearCount} />
            </div>
          </div>
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
            // director has no query param, so it can't be seeded into a
            // /films/reviews handoff — it stays scoped to this route's
            // pathname (the route re-pins it). Every other facet carries
            // its slug param forward (and toggles off cleanly).
            routePin={param ? { param, value: slug } : undefined}
            // The active-filter chip: every facet feeds its canonical name
            // in as a hint (so studio/actor/writer chips read as names, not
            // slugs); director — param-less — rides routeFacetChip instead.
            entityNameHints={{ [slug]: name }}
            routeFacetChip={
              facet === "directors" ? { facetLabel: "Director", name } : undefined
            }
          />
        </Section>

        <Section padding="md" bordered className="lg:hidden">
          <SummaryPanel summary={summary} currentYearCount={currentYearCount} />
        </Section>
      </Container>
    </div>
  );
}

/** Relative href for a facet route at a specific page, preserving other
 *  query-string filters — for the rel=prev/next link tags. */
function buildPageHref(
  basePath: string,
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
  const base = `/films/${basePath}/${slug}`;
  return qs ? `${base}?${qs}` : base;
}
