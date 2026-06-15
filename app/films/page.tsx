// ─────────────────────────────────────────────────────────────────
// /films — editorial landing (cluster front).
//
// Phase 1 of the film/TV editorial-cluster initiative: /films is no
// longer the review grid (that moved to /films/reviews). This is the
// point-of-interest landing — a taste statement, what's on rotation
// now, the hand-picked canon, and the curated lists — with the corpus
// one click away via the in-hero CTA + the sticky ClusterRail.
//
// Server component: reads the snapshot via getFilms / getFilmFavorites
// / getFilmLists. No searchParams, so this prerenders static.
//
// Copy (Display / Lede / section intros) ships as working placeholders
// for Malcolm to refine in his voice.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Headline } from "@/components/typography/Headline";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { PosterTile } from "@/components/feeds/PosterTile";
import { FeaturedPick } from "@/components/feeds/FeaturedPick";
import { ListCard } from "@/components/feeds/ListCard";
import { SITE_URL } from "@/lib/site-config";
import {
  getFilms,
  getFilmFavorites,
  getFilmLists,
  getFilmByLetterboxdSlug,
} from "@/lib/feeds/letterboxd";
import { Link } from "@/components/primitives/Link";
import { getFilmFeaturedPick } from "@/lib/feeds/featured-pick";
import { getFilmsWithEnrichment } from "@/lib/feeds/review-corpus";
import { StatsBand } from "./StatsBand";
import { getCollectionDetails } from "@/lib/feeds/enrichment";
import { indexableFilmCollections } from "@/lib/feeds/facet-index";
import type { Film, FilmList } from "@/lib/feeds/letterboxd";

// How many recent watches to surface in the "Now" module — one clean
// 5-up row on desktop (matches the denser poster grid below).
const NOW_COUNT = 5;

export const metadata: Metadata = {
  title: "Films",
  description:
    "Film as taste, not a catalogue—what Malcolm Xavier is watching now, the all-time favorites, the ranked and themed lists, and the full reviewed corpus.",
  alternates: { canonical: "/films" },
  openGraph: {
    title: "Films—Malcolm Xavier",
    description:
      "What I'm watching now, my all-time favorites, my ranked lists, and every review.",
    url: "/films",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Films—Malcolm Xavier",
    description:
      "What I'm watching now, my all-time favorites, my ranked lists, and every review.",
    images: ["/opengraph-image"],
  },
};

/** Canonical on-site detail href for a corpus film. */
function filmDetailHref(film: Film): string {
  return `/films/${film.letterboxdSlug}-${film.releaseYear}`;
}

/** Resolve up to three corpus poster URLs for a list's cover montage,
 *  walking the list's films in order and skipping any not in the
 *  reviewed corpus (or lacking a poster). */
function listCoverPosters(list: FilmList): string[] {
  const urls: string[] = [];
  for (const slug of list.filmSlugs) {
    const film = getFilmByLetterboxdSlug(slug);
    if (film?.posterUrl) urls.push(film.posterUrl);
    if (urls.length >= 3) break;
  }
  return urls;
}

