// ─────────────────────────────────────────────────────────────────
// /television/watching — in-progress offshoot.
//
// Renders the snapshot's in-progress cards (Season-in-progress —
// per-season classification rule 2 from PLAN.md). One card per
// (show, in-progress season) pair. Cards link to the detail
// page's matching season anchor so the user lands directly at
// the right Season block.
//
// Phase-2 scope: hero + flat grid + back link to /television. No
// filter sidebar (all filter dimensions in /television apply
// equally here, but the in-progress catalog is small — typically
// 16-25 shows — so a sidebar feels heavyweight at launch). Adding
// the shell back is a straightforward port from /television's
// page once filter-on-watching usage signals demand.
//
// Snapshot-only at request time: getShows() reads the same
// snapshot fixture /television uses. No live API path.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { SITE_URL } from "@/lib/site-config";
import { getShows, getWatchingExclusions } from "@/lib/feeds/serializd";
import {
  buildCompletedCards,
  buildInProgressCards,
} from "@/lib/feeds/serializd-utils";
import { AllOrWatchingToggle } from "../AllOrWatchingToggle";
import { InProgressCard } from "../InProgressCard";
import { BackToTelevision } from "../BackToTelevision";

// Watching catalog moves more often than the lifetime listing
// (every episode-watch flips the most-recent date), but the
// snapshot itself only refreshes on `npm run television:bootstrap`.
// 1-hour ISR is conservative and matches /films/[slug].
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { shows } = getShows();
  // Mirror the same exclusion the page render applies so the
  // metadata count matches what the user actually sees on the
  // page. Re-derived here (rather than reading
  // summary.showsInProgressCount) because the snapshot's count
  // includes the perpetual-show exclusions and we want this
  // description to match the displayed grid.
  const exclusions = getWatchingExclusions();
  const count = shows.filter(
    (s) =>
      !exclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;
  const description = `${count} ${count === 1 ? "show" : "shows"} I'm currently mid-season on—tracked at the episode level on Serializd. Each card links to its season notes and the episode log inside the full show hierarchy.`;
  return {
    title: "Currently Watching",
    description,
    alternates: { canonical: "/television/watching" },
    openGraph: {
      title: "Currently Watching—Malcolm Xavier",
      description,
      url: "/television/watching",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Currently Watching—Malcolm Xavier",
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function WatchingPage() {
  const { shows } = getShows();
  // Editorial exclusion list — perpetual shows (talk shows, weekly
  // variety) where the in-progress signal is structurally permanent.
  // Reading from data/television/overrides.json#excludeFromWatching
  // so the list lives next to the other editorial pins (miniseries,
  // poster overrides, watchedSeasons). Filtered AFTER buildInProgress-
  // Cards so the SummaryPanel and any other consumer of the snapshot
  // still sees the un-edited data.
  const exclusions = getWatchingExclusions();
  const cards = buildInProgressCards(shows).filter(
    (c) => !exclusions.has(c.show.serializdShowId),
  );
  // Sort by most-recent activity within the in-progress slice so
  // the freshest watches surface first. Reuses each card's
  // episodeReviews[0] (newest) as the sort key.
  cards.sort((a, b) => {
    const aDate = a.episodeReviews[0]?.reviewDate ?? "";
    const bDate = b.episodeReviews[0]?.reviewDate ?? "";
    return bDate.localeCompare(aDate);
  });

  // CollectionPage + BreadcrumbList JSON-LD. Same posture as
  // /television's listing JSON-LD but scoped to the watching
  // sub-page so AI retrievers understand its role separately.
  // Count = post-exclusion `cards.length` (NOT the snapshot's raw
  // showsInProgressCount) so the schema description matches what's
  // actually rendered on the page.
  const url = `${SITE_URL}/television/watching`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Currently Watching",
        description: `${cards.length} TV shows Malcolm Xavier is currently watching, with episode progress per season.`,
        url,
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
            name: "Watching",
            item: url,
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
        {/* Back link sits above the hero, same posture as detail
            pages. Mirrors /films/[slug]'s BackToFilms placement
            so navigation chrome reads consistently across the
            site. */}
        <div
          style={{
            paddingTop: "var(--scale-600)",
            paddingBottom: "var(--scale-400)",
          }}
        >
          {/* Suspense wrap — BackToTelevision uses useSearchParams,
              which Next.js 15+ requires inside a Suspense boundary
              for static prerender. fallback=null since the link is
              small chrome that hydrates fast. */}
          <Suspense fallback={null}>
            <BackToTelevision />
          </Suspense>
        </div>

        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Television · Watching</Kicker>
            <Display>What&apos;s on my television right now.</Display>
            <Lede>
              Each card is a season I&apos;ve started but haven&apos;t finished.
              The progress line shows how many episodes I&apos;ve
              logged so far. Open any card to see episode ratings and reviews,
              or explore prior ratings and reviews from prior seasons.
            </Lede>
          </Stack>
        </Section>

        <Section padding="md" bordered>
          {/* sr-only h2 bridges the page Display (h1) to the per-card
              Headline level={3} titles inside InProgressCard. Without
              this, axe flags the h1→h3 outline skip (regression caught
              in the 2026-05-07 re-review after Batch B's Low pass had
              removed it on the wrong rationale). Hidden visually
              because AllOrWatchingToggle below already names the
              section for sighted users. */}
          <Headline level={2} className="sr-only">
            In-progress seasons
          </Headline>
          {/* All / Watching toggle — same pattern as on
              /television's listing. From here, "All" hops back
              to the cluster root (no filter context to carry,
              since /watching has no filter sidebar).
              id="grid" + scroll-margin-top is the anchor target
              the toggle's hrefs append (#grid) so view switches
              land at the grid row rather than the page hero. */}
          <div
            id="grid"
            style={{ marginBottom: 16, scrollMarginTop: "5rem" }}
          >
            <AllOrWatchingToggle
              active="watching"
              watchingCount={cards.length}
              allCount={buildCompletedCards(shows).length}
              from="watching"
            />
          </div>
          {cards.length > 0 ? (
            <ul
              role="list"
              className="grid gap-4 sm:gap-6"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(160px, 1fr))",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {cards.map((card) => (
                <li key={`${card.show.id}#s${card.seasonNumber}`}>
                  <InProgressCard
                    card={card}
                    originHref="/television/watching"
                  />
                </li>
              ))}
            </ul>
          ) : (
            // Empty-state surface — when Malcolm has no in-progress
            // seasons (rare, but possible after a bulk Season-write
            // session). Reads as a positive signal ("all caught up")
            // rather than a missing-data warning.
            <div
              style={{
                padding: "var(--scale-800)",
                border: "1px dashed var(--border-default)",
                borderRadius: "var(--border-radius-md)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-secondary)",
                  fontSize: "var(--p-md-font-size)",
                  color: "var(--text-body)",
                  margin: 0,
                }}
              >
                Nothing in progress right now. Every season I&apos;ve started
                has a writeup.
              </p>
              {/* Stub fallback — keeps the empty-state from being a
                  dead-end if the in-progress queue ever clears.
                  Anchors at #grid so the user lands at the listing
                  row rather than the page hero. paddingBlock: 4px
                  bumps the link's hit-target above the SC 2.5.8
                  24px floor (small mono caption + 8px total
                  padding ≈ 24px). */}
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "var(--scale-400) 0 0 0",
                  padding: "4px 0",
                }}
              >
                <Link href="/television#grid">Browse all reviews →</Link>
              </p>
            </div>
          )}
        </Section>
      </Container>
    </div>
  );
}
