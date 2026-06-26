// ─────────────────────────────────────────────────────────────────
// /television/stats — the television dashboard ("The Stats").
//
// The TV sibling of /films/stats: a server component reading the typed
// compute in lib/feeds/stats/tv-stats.ts at request time. Same chart kit,
// hover system, and six-band structure as the film dashboard; the tiles
// differ where television does (per-level ratings, networks, creators,
// season vs episode cadence).
//
// Copy (Display / Lede / tile notes) ships as working placeholders for
// Malcolm to refine in his voice.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { CSSProperties } from "react";
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
import { TileReadout } from "@/components/stats/TileReadout";
import { StatsHandoffPanel } from "@/components/stats/StatsHandoffPanel";
import { StatsFilterControls } from "@/components/filters/StatsFilterControls";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs } from "@/components/stats/Bigs";
import { StatsTrackingRegion } from "@/components/analytics/StatsTrackingRegion";
import { Bars } from "@/components/stats/Bars";
import { ColumnChart } from "@/components/stats/ColumnChart";
import { Versus } from "@/components/stats/Versus";
import { Diverging } from "@/components/stats/Diverging";
import { Donut } from "@/components/stats/Donut";
import { LineChart } from "@/components/stats/LineChart";
import { StackedBars } from "@/components/stats/StackedBars";
import { RatingByLevelTabs } from "@/components/stats/RatingByLevelTabs";
import { SITE_URL } from "@/lib/site-config";
import { computeTvStats } from "@/lib/feeds/stats/tv-stats";
import { carryConnectedParams } from "@/lib/feeds/stats/connected-stats";
import {
  buildTvStatsRails,
  TV_SUMMARY_DIMS,
} from "@/lib/feeds/stats/tv-filter-options";
import { withCarriedFilters } from "@/lib/feeds/stats/filter-url-state";
import type { Contrast } from "@/lib/feeds/stats/shrinkage";
import { slugifyEntity } from "@/lib/feeds/slug";
import {
  buildCompletedCards,
  parseShowFilters,
} from "@/lib/feeds/serializd-utils";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import {
  makeTvFacetHref,
  TV_FACET_LINK_PARAM,
  type TvFacetLink,
} from "@/lib/feeds/facet-index";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Television stats",
  description:
    "Malcolm Xavier's TV corpus by the numbers—genres, networks, world cinema, creators, and the rhythm of a watching year, logged by show, season, and episode.",
  alternates: { canonical: "/television/stats" },
  openGraph: {
    title: "Television stats—Malcolm Xavier",
    description:
      "The stats behind the television corpus: per-level ratings, genres, networks, creators, world cinema, and a watching year's rhythm.",
    url: "/television/stats",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Television stats—Malcolm Xavier",
    description:
      "The stats behind the television corpus: per-level ratings, genres, networks, creators, and a watching year's rhythm.",
    images: ["/opengraph-image"],
  },
};

/** Map a Contrast to the Versus tile's left (most-logged) / right (rated) rows. */
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

/** TV tile id → a reader-facing label for the band footnote. The footnote
 *  names a hidden breakdown to someone who can't see the chart it refers to,
 *  so it avoids chart-internal jargon. Keyed by the catalog id (collapse.ts),
 *  not the tile title. */
const TV_TILE_LABELS: Record<string, string> = {
  lifetime: "Lifetime",
  "rating-distribution-by-level": "Rating distribution",
  type: "Types",
  genres: "Genres",
  "genres-vs-baseline": "Genre ratings",
  actors: "Actors",
  creators: "Creators",
  "world-cinema-lean": "International lean",
  "language-x-country": "Language by country",
  languages: "Languages",
  countries: "Countries",
  networks: "Networks",
  "by-conglomerate": "Network groups",
  "shows-across-networks": "Shows across networks",
  "season-pace": "Season pace",
  "seasons-by-month": "Seasons by month",
  "seasons-by-weekday": "Seasons by weekday",
  "episodes-by-month": "Episodes by month",
};
const tvTileLabel = (id: string) => TV_TILE_LABELS[id] ?? id;

