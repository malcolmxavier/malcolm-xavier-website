// ─────────────────────────────────────────────────────────────────
// /films/lists — the lists hub (the editorial counterpart to
// /films/collections).
//
// Malcolm's Letterboxd lists form a YEAR × SCOPE × METHOD matrix: each
// year he ranks his films two ways (New Releases = premiered that year,
// Backlog = watched that year but older) × two methods (Editor's Cut =
// rating disregarded, Ratings Cut = by star rating). Those four same-year
// lists are genuinely DIFFERENT rankings, so the hub shows the full 2×2
// — laid out as a 2-col grid per year (rows = scope, cols = method),
// each card chip-labeled so it reads at a glance. Topical one-offs (e.g.
// the Best Picture Nominees list) sit in a Featured group below the grid.
//
// Classification + grouping live in lib/feeds/list-taxonomy.ts (shared
// with TV and the landing teaser). Indexed + self-canonical.
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
import type { FilmList } from "@/lib/feeds/letterboxd-utils";
import { getFilmLists, filmListCoverPosters } from "@/lib/feeds/letterboxd";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import {
  groupListsByYear,
  scopeLabel,
  methodLabel,
  type ListScope,
  type ListMethod,
  type ListYearGroup,
} from "@/lib/feeds/list-taxonomy";

export const metadata: Metadata = {
  title: "Film Lists",
  description:
    "My year in film, ranked four ways—new releases and backlog, fully editorialized and by the stars. Every list, grouped by year.",
  alternates: { canonical: "/films/lists" },
};

/** Flatten a year's 2×2 into ordered cells (with their facets) so a
 *  2-col grid lays out as New row over Backlog row, Editor's Cut then
 *  Ratings Cut. Empty cells (a year missing a variant) are dropped. */
function yearCells(
  group: ListYearGroup<FilmList>,
): { list: FilmList; scope: ListScope; method: ListMethod }[] {
  const order: { list: FilmList | null; scope: ListScope; method: ListMethod }[] =
    [
      { list: group.new.editorial, scope: "new", method: "editorial" },
      { list: group.new.rating, scope: "new", method: "rating" },
      { list: group.backlog.editorial, scope: "backlog", method: "editorial" },
      { list: group.backlog.rating, scope: "backlog", method: "rating" },
    ];
  return order.filter(
    (c): c is { list: FilmList; scope: ListScope; method: ListMethod } =>
      c.list !== null,
  );
}

/** One list as a chip-labeled card. */
function FilmListCard({
  list,
  tags,
}: {
  list: FilmList;
  tags?: string[];
}) {
  return (
    <ListCard
      href={`/films/lists/${list.slug}`}
      title={list.title}
      count={list.filmSlugs.length}
      tags={tags}
      description={list.description}
      coverPosterUrls={filmListCoverPosters(list)}
    />
  );
}

export default function FilmListsHub() {
  const lists = getFilmLists();
  // No lists in the snapshot → nothing to show; 404 rather than ship an
  // empty hub (no-placeholder rule). Films always have lists today.
  if (lists.length === 0) notFound();

  const { summary } = getFilmsWithEnrichment();
  const { years, featured } = groupListsByYear(lists, (l) => l.title);

  // Jump strip — Featured first, then each year. SectionIndex hides
  // itself below two destinations, so a single-group hub stays clean.
  const jumpItems: SectionIndexItem[] = [
    ...(featured.length > 0 ? [{ id: "featured", label: "Featured" }] : []),
    ...years.map((g) => ({ id: `year-${g.year}`, label: String(g.year) })),
  ];

  return (
    <div data-subbrand="film">
      <Container size="lg">
        {/* Back-nav above the hero — to the main reviews grid (the "All"
            surface), matching the cluster grid-nav's All tab. */}
        <BackLink href="/films/reviews">← All films</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Films · Lists</Kicker>
            <Display>My year in film, ranked.</Display>
            {/* Methodology note — names the two axes so the matrix reads
                as intent, not redundancy. */}
            <Lede wide>
              Every year I rank what I watched two ways. By scope—
              <strong>New Releases</strong> (premiered that year) versus{" "}
              <strong>Backlog</strong> (caught up on, recency bias be damned).
              And by method—<strong>Editor’s Cut</strong> (star rating
              disregarded, fully editorialized) versus{" "}
              <strong>Ratings Cut</strong> (by the stars). Four takes on the
              same twelve months.
            </Lede>
            {/* Skip-to strip — jump to Featured or a given year. */}
            <SectionIndex
              items={jumpItems}
              subbrand="film"
              label="Film lists on this page"
            />
          </Stack>
        </Section>

        <Section padding="md" bordered>
          <Stack gap="700">
            {/* Grid-nav at the top — Lists active, linking back to All /
                Collections. */}
            <div id="grid" style={{ scrollMarginTop: "5rem" }}>
              <ClusterGridNav
                cluster="films"
                active="lists"
                allCount={summary.totalFilms}
                showLists
              />
            </div>

            {/* Featured one-offs lead the hub (topical, most distinctive). */}
            {featured.length > 0 ? (
              <Stack id="featured" className="scroll-mt-28" gap="400">
                <Headline level={2}>Featured</Headline>
                <Grid cols={3} gap="600">
                  {featured.map((list) => (
                    <FilmListCard key={list.slug} list={list} />
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
                    <FilmListCard
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
