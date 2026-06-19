// ─────────────────────────────────────────────────────────────────
// /films/stats — the film dashboard ("The numbers").
//
// The third cluster surface (Overview → Reviews → The numbers). A server
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
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { Link } from "@/components/primitives/Link";
import { StatsSection } from "@/components/stats/StatsSection";
import { StatsTips } from "@/components/stats/StatsTips";
import { Tile } from "@/components/stats/Tile";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs } from "@/components/stats/Bigs";
import { Bars } from "@/components/stats/Bars";
import { ColumnChart } from "@/components/stats/ColumnChart";
import { Versus } from "@/components/stats/Versus";
import { Diverging } from "@/components/stats/Diverging";
import { StackedBars } from "@/components/stats/StackedBars";
import { Heatmap } from "@/components/stats/Heatmap";
import { LineChart } from "@/components/stats/LineChart";
import { SITE_URL } from "@/lib/site-config";
import { computeFilmStats } from "@/lib/feeds/stats/film-stats";
import type { Contrast } from "@/lib/feeds/stats/shrinkage";
import type { DeskewContrast } from "@/lib/feeds/stats/franchise";
import { slugifyEntity } from "@/lib/feeds/slug";
import { slugifyGenre } from "@/lib/feeds/letterboxd-utils";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import {
  indexableFilmFacetNames,
  indexableFilmCollectionNames,
  FILM_FACET_BASEPATH,
  type FilmRouteFacet,
} from "@/lib/feeds/facet-index";

export const metadata: Metadata = {
  title: "Film stats",
  description:
    "The numbers behind the film corpus—what Malcolm Xavier logs and how he rates it: genres, world cinema, studios, franchises, the theatrical premium, and the rhythm of a watching year.",
  alternates: { canonical: "/films/stats" },
  openGraph: {
    title: "Film stats—Malcolm Xavier",
    description:
      "The numbers behind the film corpus: genres, world cinema, studios, franchises, and the rhythm of a watching year.",
    url: "/films/stats",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Film stats—Malcolm Xavier",
    description:
      "The numbers behind the film corpus: genres, world cinema, studios, franchises, and a watching year's rhythm.",
    images: ["/opengraph-image"],
  },
};

// Ascending 0.5–5★ order for the rating histogram x-axis.
const RATING_KEYS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

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

