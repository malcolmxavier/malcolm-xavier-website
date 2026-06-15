// ─────────────────────────────────────────────────────────────────
// Shared renderer for the television entity-facet routes (WS6b).
//
// /television/creator/[slug], /television/actor/[slug],
// /television/network/[slug], /television/language/[slug],
// /television/country/[slug], /television/type/[slug],
// /television/decade/[slug] are all the SAME page — the TV genre route's
// body (app/television/genre/[slug]/page.tsx), pinned to a different
// facet. Each thin route binds this renderer to its facet key.
//
// See app/films/_facet-route.tsx for the full rationale (the film mirror).
// TV-specific: network + type are NAME-based filters (WS3), not slug-based,
// so their pin value is the canonical name; the rest are slug-based. The
// floor/allowlist gate + the indexable value list come from
// lib/feeds/facet-index.ts (shared with the sitemap + deep-links).
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
import { getWatchingExclusions } from "@/lib/feeds/serializd";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hybridMatchIds } from "@/lib/feeds/fuzzy-search";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  deriveAvailableTypes,
  paginate,
  parseShowFilters,
  parseShowSort,
  type ShowFilters,
} from "@/lib/feeds/serializd-utils";
import { slugifyEntity } from "@/lib/feeds/slug";
import { buildOriginHref } from "@/lib/feeds/origin-href";
import {
  curatedShowEntityFacets,
  curatedTvRailNetworks,
  indexableTvFacets,
  resolveTvFacet,
  TV_FACET_BASEPATH,
  TV_FACET_PARAM,
  TV_FACET_PIN,
  type TvRouteFacet,
} from "@/lib/feeds/facet-index";
import { TelevisionShell } from "./TelevisionShell";

const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_SAVE_DATA = 12;

