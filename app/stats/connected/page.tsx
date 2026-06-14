// ─────────────────────────────────────────────────────────────────
// /stats/connected — the cross-brand film × television dashboard.
//
// The one surface that pools both libraries: where the film and TV logs
// agree, diverge, and overlap. A server component reading the typed
// compute in lib/feeds/stats/connected-stats.ts. Reuses the same chart
// kit and six-band structure as the cluster dashboards, but carries NO
// data-subbrand wrapper — it belongs to neither cluster, so its labels
// stay neutral and the Film-vs-TV series take the two brand hues (film =
// orange, TV = blue) to match the dumbbell.
//
// Not in the global header; reached via the "see how film and TV
// connect" handoff on each cluster dashboard. Copy ships as working
// placeholders for Malcolm to refine in his voice.
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
import { railPillStyle } from "@/components/chrome/ClusterRail";
import { IconChartBar } from "@/components/icons";
import { StatsSection } from "@/components/stats/StatsSection";
import { StatsTips } from "@/components/stats/StatsTips";
import { Tile } from "@/components/stats/Tile";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs } from "@/components/stats/Bigs";
import { Bars } from "@/components/stats/Bars";
import { Versus } from "@/components/stats/Versus";
import { Dumbbell } from "@/components/stats/Dumbbell";
import { StackedBars } from "@/components/stats/StackedBars";
import { GroupedStackedBars } from "@/components/stats/GroupedStackedBars";
import { SITE_URL } from "@/lib/site-config";
import { computeConnectedStats } from "@/lib/feeds/stats/connected-stats";
import type { Contrast } from "@/lib/feeds/stats/shrinkage";

