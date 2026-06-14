// ─────────────────────────────────────────────────────────────────
// /films/collections/[slug] — one franchise FAMILY's films (WS7).
//
// A "collection" here is the CURATED franchise family from
// lib/feeds/stats/franchise.ts (FAMILY_BY_*), not a raw TMDB collection:
// "John Wick" folds in Ballerina, "Alien" merges four TMDB collections,
// AVP counts under both Alien and Predator. That curated vocabulary is what
// the stats Franchises tile ranks on, so this is the route that tile
// deep-links into.
//
// Presentation follows the /television/watching pattern: a curated grid of
// one card per member film. Indexed + self-canonical (PLAN.md). The
// routable set + per-family membership come from lib/feeds/facet-index.ts —
// the one gate shared with the hub + sitemap + the stats deep-link.
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
import { ELSEWHERE } from "@/lib/elsewhere";
import { SITE_URL } from "@/lib/site-config";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import { slugifyEntity, findEntityBySlug } from "@/lib/feeds/slug";
import {
  indexableFilmCollections,
  filmsInFilmFamily,
  filmCollectionMemberSort,
} from "@/lib/feeds/facet-index";

const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

type Params = { slug: string };
type RouteArgs = { params: Promise<Params> };

function resolveCollection(
  slug: string,
): { key: string; name: string; count: number } | null {
  const { films } = getFilmsWithEnrichment();
  const collectionDetails = getCollectionDetails();
  const currentYear = new Date().getUTCFullYear();
  const routable = indexableFilmCollections(films, collectionDetails, currentYear);
  const name = findEntityBySlug(routable.map((c) => c.name), slug);
  if (!name) return null;
  return routable.find((c) => c.name === name)!;
}

export function generateStaticParams() {
  const { films } = getFilmsWithEnrichment();
  const collectionDetails = getCollectionDetails();
  const currentYear = new Date().getUTCFullYear();
  return indexableFilmCollections(films, collectionDetails, currentYear).map(
    (c) => ({ slug: slugifyEntity(c.name) }),
  );
}

export async function generateMetadata({ params }: RouteArgs): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveCollection(slug);
  if (!resolved) return { title: "Not found" };

  const { name, count } = resolved;
  const canonical = `/films/collections/${slug}`;
  const title = `${name} Collection`;
  const description = `${count} films in the ${name} collection, logged, rated, and reviewed. Every Letterboxd entry preserved with TMDB metadata.`;
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

export default async function FilmCollectionPage({ params }: RouteArgs) {
  const { slug } = await params;
  const { films } = getFilmsWithEnrichment();
  const resolved = resolveCollection(slug);
  if (!resolved) notFound();
  const { key, name, count } = resolved;

  // Member films, oldest-first so the franchise reads in release order. A
  // film can belong to several families (AVP), so membership is "familiesOf
  // includes this key."
  const members = filmsInFilmFamily(films, key).sort(filmCollectionMemberSort);

  const detailUrl = `${SITE_URL}/films/collections/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `The ${name} Collection, Reviewed by Malcolm Xavier`,
        description: `${count} films in the ${name} collection, logged, rated, and reviewed by Malcolm Xavier.`,
        url: detailUrl,
        inLanguage: "en-US",
        author: { "@type": "Person", name: "Malcolm Xavier", "@id": `${SITE_URL}/#person` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Films", item: `${SITE_URL}/films` },
          { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/films/collections` },
          { "@type": "ListItem", position: 3, name, item: detailUrl },
        ],
      },
    ],
  };

  return (
    <div data-subbrand="film">
      {/* Restore scroll when returning here from a film detail page. */}
      <ScrollRestoration />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        {/* Back-nav above the hero — same chrome as /television/watching. */}
        <BackLink href="/films/collections">← All collections</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Films · {name}</Kicker>
            <Display>Every {name} film I&rsquo;ve logged.</Display>
            <Lede>
              I&rsquo;ve logged {count} films in the {name} collection. Open any
              card for the full review.
            </Lede>
            <p style={{ margin: 0 }}>
              <TrackOnClick
                event={ANALYTICS_EVENTS.LETTERBOXD_CLICK}
                eventData={{ kind: "profile-follow", surface: "films-collection-hero" }}
              >
                <Link href={LETTERBOXD_PROFILE_URL}>Follow along on Letterboxd ↗</Link>
              </TrackOnClick>
            </p>
          </Stack>
        </Section>

        <Section padding="md" bordered>
          {/* sr-only h2 bridges the hero Display (h1) to the per-card
              Headline level={3} titles inside PosterTile, so the heading
              outline doesn't skip h2 (same fix as /television/watching). */}
          <Headline level={2} className="sr-only">
            Films in this collection
          </Headline>
          <Grid cols={5} gap="500">
            {members.map((film) => (
              <PosterTile
                key={film.id}
                href={`/films/${film.letterboxdSlug}-${film.releaseYear}`}
                // Thread this collection as the origin, so the detail page's
                // adjacent-film nav walks the collection (release order) and
                // the back-link returns here.
                originHref={`/films/collections/${slug}`}
                posterUrl={film.posterUrl}
                title={film.title}
                subtitle={String(film.releaseYear)}
                rating={film.primaryRating}
              />
            ))}
          </Grid>
        </Section>
      </Container>
    </div>
  );
}