type Params = { slug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RouteArgs = { params: Promise<Params>; searchParams: SearchParams };

// The per-facet pin config now lives in facet-index.ts (TV_FACET_PIN) so
// this route and the detail-page neighbour resolver replay the SAME pin.
const PIN = TV_FACET_PIN;

const TV_FILTER_PARAMS = [
  "rating",
  "genre",
  "network",
  "type",
  "watchedYear",
  "watchedWindow",
  "title",
  "premiereYearMin",
  "premiereYearMax",
  "cardKind",
  "actor",
  "creator",
  "conglomerate",
  "language",
  "country",
  "decade",
];

/** True if any filter param is active beyond the route's own pin (the pin
 *  param set to exactly its own value doesn't count). */
function hasAdditionalFilters(
  sp: Record<string, string | string[] | undefined>,
  param: string,
  pinValue: string,
): boolean {
  for (const p of TV_FILTER_PARAMS) {
    const v = asString(sp[p]);
    if (!v) continue;
    if (p === param && v === pinValue) continue; // the pin itself
    return true;
  }
  return false;
}

// ── Templated copy, by entity class (voice-matched to the TV genre
//    route). Counts are always ≥ the facet floor, so always plural. ──
type Copy = {
  kicker: string;
  display: string;
  lede: string;
  metaTitle: string;
  metaDesc: string;
  breadcrumb: string;
  collectionName: string;
  collectionDesc: string;
};

const FULL_HIERARCHY =
  "Open any card for the full hierarchy—show review, season notes, and episode-by-episode where they exist.";

function buildCopy(facet: TvRouteFacet, name: string, count: number): Copy {
  const desc = (lead: string) =>
    `${lead} rated and reviewed at the show, season, and episode level—logged on Serializd. Every card links to its full review hierarchy with TMDB metadata, star ratings, and prose.`;
  switch (facet) {
    case "creators":
      return {
        kicker: `Television · Created by ${name}`,
        display: `Every ${name} show I've logged.`,
        lede: `I've logged ${count} shows created by ${name}. ${FULL_HIERARCHY}`,
        metaTitle: `TV Shows Created by ${name}`,
        metaDesc: desc(`${count} TV shows created by ${name},`),
        breadcrumb: name,
        collectionName: `TV Shows Created by ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} TV shows created by ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "actors":
      return {
        kicker: `Television · ${name}`,
        display: `Every ${name} show I've logged.`,
        lede: `I've logged ${count} shows starring ${name}. ${FULL_HIERARCHY}`,
        metaTitle: `${name} TV Reviews`,
        metaDesc: desc(`${count} TV shows starring ${name},`),
        breadcrumb: name,
        collectionName: `TV Shows Starring ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} TV shows starring ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "networks":
      return {
        kicker: `Television · ${name}`,
        display: `Everything ${name} I've logged.`,
        lede: `I've logged ${count} shows on ${name}. ${FULL_HIERARCHY}`,
        metaTitle: `${name} TV Reviews`,
        metaDesc: desc(`${count} TV shows on ${name},`),
        breadcrumb: name,
        collectionName: `${name} TV Shows, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} TV shows on ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "languages":
      return {
        kicker: `Television · ${name}-language`,
        display: `Every ${name}-language show, every level, every review.`,
        lede: `I've logged ${count} ${name}-language shows on Serializd. ${FULL_HIERARCHY}`,
        metaTitle: `${name}-Language TV Reviews`,
        metaDesc: desc(`${count} ${name}-language TV shows,`),
        breadcrumb: `${name}-language`,
        collectionName: `${name}-Language TV Shows, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} ${name}-language TV shows, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "countries":
      return {
        kicker: `Television · ${name}`,
        display: `Every show I've logged from ${name}.`,
        lede: `I've logged ${count} shows from ${name} on Serializd. ${FULL_HIERARCHY}`,
        metaTitle: `TV Shows from ${name}`,
        metaDesc: desc(`${count} TV shows from ${name},`),
        breadcrumb: name,
        collectionName: `TV Shows from ${name}, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} TV shows from ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    case "types": {
      const lower = name.toLowerCase();
      return {
        kicker: `Television · ${name}`,
        display: `Every ${lower} title I've logged.`,
        lede: `I've logged ${count} ${lower} titles on Serializd. ${FULL_HIERARCHY}`,
        metaTitle: `${name} TV Reviews`,
        metaDesc: desc(`${count} ${lower} TV titles,`),
        breadcrumb: name,
        collectionName: `${name} TV Titles, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} ${lower} TV titles, logged, rated, and reviewed by Malcolm Xavier.`,
      };
    }
    case "decades":
      return {
        kicker: `Television · The ${name}`,
        display: `Every show I've logged from the ${name}.`,
        lede: `I've logged ${count} shows that premiered in the ${name}. ${FULL_HIERARCHY}`,
        metaTitle: `${name} TV Reviews`,
        metaDesc: desc(`${count} TV shows from the ${name},`),
        breadcrumb: `The ${name}`,
        collectionName: `${name} TV Shows, Reviewed by Malcolm Xavier`,
        collectionDesc: `${count} TV shows from the ${name}, logged, rated, and reviewed by Malcolm Xavier.`,
      };
  }
}

/** Resolve a route slug to its canonical name + count among the
 *  floor-clearing values only (unknown or sub-floor → null → 404). */
function resolveFacet(
  facet: TvRouteFacet,
  slug: string,
): { name: string; count: number } | null {
  // Delegates to the shared resolver so the route + the neighbour resolver
  // resolve slugs identically.
  const { shows } = getShowsWithEnrichment();
  return resolveTvFacet(facet, shows, slug);
}

/** generateStaticParams — one page per floor-clearing value. */
export function tvFacetStaticParams(facet: TvRouteFacet) {
  const { shows } = getShowsWithEnrichment();
  return indexableTvFacets(facet, shows).map(([name]) => ({
    slug: slugifyEntity(name),
  }));
}

