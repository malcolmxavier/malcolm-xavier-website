// ─────────────────────────────────────────────────────────────────
// /television/lists/[slug] — a single ranked Serializd list.
//
// TV lists are season-ranked: each entry is a SHOW+SEASON at a given
// position, and the same show can appear several times (different
// seasons). We render the entries IN RANK ORDER — which for Malcolm's
// ranked lists IS the ranking — one PosterTile per entry, prefixing the
// title with its rank. A show in the reviewed corpus links to its on-site
// detail page (deep-linked to the ranked season block); a show that
// isn't reviewed yet renders a title-only tile linking out to Serializd,
// so the full list shows in order rather than silently dropping entries.
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
import { Link } from "@/components/primitives/Link";
import { PosterTile } from "@/components/feeds/PosterTile";
import { SITE_URL } from "@/lib/site-config";
import {
  getShowLists,
  getShowListBySlug,
  getShowBySerializdId,
} from "@/lib/feeds/serializd";
import type { ShowListItem } from "@/lib/feeds/serializd-utils";

type Params = Promise<{ slug: string }>;

const SERIALIZD_SHOW_BASE = "https://www.serializd.com/show";

// Pre-render every published list at build time. A new list lands when
// its id is added to the refresh script's publish-set → snapshot commit →
// redeploy, which re-runs this.
export function generateStaticParams() {
  return getShowLists().map((list) => ({ slug: list.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = getShowListBySlug(slug);
  if (!list) return { title: "List not found" };
  const canonical = `/television/lists/${list.slug}`;
  const description =
    list.description ||
    `${list.items.length} seasons of television, ranked and curated by Malcolm Xavier. Logged, rated, and reviewed—each entry links to its full on-site review.`;
  return {
    title: list.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${list.name}—Malcolm Xavier`,
      description,
      url: canonical,
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${list.name}—Malcolm Xavier`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

/** Secondary line for an entry — the ranked season ("Season 6"), or
 *  nothing for a show-level entry (a miniseries ranked as a whole). */
function seasonSubtitle(item: ShowListItem): string | undefined {
  return item.seasonName ?? undefined;
}

export default async function TvListPage({ params }: { params: Params }) {
  const { slug } = await params;
  const list = getShowListBySlug(slug);
  if (!list) notFound();

  const landingUrl = `${SITE_URL}/television`;
  const listUrl = `${SITE_URL}/television/lists/${list.slug}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Television", item: landingUrl },
      { "@type": "ListItem", position: 2, name: list.name, item: listUrl },
    ],
  };
  // ItemList — makes the ranking machine-legible (rich results + AI search).
  // Each entry names the show (+ ranked season) and points at its on-site
  // detail page, or Serializd if the show isn't in the reviewed corpus.
  const itemList = {
    "@type": "ItemList",
    name: list.name,
    url: listUrl,
    numberOfItems: list.items.length,
    itemListOrder: list.isRanked
      ? "https://schema.org/ItemListOrderAscending"
      : "https://schema.org/ItemListOrderUnordered",
    itemListElement: list.items.map((item) => {
      const show = getShowBySerializdId(item.showId);
      return {
        "@type": "ListItem",
        position: item.position + 1,
        name: item.seasonName
          ? `${item.showName} (${item.seasonName})`
          : item.showName,
        url: show
          ? `${SITE_URL}/television/${show.slug}`
          : `${SERIALIZD_SHOW_BASE}/${item.showId}`,
      };
    }),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, itemList],
  };

  return (
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        {/* Back to the lists hub (this list's parent index). */}
        <Section padding="md">
          <Link href="/television/lists">← All lists</Link>
        </Section>

        {/* Header — title + methodology prose. */}
        <Section padding="sm">
          <Stack gap="400">
            <Kicker accent>
              {list.isRanked ? "Ranked list" : "List"} ·{" "}
              {list.items.length}{" "}
              {list.items.length === 1 ? "pick" : "picks"}
            </Kicker>
            <Display>{list.name}</Display>
            {list.description ? <Lede wide>{list.description}</Lede> : null}
            <p style={{ margin: 0 }}>
              <Link href={list.url}>View the list on Serializd ↗</Link>
            </p>
          </Stack>
        </Section>

        {/* Entries in rank order (the ranking). */}
        <Section padding="md" bordered>
          {/* sr-only h2 bridges the hero Display (h1) to the per-tile
              Headline level={3} titles, so the heading outline doesn't
              skip h2 (same fix as the collections leaf). */}
          <Headline level={2} className="sr-only">
            Picks in this list
          </Headline>
          <Grid cols={4} gap="500">
            {list.items.map((item, i) => {
              // Rank shows as a poster badge for ranked lists (the title
              // stays clean); unranked lists pass no rank.
              const rank = list.isRanked ? item.position + 1 : null;
              const show = getShowBySerializdId(item.showId);
              if (show) {
                // Deep-link to the ranked season's block when we know the
                // season number — except miniseries, whose detail page
                // collapses the season space (no #season-N anchor), so we
                // land at the top where the whole-show review lives.
                const isMiniseries = show.tmdb?.type === "Miniseries";
                const hash =
                  item.seasonNumber != null && !isMiniseries
                    ? `#season-${item.seasonNumber}`
                    : "";
                return (
                  <PosterTile
                    key={`${item.showId}-${item.seasonId ?? "show"}-${i}`}
                    href={`/television/${show.slug}${hash}`}
                    posterUrl={show.posterUrl}
                    title={item.showName}
                    subtitle={seasonSubtitle(item)}
                    rank={rank}
                  />
                );
              }
              // Not in the reviewed corpus — title-only tile linking out.
              return (
                <PosterTile
                  key={`${item.showId}-${item.seasonId ?? "show"}-${i}`}
                  href={`${SERIALIZD_SHOW_BASE}/${item.showId}`}
                  external
                  posterUrl={null}
                  title={item.showName}
                  subtitle={seasonSubtitle(item)}
                  rank={rank}
                />
              );
            })}
          </Grid>
        </Section>
      </Container>
    </div>
  );
}
