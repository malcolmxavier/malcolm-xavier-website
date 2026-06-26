// ─────────────────────────────────────────────────────────────────
// /stats/connected — the cross-brand film × television dashboard.
//
// The one surface that pools both libraries: where the film and TV logs
// agree, diverge, and overlap. A server component reading the typed
// compute in lib/feeds/stats/connected-stats.ts at request time. Reuses the
// same chart kit and six-band structure as the cluster dashboards, but
// carries NO data-subbrand wrapper — it belongs to neither cluster, so its
// labels stay neutral and the Film-vs-TV series take the two brand hues
// (film = orange, TV = blue) to match the dumbbell.
//
// Interactive (§9): the filter island narrows BOTH libraries in lockstep on
// the shared dimensions connected reports on (rating, genre, watched year +
// the omnibox's actor / language / country / conglomerate). Tiles do NOT
// deep-link out — every figure blends both libraries, so there's no single
// reviews list to click into; that click-through lives on the per-cluster
// dashboards. When a selection thins the cross-brand view past readability
// the page reports "connected-thin" and points back at those two dashboards.
//
// Not in the global header; reached via the "see how film and TV connect"
// handoff on each cluster dashboard. Copy ships as working placeholders for
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
import { railPillStyle } from "@/components/chrome/ClusterRail";
import { IconChartBar } from "@/components/icons";
import { StatsSection } from "@/components/stats/StatsSection";
import { StatsTips } from "@/components/stats/StatsTips";
import { Tile } from "@/components/stats/Tile";
import { TileReadout } from "@/components/stats/TileReadout";
import { StatsFilterControls } from "@/components/filters/StatsFilterControls";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs } from "@/components/stats/Bigs";
import { Bars } from "@/components/stats/Bars";
import { Versus } from "@/components/stats/Versus";
import { Dumbbell } from "@/components/stats/Dumbbell";
import { StackedBars } from "@/components/stats/StackedBars";
import { GroupedStackedBars } from "@/components/stats/GroupedStackedBars";
import { SITE_URL } from "@/lib/site-config";
import {
  computeConnectedStats,
  parseConnectedFilters,
  CONNECTED_FILTER_PARAMS,
} from "@/lib/feeds/stats/connected-stats";
import {
  buildConnectedStatsRails,
  CONNECTED_SUMMARY_DIMS,
} from "@/lib/feeds/stats/connected-filter-options";
import { getFilmsWithEnrichment, getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { hasActiveFilter } from "@/lib/feeds/stats/filter-url-state";
import type { Contrast } from "@/lib/feeds/stats/shrinkage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Per-request metadata. The unfiltered dashboard is the indexable canonical;
 * every filtered permutation is noindex,follow self-canonical (matches the
 * cluster stats pages — filtered states aren't canonical surfaces).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const filtered = hasActiveFilter(parseConnectedFilters(await searchParams));
  return {
    title: "Film × Television",
    description:
      "Where Malcolm Xavier's film and TV logs meet—head-to-head averages, crossover actors, how genres rate on screen vs. series, and one watching year across both.",
    alternates: { canonical: "/stats/connected" },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Film × Television—Malcolm Xavier",
      description:
        "Where the film and television logs connect: head-to-head, crossover actors, genre film-vs-TV, and a shared watching year.",
      url: "/stats/connected",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Film × Television—Malcolm Xavier",
      description:
        "Where the film and television logs connect: head-to-head, crossover actors, genre film-vs-TV, and a shared watching year.",
      images: ["/opengraph-image"],
    },
  };
}

// Film = orange, TV = blue — the EXACT hues the film and television
// dashboards paint their bars with (sub-brand --primary-700/300, resolved
// here via the [data-connected] --film-hue/--tv-hue vars in components.css
// so they flip light↔dark). Used by every Film-vs-TV series + the dumbbell.
const FILM_TV = ["var(--film-hue)", "var(--tv-hue)"];

/** Map a Contrast to the Versus tile's left/right rows. */
function versusRows(c: Contrast): {
  left: [string, number][];
  right: [string, number][];
} {
  return {
    left: c.most,
    right: c.major.map((x): [string, number] => [x.k, x.adj]),
  };
}

/** Format a signed delta to two decimals with an explicit + or −. */
function signed(n: number): string {
  return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2);
}

/** Connected tile id → a reader-facing label for the band footnote (the
 *  footnote names a hidden breakdown to someone who can't see the chart, so it
 *  avoids chart-internal jargon). Keyed by the catalog id (collapse.ts). */