/** generateMetadata for a TV facet route. */
export async function tvFacetMetadata(
  facet: TvRouteFacet,
  { params, searchParams }: RouteArgs,
): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const resolved = resolveFacet(facet, slug);
  if (!resolved) return { title: "Not found" };

  const basePath = TV_FACET_BASEPATH[facet];
  const param = TV_FACET_PARAM[facet];
  const { nameBased } = PIN[facet];
  const pinValue = nameBased ? resolved.name : slug;
  const page = Number.parseInt(asString(sp.page) ?? "1", 10);
  const isPagedBeyondFirst = Number.isFinite(page) && page > 1;
  const noindex =
    hasAdditionalFilters(sp, param, pinValue) || isPagedBeyondFirst;

  const copy = buildCopy(facet, resolved.name, resolved.count);
  const canonical = `/television/${basePath}/${slug}`;
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

/** The shared page for every TV facet route. */
export async function TvFacetPage(
  facet: TvRouteFacet,
  { params, searchParams }: RouteArgs,
) {
  const { slug } = await params;
  const headersList = await headers();
  const saveData = headersList.get("save-data") === "on";
  const sp = await searchParams;

  const { shows, summary } = getShowsWithEnrichment();
  const resolved = resolveFacet(facet, slug);
  if (!resolved) notFound();
  const { name, count } = resolved;
  const basePath = TV_FACET_BASEPATH[facet];
  const param = TV_FACET_PARAM[facet];
  const { pinKey, nameBased } = PIN[facet];
  const pinValue = nameBased ? name : slug;
  const entityFacets = curatedShowEntityFacets(shows);

  const baseFilters = parseShowFilters(sp);
  const filters: ShowFilters = { ...baseFilters, [pinKey]: [pinValue] };
  const sort = parseShowSort(sp);
  const rawPage = Number.parseInt(asString(sp.page) ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = saveData ? PAGE_SIZE_SAVE_DATA : PAGE_SIZE_DEFAULT;

  const allCards = buildCompletedCards(shows);

  const availableGenres: [string, number][] = Object.entries(
    summary.genreDistribution,
  ).sort((a, b) => a[0].localeCompare(b[0]));
  const availableNetworks = curatedTvRailNetworks(shows);
  const availableTypes = deriveAvailableTypes(shows);
  const watchedYearSetGlobal = new Set<number>();
  for (const show of shows) {
    for (const y of show.watchedYearSet) watchedYearSetGlobal.add(y);
  }
  const availableWatchedYears = Array.from(watchedYearSetGlobal).sort(
    (a, b) => b - a,
  );

  const watchingExclusions = getWatchingExclusions();
  const watchingCount = shows.filter(
    (s) =>
      !watchingExclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;

  // Title search (?title=) composes with the pinned facet.
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

  const clientCards = pageCards.map((c) => ({
    ...c,
    show: { ...c.show, enrichment: undefined },
  }));

  const copy = buildCopy(facet, name, count);
  const detailUrl = `${SITE_URL}/television/${basePath}/${slug}`;
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
          {
            "@type": "ListItem",
            position: 1,
            name: "Television",
            item: `${SITE_URL}/television`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: copy.breadcrumb,
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
        {/* Single-column hero — the lifetime-stats panel moved to the
            /television landing's "By the numbers" band. */}
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>{copy.kicker}</Kicker>
            <Display>{copy.display}</Display>
            <Lede>{copy.lede}</Lede>
            <p style={{ margin: 0 }}>
              <TrackOnClick
                event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                eventData={{ kind: "profile-follow", surface: "tv-facet-hero" }}
              >
                <Link href={SERIALIZD_PROFILE_URL}>
                  Follow along on Serializd ↗
                </Link>
              </TrackOnClick>
            </p>
          </Stack>
        </Section>

        <Section padding="md" bordered>
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
            routePin={{ param, value: pinValue }}
            // Feed the pin's canonical name in so its active chip reads as a
            // name even off the rails (actor, creator). network/type are
            // name-based and already chip by name, so the hint is a no-op there.
            entityNameHints={{ [pinValue]: name }}
            originHref={buildOriginHref(`/television/${basePath}/${slug}`, sp)}
            watchingCount={watchingCount}
          />
        </Section>
      </Container>
    </div>
  );
}
