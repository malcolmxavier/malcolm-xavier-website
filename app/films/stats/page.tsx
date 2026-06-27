// ─────────────────────────────────────────────────────────────────
// /films/stats — the film dashboard ("The Stats").
//
// The third cluster surface (Overview → Reviews → The Stats). A server
// component reading the typed compute in lib/feeds/stats/film-stats.ts at
// request time — no client data, no live API. Every tile is a real React
// chart from components/stats; the numbers are computed + tested upstream
// (WS4 + the WS5 compute-completion pass), so this file is composition
// only and the figures can't drift from the other surfaces.
//
// Copy (Display / Lede / tile notes) ships as working placeholders for
// Malcolm to refine in his voice.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import NextLink from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { HeroNote } from "@/components/typography/HeroNote";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { Link } from "@/components/primitives/Link";
import { StatsSection } from "@/components/stats/StatsSection";
import { StatsTips } from "@/components/stats/StatsTips";
import { Tile } from "@/components/stats/Tile";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs, type BigItem } from "@/components/stats/Bigs";
import { StatsTrackingRegion } from "@/components/analytics/StatsTrackingRegion";
import { Bars } from "@/components/stats/Bars";
import { ColumnChart } from "@/components/stats/ColumnChart";
import { Versus } from "@/components/stats/Versus";
import { Diverging } from "@/components/stats/Diverging";
import { StackedBars } from "@/components/stats/StackedBars";
import { Heatmap } from "@/components/stats/Heatmap";
import { LineChart } from "@/components/stats/LineChart";
import { TileReadout } from "@/components/stats/TileReadout";
import { StatsHandoffPanel } from "@/components/stats/StatsHandoffPanel";
import { SITE_URL } from "@/lib/site-config";
import { computeFilmStats } from "@/lib/feeds/stats/film-stats";
import { carryConnectedParams } from "@/lib/feeds/stats/connected-stats";
import {
  buildFilmStatsRails,
  FILM_SUMMARY_DIMS,
} from "@/lib/feeds/stats/film-filter-options";
import { StatsFilterControls } from "@/components/filters/StatsFilterControls";
import type { Contrast } from "@/lib/feeds/stats/shrinkage";
import type { DeskewContrast } from "@/lib/feeds/stats/franchise";
import { slugifyEntity } from "@/lib/feeds/slug";
import { parseFilmFilters } from "@/lib/feeds/letterboxd-utils";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import {
  FILM_FACET_LINK_PARAM,
  indexableFilmCollectionNames,
  makeFilmFacetHref,
  type FilmFacetLink,
} from "@/lib/feeds/facet-index";
import {
  withCarriedFilters,
  hasActiveFilter,
} from "@/lib/feeds/stats/filter-url-state";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Per-request metadata. The unfiltered dashboard is the indexable canonical;
 * every filtered permutation is noindex,follow self-canonical (matches the
 * reviews-filter posture — filtered states aren't canonical surfaces).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const filtered = hasActiveFilter(parseFilmFilters(await searchParams));
  return {
    title: "Film stats",
    description:
      "Malcolm Xavier’s film corpus by the numbers—genres, world cinema, studios, franchises, the theatrical premium, and the rhythm of a watching year.",
    alternates: { canonical: "/films/stats" },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Film stats—Malcolm Xavier",
      description:
        "The stats behind the film corpus: genres, world cinema, studios, franchises, and the rhythm of a watching year.",
      url: "/films/stats",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Film stats—Malcolm Xavier",
      description:
        "The stats behind the film corpus: genres, world cinema, studios, franchises, and a watching year’s rhythm.",
      images: ["/opengraph-image"],
    },
  };
}

// Ascending 0.5–5★ order for the rating histogram x-axis.
const RATING_KEYS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

// Plain-noun labels for the FILMS_TILES catalog ids — used by the band
// footnote when a tile suppresses or folds under a thin selection (§6). These
// deliberately read as plain nouns ("Genre ratings", "Language by country")
// rather than echoing the chart titles ("Genres vs. baseline", "Language ×
// country"): the footnote names a hidden breakdown to a reader who can't see
// the chart it refers to, so cross-tab "×" notation and chart-internal jargon
// ("baseline", "the world") wouldn't land. Keyed by the catalog id
// (lib/feeds/stats/collapse.ts), not the tile title.
const FILM_TILE_LABELS: Record<string, string> = {
  lifetime: "Lifetime",
  "rating-distribution": "Rating distribution",
  genres: "Genres",
  "genres-vs-baseline": "Genre ratings",
  actors: "Actors",
  writers: "Writers",
  directors: "Directors",
  collections: "Franchises",
  "me-vs-critics": "Ratings vs. critics",
  "me-vs-people": "Ratings vs. the crowd",
  "world-cinema-lean": "International lean",
  "language-x-country": "Language by country",
  languages: "Languages",
  countries: "Countries",
  "theatrical-vs-streaming": "Theatrical vs. streaming",
  studios: "Studios",
  "by-conglomerate": "Conglomerates",
  "release-type-by-year": "Release type by year",
  "budget-tier-by-year": "Budget tier by year",
  "release-type-x-era": "Release type by era",
  "budget-tier-x-era": "Budget tier by era",
  "watch-pace": "Watch pace",
  "watched-by-month": "Watched by month",
  "watched-by-weekday": "Watched by weekday",
};
const filmTileLabel = (id: string) => FILM_TILE_LABELS[id] ?? id;

