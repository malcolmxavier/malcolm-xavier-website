// ─────────────────────────────────────────────────────────────────
// /television/stats — the television dashboard ("The numbers").
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
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { StatsSection } from "@/components/stats/StatsSection";
import { StatsTips } from "@/components/stats/StatsTips";
import { Tile } from "@/components/stats/Tile";
import { Methodology } from "@/components/stats/Methodology";
import { Bigs } from "@/components/stats/Bigs";
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
import type { Contrast } from "@/lib/feeds/stats/shrinkage";

export const metadata: Metadata = {
  title: "Television stats",
  description:
    "The numbers behind the television corpus—what Malcolm Xavier logs and how he rates it across shows, seasons, and episodes: genres, networks, world cinema, creators, and the rhythm of a watching year.",
  alternates: { canonical: "/television/stats" },
  openGraph: {
    title: "Television stats—Malcolm Xavier",
    description:
      "The numbers behind the television corpus: per-level ratings, genres, networks, creators, world cinema, and a watching year's rhythm.",
    url: "/television/stats",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Television stats—Malcolm Xavier",
    description:
      "The numbers behind the television corpus: per-level ratings, genres, networks, creators, and a watching year's rhythm.",
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

export default function TelevisionStatsPage() {
  const s = computeTvStats();

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
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
  };

  const actors = versusRows(s.actors);
  const creators = versusRows(s.creators);
  const conglomerate = versusRows(s.conglomerate);
  const languages = versusRows(s.languages);
  const countries = versusRows(s.countries);

  return (
    <div data-subbrand="tv">
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
            <Kicker accent>Television</Kicker>
            <Display>The numbers.</Display>
            <Lede style={{ maxWidth: "none" }}>
              {s.lifetime.shows.toLocaleString()} shows in the corpus, rated season
              by season—{s.lifetime.seasonReviews.toLocaleString()} season ratings in
              all, because the season is the unit a series actually lives on. So the
              averages here are built from how I rate seasons, not a single mark per
              show. What I reach for, how I rate it, who makes it, where it comes from,
              and the rhythm of a watching year.
            </Lede>
            <ClusterRail
              base="/television"
              active="numbers"
              subbrand="tv"
              label="Television sections"
              className="mt-2"
            />
          </Stack>
        </Section>
      </Container>

      {/* ─── Dashboard ────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="md" style={{ paddingTop: 0 }}>
          {/* Six named bands (readability pass), mirroring the film
              dashboard. Spans within each band follow Malcolm's saved
              sketch layout (_private/_sketches/stats-sketch-layout.json
              → "tv"). */}

          <StatsSection label="The corpus">
            <Tile
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
                  { label: "Shows", n: s.ratingByLevel.show.n, avg: s.ratingByLevel.show.avg },
                  { label: "Seasons", n: s.ratingByLevel.season.n, avg: s.ratingByLevel.season.avg },
                  { label: "Episodes", n: s.ratingByLevel.episode.n, avg: s.ratingByLevel.episode.avg },
                ]}
              />
            </Tile>

            <Tile
              title="Rating distribution by level"
              span={12}
              note="Shows, seasons, and episodes are rated and counted separately. Season ratings are the dense signal—most shows are rated season by season, not with a single overall mark—so the Seasons view is the fullest and the analytics rank on it. Episode logging only began this year. Miniseries are double-counted (show and season) by the same rule the reviews use."
            >
              <RatingByLevelTabs data={s.ratingByLevel} />
            </Tile>

            <Tile
              title="Type"
              span={6}
              note="Scripted, reality, documentary, miniseries—the shape of what you log."
            >
              <Donut slices={s.types} ariaLabel="Share of shows by type" />
            </Tile>
          </StatsSection>

          <StatsSection label="Taste">
            <Tile title="Genres" span={4}>
              <Bars
                rows={s.genres.most}
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
              title="Genres vs. your baseline"
              span={8}
              note={`Baseline = your ${s.lifetime.avgRating.toFixed(2)}★ avg season rating; most-logged genres first. Bars right of center rate above it, accent bars (left) below. Shrunk.`}
            >
              <Diverging rows={s.divergingGenre} baseline={s.lifetime.avgRating} />
            </Tile>
          </StatsSection>

          <StatsSection label="People">
            <Tile
              title="Actors — logged vs. rated"
              span={6}
              note="Top-10 billed and ≥3 episodes, so a one-off guest spot doesn't count. Highest-rated counts distinct shows, shrunk."
            >
              <Versus
                leftTitle="Most logged"
                left={actors.left}
                rightTitle="Highest rated"
                right={actors.right}
              />
            </Tile>

            <Tile
              title="Creators — logged vs. rated"
              span={6}
              note="Series creators via TMDB; highest-rated gated on a minimum of distinct shows, shrunk."
            >
              <Versus
                leftTitle="Most logged"
                left={creators.left}
                rightTitle="Highest rated"
                right={creators.right}
              />
            </Tile>
          </StatsSection>

          <StatsSection label="Where it comes from">
            <Tile
              title="World cinema lean"
              span={12}
              note="You rate non-English and non-US shows against domestic ones—language is the stronger signal, country reinforces it."
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
              note="The joint view: which languages pair with which countries (language leads). Most shows sit on the English·US diagonal."
            >
              <Bigs
                items={[
                  { n: s.overlap.pairs, label: "language · country pairs" },
                  { n: s.overlap.languages, label: "languages" },
                  { n: s.overlap.countries, label: "countries" },
                ]}
              />
              <Bars rows={s.overlap.topPairs} />
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
          </StatsSection>

          <StatsSection label="How it reached you">
            <Tile
              title="Networks — logged vs. rated"
              span={6}
              note="Each show counts once under its canonical primary network (HBO and Max merged, and so on). Highest-rated is a gated raw average across ≥3 shows."
            >
              <Versus
                leftTitle="Most logged"
                left={s.networks.most}
                rightTitle="Highest rated"
                right={s.networks.topRated}
              />
            </Tile>

            <Tile
              title="By conglomerate — logged vs. rated"
              span={6}
              note="Each show rolls up to the conglomerate that owns its network (else independent). Shrunk."
            >
              <Versus
                leftTitle="Most logged"
                left={conglomerate.left}
                rightTitle="Highest rated"
                right={conglomerate.right}
              />
            </Tile>

            <Tile
              title="Shows across networks"
              span={12}
              note="Shows tied to more than one canonical network. An arrow (→) marks a known change of home; a plus (+) marks a show carried on both at once (a linear-plus-streamer simulcast)."
            >
              <MultiNetList rows={s.multiNetwork} />
            </Tile>
          </StatsSection>

          <StatsSection label="When you watch">
            <Tile
              title="Season pace by day of year"
              span={12}
              note="Cumulative seasons finished by day, one line per year—the slope shows when in the year you watch most. Drag along a line to read any day."
            >
              <LineChart
                series={s.temporal.seasonPaceByDay.map((c) => ({
                  label: c.year,
                  points: c.points,
                }))}
                ariaLabel="Cumulative seasons finished by day of year, per year"
              />
            </Tile>

            <Tile title="Seasons by month" span={6}>
              <StackedBars
                data={s.temporal.seasonMonthMatrix}
                ariaLabel="Seasons finished by month, stacked by year"
                averageLine="month"
              />
            </Tile>

            <Tile title="Seasons by weekday" span={6}>
              <StackedBars
                data={s.temporal.seasonWeekdayMatrix}
                ariaLabel="Seasons finished by weekday, stacked by year"
                averageLine="weekday"
              />
            </Tile>

            <Tile
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
          <span style={levelSubStyle}>
            {l.n === 1 ? "review" : "reviews"} · {l.avg.toFixed(2)}★ avg
          </span>
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
  "Shows, seasons, and episodes are rated and counted on separate scales. Miniseries are deliberately double-counted (as a show and as a season) by the same rule the reviews, landing, and genre pages use.",
  "Every “how I rate it” figure ranks on season ratings—the dense signal, since only a handful of shows carry a single overall mark. The headline average and the genre baseline are the mean across all rated seasons (so they match the Seasons distribution above). The people and network rankings fold each show to its own season mean first, counted once, so a long-running series can’t swamp them.",
  "Ratings are on a 0.5–5★ scale. “This year” is computed at render, not snapshot time, so it stays current.",
  "Networks are canonicalized before counting—HBO and Max are one destination, Showtime rolls into Paramount+, and each show counts once under its primary network.",
  "“Highest rated” lists gate on a minimum count, so a single 5★ show can’t top the chart.",
  "Actors count only top-10-billed roles with at least three episodes, so a one-scene guest spot doesn’t inflate the list—the same actor rule the Films and Connected pages use. Creators come from the TMDB created-by credit.",
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
