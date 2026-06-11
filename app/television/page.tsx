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
import { Headline } from "@/components/typography/Headline";
import { Link } from "@/components/primitives/Link";
import { ClusterRail } from "@/components/chrome/ClusterRail";
import { PosterTile } from "@/components/feeds/PosterTile";
import { FeaturedPick } from "@/components/feeds/FeaturedPick";
import { ListCard } from "@/components/feeds/ListCard";
import { SITE_URL } from "@/lib/site-config";
import {
  getShows,
  getShowFavorites,
  getShowLists,
  getShowBySerializdId,
  getWatchingExclusions,
} from "@/lib/feeds/serializd";
import { getShowFeaturedPick } from "@/lib/feeds/featured-pick";
import { buildInProgressCards } from "@/lib/feeds/serializd-utils";
import type { ShowList } from "@/lib/feeds/serializd";
import { InProgressCard } from "./InProgressCard";

const NOW_COUNT = 5;

export const metadata: Metadata = {
  title: "Television",
  description:
    "Television as taste, not a catalogue—what Malcolm Xavier is mid-watch on now, the favorite series, and the full reviewed corpus.",
  alternates: { canonical: "/television" },
  openGraph: {
    title: "Television—Malcolm Xavier",
    description:
      "What I'm mid-watch on now, my favorite series, and every review.",
    url: "/television",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Television—Malcolm Xavier",
    description:
      "What I'm mid-watch on now, my favorite series, and every review.",
    images: ["/opengraph-image"],
  },
};

/** Resolve up to three corpus poster URLs for a TV list's cover. */
function listCoverPosters(list: ShowList): string[] {
  const urls: string[] = [];
  for (const id of list.showIds) {
    const show = getShowBySerializdId(id);
    if (show?.posterUrl) urls.push(show.posterUrl);
    if (urls.length >= 3) break;
  }
  return urls;
}

export default function TelevisionLandingPage() {
  const { shows } = getShows();
  const favorites = getShowFavorites();
  const lists = getShowLists();

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
            <Kicker accent>Television</Kicker>
            <Display>The shows I stay up for.</Display>
            {/* Full-width lede (the 60ch cap is dropped) so the blurb
                reads in fewer lines and the modules sit higher on load. */}
            <Lede style={{ maxWidth: "none" }}>
              I review television at the show, season, and episode level—the
              prestige dramas, the comfort rewatches, the reality I am not
              embarrassed about. This is the front door: what I am mid-watch on
              right now and the series I hold sacred. The full reviewed corpus
              is one click away.
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
          </Stack>
        </Section>
      </Container>

      <Container size="lg">
        {/* ─── Featured pick ──────────────────────────────────── */}
        {/* The one editorial, hand-curated module — leads the modules as
            the payoff to the hero's taste thesis. paddingTop:0 so the gap
            is the hero's bottom rhythm alone. Hidden when no pick set. */}
        {featured ? (
          <Section padding="md" style={{ paddingTop: 0 }}>
            <FeaturedPick pick={featured} />
          </Section>
        ) : null}

        {/* ─── Now ────────────────────────────────────────────── */}
        {/* paddingTop:0 on the first module so the gap to it is the hero
            section's bottom rhythm alone, not that PLUS this section's top
            rhythm (the doubling read as a big void under the hero). */}
        {nowCards.length > 0 ? (
          <Section padding="md" style={{ paddingTop: 0 }}>
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

        {/* ─── Favorites ──────────────────────────────────────── */}
        {favorites.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Favorites</Kicker>
              <Headline level={2}>The ones I hold sacred</Headline>
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
                        corpusShow ? `/television/${corpusShow.slug}` : undefined
                      }
                      posterUrl={fav.posterUrl}
                      title={fav.name}
                      subtitle={
                        corpusShow ? String(corpusShow.premiereYear) : undefined
                      }
                    />
                  );
                })}
              </Grid>
            </Stack>
          </Section>
        ) : null}

        {/* ─── Lists ──────────────────────────────────────────── */}
        {/* Dormant until Serializd lists exist (the endpoint returns
            empty today) — renders nothing rather than an empty shell,
            per the no-placeholder rule. Lights up automatically once
            Malcolm creates a Serializd list. */}
        {lists.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker accent>Lists</Kicker>
              <Headline level={2}>Ranked and themed</Headline>
              <Grid cols={3} gap="600">
                {lists.map((list) => (
                  <ListCard
                    key={list.slug}
                    href={`/television/lists/${list.slug}`}
                    title={list.name}
                    count={list.showIds.length}
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