/** Map a Contrast/DeskewContrast to the Versus tile's left/right rows. */
function versusRows(c: Contrast | DeskewContrast): {
  left: [string, number][];
  right: [string, number][];
} {
  return {
    left: c.most,
    right: c.major.map((x): [string, number] => [x.k, x.adj]),
  };
}

export default async function FilmStatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Filter state lives in the URL (§9). Parse it, recompute every tile over
  // the predicate-narrowed corpus, and note whether anything is active (the
  // active state drops the JSON-LD, same as it flips noindex above).
  const sp = await searchParams;
  const filters = parseFilmFilters(sp);
  const filtered = hasActiveFilter(filters);
  const s = computeFilmStats(filters);

  // Collapse decisions (§6): resolve a tile's rung / a band's state by id.
  // `td` bundles the per-tile props every Tile takes (its decision + the
  // shared readout); `bd` bundles the per-band props every StatsSection takes.
  const dec = (id: string) => s.collapse.tiles.find((t) => t.id === id);
  const bandDec = (id: string) => s.collapse.bands.find((b) => b.id === id);
  // The generic T2 readout is one shared node for every tile: the narrowed
  // corpus count + a thinning caption (per-tile voice comes later).
  const readout = <TileReadout n={s.lifetime.films} noun="films" />;
  const td = (id: string) => ({ decision: dec(id), readout });
  const bd = (label: string) => ({
    band: bandDec(label),
    tileLabel: filmTileLabel,
  });
  // A versus tile renders solo (surviving column + withheld panel) when the
  // engine flagged its highest-rated column below the ranking floor. Passed
  // straight through to <Versus solo>.
  const solo = (id: string) => dec(id)?.soloColumn ?? false;

  // The page's active filter state as query params. Stats and reviews share the
  // filter param vocabulary, so this transfers verbatim to both the reviews
  // handoff (below) and every tile deep-link (via withCarriedFilters), so the
  // WHOLE selection survives a click-through instead of just the clicked facet.
  const activeParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => activeParams.append(k, x));
    else activeParams.append(k, v);
  }
  // Reviews-handoff deep-link (§6 altitude 3 / §11): when the page hands off,
  // carry the active query straight through so the handoff lands on the SAME
  // selection.
  // How many distinct filter dimensions are active — reported as
  // `carriedFilters` on every tile deep-link so the dashboard can tell a
  // cold-corpus click from one that carries a narrowed selection through.
  const carriedCount = new Set(activeParams.keys()).size;
  const reviewsHref = `/films/reviews${
    activeParams.toString() ? `?${activeParams.toString()}` : ""
  }`;
  // Cross-brand handoff: carry only the dimensions the connected dashboard
  // also filters on (rating, genre, watched year, actor, language, country,
  // conglomerate) so a film selection crosses over without leaking film-only
  // params connected would ignore.
  const connectedHref = `/stats/connected${carryConnectedParams(activeParams)}`;

  // Page-level JSON-LD — a CollectionPage describing the UNFILTERED dashboard
  // as a first-class, indexable portfolio artifact (mirrors the landing).
  // Filtered states drop it (they're noindex permutations).
  const pageUrl = `${SITE_URL}/films/stats`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Film stats",
    description:
      "Aggregate statistics derived from Malcolm Xavier’s film reviews: genres, world cinema, studios, franchises, release shape, and temporal rhythm.",
    url: pageUrl,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL },
    author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
  };

  // Total reviews behind the rating histogram — lets each column's hover
  // chip show its share of the corpus, not just its raw count.
  const ratingTotal = RATING_KEYS.reduce(
    (sum, k) => sum + (s.ratingDistribution[k] ?? 0),
    0,
  );

  const studios = versusRows(s.studios);
  const conglomerate = versusRows(s.conglomerate);
  const actors = versusRows(s.actors);
  const directors = versusRows(s.directors);
  const writers = versusRows(s.writers);
  const languages = versusRows(s.languages);
  const countries = versusRows(s.countries);

  // Theatrical vs. streaming counter. The wide-vs-streaming comparison only
  // means something when BOTH buckets hold films. Under a narrow filter (a
  // single pre-streaming era, or down at n=1) one side empties out, and the
  // premium delta plus the empty bucket's row would read as bogus zeros. In
  // that case we drop to the one populated bucket's count·avg as a single
  // figure, losing the empty side and the comparison stat.
  const theat = s.theatrical;
  const theatricalItems =
    theat.wideCount > 0 && theat.nonCount > 0
      ? [
          { n: theat.wideCount, label: `wide theatrical · ${theat.wideAvg.toFixed(2)}★` },
          { n: theat.nonCount, label: `streaming/limited · ${theat.nonAvg.toFixed(2)}★` },
          { n: `${signed(theat.premium)}★`, label: "theatrical premium" },
        ]
      : theat.wideCount > 0
        ? [{ n: theat.wideCount, label: `wide theatrical · ${theat.wideAvg.toFixed(2)}★` }]
        : [{ n: theat.nonCount, label: `streaming/limited · ${theat.nonAvg.toFixed(2)}★` }];

  // World cinema lean counter. Same two-sided rule as the theatrical split: each
  // "vs" delta only means something when BOTH sides hold films (meanOf([]) is 0,
  // so an empty side yields a real-looking but bogus premium). Under a narrow
  // filter one side can empty out, so we drop whichever delta has gone one-sided.
  // The international share is always shown—it's a share of the corpus, not a
  // two-bucket comparison, so it stays honest down to n=1.
  const wl = s.worldLean;
  const worldLeanItems: BigItem[] = [];
  if (wl.enCount > 0 && wl.nonEnglishCount > 0)
    worldLeanItems.push({
      n: `${signed(wl.nonEnglishVsEnglish)}★`,
      label: "non-English vs. English",
    });
  if (wl.usCount > 0 && wl.nonUsCount > 0)
    worldLeanItems.push({ n: `${signed(wl.nonUsVsUs)}★`, label: "non-US vs. US" });
  worldLeanItems.push({
    n: `${wl.pctInternational}%`,
    label: "international (non-US)",
  });

  // Deep-link builders: a stats-tile row links to its SUBJECT under that
  // entity filter (vocabulary matches the filter — same canonicalizers +
  // slugifyEntity). A row whose entity clears its indexation floor links to
  // the dedicated route (/films/studio/a24); a sub-floor entity (no route by
  // the no-thin-page rule) falls back to the noindex ?param= form. Genre
  // already has its dedicated route. Conglomerate has NO route (not in the
  // floors table), so it always uses ?conglomerate=. Franchises link to the
  // curated-family collection routes (built below — WS7).
  const { films, summary } = getFilmsWithEnrichment();
  // The filter island's bounded rails are built from the UNFILTERED corpus
  // (so a rail keeps every chip as the selection narrows); the high-card
  // dimensions are reached through the omnibox (FILM_SUMMARY_DIMS).
  const statsRails = buildFilmStatsRails(films, summary);
  // All single-value facet deep-links route through the shared resolver, so
  // the slug vocabulary + the route-vs-?param= decision stay identical to the
  // detail page (see makeFilmFacetHref — the drift this prevents is the
  // ?genre= no-op bug). The per-facet wrappers below keep the tile call sites
  // (hrefFor={actorHref} …) unchanged.
  const facetResolver = makeFilmFacetHref(films);
  // Wrap the resolver so every facet deep-link carries the page's other active
  // filters, dropping only the param this click pins (FILM_FACET_LINK_PARAM[f]).
  const facetHref = (facet: FilmFacetLink, value: string) => {
    const href = facetResolver(facet, value);
    return href === undefined
      ? undefined
      : withCarriedFilters(href, activeParams, [FILM_FACET_LINK_PARAM[facet]]);
  };
  const genreHref = (g: string) => facetHref("genres", g);
  const directorHref = (name: string) => facetHref("directors", name);
  const actorHref = (label: string) => facetHref("actors", label);
  const writerHref = (label: string) => facetHref("writers", label);
  const studioHref = (label: string) => facetHref("studios", label);
  const languageHref = (label: string) => facetHref("languages", label);
  const countryHref = (label: string) => facetHref("countries", label);
  const conglomerateHref = (label: string) =>
    facetHref("conglomerates", label);

  // Non-entity facet deep-links (WS6b.1): rating, release shape, decade,
  // watched year, and the language×country combination. None has a dedicated
  // route, so all use the ?param= form (noindex). Rating buckets with zero
  // films don't link (an empty filtered view helps no one).
  // These inline builders emit ?param= URLs, so withCarriedFilters drops their
  // own keys automatically — they carry the rest of the active filters with no
  // explicit pin. (Entity facets go through facetHref above, which does pin.)
  const ratingHref = (k: string) =>
    s.ratingDistribution[k]
      ? withCarriedFilters(`/films/reviews?rating=${k}`, activeParams)
      : undefined;
  const releaseTypeHref = (label: string) => facetHref("releaseTypes", label);
  const budgetTierHref = (label: string) => facetHref("budgetTiers", label);
  // era → release-year scope: the decade buckets map to ?decade=; the open
  // "<2010" bucket spans many decades, so it caps the release year instead.
  const eraSuffix = (era: string) =>
    era === "<2010" ? "&releaseYearMax=2009" : `&decade=${slugifyEntity(era)}`;
  const eraHeatHref = (param: string) => (row: string, col: string) =>
    withCarriedFilters(
      `/films/reviews?${param}=${slugifyEntity(row)}${eraSuffix(col)}`,
      activeParams,
    );
  const watchedYearHref = (year: string) =>
    withCarriedFilters(`/films/reviews?watchedYear=${year}`, activeParams);
  // language×country pairs → the combination filter. Built as a label→href
  // map from the index-aligned topPairKeys so Bars' hrefFor(label) resolves
  // each pair to its two slugs without parsing the "·" label.
  const pairHrefByLabel = new Map(
    s.overlap.topPairs.map(([label], i) => {
      const k = s.overlap.topPairKeys[i];
      return [
        label,
        withCarriedFilters(
          `/films/reviews?language=${slugifyEntity(k.language)}&country=${slugifyEntity(k.country)}`,
          activeParams,
        ),
      ];
    }),
  );
  const pairHref = (label: string) => pairHrefByLabel.get(label);

  // Franchises (WS7): the tile ranks on CURATED family names, which is the
  // /films/collections/[slug] route vocabulary. A family links iff it clears
  // the route floor (≥3 logged) — the looser stats qualification (≥2) means
  // a 2-film family shows here but has no thin page, so it stays inert (no
  // ?param= fallback: the raw-collection filter doesn't speak family).
  // No withCarriedFilters here: a collection route renders a curated
  // one-card-per-title grid, not a filterable view, so carried params are inert.
  const routableFamilies = new Set(
    indexableFilmCollectionNames(
      films,
      getCollectionDetails(),
      new Date().getUTCFullYear(),
    ),
  );
  const franchiseHref = (name: string) =>
    routableFamilies.has(name)
      ? `/films/collections/${slugifyEntity(name)}`
      : undefined;

  return (
    <div data-subbrand="film">
      {/* JSON-LD only on the unfiltered canonical (filtered states are
          noindex permutations). */}
      {!filtered ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {/* Touch support for the chart hover chips (tap-to-toggle); no-ops
          on pointer devices, which use the CSS hover path. */}
      <StatsTips />
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Films</Kicker>
            <Display>Film by the numbers.</Display>
            <Lede wide>
              {/* Hero copy reads the UNFILTERED lifetime total (summary.totalFilms,
                  computed over the full corpus below) — not s.lifetime.films, which
                  narrows with the active filter. The live, filter-aware count lives
                  in the sticky filter bar; the lede stays a stable brand statement
                  (a recompute shouldn't rewrite a headline that's scrolled out of
                  view). */}
              {summary.totalFilms.toLocaleString()} films logged and counting—this
              is the quantitative breakdown. What I watch, how I rate it, where in the
              world it comes from, and the rhythm of a watching year.
            </Lede>
            {/* The cross-brand board rides inline with the rail as a
                fourth, sibling pill; a quieter link repeats at the foot. */}
            <ClusterRail
              base="/films"
              active="numbers"
              subbrand="film"
              label="Films sections"
              className="mt-2"
              extra={{ label: "Connected Stats", href: connectedHref }}
            />
            {/* The "how to use this page" note drops below the rail as a
                quiet footnote rather than a second headline-weight lede. */}
            <HeroNote>
              This page is interactive. Click through on the visualizations to be
              taken over to the search experience to discover the reviews behind
              the data.
            </HeroNote>
          </Stack>
        </Section>
      </Container>

      {/* ─── Filter controls + dashboard ──────────────────────────
          ONE Container, ONE bordered Section wrapping BOTH the filter strip and
          the dashboard. The shared parent is deliberate: position:sticky only
          travels within its containing block (its DOM parent), so a bar boxed in
          its own short section can't actually stick — it scrolls away the instant
          that section ends. Sharing the dashboard's tall box is what gives the
          summary bar real sticky range over the tiles it filters.
          The lede's divider is this Section's top border; the bar tucks under it
          (paddingTop 1rem, no bottom rule per the single-divider call), then the
          dashboard bands follow. Every filter change is a URL round-trip that
          re-runs computeFilmStats over the narrowed corpus. */}
      <Container size="lg">
        <Section bordered padding="md" style={{ paddingTop: "1rem" }}>
          <StatsFilterControls
            rails={statsRails}
            summaryDims={FILM_SUMMARY_DIMS}
            tailParams={["decade", "releaseType", "budgetTier"]}
            omniboxEndpoint="/films/reviews/facet-search"
            omniboxLabel="Search"
            omniboxPlaceholder="Titles, actors, directors, studios…"
            omniboxAriaLabel="Search films by title, actor, director, writer, or studio"
            chipClassName="film-filter-chip"
            idPrefix="films-stats"
            basePath="/films/stats"
            noun={{ singular: "film", plural: "films" }}
            totalResults={s.lifetime.films}
            cluster="films"
          />

          {/* The dashboard bands. The top padding restores the breathing room
              the old separate filter-section boundary used to provide, now that
              the strip and the tiles share one section. */}
          <div className="pt-10 sm:pt-14">
          {/* One delegated click listener instruments every tile deep-link
              (STATS_TILE_CLICK) without the chart primitives becoming client
              components — each linking Tile stamps its facet via data-sd. */}
          <StatsTrackingRegion cluster="films" activeFilterCount={carriedCount}>
          {/* Page verdict (§6 altitude 3): when the load-bearing Taste band
              collapses the selection is too thin for a dashboard, so the page
              hands off to the reviews funnel for the same selection rather
              than rendering a wall of readouts. */}
          {s.collapse.verdict === "reviews-handoff" ? (
            <StatsHandoffPanel
              n={s.lifetime.films}
              href={reviewsHref}
              noun={{ singular: "film", plural: "films" }}
              resetHref="/films/stats"
              cluster="films"
            />
          ) : (
            <>
          {/* The dashboard is grouped into six named bands (readability
              pass) so ~23 tiles don't read as one wall. Tile order + spans
              within each band still follow Malcolm's saved sketch layout
              (_private/_sketches/stats-sketch-layout.json → "films"). */}
          <StatsSection label="The corpus" {...bd("The corpus")}>
            <Tile title="Lifetime" {...td("lifetime")} span={12}>
              <Bigs
                items={[
                  { n: s.lifetime.films.toLocaleString(), label: "films logged" },
                  { n: s.lifetime.thisYear, label: "this year" },
                  { n: s.lifetime.hours.toLocaleString(), label: "hours watched" },
                  { n: `${s.lifetime.avgRating.toFixed(2)}★`, label: "average rating" },
                ]}
              />
            </Tile>

            <Tile title="Rating distribution" {...td("rating-distribution")} span={12} linkDimension="rating">
              <ColumnChart
                columns={RATING_KEYS.map((k): [string, number] => [
                  k,
                  s.ratingDistribution[k] ?? 0,
                ])}
                hrefFor={ratingHref}
                ariaLabelFor={(rating, count) => `${rating} stars: ${count} reviews`}
                tipFor={(rating, count) =>
                  `${rating}★ — ${count} ${count === 1 ? "film" : "films"}${
                    ratingTotal ? ` · ${Math.round((count / ratingTotal) * 100)}% of corpus` : ""
                  }`
                }
              />
            </Tile>

          </StatsSection>

          <StatsSection label="Taste" {...bd("Taste")}>
            <Tile title="Genres" {...td("genres")} span={4} linkDimension="genre">
              <Bars
                rows={s.genreDistribution}
                hrefFor={genreHref}
                tipFor={(genre, count) =>
                  `${genre} — ${count} ${count === 1 ? "film" : "films"}${
                    s.lifetime.films
                      ? ` · ${Math.round((count / s.lifetime.films) * 100)}% of films`
                      : ""
                  }`
                }
              />
            </Tile>

            <Tile
              title="Genres vs. my baseline" {...td("genres-vs-baseline")}
              span={8}
              linkDimension="genre"
              note={`Baseline = my ${s.lifetime.avgRating.toFixed(2)}★ average; most-logged genres first. Bars right of center rate above it; bars left of center rate below.`}
            >
              <Diverging
                rows={s.divergingGenre}
                baseline={s.lifetime.avgRating}
                hrefFor={genreHref}
              />
            </Tile>

          </StatsSection>

          <StatsSection
            label="Cast, crew, and franchises"
            {...bd("Cast, crew, and franchises")}
          >
            <Tile
              title="Actors — logged vs. rated"
              soloTitle="Actors"
              {...td("actors")}
              span={4}
              linkDimension="actor"
              note="Top-10 billed only; highest-rated counts distinct franchises, not films."
            >
              <Versus
                leftTitle="Most logged"
                left={actors.left}
                rightTitle="Highest rated"
                right={actors.right}
                hrefFor={actorHref}
                solo={solo("actors")}
                withheldNote="Widen the filters to rank actors by rating—needs 3+ with distinct franchises."
              />
            </Tile>

            <Tile
              title="Writers — logged vs. rated"
              soloTitle="Writers"
              {...td("writers")}
              span={4}
              linkDimension="writer"
            >
              <Versus
                leftTitle="Most logged"
                left={writers.left}
                rightTitle="Highest rated"
                right={writers.right}
                hrefFor={writerHref}
                solo={solo("writers")}
                withheldNote="Widen the filters to rank writers by rating—needs 3+ with distinct franchises."
              />
            </Tile>

            <Tile
              title="Directors — logged vs. rated"
              soloTitle="Directors"
              {...td("directors")}
              span={4}
              linkDimension="director"
              note="Highest-rated gated on ≥3 distinct franchises."
            >
              <Versus
                leftTitle="Most logged"
                left={directors.left}
                rightTitle="Highest rated"
                right={directors.right}
                hrefFor={directorHref}
                solo={solo("directors")}
                withheldNote="Widen the filters to rank directors by rating—needs 3+ with distinct franchises."
              />
            </Tile>

            <Tile
              title="Collections — logged vs. rated"
              soloTitle="Collections"
              {...td("collections")}
              span={8}
              centered
              linkDimension="collection"
              linkDestination="collection-page"
              note="Curated families (≥3 released films, logged 2+)."
            >
              <Versus
                leftTitle="Most logged"
                left={s.franchises.most}
                rightTitle="Highest rated"
                right={s.franchises.major.map((x): [string, number] => [x.k, x.adj])}
                hrefFor={franchiseHref}
                solo={solo("collections")}
                withheldNote="Widen the filters to rank franchises by rating—needs 3+ ranked families."
              />
            </Tile>
          </StatsSection>

          <StatsSection label="How I stack up" {...bd("How I stack up")}>
            <Tile
              title="Me vs. the Critics"
              {...td("me-vs-critics")}
              span={6}
              note={`Across ${s.youVsWorld.critics.count} films with a Metascore.`}
            >
              <Bigs
                items={[
                  { n: `${signed(s.youVsWorld.critics.avg)}★`, label: "avg gap vs. Metascore" },
                ]}
              />
              {/* Lists only appear above the threshold (n ≥ 4); below it the
                  tile is the average gap alone. */}
              {s.youVsWorld.critics.hotTakes.length > 0 ? (
                <div style={hotColsStyle}>
                  <DeltaList title="My hot takes (me ≫ critics)" rows={s.youVsWorld.critics.hotTakes} />
                  <DeltaList title="Critics’ darlings (critics ≫ me)" rows={s.youVsWorld.critics.darlings} />
                </div>
              ) : null}
            </Tile>

            <Tile
              title="Me vs. the People"
              {...td("me-vs-people")}
              span={6}
              note={`Across ${s.youVsWorld.crowd.count} films with a Letterboxd score.`}
            >
              <Bigs
                items={[
                  { n: `${signed(s.youVsWorld.crowd.avg)}★`, label: "avg gap vs. Letterboxd" },
                ]}
              />
              {s.youVsWorld.crowd.hotTakes.length > 0 ? (
                <div style={hotColsStyle}>
                  <DeltaList title="My hot takes (me ≫ crowd)" rows={s.youVsWorld.crowd.hotTakes} />
                  <DeltaList title="Crowd darlings (crowd ≫ me)" rows={s.youVsWorld.crowd.darlings} />
                </div>
              ) : null}
            </Tile>
          </StatsSection>

          <StatsSection label="Where it comes from" {...bd("Where it comes from")}>
            <Tile
              title="World cinema lean" {...td("world-cinema-lean")}
              span={12}
              note="I rate non-English and non-US films above domestic ones—language is the stronger signal; country reinforces it."
            >
              <Bigs items={worldLeanItems} />
            </Tile>

            <Tile
              title="Language × country" {...td("language-x-country")}
              span={12}
              linkDimension="language-country"
              note="The joint view: which languages pair with which countries (language leads)."
            >
              <Bigs
                items={[
                  { n: s.overlap.pairs, label: "language · country pairs" },
                  { n: s.overlap.languages, label: "languages" },
                  { n: s.overlap.countries, label: "countries" },
                ]}
              />
              <Bars rows={s.overlap.topPairs} hrefFor={pairHref} />
            </Tile>

            <Tile
              title="Languages — logged vs. rated"
              soloTitle="Languages"
              {...td("languages")}
              span={6}
              linkDimension="language"
            >
              <Versus
                leftTitle="Most logged"
                left={languages.left}
                rightTitle="Highest rated"
                right={languages.right}
                hrefFor={languageHref}
                solo={solo("languages")}
                withheldNote="Widen the filters to rank languages by rating—needs 3+ distinct entries."
              />
            </Tile>

            <Tile
              title="Countries — logged vs. rated"
              soloTitle="Countries"
              {...td("countries")}
              span={6}
              linkDimension="country"
            >
              <Versus
                leftTitle="Most logged"
                left={countries.left}
                rightTitle="Highest rated"
                right={countries.right}
                hrefFor={countryHref}
                solo={solo("countries")}
                withheldNote="Widen the filters to rank countries by rating—needs 3+ distinct entries."
              />
            </Tile>

          </StatsSection>

          <StatsSection label="Distribution" {...bd("Distribution")}>
            <Tile title="Theatrical vs. streaming" {...td("theatrical-vs-streaming")} span={12}>
              <Bigs items={theatricalItems} />
            </Tile>

            <Tile
              title="Studios — logged vs. rated"
              soloTitle="Studios"
              {...td("studios")}
              span={6}
              linkDimension="studio"
            >
              <Versus
                leftTitle="Most logged"
                left={studios.left}
                rightTitle="Highest rated"
                right={studios.right}
                hrefFor={studioHref}
                solo={solo("studios")}
                withheldNote="Widen the filters to rank studios by rating—needs 3+ distinct entries."
              />
            </Tile>

            <Tile
              title="By conglomerate — logged vs. rated"
              soloTitle="By conglomerate"
              {...td("by-conglomerate")}
              span={6}
              linkDimension="conglomerate"
              note="Each film rolls up to the conglomerate that owns its studio (else independent). TMDB lists production companies, so this is approximate."
            >
              <Versus
                leftTitle="Most logged"
                left={conglomerate.left}
                rightTitle="Highest rated"
                right={conglomerate.right}
                hrefFor={conglomerateHref}
                solo={solo("by-conglomerate")}
                withheldNote="Widen the filters to rank conglomerates by rating—needs 3+ distinct entries."
              />
            </Tile>

            <Tile
              title="Release type by year" {...td("release-type-by-year")}
              span={6}
              linkDimension="release-type"
              note="Films I logged from each release year, split by how they premiered. Streaming and limited only emerge through the 2010s and 2020s."
            >
              <StackedBars
                data={s.releaseTypeByYear}
                ariaLabel="Release type by film release year"
                segmentHref={releaseTypeHref}
              />
            </Tile>

            <Tile
              title="Budget tier by year" {...td("budget-tier-by-year")}
              span={6}
              linkDimension="budget-tier"
              note="Wide-theatrical films with a reported budget only—recent indie and streaming work is excluded given under-reporting."
            >
              <StackedBars
                data={s.budgetTierByYear}
                ariaLabel="Budget tier by film release year"
                segmentHref={budgetTierHref}
              />
            </Tile>

            <Tile
              title="Release type × release era — avg rating" {...td("release-type-x-era")}
              span={6}
              linkDimension="release-type-x-era"
              note="Streaming and limited only exist in recent eras (older cells empty by definition)."
            >
              <Heatmap
                grid={s.releaseTypeEraHeat}
                caption="Average rating by release type and release era"
                hrefFor={eraHeatHref("releaseType")}
              />
            </Tile>

            <Tile
              title="Budget tier × release era — avg rating" {...td("budget-tier-x-era")}
              span={6}
              linkDimension="budget-tier-x-era"
              note="Wide-theatrical films with a reported budget only—recent indie and streaming work is excluded given budget under-reporting."
            >
              <Heatmap
                grid={s.budgetEraHeat}
                caption="Average rating by budget tier and release era"
                hrefFor={eraHeatHref("budgetTier")}
              />
            </Tile>

          </StatsSection>

          <StatsSection label="When I watch" {...bd("When I watch")}>
            <Tile
              title="Watch pace by day of year" {...td("watch-pace")}
              span={12}
              linkDimension="watched-year"
              note="Cumulative films watched by each date of the year, per year."
            >
              <LineChart
                series={s.temporal.paceByDay.map((c) => ({
                  label: c.year,
                  points: c.points,
                }))}
                ariaLabel="Cumulative films watched by day of year, per year"
                hrefFor={watchedYearHref}
              />
            </Tile>

            <Tile title="Watched by month" {...td("watched-by-month")} span={6} linkDimension="watched-year">
              <StackedBars
                data={s.temporal.monthMatrix}
                ariaLabel="Films watched by month, stacked by year"
                averageLine="month"
                segmentHref={watchedYearHref}
              />
            </Tile>

            <Tile title="Watched by weekday" {...td("watched-by-weekday")} span={6} linkDimension="watched-year">
              <StackedBars
                data={s.temporal.weekdayMatrix}
                ariaLabel="Films watched by weekday, stacked by year"
                averageLine="weekday"
                segmentHref={watchedYearHref}
              />
            </Tile>
          </StatsSection>
            </>
          )}
          </StatsTrackingRegion>
          </div>
        </Section>

        {/* ─── Cross-brand handoff ──────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "var(--p-sm-font-size)" }}>
            <Link href={connectedHref}>See how film and television connect →</Link>
          </p>
        </Section>

        {/* ─── Methodology ──────────────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <Methodology notes={FILM_METHOD} />
        </Section>
      </Container>
    </div>
  );
}

// How the film numbers are made — the assumptions behind the figures
// above. Working drafts in Malcolm's voice; refine as needed.
const FILM_METHOD: string[] = [
  "Ratings, watch dates, lists, and favorites come from Letterboxd; genre, runtime, director, and posters from TMDB.",
  "Critic scores (Metacritic here; IMDb and Rotten Tomatoes on the cards) come from MDBList, joined by IMDb id.",
  "“Highest rated” lists guard against thin samples two ways—a minimum-count gate, so a single 5★ film can’t top the chart, and Bayesian shrinkage, which eases a small sample toward the overall average until enough ratings accumulate. Both apply anywhere an average rating is ranked.",
  "People stats—actors, directors, writers—count distinct franchises, not films, so a long-running series can’t masquerade as preference. Most-logged stays a raw film count; highest-rated is gated on distinct franchises.",
  "Actors count only top-10-billed roles, so deep-bench supporting credits don’t inflate the list.",
];

// ─── Local helpers ────────────────────────────────────────────────

/** Format a signed delta to two decimals with an explicit + or −. */
function signed(n: number): string {
  return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);
}

/** The hot-takes / darlings list inside the me-vs-world tile. */
function DeltaList({
  title,
  rows,
}: {
  title: string;
  rows: { title: string; year: number; slug: string; delta: number }[];
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <h4 style={deltaHeadStyle}>{title}</h4>
      <ul style={deltaListStyle}>
        {rows.map((r) => (
          <li key={`${r.title}-${r.year}`} style={deltaRowStyle}>
            {/* The title links to the film's detail page. color:inherit keeps
                the label at --text-body over the sub-brand `a !important`
                cascade; the inner spans set their own colors. */}
            <NextLink
              href={`/films/${r.slug}`}
              aria-label={`${r.title} (${r.year})`}
              style={deltaLinkStyle}
              className="hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span style={deltaLabelStyle}>
                {r.title} <span style={{ color: "var(--text-caption)" }}>({r.year})</span>
              </span>
            </NextLink>
            <span
              style={{
                ...deltaValueStyle,
                color: r.delta >= 0 ? "var(--chart-positive)" : "var(--chart-accent)",
              }}
            >
              {signed(r.delta)}★
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const hotColsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--scale-500)", // 20px
  marginTop: "var(--scale-100)", // 4px
};

const deltaHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  margin: "0 0 var(--scale-200)", // 8px
  // Weight inherits (matching the canonical Kicker mono-caption register);
  // an inline 600 here re-split the heading weighting the tile-title fix unified.
};

const deltaListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const deltaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "var(--scale-200)", // 8px
  fontSize: 12,
  fontFamily: "var(--font-mono)",
};

// The title link: takes the flexible column (so the value stays pinned
// right) and clips with the label's ellipsis. minHeight 24 meets the WCAG
// 2.2 target-size (minimum) floor for the thin list rows. Subtle until
// hover/focus.
const deltaLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minHeight: 24,
  minWidth: 0,
  overflow: "hidden",
  color: "inherit",
  textDecoration: "none",
  borderRadius: "var(--border-radius-sm)",
};

const deltaLabelStyle: CSSProperties = {
  display: "block",
  color: "var(--text-body)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const deltaValueStyle: CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};