export const metadata: Metadata = {
  title: "Film × Television",
  description:
    "Where Malcolm Xavier's film and television logs connect: the head-to-head averages, crossover actors, how genres rate differently on screen vs. series, shared world-cinema lean, and one watching year across both.",
  alternates: { canonical: "/stats/connected" },
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

export default function ConnectedStatsPage() {
  const s = computeConnectedStats();

  const pageUrl = `${SITE_URL}/stats/connected`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Film × Television",
    description:
      "Cross-brand statistics pooling Malcolm Xavier's film and television reviews: head-to-head averages, crossover actors, genre comparison, shared provenance, and a combined watching year.",
    url: pageUrl,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
  };

  const crossover = s.crossoverActors;
  const languages = versusRows(s.languages);
  const countries = versusRows(s.countries);

  return (
    <div data-connected>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Touch support for the chart hover chips. */}
      <StatsTips />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker>Film × Television</Kicker>
            <Display>Where they connect.</Display>
            <Lede style={{ maxWidth: "none" }}>
              Two libraries, one taste. This is where the film and television
              logs meet—the head-to-head averages, the actors who cross over, the
              genres I rate differently on screen than in a series, and the
              watching year the two share. Television sits on its season ratings
              so the two compare on even footing.
            </Lede>
            {/* Back to each cluster's own dashboard — pills that mirror the
                cluster rail's inactive tabs, each tinted to its medium
                (orange film, blue television) so they read as the
                counterpart to the "Connected" pill on those pages. */}
            <nav aria-label="Cluster dashboards" style={backNavStyle}>
              <NextLink
                href="/films/stats"
                style={{
                  ...railPillStyle,
                  color: "var(--film-hue)",
                  border: "1px solid var(--film-hue)",
                }}
                className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <IconChartBar size={14} style={{ flex: "none" }} />
                The film numbers
              </NextLink>
              <NextLink
                href="/television/stats"
                style={{
                  ...railPillStyle,
                  color: "var(--tv-hue)",
                  border: "1px solid var(--tv-hue)",
                }}
                className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <IconChartBar size={14} style={{ flex: "none" }} />
                The television numbers
              </NextLink>
            </nav>
            {/* Why the tiles here aren't clickable: every figure on this page
                blends film AND television, so there's no single reviews list
                to filter into the way the per-cluster dashboards do. The
                click-through lives on those (linked above). */}
            <p style={connectedNoteStyle}>
              The tiles on the cluster dashboards click through to filtered
              reviews; these don&rsquo;t. Each number here blends both
              libraries, so there&rsquo;s no single list to open—head to the
              film or television numbers above to filter into the reviews behind
              a figure.
            </p>
          </Stack>
        </Section>
      </Container>

      {/* ─── Dashboard ────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="md" style={{ paddingTop: 0 }}>
          <StatsSection label="Head to head">
            <Tile
              title="Films vs. television"
              span={12}
              note="Your full film corpus against your rated TV seasons—the two units that carry a single rating each. The gap is season average minus film average."
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

          <StatsSection label="Film vs. television">
            <Tile
              title="Genres — film vs. TV"
              span={6}
              note="Shared genres only (≥5 titles logged on each side). Each row is a genre's film average and its TV average; the bar is the gap. Film = orange, TV = blue."
            >
              <Dumbbell rows={s.genreFilmVsTv} />
            </Tile>

            <Tile
              title="Crossover actors"
              span={6}
              note="In at least two films AND two shows, so the list reads as real cross-medium careers. The label carries each name's film·TV split; highest-rated is shrunk over everything logged."
            >
              <Versus
                leftTitle="Most logged"
                left={crossover.most}
                rightTitle="Highest rated"
                right={crossover.major}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="Where it comes from">
            <Tile
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

            <Tile title="Languages — logged vs. rated" span={6}>
              <Versus
                leftTitle="Most logged"
                left={languages.left}
                rightTitle="Highest rated"
                right={languages.right}
              />
            </Tile>

            <Tile title="Countries — logged vs. rated" span={6}>
              <Versus
                leftTitle="Most logged"
                left={countries.left}
                rightTitle="Highest rated"
                right={countries.right}
              />
            </Tile>

            <Tile
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

          <StatsSection label="The industry">
            <Tile
              title="By conglomerate — film vs. TV"
              span={12}
              note="Each title rolls up to the conglomerate that owns its studio (film) or network (TV). The stack splits film and TV so you can see where each medium concentrates."
            >
              <StackedBars
                data={s.conglomerate}
                ariaLabel="Titles by conglomerate, split film vs. TV"
                colors={FILM_TV}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="When you watch">
            {/* The headline cadence view: one chart, three dimensions.
                Each month carries two bars—film on the left, television on
                the right—each stacked by year. Hue marks the medium (orange
                film, blue TV); shade marks the year. So the month-to-month
                rhythm, the film-vs-TV split, and the year-over-year mix all
                read in one place, in volumes. */}
            <Tile
              title="Film and television by month"
              span={12}
              note="Two bars per month—film on the left, television on the right. Hue marks the medium (orange film, blue television); shade marks the year, lighter for earlier. Hover any bar for its per-year counts."
            >
              <GroupedStackedBars
                data={s.temporal.monthMediumYear}
                ariaLabel="Films and television logged by month, two bars per month (film, television), each stacked by year"
                groupColors={FILM_TV}
              />
            </Tile>

            <Tile title="By weekday" span={6}>
              <StackedBars
                data={s.temporal.weekdayMatrix}
                ariaLabel="Films vs. seasons by weekday"
                colors={FILM_TV}
              />
            </Tile>
          </StatsSection>
        </Section>

        {/* ─── Methodology ──────────────────────────────────────── */}
        <Section padding="md" style={{ paddingTop: 0 }}>
          <Methodology notes={CONNECTED_METHOD} />
        </Section>
      </Container>
    </div>
  );
}

// How the connected numbers are made — working drafts in Malcolm's voice.
const CONNECTED_METHOD: string[] = [
  "The same libraries the cluster dashboards draw on—Letterboxd for film, Serializd for television—pooled onto one calendar and one 0.5–5★ scale.",
  "Television ratings use the season signal (each show folded to the mean of its rated seasons), so film and TV sit on comparable footing rather than comparing a film to a sparse overall show mark.",
  "Crossover actors clear a symmetric gate—at least two films AND two shows—so the list reads as genuine cross-medium careers, not a film star with one TV cameo.",
  "Genre comparison keeps only genres with at least five logged titles on each side, so a thin genre can’t manufacture a film-vs-TV gap.",
  "Film = orange, TV = blue throughout, matching the cluster dashboards’ sub-brand hues. “This year” is computed at render, not snapshot time.",
];

// ─── Styles ───────────────────────────────────────────────────────

const backNavStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginTop: 8,
};

// Reading-register note (slab, caption color) explaining the deep-link
// asymmetry — matches the dashboard's mono→slab prose treatment.
const connectedNoteStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: "4px 0 0",
  maxWidth: "60ch",
};
