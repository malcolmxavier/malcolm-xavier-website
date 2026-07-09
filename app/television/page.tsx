// ─────────────────────────────────────────────────────────────────
// /television — editorial landing (cluster front).
//
// TV analog of /films. The review grid moved to /television/reviews;
// this is the point-of-interest landing — a POV statement, what's
// mid-watch right now (the in-progress seasons, reusing the /watching
// data + InProgressCard), the favorite series, and curated lists
// (dormant until Serializd lists exist), with the corpus one click
// away via the hero CTA + sticky ClusterRail.
//
// Server component: reads the snapshot. No searchParams → prerenders
// static. Copy ships as placeholders for Malcolm to refine.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { HeroNote } from "@/components/typography/HeroNote";
import { Headline } from "@/components/typography/Headline";
import { Link } from "@/components/primitives/Link";
import { ShareBar } from "@/components/share/ShareBar";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import {
  SectionIndex,
  type SectionIndexItem,
} from "@/components/feeds/SectionIndex";
import { PosterTile } from "@/components/feeds/PosterTile";
import { FeaturedPick } from "@/components/feeds/FeaturedPick";
import { ListCard } from "@/components/feeds/ListCard";
import { CollectionCard } from "@/components/feeds/CollectionCard";
import { SITE_URL, twitterAttribution } from "@/lib/site-config";
import {
  getShows,
  getShowFavorites,
  getShowLists,
  getShowBySerializdId,
  getWatchingExclusions,
  showListCoverPosters,
} from "@/lib/feeds/serializd";
import { orderForTeaser } from "@/lib/feeds/list-taxonomy";
import { getShowFeaturedPick } from "@/lib/feeds/featured-pick";
import {
  buildInProgressCards,
  seasonNumberForReview,
} from "@/lib/feeds/serializd-utils";
import { modesForReview } from "@/lib/feeds/serializd-mode-counts.mjs";
import {
  indexableTvCollections,
  showsInTvFamily,
  tvCollectionMemberSort,
} from "@/lib/feeds/facet-index";
import { slugifyEntity } from "@/lib/feeds/slug";
import type { Show } from "@/lib/feeds/serializd-utils";
import { InProgressCard } from "./InProgressCard";
import { StatsBand } from "./StatsBand";

const NOW_COUNT = 5;

// Serializd follow URL for the hero note's closing CTA — the canonical
// profile, kept as a literal here to mirror the films landing's CTA.
const SERIALIZD_PROFILE_URL = "https://serializd.com/user/malxavi";

export const metadata: Metadata = {
  title: "Television",
  description:
    "Television as taste, not a catalogue—what Malcolm Xavier is mid-watch on now, the favorite series, and the full reviewed corpus.",
  alternates: { canonical: "/television" },
  openGraph: {
    title: "Television—Malcolm Xavier",
    description:
      "What I’m mid-watch on now, my favorite series, and every review.",
    url: "/television",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    ...twitterAttribution,
    title: "Television—Malcolm Xavier",
    description:
      "What I’m mid-watch on now, my favorite series, and every review.",
    images: ["/opengraph-image"],
  },
};

/** Resolve up to three corpus poster URLs for a collection's cover
 *  montage — the family's member shows in the hub's canonical order
 *  (premiere year, then name), so the montage leads with the same titles
 *  the leaf route opens with. */
function collectionCoverPosters(shows: Show[], key: string): string[] {
  return showsInTvFamily(shows, key)
    .sort(tvCollectionMemberSort)
    .map((show) => show.posterUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);
}

