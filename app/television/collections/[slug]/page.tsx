// ─────────────────────────────────────────────────────────────────
// /television/collections/[slug] — one TV franchise FAMILY's shows (WS7).
//
// TV has no TMDB collection signal, so families are fully hand-curated in
// lib/feeds/stats/tv-franchise.ts (the Bravo-verse hierarchy + standalone
// universes like 9-1-1, Grey's Anatomy, Game of Thrones). A two-level
// hierarchy: a parent collection (Bravo) lists the union of its
// subcollections; a subcollection links back up to its parent.
//
// Presentation follows the /television/watching pattern: a curated grid of
// ONE card per member SHOW (not the filterable reviews grid). A show appears
// even when it's only been reviewed at the season/episode level — the card
// is the show, not a review (per Malcolm, 2026-06-13). Indexed +
// self-canonical (PLAN.md). The routable set + per-family membership come
// from lib/feeds/facet-index.ts — the one gate shared with the hub + sitemap.
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
import { BackLink } from "@/components/feeds/BackLink";
import { ScrollRestoration } from "@/components/feeds/useScrollRestoration";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import { slugifyEntity, findEntityBySlug } from "@/lib/feeds/slug";
import {
  indexableTvCollections,
  showsInTvFamily,
  tvCollectionMemberSort,
} from "@/lib/feeds/facet-index";
import { tvFamilyName, tvSubfamilies } from "@/lib/feeds/stats/tv-franchise";

const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

type Params = { slug: string };
type RouteArgs = { params: Promise<Params> };

/** Strip a leading article so the family name reads cleanly mid-sentence
 *  ("6 Real Housewives shows", not "6 The Real Housewives shows"). */
const inlineName = (name: string) => name.replace(/^The /, "");

type Resolved = { key: string; name: string; count: number; parent?: string };

/** Resolve a route slug to its family — only among the floor-clearing
 *  (routable) families. Unknown / sub-floor → null → 404. */
function resolveCollection(slug: string): Resolved | null {
  const { shows } = getShowsWithEnrichment();
  const routable = indexableTvCollections(shows);
  const name = findEntityBySlug(routable.map((c) => c.name), slug);
  if (!name) return null;
  return routable.find((c) => c.name === name)!;
}

export function generateStaticParams() {
  const { shows } = getShowsWithEnrichment();
  return indexableTvCollections(shows).map((c) => ({
    slug: slugifyEntity(c.name),
  }));
}

export async function generateMetadata({ params }: RouteArgs): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveCollection(slug);
  if (!resolved) return { title: "Not found" };

  const { name, count } = resolved;
  const canonical = `/television/collections/${slug}`;
  const title = `${name} Shows`;
  const description = `${count} ${inlineName(name)} shows, logged, rated, and reviewed. Every Serializd entry preserved with TMDB metadata.`;
  const socialTitle = `${title}—Malcolm Xavier`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function TvCollectionPage({ params }: RouteArgs) {
  const { slug } = await params;
  const { shows } = getShowsWithEnrichment();
  const resolved = resolveCollection(slug);
  if (!resolved) notFound();
  const { key, name, count, parent } = resolved;

  // Member shows, oldest-first so the franchise reads in broadcast order.
  // familiesOfShow walks parents, so a parent collection (Bravo) returns
  // the union of its subcollections' shows.
  const members = showsInTvFamily(shows, key).sort(tvCollectionMemberSort);

  // Hierarchy context: a subcollection links up to its parent; a parent
  // lists the routable subcollections nested inside it.
  const routableNames = new Set(indexableTvCollections(shows).map((c) => c.name));
  const subKeys = tvSubfamilies(key).filter((k) =>
    routableNames.has(tvFamilyName(k)),
  );

  const detailUrl = `${SITE_URL}/television/collections/${slug}`;
  const breadcrumb: { "@type": "ListItem"; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "Television", item: `${SITE_URL}/television` },
    { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/television/collections` },
  ];
  if (parent) {
    breadcrumb.push({
      "@type": "ListItem",
      position: 3,
      name: tvFamilyName(parent),
      item: `${SITE_URL}/television/collections/${slugifyEntity(tvFamilyName(parent))}`,
    });
  }
  breadcrumb.push({
    "@type": "ListItem",
    position: breadcrumb.length + 1,
    name,
    item: detailUrl,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${name} — Reviewed by Malcolm Xavier`,
        description: `${count} ${inlineName(name)} shows, logged, rated, and reviewed by Malcolm Xavier.`,
        url: detailUrl,
        inLanguage: "en-US",
        author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
      },
      { "@type": "BreadcrumbList", itemListElement: breadcrumb },
    ],
  };

  return (
    <div data-subbrand="tv">
      {/* Restore scroll when returning here from a show detail page. */}
      <ScrollRestoration />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        {/* Back-nav above the hero — same chrome as /television/watching. */}
        <BackLink href="/television/collections">← All collections</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Television · {name}</Kicker>
            <Display>Every {inlineName(name)} show I&rsquo;ve logged.</Display>
            <Lede wide>
              I&rsquo;ve logged {count} {inlineName(name)} shows. Open any card
              for the full review history.
            </Lede>
            {/* Hierarchy context — a subcollection links up to its parent;
                a parent lists the franchises nested inside it. */}
            {parent ? (
              <p style={{ margin: 0 }}>
                Part of{" "}
                <Link href={`/television/collections/${slugifyEntity(tvFamilyName(parent))}`}>
                  {tvFamilyName(parent)}
                </Link>
                .
              </p>
            ) : subKeys.length > 0 ? (
              <p style={{ margin: 0 }}>
                Includes{" "}
                {subKeys.map((k, i) => (
                  <span key={k}>
                    {i > 0 ? (i === subKeys.length - 1 ? ", and " : ", ") : ""}
                    <Link href={`/television/collections/${slugifyEntity(tvFamilyName(k))}`}>
                      {tvFamilyName(k)}
                    </Link>
                  </span>
                ))}
                .
              </p>
            ) : null}
            <p style={{ margin: 0 }}>
              <TrackOnClick
                event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                eventData={{ kind: "profile-follow", surface: "tv-collection-hero" }}
              >
                <Link href={SERIALIZD_PROFILE_URL}>Follow along on Serializd ↗</Link>
              </TrackOnClick>
            </p>
          </Stack>
        </Section>

        <Section padding="md" bordered>
          {/* sr-only h2 bridges the hero Display (h1) to the per-card
              Headline level={3} titles inside PosterTile, so the heading
              outline doesn't skip h2 (same fix as /television/watching). */}
          <Headline level={2} className="sr-only">
            Shows in this collection
          </Headline>
          <Grid cols={5} gap="500">
            {members.map((show) => (
              <PosterTile
                key={show.id}
                href={`/television/${show.slug}`}
                // Thread this collection as the origin, so the detail page's
                // adjacent-show nav walks the collection (premiere order) and
                // the back-link returns here.
                originHref={`/television/collections/${slug}`}
                posterUrl={show.posterUrl}
                title={show.name}
                subtitle={String(show.premiereYear)}
                rating={show.primaryRating}
              />
            ))}
          </Grid>
        </Section>
      </Container>
    </div>
  );
}
