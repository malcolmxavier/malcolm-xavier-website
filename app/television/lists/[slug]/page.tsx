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
    `${list.items.length} seasons of television, ranked and curated by Malcolm Xavier.`;
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
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Television", item: landingUrl },
      { "@type": "ListItem", position: 2, name: list.name, item: listUrl },
    ],
  };

  return (
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
              // Prefix the rank for ranked lists so the order reads as a
              // ranking, not just a grid. Unranked → plain title.
              const rank = list.isRanked ? `${item.position + 1}. ` : "";
              const title = `${rank}${item.showName}`;
              const show = getShowBySerializdId(item.showId);
              if (show) {
                // Deep-link to the ranked season's block when we know the
                // season number; otherwise the show's detail page top.
                const hash =
                  item.seasonNumber != null
                    ? `#season-${item.seasonNumber}`
                    : "";
                return (
                  <PosterTile
                    key={`${item.showId}-${item.seasonId ?? "show"}-${i}`}
                    href={`/television/${show.slug}${hash}`}
                    posterUrl={show.posterUrl}
                    title={title}
                    subtitle={seasonSubtitle(item)}
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
                  title={title}
                  subtitle={seasonSubtitle(item)}
                />
              );
            })}
          </Grid>
        </Section>
      </Container>
    </div>
  );
}
