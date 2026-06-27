// ─────────────────────────────────────────────────────────────────
// /television/collections — the TV franchise-family core page (WS7).
//
// A real curated landing (not a thin directory), following the
// /television/watching pattern: hero + grids of show cards. It houses
// every routable collection and reflects the curated hierarchy — the
// Bravo-verse renders as a section with its Real Housewives and Vanderpump
// Rules families nested beneath it.
//
// Indexed (added to the sitemap), same posture as /television/watching: a
// curated hub with unique editorial value that also feeds crawl equity to
// the per-collection routes. The list comes from indexableTvCollections —
// the same gate the leaf routes and the sitemap read.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { PosterTile } from "@/components/feeds/PosterTile";
import { ClusterGridNav } from "@/components/feeds/ClusterGridNav";
import { BackLink } from "@/components/feeds/BackLink";
import { buildCompletedCards, type Show } from "@/lib/feeds/serializd-utils";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getWatchingExclusions, getShowLists } from "@/lib/feeds/serializd";
import { slugifyEntity } from "@/lib/feeds/slug";
import {
  indexableTvCollections,
  showsInTvFamily,
  tvCollectionMemberSort,
  type TvCollectionRoute,
} from "@/lib/feeds/facet-index";

export const metadata: Metadata = {
  title: "Television Collections",
  description:
    "The franchises and show families I’ve followed across a universe—Bravo, 9-1-1, Grey’s Anatomy, and more—each with its own page of reviews.",
  alternates: { canonical: "/television/collections" },
};

export default function TvCollectionsHub() {
  const { shows } = getShowsWithEnrichment();
  const collections = indexableTvCollections(shows);

  // Counts for the grid nav's All / Watching tabs (parity with the reviews
  // and watching surfaces, so the control reads identically everywhere).
  const allCount = buildCompletedCards(shows).length;
  const exclusions = getWatchingExclusions();
  const watchingCount = shows.filter(
    (s) =>
      !exclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;

  // Top-level collections (no parent), most-logged first; each renders its
  // own grid, or — for a parent like Bravo — its subcollections nested.
  const topLevel = collections.filter((c) => !c.parent);
  const childrenOf = (key: string) => collections.filter((c) => c.parent === key);

  return (
    <div data-subbrand="tv">
      <Container size="lg">
        {/* Back-nav above the hero — to the main reviews grid (the "All"
            surface), matching the cluster grid-nav's All tab. */}
        <BackLink href="/television/reviews">← All television</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Television · Collections</Kicker>
            <Display>Franchises and show families I’ve logged.</Display>
            <Lede wide>
              The shows I’ve followed across a franchise or universe,
              grouped into their own pages of reviews. Some collections
              nest—the Bravo-verse holds the Real Housewives and Vanderpump
              Rules families inside it.
            </Lede>
          </Stack>
        </Section>

        {/* Grid container (watching pattern): the section-toggle nav sits at
            the top, right above the collection grids — Collections active,
            linking back to All and Watching. */}
        <Section padding="md" bordered>
          <Stack gap="700">
            <div id="grid" style={{ scrollMarginTop: "5rem" }}>
              <ClusterGridNav
                cluster="television"
                active="collections"
                allCount={allCount}
                watchingCount={watchingCount}
                showLists={getShowLists().length > 0}
              />
            </div>
            {topLevel.map((c) => {
              const kids = childrenOf(c.key);
              return (
                <Stack key={c.key} gap="500">
                  <CollectionHeading collection={c} />
                  {kids.length > 0 ? (
                    // Parent (Bravo): render each subcollection as its own
                    // nested grid rather than one flat parent grid, so the
                    // hierarchy is legible and no show is shown twice.
                    kids.map((k) => (
                      <Stack key={k.key} gap="400">
                        <CollectionHeading collection={k} level={3} />
                        <CollectionGrid shows={showsInTvFamily(shows, k.key)} />
                      </Stack>
                    ))
                  ) : (
                    <CollectionGrid shows={showsInTvFamily(shows, c.key)} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Section>
      </Container>
    </div>
  );
}

/** A collection's heading — its name linking to the leaf, plus the logged
 *  count. level 2 for top-level collections, 3 for nested subcollections. */
function CollectionHeading({
  collection,
  level = 2,
}: {
  collection: TvCollectionRoute;
  level?: 2 | 3;
}) {
  return (
    <Headline level={level}>
      <Link href={`/television/collections/${slugifyEntity(collection.name)}`}>
        {collection.name}
      </Link>{" "}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 400,
          color: "var(--text-caption)",
          // Reset the heading's mono word-spacing (-0.2em, computed off the
          // large Headline font = ~-9.6px) so it doesn't inherit into this
          // 13px caption and collapse "9 shows" into "9shows".
          wordSpacing: "normal",
        }}
      >
        {collection.count} shows
      </span>
    </Headline>
  );
}

/** One PosterTile per member show, oldest-first (broadcast order). */
function CollectionGrid({ shows }: { shows: Show[] }) {
  const ordered = [...shows].sort(tvCollectionMemberSort);
  return (
    <Grid cols={5} gap="500">
      {ordered.map((show) => (
        <PosterTile
          key={show.id}
          href={`/television/${show.slug}`}
          posterUrl={show.posterUrl}
          title={show.name}
          subtitle={String(show.premiereYear)}
          rating={show.primaryRating}
        />
      ))}
    </Grid>
  );
}