export default function TelevisionLandingPage() {
  const { shows, summary } = getShows();
  const favorites = getShowFavorites();
  const lists = getShowLists();

  // Per-mode "this year" counts + averages for the StatsBand's lead
  // numbers. Derived at request time so they track `new Date()` and stay
  // correct across the year boundary, and routed through modesForReview
  // so the miniseries double-count rule matches the lifetime totals shown
  // alongside (a Show review on a miniseries-pinned show counts in both
  // Shows and Seasons modes). This mirrors the derivation that used to
  // live on /television/reviews when the panel rendered there. Don't
  // increment cybl[r.level] directly — that bypasses the double-count
  // rule. See lib/feeds/serializd-mode-counts.mjs.
  const currentYear = new Date().getUTCFullYear();
  const cybl = { show: 0, season: 0, episode: 0 };
  const cyblRatingSums = { show: 0, season: 0, episode: 0 };
  const cyblRatingCounts = { show: 0, season: 0, episode: 0 };
  for (const show of shows) {
    for (const r of show.reviews) {
      const yr = Number.parseInt(r.watchedDate.slice(0, 4), 10);
      if (yr !== currentYear) continue;
      for (const mode of modesForReview(r.level, show.isMiniseries)) {
        cybl[mode]++;
        if (r.rating !== null) {
          cyblRatingSums[mode] += r.rating;
          cyblRatingCounts[mode]++;
        }
      }
    }
  }
  const currentYearAvgByLevel: {
    show: number | null;
    season: number | null;
    episode: number | null;
  } = {
    show:
      cyblRatingCounts.show > 0
        ? cyblRatingSums.show / cyblRatingCounts.show
        : null,
    season:
      cyblRatingCounts.season > 0
        ? cyblRatingSums.season / cyblRatingCounts.season
        : null,
    episode:
      cyblRatingCounts.episode > 0
        ? cyblRatingSums.episode / cyblRatingCounts.episode
        : null,
  };
  // Routable franchise collections — drives the "Collections" landing
  // teaser + its link to the core /television/collections page. The teaser
  // shows the top-level families only (no nested subcollection like Real
  // Housewives, whose count already rolls up into its Bravo parent),
  // biggest first, capped at three so the module entices without
  // duplicating the full hub.
  const collections = indexableTvCollections(shows);
  const collectionTeasers = collections.filter((c) => !c.parent).slice(0, 3);

  // "Now" — in-progress seasons, same data + exclusions as
  // /television/watching, newest-episode-review first. Reuses the
  // shipped InProgressCard so the landing teaser and the full watching
  // page read identically.
  const exclusions = getWatchingExclusions();
  const inProgress = buildInProgressCards(shows)
    .filter((c) => !exclusions.has(c.show.serializdShowId))
    .sort((a, b) =>
      (b.episodeReviews[0]?.reviewDate ?? "").localeCompare(
        a.episodeReviews[0]?.reviewDate ?? "",
      ),
    );
  const nowCards = inProgress.slice(0, NOW_COUNT);
  const featured = getShowFeaturedPick();

  // "Favorite episodes" — the perfect-score (5.0★) episode-level reviews,
  // newest-reviewed first. Curation that gives the episode tier real value
  // on-site NOW, while episode-level STATS need ~a year of history before
  // they mean anything. Episodes have no detail page of their own, so each
  // card deep-links to the show's season block (#season-N), where the
  // episode note lives. Shown in full (no cap) — exclusivity is the point,
  // and the set grows slowly as more episodes get logged.
  const favoriteEpisodes = shows
    .flatMap((show) =>
      show.reviews
        .filter((r) => r.level === "episode" && r.rating === 5)
        .map((review) => ({ show, review })),
    )
    .sort((a, b) => b.review.reviewDate.localeCompare(a.review.reviewDate));

  // Which optional modules render this request — computed ONCE and used for
  // both the section guards below AND the "On this page" index, so the
  // wayfinding strip stays in lockstep with what's actually on the page.
  // The StatsBand is unconditional, so it's always in the index.
  const hasFeatured = Boolean(featured);
  const hasNow = nowCards.length > 0;
  const hasCollections = collections.length > 0;
  const hasFavorites = favorites.length > 0;
  const hasFavoriteEpisodes = favoriteEpisodes.length > 0;
  const hasLists = lists.length > 0;
  const sectionIndexItems: SectionIndexItem[] = [
    hasFeatured ? { id: "featured", label: "Featured" } : null,
    { id: "numbers", label: "Stats at a glance" },
    hasNow ? { id: "now", label: "Now" } : null,
    hasCollections ? { id: "collections", label: "Collections" } : null,
    hasFavorites ? { id: "favorites", label: "Favorites" } : null,
    hasFavoriteEpisodes ? { id: "episodes", label: "Episodes" } : null,
    hasLists ? { id: "lists", label: "Lists" } : null,
  ].filter((item): item is SectionIndexItem => item !== null);

  // Page-level JSON-LD — see the /films landing for the rationale. The
  // landing carries its own CollectionPage (mirroring /television/reviews),
  // and the featured pick's hand-written take rides along as a schema.org
  // Review of a TVSeries (a real critic review of a third-party work, real
  // rating, no faked aggregateRating).
  const pageUrl = `${SITE_URL}/television`;
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
        name: "Television",
        description:
          "Television as taste, not a catalogue—what Malcolm Xavier is mid-watch on now, the favorite series, the curated lists, and a standing recommendation.",
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
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            {/* Masthead row: the cluster eyebrow on the left, the "On this
                page" jump strip right-aligned opposite it. Wraps (strip
                drops below the eyebrow) when there's no room on one line. */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: "8px 24px",
              }}
            >
              <Kicker accent>Television</Kicker>
              <SectionIndex
                items={sectionIndexItems}
                subbrand="tv"
                label="Television sections on this page"
              />
            </div>
            <Display>The shows I stay up for.</Display>
            {/* Full-width lede (the 60ch cap is dropped) so the blurb
                reads in fewer lines and the modules sit higher on load.
                The scene-setter stays headline-weight; the "what to do
                here" line drops below the rail as a quiet HeroNote. */}
            <Lede wide>
              I review television at the season, show, and (as of 2026) episode level—the
              prestige dramas, the comfort comedies, and my fair share of reality. I watch north of 100 new-to-me
              seasons of television a year and write up nearly all of them.
            </Lede>
            {/* Cluster sub-nav, inline in the hero. Overview is the current
                page; Reviews links to the corpus — the on-site action that
                replaces the old standalone "Browse all shows reviewed" link.
                (The Serializd follow link lives on the Reviews page now, not
                here — the landing keeps recruiters on-site.) */}
            <ClusterRail
              base="/television"
              active="overview"
              subbrand="tv"
              label="Television sections"
              className="mt-2"
            />
            {/* The follow CTA closes the note here on the landing page —
                the cluster's top-level surface — rather than on /reviews.
                ↗ marks it external per the CTA-arrow convention. */}
            <HeroNote
              action={
                <TrackOnClick
                  event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                  eventData={{ kind: "profile-follow", surface: "television-overview-hero" }}
                >
                  <Link href={SERIALIZD_PROFILE_URL}>
                    Follow along on Serializd ↗
                  </Link>
                </TrackOnClick>
              }
            >
              Explore this page for a quick overview of what I’ve watched recently, my
              recommended picks, and my favorites—click through to search through all
              my reviews or explore the data behind my taste.
            </HeroNote>
            {/* Share the television landing. Personal emphasis. */}
            <ShareBar
              path="/television"
              title="Television by Malcolm Xavier"
              emphasis="personal"
              surface="tv-landing"
              campaign="tv-landing"
              label="Share"
            />
          </Stack>
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Featured pick ──────────────────────────────────── */}
        {/* The one editorial, hand-curated module — leads the modules as
            the payoff to the hero's taste thesis. A bordered divider sets
            it off from the hero so the note's closing follow-CTA reads as
            the end of the lede, not the top of this section. Hidden when
            no pick set. */}
        {featured ? (
          <Section id="featured" className="scroll-mt-28" padding="md" bordered>
            <FeaturedPick pick={featured} />
          </Section>
        ) : null}

        {/* ─── By the numbers ─────────────────────────────────── */}
        {/* Lifetime stats, relocated here from the old listing-hero
            panel. Always carries a bordered divider: it follows either
            the featured pick or (when no pick is set) the hero itself,
            and both cases want it set off rather than sitting tight. */}
        <Section id="numbers" className="scroll-mt-28" padding="md" bordered>
          <StatsBand
            summary={summary}
            currentYearByLevel={cybl}
            currentYearAvgByLevel={currentYearAvgByLevel}
          />
        </Section>

        {/* ─── Now ────────────────────────────────────────────── */}
        {/* The StatsBand always precedes Now, so Now is never the first
            module — a bordered divider separates the two (it no longer
            needs the paddingTop:0 first-module treatment). */}
        {hasNow ? (
          <Section id="now" className="scroll-mt-28" padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Now</Kicker>
              <Headline level={2}>Mid-watch right now</Headline>
              <Grid cols={5} gap="500">
                {nowCards.map((card) => (
                  <InProgressCard
                    key={`${card.show.id}#s${card.seasonNumber}`}
                    card={card}
                    originHref="/television/watching"
                  />
                ))}
              </Grid>
              <p style={{ margin: 0 }}>
                <Link href="/television/watching">
                  See everything in progress →
                </Link>
              </p>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Collections ────────────────────────────────────── */}
        {/* Franchise families (the Bravo-verse, 9-1-1, Grey's, …) — a
            link into the core /television/collections page, mirroring how
            "Now" links into /television/watching. */}
        {hasCollections ? (
          <Section
            id="collections"
            className="scroll-mt-28"
            padding="md"
            bordered
          >
            <Stack gap="400">
              <Kicker accent>Collections</Kicker>
              <Lede>
                The shows I’ve followed across a franchise or universe,
                grouped into their own pages—from the Bravo-verse to 9-1-1.
              </Lede>
              {/* Teaser cards: the biggest top-level families, each
                  deep-linking straight to its leaf collection route (not
                  the hub), so the click lands one step closer to the
                  reviews. Slug matches the leaf route's
                  generateStaticParams (slugifyEntity of the family name). */}
              <Grid cols={3} gap="600">
                {collectionTeasers.map((collection) => (
                  <CollectionCard
                    key={collection.key}
                    href={`/television/collections/${slugifyEntity(collection.name)}`}
                    title={collection.name}
                    count={collection.count}
                    unit="show"
                    coverPosterUrls={collectionCoverPosters(shows, collection.key)}
                  />
                ))}
              </Grid>
              <p style={{ margin: 0 }}>
                <Link href="/television/collections">
                  Browse all collections →
                </Link>
              </p>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Favorites ──────────────────────────────────────── */}
        {hasFavorites ? (
          <Section id="favorites" className="scroll-mt-28" padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Favorites</Kicker>
              <Headline level={2}>Some of my sacred texts</Headline>
              <Grid cols={5} gap="500">
                {favorites.map((fav) => {
                  // In-corpus favorites link to their on-site detail;
                  // out-of-corpus favorites (no review yet) render
                  // display-only — the landing no longer leaks to
                  // Serializd (that follow link lives on the Reviews page).
                  const corpusShow = getShowBySerializdId(fav.serializdShowId);
                  return (
                    <PosterTile
                      key={fav.serializdShowId}
                      href={
                        corpusShow
                          ? `/television/${corpusShow.slug}`
                          : undefined
                      }
                      posterUrl={fav.posterUrl}
                      title={fav.name}
                      // No year subtitle here: premiere years don't resolve
                      // consistently across the favorites (some are
                      // out-of-corpus picks) and aren't meaningful on a
                      // "sacred texts" shelf — the title carries the card.
                    />
                  );
                })}
              </Grid>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Favorite episodes ──────────────────────────────── */}
        {/* The perfect-score (5.0★) episodes — curated standouts that give
            the episode tier value on-site now, ahead of episode-level
            stats. Each tile uses the show's poster (episodes have no art of
            their own) and deep-links to the show's season block, where the
            episode note lives. Copy is a working placeholder. */}
        {hasFavoriteEpisodes ? (
          <Section id="episodes" className="scroll-mt-28" padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Favorite episodes</Kicker>
              <Headline level={2}>Five stars, no notes</Headline>
              <Grid cols={5} gap="500">
                {favoriteEpisodes.map(({ show, review }) => {
                  // Episodes have no detail page; the finest anchor is the
                  // season block on the show's page (#season-N).
                  const seasonNumber = seasonNumberForReview(show, review);
                  const href =
                    seasonNumber !== null
                      ? `/television/${show.slug}#season-${seasonNumber}`
                      : `/television/${show.slug}`;
                  // Secondary line: "Show · S# · E#" (each part omitted when
                  // unknown — episode-level reviews normally have both).
                  const seLabel =
                    (seasonNumber !== null ? ` · S${seasonNumber}` : "") +
                    (review.episodeNumber !== null
                      ? ` · E${review.episodeNumber}`
                      : "");
                  return (
                    <PosterTile
                      key={review.id}
                      href={href}
                      posterUrl={show.posterUrl}
                      title={
                        review.episodeName ??
                        (review.episodeNumber !== null
                          ? `Episode ${review.episodeNumber}`
                          : "Episode")
                      }
                      subtitle={`${show.name}${seLabel}`}
                      rating={5}
                    />
                  );
                })}
              </Grid>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Lists ──────────────────────────────────────────── */}
        {/* Teaser only — the full year × scope × method matrix lives on
            the /television/lists hub. Hidden when the publish-set is
            empty (no-placeholder rule). */}
        {hasLists ? (
          <Section id="lists" className="scroll-mt-28" padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Lists</Kicker>
              <Headline level={2}>Ranked and themed</Headline>
              <Grid cols={3} gap="600">
                {orderForTeaser(lists, (l) => l.name)
                  .slice(0, 3)
                  .map((list) => (
                    <ListCard
                      key={list.slug}
                      href={`/television/lists/${list.slug}`}
                      title={list.name}
                      count={list.items.length}
                      unit={{ one: "pick", other: "picks" }}
                      description={list.description}
                      coverPosterUrls={showListCoverPosters(list)}
                    />
                  ))}
              </Grid>
              <p style={{ margin: 0 }}>
                <Link href="/television/lists">Explore lists →</Link>
              </p>
            </Stack>
          </Section>
        ) : null}
      </Container>
    </div>
  );
}
