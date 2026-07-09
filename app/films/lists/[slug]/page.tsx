// ─────────────────────────────────────────────────────────────────
// /films/lists/[slug] — a single curated Letterboxd list.
//
// One statically-generated page per public list (generateStaticParams
// from the snapshot's lists[]). Renders the list title, its prose
// (the ranking methodology for the ranked lists), and the films IN
// LIST ORDER — which for Malcolm's ranked lists IS the ranking.
//
// Films are shown in their running order. Each list entry is only a
// Letterboxd slug; films that are in the reviewed corpus render as
// rich poster tiles linking to their on-site review, and films that
// aren't (the list includes plenty he hasn't written up) render via
// PosterTile's title-only fallback, linking out to Letterboxd — so
// the full list shows in order rather than silently dropping entries.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ShareBar } from "@/components/share/ShareBar";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { PosterTile } from "@/components/feeds/PosterTile";
import { SITE_URL, twitterAttribution } from "@/lib/site-config";
import {
  getFilmLists,
  getFilmListBySlug,
  getFilmByLetterboxdSlug,
} from "@/lib/feeds/letterboxd";
import { classifyList } from "@/lib/feeds/list-taxonomy";

type Params = Promise<{ slug: string }>;

// Pre-render every list at build time. New lists land via the weekly
// scrape → snapshot commit → redeploy, which re-runs this.
export function generateStaticParams() {
  return getFilmLists().map((list) => ({ slug: list.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = getFilmListBySlug(slug);
  if (!list) return { title: "List not found" };
  const canonical = `/films/lists/${list.slug}`;
  const description =
    list.description ||
    `${list.filmSlugs.length} films, ranked and curated by Malcolm Xavier. Logged, rated, and reviewed—each entry links to its full on-site review.`;
  return {
    title: list.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${list.title}—Malcolm Xavier`,
      description,
      url: canonical,
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      ...twitterAttribution,
      title: `${list.title}—Malcolm Xavier`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

/** Title fallback for a list film that isn't in the reviewed corpus —
 *  deslugify the Letterboxd slug ("fight-club" → "Fight Club"). Lossy
 *  for year-suffixed slugs ("anastasia-1997" → "Anastasia 1997") but
 *  honest enough for a title-only tile. */
function deslugify(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function FilmListPage({ params }: { params: Params }) {
  const { slug } = await params;
  const list = getFilmListBySlug(slug);
  if (!list) notFound();

  // Letterboxd doesn't flag ranked-ness in the snapshot, so infer it: every
  // matrix cell (Editor's / Ratings Cut) is a ranking, plus any Featured
  // one-off whose title says so ("… Ranked" / "Top N").
  const isRanked =
    classifyList(list.title).kind === "matrix" ||
    /\branked\b|\btop\s*\d+\b/i.test(list.title);

  const landingUrl = `${SITE_URL}/films`;
  const listUrl = `${SITE_URL}/films/lists/${list.slug}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Films", item: landingUrl },
      { "@type": "ListItem", position: 2, name: list.title, item: listUrl },
    ],
  };
  // ItemList — makes the ranking machine-legible (rich results + AI search).
  // Each entry points at its on-site detail page (or Letterboxd if the film
  // isn't in the reviewed corpus); position is the rank.
  const itemList = {
    "@type": "ItemList",
    name: list.title,
    url: listUrl,
    numberOfItems: list.filmSlugs.length,
    itemListOrder: isRanked
      ? "https://schema.org/ItemListOrderAscending"
      : "https://schema.org/ItemListOrderUnordered",
    itemListElement: list.filmSlugs.map((filmSlug, i) => {
      const f = getFilmByLetterboxdSlug(filmSlug);
      return {
        "@type": "ListItem",
        position: i + 1,
        name: f ? f.title : deslugify(filmSlug),
        url: f
          ? `${SITE_URL}/films/${f.letterboxdSlug}-${f.releaseYear}`
          : `https://letterboxd.com/film/${filmSlug}/`,
      };
    }),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, itemList],
  };

  return (
    <div data-subbrand="film">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        {/* Back to the lists hub (this list's parent index). */}
        <Section padding="md">
          <Link href="/films/lists">← All lists</Link>
        </Section>

        {/* Header — title + methodology prose. */}
        <Section padding="sm">
          <Stack gap="400">
            <Kicker accent>
              List · {list.filmSlugs.length}{" "}
              {list.filmSlugs.length === 1 ? "film" : "films"}
            </Kicker>
            <Display>{list.title}</Display>
            {list.description ? <Lede wide>{list.description}</Lede> : null}
            <p style={{ margin: 0 }}>
              <Link href={list.url}>View the list on Letterboxd ↗</Link>
            </p>
            {/* Share this ranked/themed list. Personal emphasis. */}
            <ShareBar
              path={`/films/lists/${list.slug}`}
              title={list.title}
              emphasis="personal"
              surface="list"
              label="Share"
            />
          </Stack>
        </Section>

        {/* Films in list order (the ranking). */}
        <Section padding="md" bordered>
          {/* sr-only h2 bridges the hero Display (h1) to the per-tile
              Headline level={3} titles, so the heading outline doesn't
              skip h2 (same fix as the collections leaf). */}
          <Headline level={2} className="sr-only">
            Films in this list
          </Headline>
          <Grid cols={4} gap="500">
            {list.filmSlugs.map((filmSlug, i) => {
              // Rank shows as a poster badge for ranked lists (every matrix
              // cell, plus "… Ranked" one-offs); the visible title stays clean.
              const rank = isRanked ? i + 1 : null;
              const film = getFilmByLetterboxdSlug(filmSlug);
              if (film) {
                return (
                  <PosterTile
                    key={filmSlug}
                    href={`/films/${film.letterboxdSlug}-${film.releaseYear}`}
                    posterUrl={film.posterUrl}
                    title={film.title}
                    subtitle={String(film.releaseYear)}
                    rating={film.primaryRating}
                    rank={rank}
                  />
                );
              }
              // Not in the prose corpus — title-only tile linking out.
              return (
                <PosterTile
                  key={filmSlug}
                  href={`https://letterboxd.com/film/${filmSlug}/`}
                  external
                  posterUrl={null}
                  title={deslugify(filmSlug)}
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