export default function FilmsLandingPage() {
  const { films, summary } = getFilms();
  const favorites = getFilmFavorites();
  const lists = getFilmLists();
  const recent = films.slice(0, NOW_COUNT);
  const featured = getFilmFeaturedPick();

  // Films watched this calendar year — for the StatsBand's lead line.
  // Derived at request time (not from summary's snapshot-frozen count)
  // so the "{n} in {year}" figure tracks `new Date()` and can't go stale
  // across the Jan 1 boundary before the next snapshot refresh.
  const currentYear = new Date().getUTCFullYear();
  const currentYearCount = films.filter((f) =>
    f.watchedYearSet.includes(currentYear),
  ).length;
  // Routable franchise collections — drives the "Collections" landing teaser
  // and its link to the core /films/collections page. Reads the enriched
  // corpus (collection membership lives in the enrichment fixture).
  const { films: enrichedFilms } = getFilmsWithEnrichment();
  const collections = indexableFilmCollections(
    enrichedFilms,
    getCollectionDetails(),
    new Date().getUTCFullYear(),
  );

  // Page-level JSON-LD. The landing is now a first-class editorial page
  // (not just a grid precursor), so it carries its own CollectionPage —
  // mirroring /films/reviews, which already had one. When a featured
  // pick is set, its hand-written take is emitted as a schema.org Review
  // in the SAME @graph: legitimate critic-reviews-a-creative-work markup
  // (itemReviewed is a third-party Movie, not a self-review), with a
  // real rating and NO faked aggregateRating.
  const pageUrl = `${SITE_URL}/films`;
  const person = {
    "@type": "Person",
    name: "Malcolm Xavier",
    "@id": `${SITE_URL}/#person`,
  };
  const landingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Films",
        description:
          "Film as taste, not a catalogue—what Malcolm Xavier is watching now, the all-time favorites, the curated lists, and a standing recommendation.",
        url: pageUrl,
        inLanguage: "en-US",
        author: person,
      },
      ...(featured
        ? [
            {
              "@type": "Review",
              name: `Currently recommending: ${featured.title}`,
              url: `${SITE_URL}${featured.href}`,
              author: person,
              reviewBody: featured.take,
              itemReviewed: {
                "@type": featured.kind,
                name: featured.title,
                ...(featured.posterUrl ? { image: featured.posterUrl } : {}),
              },
              ...(featured.rating !== null
                ? {
                    reviewRating: {
                      "@type": "Rating",
                      ratingValue: featured.rating,
                      bestRating: 5,
                      worstRating: 0.5,
                    },
                  }
                : {}),
            },
          ]
        : []),
    ],
  };

  return (
    <div data-subbrand="film">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker accent>Films</Kicker>
            <Display>A taste, not a catalogue.</Display>
            {/* Full-width lede (the 60ch cap is dropped) so the blurb
                reads in ~2 lines and the modules below sit higher on the
                initial viewport. */}
            <Lede style={{ maxWidth: "none" }}>
              I watch north of 300 films a year and write up nearly all of them.
              This is the front door: what I am watching right now, the handful
              I would save in a fire, and the lists I rebuild every year. The
              full reviewed backlog is one click away.
            </Lede>
            {/* Cluster sub-nav, inline in the hero. Overview is the
                current page; Reviews links to the corpus — the on-site
                action that replaces the old standalone "Browse all
                reviews" link. (The Letterboxd follow link lives on the
                Reviews page now, not here — the landing keeps recruiters
                on-site.) */}
            <ClusterRail
              base="/films"
              active="overview"
              subbrand="film"
              label="Films sections"
              className="mt-2"
            />
          </Stack>
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Featured pick ──────────────────────────────────── */}
        {/* The one editorial, hand-curated module — leads the modules so
            it's the payoff to the hero's taste thesis before any
            feed-derived content. paddingTop:0 so the gap to it is the
            hero's bottom rhythm alone (no doubled padding). Hidden
            entirely when no pick is set / resolvable. */}
        {featured ? (
          <Section padding="md" style={{ paddingTop: 0 }}>
            <FeaturedPick pick={featured} />
          </Section>
        ) : null}

        {/* ─── By the numbers ─────────────────────────────────── */}
        {/* Lifetime stats, relocated here from the old listing-hero
            panel. With a featured pick above it, a bordered divider sets
            it off; with no pick it's the first module and sits tight to
            the hero (paddingTop:0), matching the first-module rhythm the
            Featured/Now sections use. */}
        <Section
          padding="md"
          bordered={Boolean(featured)}
          style={featured ? undefined : { paddingTop: 0 }}
        >
          <StatsBand summary={summary} currentYearCount={currentYearCount} />
        </Section>

        {/* ─── Now ────────────────────────────────────────────── */}
        {/* The StatsBand always precedes Now, so Now is never the first
            module — a bordered divider separates the two (it no longer
            needs the paddingTop:0 first-module treatment). */}
        {recent.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Now</Kicker>
              <Headline level={2}>Recently watched</Headline>
              <Grid cols={5} gap="500">
                {recent.map((film) => (
                  <PosterTile
                    key={film.id}
                    href={filmDetailHref(film)}
                    posterUrl={film.posterUrl}
                    title={film.title}
                    subtitle={String(film.releaseYear)}
                    rating={film.primaryRating}
                  />
                ))}
              </Grid>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Collections ────────────────────────────────────── */}
        {/* Franchise families (John Wick, Alien, Mission: Impossible, …) —
            a link into the core /films/collections page. */}
        {collections.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Collections</Kicker>
              <Headline level={2}>Franchises and sagas</Headline>
              <Lede>
                The series I&rsquo;ve followed across more than a couple of
                films, each grouped into its own page of reviews.
              </Lede>
              <p style={{ margin: 0 }}>
                <Link href="/films/collections">Browse all collections →</Link>
              </p>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Favorites ──────────────────────────────────────── */}
        {favorites.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Favorites</Kicker>
              <Headline level={2}>The all-timers</Headline>
              {/* 4-up: Letterboxd caps favorites at four ("Top 4"), so a
                  4-column grid fills exactly with no empty trailing slot. */}
              <Grid cols={4} gap="500">
                {favorites.map((fav) => {
                  // In-corpus favorites link to their on-site review;
                  // out-of-corpus favorites (no review yet) render
                  // display-only — the landing no longer leaks to
                  // Letterboxd (those links live on the Reviews page).
                  const corpusFilm = getFilmByLetterboxdSlug(fav.slug);
                  return (
                    <PosterTile
                      key={fav.slug}
                      href={corpusFilm ? filmDetailHref(corpusFilm) : undefined}
                      posterUrl={fav.posterUrl}
                      title={fav.title}
                      subtitle={
                        fav.releaseYear ? String(fav.releaseYear) : undefined
                      }
                    />
                  );
                })}
              </Grid>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Lists ──────────────────────────────────────────── */}
        {lists.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Lists</Kicker>
              <Headline level={2}>Ranked and themed</Headline>
              <Grid cols={3} gap="600">
                {lists.map((list) => (
                  <ListCard
                    key={list.slug}
                    href={`/films/lists/${list.slug}`}
                    title={list.title}
                    count={list.filmSlugs.length}
                    description={list.description}
                    coverPosterUrls={listCoverPosters(list)}
                  />
                ))}
              </Grid>
            </Stack>
          </Section>
        ) : null}
      </Container>
    </div>
  );
}