export default function FilmStatsPage() {
  const s = computeFilmStats();

  // Page-level JSON-LD — a CollectionPage describing the dashboard as a
  // first-class, indexable portfolio artifact (mirrors the landing).
  const pageUrl = `${SITE_URL}/films/stats`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Film stats",
    description:
      "Aggregate statistics derived from Malcolm Xavier's film reviews: genres, world cinema, studios, franchises, release shape, and temporal rhythm.",
    url: pageUrl,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
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

  // Deep-link builders: a stats-tile row links to its SUBJECT under that
  // entity filter (vocabulary matches the filter — same canonicalizers +
  // slugifyEntity). A row whose entity clears its indexation floor links to
  // the dedicated route (/films/studio/a24); a sub-floor entity (no route by
  // the no-thin-page rule) falls back to the noindex ?param= form. Genre
  // already has its dedicated route. Conglomerate has NO route (not in the
  // floors table), so it always uses ?conglomerate=. Franchises link to the
  // curated-family collection routes (built below — WS7).
  const { films } = getFilmsWithEnrichment();
  // route-iff-indexable, else the ?param= fallback. Indexable name sets are
  // built once per facet so the per-row check is O(1).
  const filmRouteHref = (facet: FilmRouteFacet, param: string) => {
    const indexable = new Set(indexableFilmFacetNames(facet, films));
    const base = FILM_FACET_BASEPATH[facet];
    return (label: string) =>
      indexable.has(label)
        ? `/films/${base}/${slugifyEntity(label)}`
        : `/films/reviews?${param}=${slugifyEntity(label)}`;
  };
  // Plain ?param= deep-link for facets with no dedicated route (conglomerate).
  const facetHref = (param: string) => (label: string) =>
    `/films/reviews?${param}=${slugifyEntity(label)}`;
  const genreHref = (g: string) => `/films/genre/${slugifyGenre(g)}`;
  // Director's sub-floor fallback is the FUZZY ?director= search (the exact
  // facet has no param), not a slug param.
  const directorHref = (() => {
    const indexable = new Set(indexableFilmFacetNames("directors", films));
    return (name: string) =>
      indexable.has(name)
        ? `/films/director/${slugifyEntity(name)}`
        : `/films/reviews?director=${encodeURIComponent(name)}`;
  })();
  const actorHref = filmRouteHref("actors", "actor");
  const writerHref = filmRouteHref("writers", "writer");
  const studioHref = filmRouteHref("studios", "studio");
  const languageHref = filmRouteHref("languages", "language");
  const countryHref = filmRouteHref("countries", "country");

  // Non-entity facet deep-links (WS6b.1): rating, release shape, decade,
  // watched year, and the language×country combination. None has a dedicated
  // route, so all use the ?param= form (noindex). Rating buckets with zero
  // films don't link (an empty filtered view helps no one).
  const ratingHref = (k: string) =>
    s.ratingDistribution[k] ? `/films/reviews?rating=${k}` : undefined;
  const releaseTypeHref = (label: string) =>
    `/films/reviews?releaseType=${slugifyEntity(label)}`;
  const budgetTierHref = (label: string) =>
    `/films/reviews?budgetTier=${slugifyEntity(label)}`;
  // era → release-year scope: the decade buckets map to ?decade=; the open
  // "<2010" bucket spans many decades, so it caps the release year instead.
  const eraSuffix = (era: string) =>
    era === "<2010" ? "&releaseYearMax=2009" : `&decade=${slugifyEntity(era)}`;
  const eraHeatHref = (param: string) => (row: string, col: string) =>
    `/films/reviews?${param}=${slugifyEntity(row)}${eraSuffix(col)}`;
  const watchedYearHref = (year: string) => `/films/reviews?watchedYear=${year}`;
  // language×country pairs → the combination filter. Built as a label→href
  // map from the index-aligned topPairKeys so Bars' hrefFor(label) resolves
  // each pair to its two slugs without parsing the "·" label.
  const pairHrefByLabel = new Map(
    s.overlap.topPairs.map(([label], i) => {
      const k = s.overlap.topPairKeys[i];
      return [
        label,
        `/films/reviews?language=${slugifyEntity(k.language)}&country=${slugifyEntity(k.country)}`,
      ];
    }),
  );
  const pairHref = (label: string) => pairHrefByLabel.get(label);

  // Franchises (WS7): the tile ranks on CURATED family names, which is the
  // /films/collections/[slug] route vocabulary. A family links iff it clears
  // the route floor (≥3 logged) — the looser stats qualification (≥2) means
  // a 2-film family shows here but has no thin page, so it stays inert (no
  // ?param= fallback: the raw-collection filter doesn't speak family).
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Touch support for the chart hover chips (tap-to-toggle); no-ops
          on pointer devices, which use the CSS hover path. */}
      <StatsTips />
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Films</Kicker>
            <Display>The numbers.</Display>
            <Lede wide>
              {s.lifetime.films.toLocaleString()} films logged and counting—this
              is the shape of them. What I reach for, how I rate it, where in the
              world it comes from, and the rhythm of a watching year. Every figure
              here is the same one the reviews and landing pull from.
            </Lede>
            {/* The cross-brand dashboard rides inline with the rail as a
                fourth, sibling pill; a quieter link repeats at the foot. */}
            <ClusterRail
              base="/films"
              active="numbers"
              subbrand="film"
              label="Films sections"
              className="mt-2"
              extra={{ label: "Connected", href: "/stats/connected" }}
            />
          </Stack>
        </Section>
      </Container>

      {/* ─── Dashboard ────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="md" style={{ paddingTop: 0 }}>
          {/* The dashboard is grouped into six named bands (readability
              pass) so ~23 tiles don't read as one wall. Tile order + spans
              within each band still follow Malcolm's saved sketch layout
              (_private/_sketches/stats-sketch-layout.json → "films"). */}
          <StatsSection label="The corpus">
            <Tile title="Lifetime" span={12}>
              <Bigs
                items={[
                  { n: s.lifetime.films.toLocaleString(), label: "films logged" },
                  { n: s.lifetime.thisYear, label: "this year" },
                  { n: s.lifetime.hours.toLocaleString(), label: "hours watched" },
                  { n: `${s.lifetime.avgRating.toFixed(2)}★`, label: "average rating" },
                ]}
              />
            </Tile>

            <Tile title="Rating distribution" span={12}>
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

          <StatsSection label="Taste">
            <Tile title="Genres" span={4}>
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
              title="Genres vs. your baseline"
              span={8}
              note={`Baseline = your ${s.lifetime.avgRating.toFixed(2)}★ average; most-logged genres first. Bars right of center rate above your norm, accent bars (left) below. Shrunk.`}
            >
              <Diverging
                rows={s.divergingGenre}
                baseline={s.lifetime.avgRating}
                hrefFor={genreHref}
              />
            </Tile>

          </StatsSection>

          <StatsSection label="People">
            <Tile
              title="Actors — logged vs. rated"
              span={4}
              note="Top-10 billed only; highest-rated counts distinct projects, not films."
            >
              <Versus
                leftTitle="Most logged"
                left={actors.left}
                rightTitle="Highest rated"
                right={actors.right}
                hrefFor={actorHref}
              />
            </Tile>

            <Tile
              title="Writers — logged vs. rated"
              span={4}
              note="Screenwriters via TMDB (source-material credits excluded)."
            >
              <Versus
                leftTitle="Most logged"
                left={writers.left}
                rightTitle="Highest rated"
                right={writers.right}
                hrefFor={writerHref}
              />
            </Tile>

            <Tile
              title="Directors — logged vs. rated"
              span={4}
              note="Highest-rated gated on ≥3 distinct projects."
            >
              <Versus
                leftTitle="Most logged"
                left={directors.left}
                rightTitle="Highest rated"
                right={directors.right}
                hrefFor={directorHref}
              />
            </Tile>

            <Tile
              title="Franchises — logged vs. rated"
              span={6}
              note="Curated families (≥3 released films, logged 2+). Alien merges four TMDB collections; Ballerina folds into John Wick."
            >
              <Versus
                leftTitle="Most logged"
                left={s.franchises.most}
                rightTitle="Highest rated"
                right={s.franchises.major.map((x): [string, number] => [x.k, x.adj])}
                hrefFor={franchiseHref}
              />
            </Tile>

          </StatsSection>

          <StatsSection label="Where it comes from">
            <Tile
              title="You vs. the world"
              span={6}
              note={`Across ${s.youVsWorld.filmsVsCritics} films with a critic score, on your 0.5–5★ scale (Metascore ÷ 20). Films lacking one sit out the comparison.`}
            >
              <Bigs
                items={[
                  {
                    n: `${signed(s.youVsWorld.avgVsMetascore)}★`,
                    label: "avg gap vs. Metascore",
                  },
                  {
                    n: `${signed(s.youVsWorld.avgVsLetterboxd)}★`,
                    label: "avg gap vs. Letterboxd crowd",
                  },
                ]}
              />
              <div style={hotColsStyle}>
                <DeltaList title="Your hot takes (you ≫ critics)" rows={s.youVsWorld.hotTakes} />
                <DeltaList title="Critics' darlings (critics ≫ you)" rows={s.youVsWorld.darlings} />
              </div>
            </Tile>

            <Tile
              title="World cinema lean"
              span={12}
              note="You rate non-English and non-US films above domestic ones—language is the stronger signal, country reinforces it."
            >
              <Bigs
                items={[
                  {
                    n: `${signed(s.worldLean.nonEnglishVsEnglish)}★`,
                    label: "non-English vs. English",
                  },
                  { n: `${signed(s.worldLean.nonUsVsUs)}★`, label: "non-US vs. US" },
                  {
                    n: `${s.worldLean.pctInternational}%`,
                    label: "international (non-US)",
                  },
                ]}
              />
            </Tile>

            <Tile
              title="Language × country"
              span={12}
              note="The joint view: which languages pair with which countries (language leads). Most films sit on the English·US diagonal."
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

            <Tile title="Languages — logged vs. rated" span={6}>
              <Versus
                leftTitle="Most logged"
                left={languages.left}
                rightTitle="Highest rated"
                right={languages.right}
                hrefFor={languageHref}
              />
            </Tile>

            <Tile title="Countries — logged vs. rated" span={6}>
              <Versus
                leftTitle="Most logged"
                left={countries.left}
                rightTitle="Highest rated"
                right={countries.right}
                hrefFor={countryHref}
              />
            </Tile>

          </StatsSection>

          <StatsSection label="How it reached you">
            <Tile title="Theatrical vs. streaming" span={12}>
              <Bigs
                items={[
                  {
                    n: s.theatrical.wideCount,
                    label: `wide theatrical · ${s.theatrical.wideAvg.toFixed(2)}★`,
                  },
                  {
                    n: s.theatrical.nonCount,
                    label: `streaming/limited · ${s.theatrical.nonAvg.toFixed(2)}★`,
                  },
                  {
                    n: `${signed(s.theatrical.premium)}★`,
                    label: "theatrical premium",
                  },
                ]}
              />
            </Tile>

            <Tile title="Studios — logged vs. rated" span={6}>
              <Versus
                leftTitle="Most logged"
                left={studios.left}
                rightTitle="Highest rated"
                right={studios.right}
                hrefFor={studioHref}
              />
            </Tile>

            <Tile
              title="By conglomerate — logged vs. rated"
              span={6}
              note="Each film rolls up to the conglomerate that owns its studio (else independent). TMDB lists production companies, so this is approximate."
            >
              <Versus
                leftTitle="Most logged"
                left={conglomerate.left}
                rightTitle="Highest rated"
                right={conglomerate.right}
                hrefFor={facetHref("conglomerate")}
              />
            </Tile>

            <Tile
              title="Release type by year"
              span={6}
              note="Films you logged from each release year, split by how they premiered. Streaming and limited only emerge through the 2010s and 2020s."
            >
              <StackedBars
                data={s.releaseTypeByYear}
                ariaLabel="Release type by film release year"
                segmentHref={releaseTypeHref}
              />
            </Tile>

            <Tile
              title="Budget tier by year"
              span={6}
              note="Wide-theatrical films with a reported budget only—recent indie and streaming work undercounts."
            >
              <StackedBars
                data={s.budgetTierByYear}
                ariaLabel="Budget tier by film release year"
                segmentHref={budgetTierHref}
              />
            </Tile>

            <Tile
              title="Release type × release era — avg rating"
              span={6}
              note="All classified films, shrunk. Streaming and limited only exist in recent eras (older cells empty by definition)."
            >
              <Heatmap
                grid={s.releaseTypeEraHeat}
                caption="Average rating by release type and release era"
                hrefFor={eraHeatHref("releaseType")}
              />
            </Tile>

            <Tile
              title="Budget tier × release era — avg rating"
              span={6}
              note="Wide-theatrical only, Bayesian-shrunk. * marks a thin sample (n<5). Tint intensity tracks the rating."
            >
              <Heatmap
                grid={s.budgetEraHeat}
                caption="Average rating by budget tier and release era"
                hrefFor={eraHeatHref("budgetTier")}
              />
            </Tile>

          </StatsSection>

          <StatsSection label="When you watch">
            <Tile
              title="Watch pace by day of year"
              span={12}
              note="Cumulative films watched by day, one line per year—the slope shows when in the year you watch most."
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

            <Tile title="Watched by month" span={6}>
              <StackedBars
                data={s.temporal.monthMatrix}
                ariaLabel="Films watched by month, stacked by year"
                averageLine="month"
                segmentHref={watchedYearHref}
              />
            </Tile>

            <Tile title="Watched by weekday" span={6}>
              <StackedBars
                data={s.temporal.weekdayMatrix}
                ariaLabel="Films watched by weekday, stacked by year"
                averageLine="weekday"
                segmentHref={watchedYearHref}
              />
            </Tile>
          </StatsSection>
        </Section>

        {/* ─── Cross-brand handoff ──────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 14 }}>
            <Link href="/stats/connected">See how film and television connect →</Link>
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
  "Ratings are on a 0.5–5★ scale. “This year” is computed at render, not snapshot time, so it stays current.",
  "“Highest rated” lists gate on a minimum count, so a single 5★ film can’t top the chart.",
  "People stats—actors, directors, writers—count distinct franchises, not films, so a long-running series can’t masquerade as preference. Most-logged stays a raw film count; highest-rated is shrunk and gated on distinct projects.",
  "Actors count only top-10-billed roles, so deep-bench supporting credits don’t inflate the list. On TV the same rule also requires ≥3 episodes—the actor rule is shared across the Films, Television, and Connected pages.",
];

// ─── Local helpers ────────────────────────────────────────────────

/** Format a signed delta to two decimals with an explicit + or −. */
function signed(n: number): string {
  return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);
}

/** The hot-takes / darlings list inside the you-vs-world tile. */
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
  gap: 20,
  marginTop: 4,
};

const deltaHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  margin: "0 0 8px",
  fontWeight: 600,
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
  gap: 8,
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