export default async function TelevisionStatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Filter state lives in the URL (§9). Parse it, recompute every tile over the
  // predicate-narrowed corpus, and note whether anything is active (the active
  // state drops the JSON-LD, mirroring the films dashboard).
  const sp = await searchParams;
  const filters = parseShowFilters(sp);
  const filtered = Object.keys(filters).length > 0;
  const s = computeTvStats(filters);

  // Collapse decisions (§6): resolve a tile's rung / a band's state by id. `td`
  // bundles the per-tile props every Tile takes (its decision + the shared
  // readout); `bd` bundles the per-band props every StatsSection takes; `solo`
  // passes a versus tile's surviving-column flag to <Versus solo>.
  const dec = (id: string) => s.collapse.tiles.find((t) => t.id === id);
  const bandDec = (id: string) => s.collapse.bands.find((b) => b.id === id);
  const readout = <TileReadout n={s.lifetime.shows} noun="shows" />;
  const td = (id: string) => ({ decision: dec(id), readout });
  const bd = (label: string) => ({ band: bandDec(label), tileLabel: tvTileLabel });
  const solo = (id: string) => dec(id)?.soloColumn ?? false;

  // The page's active filter state as query params — shared by the reviews
  // handoff and every tile deep-link (withCarriedFilters), so the WHOLE
  // selection survives a click-through, not just the clicked facet.
  const activeParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => activeParams.append(k, x));
    else activeParams.append(k, v);
  }
  // Carry the active filters onto a tile href, dropping the param(s) this click
  // pins. Canonical routes pin in the PATH (pass the param explicitly); ?param=
  // builders auto-drop their own key, so they need no explicit pin.
  const carry = (href: string, ...pinned: string[]) =>
    withCarriedFilters(href, activeParams, pinned);

  // Active filter-dimension count — reported as `carriedFilters` on each tile
  // deep-link so the dashboard separates cold-corpus clicks from clicks that
  // carry a narrowed selection through. Mirrors the films dashboard.
  const carriedCount = new Set(activeParams.keys()).size;

  // Reviews-handoff deep-link (§6 altitude 3): when the page hands off, carry
  // the active query through so the handoff lands on the SAME selection.
  const reviewsHref = `/television/reviews${
    activeParams.toString() ? `?${activeParams.toString()}` : ""
  }`;
  // Cross-brand handoff: carry only the dimensions the connected dashboard
  // also filters on (rating, genre, watched year, actor, language, country,
  // conglomerate) so a TV selection crosses over without leaking TV-only
  // params connected would ignore.
  const connectedHref = `/stats/connected${carryConnectedParams(activeParams)}`;

  // Page-level JSON-LD — a CollectionPage describing the dashboard as a
  // first-class, indexable portfolio artifact (mirrors the film dashboard).
  const pageUrl = `${SITE_URL}/television/stats`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Television stats",
    description:
      "Aggregate statistics derived from Malcolm Xavier's television reviews across shows, seasons, and episodes: genres, networks, creators, world cinema, and temporal rhythm.",
    url: pageUrl,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL },
    author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
  };

  const actors = versusRows(s.actors);
  const creators = versusRows(s.creators);
  const conglomerate = versusRows(s.conglomerate);
  const languages = versusRows(s.languages);
  const countries = versusRows(s.countries);

  // Deep-link builders: each stats-tile row links to its subject under that
  // entity filter (vocabulary matches the filter). A row whose entity clears
  // its indexation floor links to the dedicated route (/television/network/
  // hbo-max); a sub-floor entity falls back to the noindex ?param= form.
  // Genre already has its route. Conglomerate has NO route (not in the floors
  // table), so it always uses ?conglomerate=. Every link carries the page's
  // active filters via `carry` (dropping the param this click pins).
  // The indexable sets read the UNFILTERED corpus so the route-vs-?param
  // decision stays stable as the selection narrows. `summary` feeds the rails.
  const { shows, summary } = getShowsWithEnrichment();
  const statsRails = buildTvStatsRails(shows, summary);
  // The ONE value→href resolver, shared with the show detail block
  // (makeTvFacetHref), so the slug + route-vs-?param= vocabulary can't drift
  // between the two surfaces. Each facet deep-link wraps the bare href with
  // `carry`, which folds the page's active filters onto it and drops the param
  // THIS click pins — TV_FACET_LINK_PARAM names that param. (network/type keep
  // their name-based ?param= fallback inside the factory; genre always routes;
  // conglomerate is always a ?param= filter.)
  const tvFacet = makeTvFacetHref(shows);
  const facetLink =
    (facet: TvFacetLink) =>
    (value: string): string | undefined => {
      const href = tvFacet(facet, value);
      return href === undefined
        ? undefined
        : carry(href, TV_FACET_LINK_PARAM[facet]);
    };
  const genreHref = facetLink("genres");
  const networkHref = facetLink("networks");
  const conglomerateHref = facetLink("conglomerates");
  const actorHref = facetLink("actors");
  const creatorHref = facetLink("creators");
  const languageHref = facetLink("languages");
  const countryHref = facetLink("countries");

  // Non-entity facet deep-links (WS6b.1). Type is name-based and has a route
  // (mirrors networkHref); rating / watched-year / the language×country
  // combination are route-less ?param= filters.
  //
  // Type click-through is gated to types that actually appear as show/season
  // cards in the reviews grid. A type logged only at the episode level (e.g.
  // Talk Show — WWHL) produces no cards, so filtering to it would land an
  // empty grid; those slices stay non-links (see the tile note).
  const cardTypes = new Set(
    buildCompletedCards(shows)
      .map((c) => c.show.tmdb?.type)
      .filter((t): t is string => Boolean(t)),
  );
  // Type additionally gates on cardTypes (an episode-only type lands an empty
  // grid), pre-checking before it resolves through the shared factory.
  const typeHref = (name: string): string | undefined =>
    cardTypes.has(name) ? facetLink("types")(name) : undefined;
  // RatingByLevelTabs is a client component, so it gets a serializable
  // per-level rating→href map (not a closure). Show and season rating
  // buckets scope the grid by cardKind; EPISODE is omitted — episode
  // reviews aren't show/season cards, so there's nothing to filter to (the
  // tab's pane shows a note). Only buckets with reviews get a link. The
  // rating+cardKind keys are this click's pins, auto-dropped by carry.
  const ratingHrefsForLevel = (lvl: "show" | "season") =>
    Object.fromEntries(
      s.ratingByLevel[lvl].bars
        .filter(([, n]) => n > 0)
        .map(([k]) => [
          k,
          carry(`/television/reviews?rating=${k}&cardKind=${lvl}`),
        ]),
    );
  const ratingHrefs = {
    show: ratingHrefsForLevel("show"),
    season: ratingHrefsForLevel("season"),
  };
  const watchedYearHref = (year: string) =>
    carry(`/television/reviews?watchedYear=${year}`);
  const pairHrefByLabel = new Map(
    s.overlap.topPairs.map(([label], i) => {
      const k = s.overlap.topPairKeys[i];
      return [
        label,
        carry(
          `/television/reviews?language=${slugifyEntity(k.language)}&country=${slugifyEntity(k.country)}`,
        ),
      ];
    }),
  );
  const pairHref = (label: string) => pairHrefByLabel.get(label);

  return (
    <div data-subbrand="tv">
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
            <Kicker accent>Television</Kicker>
            <Display>The stats.</Display>
            <Lede wide>
              {s.lifetime.seasonReviews.toLocaleString()} seasons across {s.lifetime.shows.toLocaleString()} shows—this
              is the quantitative breakdown. What I watch, how I rate it, where in the
              world it comes from, and the rhythm of a watching year.
            </Lede>
            {/* The cross-brand dashboard rides inline with the rail as a
                fourth, sibling pill; a quieter link repeats at the foot. */}
            <ClusterRail
              base="/television"
              active="numbers"
              subbrand="tv"
              label="Television sections"
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
          ONE bordered Section wraps BOTH the filter strip and the dashboard so
          the sticky summary bar has real range over the tiles it filters
          (position:sticky only travels within its DOM parent). Every filter
          change is a URL round-trip that re-runs computeTvStats over the
          narrowed corpus. Mirrors /films/stats. */}
      <Container size="lg">
        <Section bordered padding="md" style={{ paddingTop: "1rem" }}>
          <StatsFilterControls
            rails={statsRails}
            summaryDims={TV_SUMMARY_DIMS}
            tailParams={["type", "decade"]}
            omniboxEndpoint="/television/reviews/facet-search"
            omniboxLabel="Search"
            omniboxPlaceholder="Titles, actors, creators, networks…"
            omniboxAriaLabel="Search television by title, actor, creator, network, language, or country"
            chipClassName="show-filter-chip"
            idPrefix="tv-stats"
            basePath="/television/stats"
            noun={{ singular: "show", plural: "shows" }}
            totalResults={s.lifetime.shows}
            cluster="television"
          />

          <div className="pt-10 sm:pt-14">
          {/* One delegated click listener instruments every tile deep-link
              (STATS_TILE_CLICK) without the chart primitives becoming client
              components — each linking Tile stamps its facet via data-sd. */}
          <StatsTrackingRegion cluster="television" activeFilterCount={carriedCount}>
          {/* Page verdict (§6 altitude 3): when the filtered corpus is too thin
              (N ≤ HANDOFF_MAX_N) the page hands off to the reviews funnel for
              the same selection rather than rendering a wall of readouts. */}
          {s.collapse.verdict === "reviews-handoff" ? (
            <StatsHandoffPanel
              n={s.lifetime.shows}
              href={reviewsHref}
              noun={{ singular: "show", plural: "shows" }}
              resetHref="/television/stats"
              cluster="television"
            />
          ) : (
            <>
          {/* Six named bands (readability pass), mirroring the film
              dashboard. Spans within each band follow Malcolm's saved
              sketch layout (_private/_sketches/stats-sketch-layout.json
              → "tv"). */}

          <StatsSection label="The corpus" {...bd("The corpus")}>
            <Tile
              {...td("lifetime")}
              title="Lifetime"
              span={12}
              note={`Across ${s.lifetime.shows.toLocaleString()} total shows, ${s.lifetime.thisYear} of which I've actively watched at some point this year.`}
            >
              {/* Per-level breakout: each level gets its own count + average
                  rather than mixing shows and seasons into one figure. This
                  also makes the rating granularity legible at a glance — far
                  more episode and season reviews than show reviews — and the
                  Seasons average matches the genre baseline and the
                  distribution tile below. */}
              <LifetimeLevels
                levels={[
                  { label: "Season-level reviews", n: s.ratingByLevel.season.n, avg: s.ratingByLevel.season.avg },
                  { label: "Show-level reviews", n: s.ratingByLevel.show.n, avg: s.ratingByLevel.show.avg },
                  { label: "Episode-level reviews", n: s.ratingByLevel.episode.n, avg: s.ratingByLevel.episode.avg },
                ]}
              />
            </Tile>

            <Tile
              {...td("rating-distribution-by-level")}
              title="Rating distribution by level"
              span={12}
              linkDimension="rating"
              note="Seasons, shows, and episodes are rated and counted separately with the exception of miniseries, which are double-counted (season and show). Episode logging only began this year."
            >
              <RatingByLevelTabs data={s.ratingByLevel} ratingHrefs={ratingHrefs} />
            </Tile>

            <Tile
              {...td("type")}
              title="Type"
              span={6}
              linkDimension="type"
            >
              <Donut slices={s.types} ariaLabel="Share of shows by type" hrefFor={typeHref} />
            </Tile>
          </StatsSection>

          <StatsSection label="Taste" {...bd("Taste")}>
            <Tile {...td("genres")} title="Genres" span={4} linkDimension="genre">
              <Bars
                rows={s.genres.most}
                hrefFor={genreHref}
                tipFor={(genre, count) =>
                  `${genre} — ${count} ${count === 1 ? "show" : "shows"}${
                    s.lifetime.shows
                      ? ` · ${Math.round((count / s.lifetime.shows) * 100)}% of shows`
                      : ""
                  }`
                }
              />
            </Tile>

            <Tile
              {...td("genres-vs-baseline")}
              title="Genres vs. my baseline"
              span={8}
              linkDimension="genre"
              note={`Baseline = my ${s.lifetime.avgRating.toFixed(2)}★ avg season rating; most-logged genres first. Bars right of center rate above it; bars left of center rate below.`}
            >
              <Diverging
                rows={s.divergingGenre}
                baseline={s.lifetime.avgRating}
                hrefFor={genreHref}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="People" {...bd("People")}>
            <Tile
              {...td("actors")}
              title="Actors — logged vs. rated"
              span={6}
              linkDimension="actor"
              note="Top-10 billed and ≥3 episodes, so a one-off guest spot doesn't count. Highest-rated counts distinct shows."
            >
              <Versus
                leftTitle="Most logged"
                left={actors.left}
                rightTitle="Highest rated"
                right={actors.right}
                hrefFor={actorHref}
                solo={solo("actors")}
              />
            </Tile>

            <Tile
              {...td("creators")}
              title="Creators — logged vs. rated"
              span={6}
              linkDimension="creator"
              note="Highest-rated gated on a minimum of 2 distinct shows."
            >
              <Versus
                leftTitle="Most logged"
                left={creators.left}
                rightTitle="Highest rated"
                right={creators.right}
                hrefFor={creatorHref}
                solo={solo("creators")}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="Where it comes from" {...bd("Where it comes from")}>
            <Tile
              {...td("world-cinema-lean")}
              title="World cinema lean"
              span={12}
              note="I rate non-English and non-US shows against domestic ones—language is the stronger signal, country reinforces it."
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
              {...td("language-x-country")}
              title="Language × country"
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

            <Tile {...td("languages")} title="Languages — logged vs. rated" span={6} linkDimension="language">
              <Versus
                leftTitle="Most logged"
                left={languages.left}
                rightTitle="Highest rated"
                right={languages.right}
                hrefFor={languageHref}
                solo={solo("languages")}
              />
            </Tile>

            <Tile {...td("countries")} title="Countries — logged vs. rated" span={6} linkDimension="country">
              <Versus
                leftTitle="Most logged"
                left={countries.left}
                rightTitle="Highest rated"
                right={countries.right}
                hrefFor={countryHref}
                solo={solo("countries")}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="How it reached me" {...bd("How it reached me")}>
            <Tile
              {...td("networks")}
              title="Networks — logged vs. rated"
              span={6}
              linkDimension="network"
              note="Each show counts once under its canonical primary network (HBO and Max merged, and so on). Highest-rated is a gated raw average across ≥3 shows."
            >
              <Versus
                leftTitle="Most logged"
                left={s.networks.most}
                rightTitle="Highest rated"
                right={s.networks.topRated}
                hrefFor={networkHref}
                solo={solo("networks")}
              />
            </Tile>

            <Tile
              {...td("by-conglomerate")}
              title="By conglomerate — logged vs. rated"
              span={6}
              linkDimension="conglomerate"
              note="Each show rolls up to the conglomerate that owns its network (else independent)."
            >
              <Versus
                leftTitle="Most logged"
                left={conglomerate.left}
                rightTitle="Highest rated"
                right={conglomerate.right}
                hrefFor={conglomerateHref}
                solo={solo("by-conglomerate")}
              />
            </Tile>

            <Tile
              {...td("shows-across-networks")}
              title="Shows across networks"
              span={12}
              note="Shows tied to more than one canonical network. An arrow (→) marks a known change of home; a plus (+) marks a show carried on both at once (a linear-plus-streamer simulcast)."
            >
              <MultiNetList rows={s.multiNetwork} />
            </Tile>
          </StatsSection>

          <StatsSection label="When I watch" {...bd("When I watch")}>
            <Tile
              {...td("season-pace")}
              title="Season pace by day of year"
              span={12}
              linkDimension="watched-year"
              note="Cumulative seasons finished by each date of the year, per year."
            >
              <LineChart
                series={s.temporal.seasonPaceByDay.map((c) => ({
                  label: c.year,
                  points: c.points,
                }))}
                ariaLabel="Cumulative seasons finished by day of year, per year"
                hrefFor={watchedYearHref}
              />
            </Tile>

            <Tile {...td("seasons-by-month")} title="Seasons by month" span={6} linkDimension="watched-year">
              <StackedBars
                data={s.temporal.seasonMonthMatrix}
                ariaLabel="Seasons finished by month, stacked by year"
                averageLine="month"
                segmentHref={watchedYearHref}
              />
            </Tile>

            <Tile {...td("seasons-by-weekday")} title="Seasons by weekday" span={6} linkDimension="watched-year">
              <StackedBars
                data={s.temporal.seasonWeekdayMatrix}
                ariaLabel="Seasons finished by weekday, stacked by year"
                averageLine="weekday"
                segmentHref={watchedYearHref}
              />
            </Tile>

            <Tile
              {...td("episodes-by-month")}
              title="Episodes logged by month"
              span={12}
              note="Standalone episode reviews by month—episode-level logging only began this year."
            >
              <ColumnChart
                columns={s.temporal.episodesByMonth}
                ariaLabelFor={(month, count) => `${month}: ${count} episodes`}
                tipFor={(month, count) =>
                  `${month} — ${count} ${count === 1 ? "episode" : "episodes"}`
                }
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
          <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 14 }}>
            <Link href={connectedHref}>See how film and television connect →</Link>
          </p>
        </Section>

        {/* ─── Methodology ──────────────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <Methodology notes={TV_METHOD} />
        </Section>
      </Container>
    </div>
  );
}

// ─── The multi-network list ───────────────────────────────────────

/** Lifetime — a count + average per review level (Shows / Seasons /
    Episodes), kept separate rather than blended. Corpus size and this-year
    activity live in the tile caption. */
function LifetimeLevels({
  levels,
}: {
  levels: { label: string; n: number; avg: number }[];
}) {
  return (
    <div style={levelGridStyle}>
      {levels.map((l) => (
        <div key={l.label} style={levelCellStyle}>
          <span style={levelLabelStyle}>{l.label}</span>
          <span style={levelNumStyle}>{l.n.toLocaleString()}</span>
          {/* The level label already says "reviews," so the sub-line just
              carries the average — the big number above is the count. */}
          <span style={levelSubStyle}>{l.avg.toFixed(2)}★ avg</span>
        </div>
      ))}
    </div>
  );
}

/** "Shows across networks" — two columns: shows that switched home (left,
    directional Fox → ABC) and shows carried on more than one network at
    once (right, FX + Hulu). Within each, alphabetical by title; the name
    column is flexible so titles never truncate. */
function MultiNetList({
  rows,
}: {
  rows: { name: string; nets: string[]; move: string | null }[];
}) {
  if (!rows.length) {
    return <p style={emptyStyle}>No multi-network shows in the corpus yet.</p>;
  }
  const byTitle = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  const switched = rows.filter((r) => r.move).sort(byTitle);
  const coaired = rows.filter((r) => !r.move).sort(byTitle);
  return (
    <div style={netTwoColStyle}>
      <NetGroup title="Switched home" rows={switched} pathOf={(r) => r.move ?? ""} />
      <NetGroup title="Carried on both" rows={coaired} pathOf={(r) => r.nets.join(" + ")} />
    </div>
  );
}

function NetGroup({
  title,
  rows,
  pathOf,
}: {
  title: string;
  rows: { name: string; nets: string[]; move: string | null }[];
  pathOf: (r: { name: string; nets: string[]; move: string | null }) => string;
}) {
  return (
    <div style={netGroupStyle}>
      <h4 style={netHeadStyle}>{title}</h4>
      {rows.length ? (
        <ul style={netListStyle}>
          {rows.map((r) => (
            <li key={r.name} style={netRowStyle}>
              <span style={netNameStyle}>{r.name}</span>
              <span style={netPathStyle}>{pathOf(r)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={emptyStyle}>None yet.</p>
      )}
    </div>
  );
}

// How the television numbers are made — working drafts in Malcolm's voice.
const TV_METHOD: string[] = [
  "Ratings, watch dates, and the show/season/episode structure come from Serializd; genres, networks, cast, and creators from TMDB.",
  "Every “how I rate it” figure ranks on season ratings. The headline average and the genre baseline are the mean across all rated seasons. The people and network rankings fold each show to its own season mean first, counted once, so a long-running series can’t swamp them.",
  "Networks are canonicalized before counting—HBO and Max are one destination, Showtime rolls into Paramount+, and each show counts once under its primary network.",
  "“Highest rated” lists guard against thin samples two ways—a minimum-count gate, so a single 5★ show can’t top the chart, and Bayesian shrinkage, which eases a small sample toward the overall average until enough ratings accumulate. Both apply anywhere an average rating is ranked.",
  "Actors count only top-10-billed roles with at least three episodes, so a one-scene guest spot doesn’t inflate the list.",
];

// ─── Styles ───────────────────────────────────────────────────────

// ─ Lifetime per-level breakout ─
// Three level columns; wraps below ~3×130px.
const levelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 16,
};

const levelCellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const levelLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  fontWeight: 600,
};

const levelNumStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 600,
  color: "var(--text-heading)",
  fontVariantNumeric: "tabular-nums",
};

const levelSubStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  fontVariantNumeric: "tabular-nums",
};

// ─ Shows across networks: two outer columns, name|path within each ─
const netTwoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px 32px",
};

const netGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const netHeadStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-caption)",
  fontWeight: 600,
  margin: 0,
};

const netListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const netRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "baseline",
};

const netNameStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12.5,
  lineHeight: 1.3,
  color: "var(--text-body)",
  minWidth: 0,
};

const netPathStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  color: "var(--text-caption)",
  margin: 0,
};