const CONNECTED_TILE_LABELS: Record<string, string> = {
  "films-vs-television": "Head to head",
  "genres-film-vs-tv": "Genres film vs. TV",
  "crossover-actors": "Crossover actors",
  "world-cinema-lean": "International lean",
  languages: "Languages",
  countries: "Countries",
  "language-x-country": "Language by country",
  "by-conglomerate": "Conglomerates",
  "film-and-tv-by-month": "By month",
  "by-weekday": "By weekday",
};
const connectedTileLabel = (id: string) => CONNECTED_TILE_LABELS[id] ?? id;

export default async function ConnectedStatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Filter state lives in the URL (§9). Parse it (restricted to the shared
  // dims connected reports on), recompute every tile over the predicate-
  // narrowed pooled corpus, and note whether anything is active (the active
  // state drops the JSON-LD, mirroring the cluster dashboards).
  const sp = await searchParams;
  const filters = parseConnectedFilters(sp);
  const filtered = hasActiveFilter(filters);
  const s = computeConnectedStats(filters);

  // Collapse decisions (§6): resolve a tile's rung / a band's state by id. `td`
  // bundles the per-tile props every Tile takes (its decision + the shared
  // readout); `bd` bundles the per-band props every StatsSection takes; `solo`
  // passes a versus tile's surviving-column flag to <Versus solo>. The readout
  // figure is the pooled corpus (films + rated seasons) the selection supports.
  const dec = (id: string) => s.collapse.tiles.find((t) => t.id === id);
  const bandDec = (id: string) => s.collapse.bands.find((b) => b.id === id);
  const pooledCorpus = s.headToHead.filmsLogged + s.headToHead.seasonsLogged;
  const readout = <TileReadout n={pooledCorpus} noun="titles" />;
  const td = (id: string) => ({ decision: dec(id), readout });
  const bd = (label: string) => ({ band: bandDec(label), tileLabel: connectedTileLabel });
  const solo = (id: string) => dec(id)?.soloColumn ?? false;

  // The page's active filter state as query params — restricted to the dims
  // connected actually filters on, so the cross-dashboard carry reflects the
  // real selection and never leaks a hand-crafted cluster-only param onward.
  const allowed = new Set<string>(CONNECTED_FILTER_PARAMS);
  const activeParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (!allowed.has(k) || v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => activeParams.append(k, x));
    else activeParams.append(k, v);
  }
  const qs = activeParams.toString();
  // When connected thins out, the two cluster dashboards inherit the SAME
  // selection so the reader keeps their filters crossing the handoff.
  const filmStatsHref = `/films/stats${qs ? `?${qs}` : ""}`;
  const tvStatsHref = `/television/stats${qs ? `?${qs}` : ""}`;

  // Filter island options, built from the UNFILTERED pooled corpus so the
  // rails keep every chip as the selection narrows.
  const { films } = getFilmsWithEnrichment();
  const { shows } = getShowsWithEnrichment();
  const connectedRails = buildConnectedStatsRails(films, shows);

  const pageUrl = `${SITE_URL}/stats/connected`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Film × Television",
    description:
      "Cross-brand statistics pooling Malcolm Xavier's film and television reviews: head-to-head averages, crossover actors, genre comparison, shared provenance, and a combined watching year.",
    url: pageUrl,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL },
    author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
  };

  const crossover = s.crossoverActors;
  const languages = versusRows(s.languages);
  const countries = versusRows(s.countries);

  return (
    <div data-connected>
      {/* JSON-LD only on the unfiltered canonical (filtered states are
          noindex permutations). */}
      {!filtered ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {/* Touch support for the chart hover chips. */}
      <StatsTips />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker>Film × Television</Kicker>
            <Display>Where they connect.</Display>
            <Lede wide>
              Two libraries, one taste. This is where the film and television
              logs meet—the head-to-head averages, the actors who cross over, and the
              genres I rate differently on screen than in a series.
            </Lede>
            {/* Back to each cluster's own dashboard — pills that mirror the
                cluster rail's inactive tabs, each tinted to its medium
                (orange film, blue television) so they read as the
                counterpart to the "Connected Stats" pill on those pages.
                Each carries the active selection so a filter crosses over. */}
            <nav aria-label="Cluster dashboards" style={backNavStyle}>
              <NextLink
                href={filmStatsHref}
                style={{
                  ...railPillStyle,
                  color: "var(--film-hue)",
                  border: "1px solid var(--film-hue)",
                }}
                className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <IconChartBar size={14} style={{ flex: "none" }} />
                The film stats
              </NextLink>
              <NextLink
                href={tvStatsHref}
                style={{
                  ...railPillStyle,
                  color: "var(--tv-hue)",
                  border: "1px solid var(--tv-hue)",
                }}
                className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <IconChartBar size={14} style={{ flex: "none" }} />
                The television stats
              </NextLink>
            </nav>
            {/* This page filters both libraries at once, but its tiles don't
                click through: every figure blends film AND television, so
                there's no single reviews list to filter into. For the reviews
                behind a chart, use the per-cluster dashboards linked above. */}
            <HeroNote>
              Use the filters to narrow both libraries at once. The tiles here
              don't click through—each number blends both libraries—so for the
              reviews behind a visualization, head to the individual film or
              television stats pages above.
            </HeroNote>
          </Stack>
        </Section>
      </Container>

      {/* ─── Filter controls + dashboard ──────────────────────────
          ONE bordered Section wraps BOTH the filter strip and the dashboard so
          the sticky summary bar has range over the tiles it filters. Every
          filter change is a URL round-trip that re-runs computeConnectedStats
          over the narrowed pooled corpus. Mirrors the cluster dashboards. */}
      <Container size="lg">
        <Section bordered padding="md" style={{ paddingTop: "1rem" }}>
          <StatsFilterControls
            rails={connectedRails}
            summaryDims={CONNECTED_SUMMARY_DIMS}
            omniboxEndpoint="/stats/connected/facet-search"
            omniboxLabel="Search"
            omniboxPlaceholder="Actors, languages, countries, conglomerates…"
            omniboxAriaLabel="Search across both libraries by actor, language, country, or conglomerate"
            chipClassName="connected-filter-chip"
            idPrefix="connected-stats"
            basePath="/stats/connected"
            noun={{ singular: "title", plural: "titles" }}
            totalResults={pooledCorpus}
            cluster="connected"
          />

          <div className="pt-10 sm:pt-14">
            {/* Page verdict (§6 altitude 3): connected never hands off to a
                single reviews list (cross-brand), so when the selection thins
                the view past readability it reports "connected-thin" and points
                back at the two cluster dashboards for the same filters. */}
            {s.collapse.verdict === "connected-thin" ? (
              <ConnectedThinPanel
                filmHref={filmStatsHref}
                tvHref={tvStatsHref}
                resetHref="/stats/connected"
              />
            ) : (
              <>
                <StatsSection label="Head to head" {...bd("Head to head")}>
                  <Tile
                    {...td("films-vs-television")}
                    title="Films vs. television"
                    span={12}
                    note="My full film corpus against my rated TV seasons (the primary unit of television ratings)."
                  >
                    <Bigs
                      items={[
                        { n: s.headToHead.filmsLogged.toLocaleString(), label: "films logged" },
                        { n: s.headToHead.seasonsLogged.toLocaleString(), label: "seasons rated" },
                        { n: `${s.headToHead.filmAvg.toFixed(2)}★`, label: "film average" },
                        { n: `${s.headToHead.seasonAvg.toFixed(2)}★`, label: "season average" },
                        {
                          n: `${signed(s.headToHead.seasonMinusFilm)}★`,
                          label: "TV vs. film gap",
                        },
                      ]}
                    />
                  </Tile>
                </StatsSection>

                <StatsSection label="Film vs. television" {...bd("Film vs. television")}>
                  <Tile
                    {...td("genres-film-vs-tv")}
                    title="Genres — film vs. TV"
                    span={6}
                    note="Shared genres only (≥5 titles logged on each side). Each row is a genre's film average and its TV average; the bar is the gap. Film = orange, TV = blue."
                  >
                    <Dumbbell rows={s.genreFilmVsTv} />
                  </Tile>

                  <Tile
                    {...td("crossover-actors")}
                    title="Crossover actors"
                    span={6}
                    note="In ≥2 films and ≥2 shows. Only top-10-billed roles with at least three episodes for a show to count. The label carries each name's film·TV split; highest-rated averages over everything logged."
                  >
                    <Versus
                      leftTitle="Most logged"
                      left={crossover.most}
                      rightTitle="Highest rated"
                      right={crossover.major}
                      solo={solo("crossover-actors")}
                    />
                  </Tile>
                </StatsSection>

                <StatsSection label="Where it comes from" {...bd("Where it comes from")}>
                  <Tile
                    {...td("world-cinema-lean")}
                    title="World cinema lean"
                    span={12}
                    note="Pooled across both libraries—how non-English and non-US titles rate against domestic ones, and the international share of everything logged."
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

                  <Tile {...td("languages")} title="Languages — logged vs. rated" span={6}>
                    <Versus
                      leftTitle="Most logged"
                      left={languages.left}
                      rightTitle="Highest rated"
                      right={languages.right}
                      solo={solo("languages")}
                    />
                  </Tile>

                  <Tile {...td("countries")} title="Countries — logged vs. rated" span={6}>
                    <Versus
                      leftTitle="Most logged"
                      left={countries.left}
                      rightTitle="Highest rated"
                      right={countries.right}
                      solo={solo("countries")}
                    />
                  </Tile>

                  <Tile
                    {...td("language-x-country")}
                    title="Language × country"
                    span={12}
                    note="The joint view across both libraries: which languages pair with which countries (language leads)."
                  >
                    <Bigs
                      items={[
                        { n: s.overlap.pairs, label: "language · country pairs" },
                        { n: s.overlap.languages, label: "languages" },
                        { n: s.overlap.countries, label: "countries" },
                      ]}
                    />
                    {/* Neutral green (the categorical palette's first hue) rather
                        than the default single-series blue, which on a cross-brand
                        page reads as "television." */}
                    <Bars rows={s.overlap.topPairs} fill="var(--chart-c1)" />
                  </Tile>
                </StatsSection>

                <StatsSection label="The industry" {...bd("The industry")}>
                  <Tile
                    {...td("by-conglomerate")}
                    title="By conglomerate — film vs. TV"
                    span={12}
                    note="Each title rolls up to the conglomerate that owns its studio (film) or network (TV)."
                  >
                    <StackedBars
                      data={s.conglomerate}
                      ariaLabel="Titles by conglomerate, split film vs. TV"
                      colors={FILM_TV}
                    />
                  </Tile>
                </StatsSection>

                <StatsSection label="When I watch" {...bd("When I watch")}>
                  {/* The headline cadence view: one chart, three dimensions.
                      Each month carries two bars—film on the left, television on
                      the right—each stacked by year. Hue marks the medium (orange
                      film, blue TV); shade marks the year. So the month-to-month
                      rhythm, the film-vs-TV split, and the year-over-year mix all
                      read in one place, in volumes. */}
                  <Tile
                    {...td("film-and-tv-by-month")}
                    title="Film and television by month"
                    span={12}
                  >
                    <GroupedStackedBars
                      data={s.temporal.monthMediumYear}
                      ariaLabel="Films and television logged by month, two bars per month (film, television), each stacked by year"
                      groupColors={FILM_TV}
                    />
                  </Tile>

                  <Tile {...td("by-weekday")} title="By weekday" span={6}>
                    <StackedBars
                      data={s.temporal.weekdayMatrix}
                      ariaLabel="Films vs. seasons by weekday"
                      colors={FILM_TV}
                    />
                  </Tile>
                </StatsSection>
              </>
            )}
          </div>
        </Section>

        {/* ─── Methodology ──────────────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <Methodology notes={CONNECTED_METHOD} />
        </Section>
      </Container>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ConnectedThinPanel — the connected page's "verdict" panel (§6 altitude 3).
// Connected can't hand off to a single reviews list (every figure pools both
// libraries), so when a selection thins the cross-brand view past readability
// it sends the reader to the two cluster dashboards, carrying the same filters.
// Same bordered surface as a Tile so it reads as part of the dashboard frame.
// ─────────────────────────────────────────────────────────────────
function ConnectedThinPanel({
  filmHref,
  tvHref,
  resetHref,
}: {
  filmHref: string;
  tvHref: string;
  resetHref: string;
}) {
  return (
    <div style={thinPanelStyle} role="status">
      <p style={thinLeadStyle}>
        Widen the selection or explore the same filters on either dashboard.
      </p>
      <div style={thinLinksStyle}>
        <NextLink href={filmHref} style={thinLinkStyle}>
          The film stats →
        </NextLink>
        <NextLink href={tvHref} style={thinLinkStyle}>
          The television stats →
        </NextLink>
        <NextLink href={resetHref} style={thinLinkStyle}>
          Clear the filters →
        </NextLink>
      </div>
    </div>
  );
}

// How the connected numbers are made — working drafts in Malcolm's voice.
const CONNECTED_METHOD: string[] = [
  "The same libraries the individual stats pages draw on—Letterboxd for film, Serializd for television—pooled onto one calendar and one 0.5–5★ scale.",
  "Television ratings use season data (each show folded to the mean of its rated seasons), so film and TV sit on comparable footing rather than comparing a film to sparse overall show data.",
  "“Highest rated” figures are Bayesian-shrunk—a thin sample is eased toward the overall average until enough ratings accumulate, so a lone high mark can’t outrank a consistently strong record.",
];

// ─── Styles ───────────────────────────────────────────────────────

const backNavStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginTop: 8,
};

// The connected-thin panel — same surface + border tokens as a Tile.
const thinPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  alignItems: "flex-start",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-md)",
  padding: "28px 24px",
};

const thinLeadStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 18,
  lineHeight: 1.5,
  color: "var(--text-heading)",
  margin: 0,
  maxWidth: "52ch",
};

const thinLinksStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 20,
};

// Mono action links carrying the internal-destination arrow per the CTA
// convention. Colour + underline come from the global body-link cascade.
const thinLinkStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
};
