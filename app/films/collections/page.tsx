// ─────────────────────────────────────────────────────────────────
// /films/collections — the franchise-family core page (WS7).
//
// A real curated landing (not a thin directory), following the
// /television/watching pattern: hero + grids of film cards, one section per
// routable franchise family. Indexed (added to the sitemap), same posture
// as the TV collections hub — a curated hub with unique value that also
// feeds crawl equity to the per-collection routes.
//
// The list comes from indexableFilmCollections — the same gate the leaf
// routes, the sitemap, and the stats Franchises deep-link read.
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
import type { Film } from "@/lib/feeds/letterboxd-utils";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import { slugifyEntity } from "@/lib/feeds/slug";
import {
  indexableFilmCollections,
  filmsInFilmFamily,
  filmCollectionMemberSort,
  type FilmCollectionRoute,
} from "@/lib/feeds/facet-index";

export const metadata: Metadata = {
  title: "Film Collections",
  description:
    "The franchises and film families in my logged corpus—each with its own page of reviews.",
  alternates: { canonical: "/films/collections" },
};

export default function FilmCollectionsHub() {
  const { films, summary } = getFilmsWithEnrichment();
  const collectionDetails = getCollectionDetails();
  const currentYear = new Date().getUTCFullYear();
  const collections = indexableFilmCollections(films, collectionDetails, currentYear);

  return (
    <div data-subbrand="film">
      <Container size="lg">
        {/* Back-nav above the hero — same chrome as /television/watching. */}
        <BackLink href="/films">← All films</BackLink>
        <Section padding="md">
          <Stack gap="500">
            <Kicker accent>Films · Collections</Kicker>
            <Display>Franchises and film families I&rsquo;ve logged.</Display>
            <Lede wide>
              The series I&rsquo;ve followed across more than a couple of films,
              each grouped into its own page of reviews. Open a collection to
              see every entry, every rating, every reaction.
            </Lede>
          </Stack>
        </Section>

        {/* Grid container (watching pattern): the section-toggle nav sits at
            the top, right above the collection grids — Collections active,
            linking back to All. Films have no "watching" surface. */}
        <Section padding="md" bordered>
          <Stack gap="700">
            <div id="grid" style={{ scrollMarginTop: "5rem" }}>
              <ClusterGridNav
                cluster="films"
                active="collections"
                allCount={summary.totalFilms}
              />
            </div>
            {collections.map((c) => (
              <Stack key={c.key} gap="500">
                <CollectionHeading collection={c} />
                <CollectionGrid films={filmsInFilmFamily(films, c.key)} />
              </Stack>
            ))}
          </Stack>
        </Section>
      </Container>
    </div>
  );
}

/** A collection's heading — its name linking to the leaf, plus the logged
 *  film count. */
function CollectionHeading({ collection }: { collection: FilmCollectionRoute }) {
  return (
    <Headline level={2}>
      <Link href={`/films/collections/${slugifyEntity(collection.name)}`}>
        {collection.name}
      </Link>{" "}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 400,
          color: "var(--text-caption)",
        }}
      >
        {collection.count} films
      </span>
    </Headline>
  );
}

/** One PosterTile per member film, oldest-first (release order). */
function CollectionGrid({ films }: { films: Film[] }) {
  const ordered = [...films].sort(filmCollectionMemberSort);
  return (
    <Grid cols={5} gap="500">
      {ordered.map((film) => (
        <PosterTile
          key={film.id}
          href={`/films/${film.letterboxdSlug}-${film.releaseYear}`}
          posterUrl={film.posterUrl}
          title={film.title}
          subtitle={String(film.releaseYear)}
          rating={film.primaryRating}
        />
      ))}
    </Grid>
  );
}
