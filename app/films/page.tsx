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
import { Link } from "@/components/primitives/Link";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { PosterTile } from "@/components/feeds/PosterTile";
import { ListCard } from "@/components/feeds/ListCard";
import { ELSEWHERE } from "@/lib/elsewhere";
import { SITE_URL } from "@/lib/site-config";
import {
  getFilms,
  getFilmFavorites,
  getFilmLists,
  getFilmByLetterboxdSlug,
} from "@/lib/feeds/letterboxd";
import type { Film, FilmList } from "@/lib/feeds/letterboxd";

const LETTERBOXD_PROFILE_URL =
  ELSEWHERE.find((e) => e.label === "Letterboxd")?.href ??
  "https://letterboxd.com/malxavi/";

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
  const { films } = getFilms();
  const favorites = getFilmFavorites();
  const lists = getFilmLists();
  const recent = films.slice(0, NOW_COUNT);

  return (
    <div data-subbrand="film">
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
              I watch north of 300 films a year and write up nearly all of
              them. This is the front door: what I am watching right now, the
              handful I would save in a fire, and the lists I rebuild every
              year. The full reviewed backlog is one click away.
            </Lede>
            <p style={{ margin: 0 }}>
              <Link href={LETTERBOXD_PROFILE_URL}>Follow on Letterboxd ↗</Link>
            </p>
            {/* Cluster sub-nav, inline in the hero. Overview is the
                current page; Reviews links to the corpus — this is the
                button that replaces the old standalone "Browse all
                reviews" link. */}
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
        {/* ─── Now ────────────────────────────────────────────── */}
        {recent.length > 0 ? (
          <Section padding="md">
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

        {/* ─── Favorites ──────────────────────────────────────── */}
        {favorites.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Favorites</Kicker>
              <Headline level={2}>The all-timers</Headline>
              <Grid cols={5} gap="500">
                {favorites.map((fav) => {
                  // In-corpus favorites link to their on-site review;
                  // the rest (prose-less films) link out to Letterboxd.
                  const corpusFilm = getFilmByLetterboxdSlug(fav.slug);
                  const href = corpusFilm
                    ? filmDetailHref(corpusFilm)
                    : fav.letterboxdUrl;
                  return (
                    <PosterTile
                      key={fav.slug}
                      href={href}
                      external={!corpusFilm}
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
