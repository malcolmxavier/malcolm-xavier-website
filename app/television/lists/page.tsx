// ─────────────────────────────────────────────────────────────────
// /television/lists — the TV lists hub (counterpart to /films/lists).
//
// Same YEAR × SCOPE × METHOD matrix as films, but TV lists are season-
// ranked (a list item is a SHOW+SEASON), so cards count "picks" rather
// than films. Malcolm publishes a configured set of Serializd lists (the
// username→lists endpoint is dead — see scripts/refresh-tv-lists.mjs); if
// that set is ever cleared, getShowLists() is empty and this hub 404s
// (no-placeholder rule).
//
// Classification + grouping are shared with films via
// lib/feeds/list-taxonomy.ts. Indexed + self-canonical.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { ListCard } from "@/components/feeds/ListCard";
import { ClusterGridNav } from "@/components/feeds/ClusterGridNav";
import { BackLink } from "@/components/feeds/BackLink";
import {
  SectionIndex,
  type SectionIndexItem,
} from "@/components/feeds/SectionIndex";
import type { ShowList } from "@/lib/feeds/serializd-utils";
import { buildCompletedCards } from "@/lib/feeds/serializd-utils";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import {
  getShowLists,
  showListCoverPosters,
  getWatchingExclusions,
} from "@/lib/feeds/serializd";
import {
  groupListsByYear,
  scopeLabel,
  methodLabel,
  type ListScope,
  type ListMethod,
  type ListYearGroup,
} from "@/lib/feeds/list-taxonomy";

export const metadata: Metadata = {
  title: "TV Lists",
  description:
    "My year in television, ranked by season—new releases and backlog, fully editorialized and by the stars. Every list, grouped by year.",
  alternates: { canonical: "/television/lists" },
};

// TV lists rank seasons, not shows, so the count noun is "pick(s)".
const TV_LIST_UNIT = { one: "pick", other: "picks" };

/** Flatten a year's 2×2 into ordered cells (with facets) so a 2-col grid
 *  lays out New over Backlog, Editor's Cut then Ratings Cut. */
function yearCells(
  group: ListYearGroup<ShowList>,
): { list: ShowList; scope: ListScope; method: ListMethod }[] {
  const order: { list: ShowList | null; scope: ListScope; method: ListMethod }[] =
    [
      { list: group.new.editorial, scope: "new", method: "editorial" },
      { list: group.new.rating, scope: "new", method: "rating" },
      { list: group.backlog.editorial, scope: "backlog", method: "editorial" },
      { list: group.backlog.rating, scope: "backlog", method: "rating" },
    ];
  return order.filter(
    (c): c is { list: ShowList; scope: ListScope; method: ListMethod } =>
      c.list !== null,
  );
}

/** One list as a chip-labeled card. */
function ShowListCard({ list, tags }: { list: ShowList; tags?: string[] }) {
  return (
    <ListCard
      href={`/television/lists/${list.slug}`}
      title={list.name}
      count={list.items.length}
      unit={TV_LIST_UNIT}
      tags={tags}
      description={list.description}
      coverPosterUrls={showListCoverPosters(list)}
    />
  );
}

export default function TvListsHub() {
  const lists = getShowLists();
  // Publish-set empty → 404 rather than ship an empty hub.
  if (lists.length === 0) notFound();

  const { shows } = getShowsWithEnrichment();
  const allCount = buildCompletedCards(shows).length;
  const exclusions = getWatchingExclusions();
  const watchingCount = shows.filter(
    (s) =>
      !exclusions.has(s.serializdShowId) &&
      s.inProgressSeasonNumbers.length > 0,
  ).length;

  const { years, featured } = groupListsByYear(lists, (l) => l.name);

  // Jump strip — Featured first, then each year. SectionIndex hides
  // itself below two destinations, so a single-year hub stays clean.
  const jumpItems: SectionIndexItem[] = [
    ...(featured.length > 0 ? [{ id: "featured", label: "Featured" }] : []),
    ...years.map((g) => ({ id: `year-${g.year}`, label: String(g.year) })),
  ];

  return (
    <div data-subbrand="tv">
      <Container size="lg">
        {/* Back-nav above the hero — to the main reviews grid (the "All"
            surface), matching the cluster grid-nav's All tab. */}
        <BackLink href="/television/reviews">← All television</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Television · Lists</Kicker>
            <Display>My year in television, ranked.</Display>
            <Lede wide>
              Each year I rank what I watched two ways. By scope—
              <strong>New Releases</strong> (seasons that aired that year)
              versus <strong>Backlog</strong> (older seasons I caught up on,
              recency bias be damned). And by method—
              <strong>Editor&rsquo;s Cut</strong> (star rating disregarded,
              fully editorialized) versus <strong>Ratings Cut</strong> (by the
              stars). Ranked by season, since a great season is the unit that
              matters.
            </Lede>
            {/* Skip-to strip — jump to Featured or a given year. */}
            <SectionIndex
              items={jumpItems}
              subbrand="tv"
              label="Television lists on this page"
            />
          </Stack>
        </Section>

        <Section padding="md" bordered>
          <Stack gap="700">
            <div id="grid" style={{ scrollMarginTop: "5rem" }}>
              <ClusterGridNav
                cluster="television"
                active="lists"
                allCount={allCount}
                watchingCount={watchingCount}
                showLists
              />
            </div>

            {/* Featured one-offs lead the hub (none today, but kept for
                parity with films). */}
            {featured.length > 0 ? (
              <Stack id="featured" className="scroll-mt-28" gap="400">
                <Headline level={2}>Featured</Headline>
                <Grid cols={3} gap="600">
                  {featured.map((list) => (
                    <ShowListCard key={list.slug} list={list} />
                  ))}
                </Grid>
              </Stack>
            ) : null}

            {/* One labeled 2×2 per year, newest first. */}
            {years.map((group) => (
              <Stack
                key={group.year}
                id={`year-${group.year}`}
                className="scroll-mt-28"
                gap="400"
              >
                <Headline level={2}>{group.year}</Headline>
                <Grid cols={2} gap="600">
                  {yearCells(group).map(({ list, scope, method }) => (
                    <ShowListCard
                      key={list.slug}
                      list={list}
                      tags={[scopeLabel(scope), methodLabel(method)]}
                    />
                  ))}
                </Grid>
              </Stack>
            ))}
          </Stack>
        </Section>
      </Container>
    </div>
  );
}
