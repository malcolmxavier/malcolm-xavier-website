// ─────────────────────────────────────────────────────────────────
// /television/[showSlug] — single-show detail page.
//
// Renders the full hierarchy for a TV show:
//
//   1. Back link — "← All television" mono caption.
//   2. Hero — poster + title block (kicker, name, premiere year /
//      type / status / network metadata, primary rating + dateline,
//      genre chips → /television/genre/<slug>, "View on Serializd ↗").
//   3. Show review (if any) — full prose, sits at the top of the
//      review stack since the Show review summarizes the whole.
//   4. Season hierarchy — every season per TMDB rendered in
//      seasonNumber asc order. Each season block carries its own
//      Season-level review (if reviewed) and any nested Episode
//      reviews. Unreviewed seasons appear as quiet placeholders
//      so the user sees the full structure.
//   5. Adjacent shows — chronological prev/next neighbors at the
//      bottom, walking the snapshot's shows array (sorted by
//      latestActivityDate desc to match listing default).
//
// JSON-LD: TVSeries + per-Review (Show + Season levels) +
// BreadcrumbList in a single @graph. TVEpisode emission deferred
// — adds bytes without earning ranking value at current scale.
//
// Snapshot-only at request time: getShowBySlug() reads
// lib/feeds/_fixtures/serializd-snapshot.json directly. ISR
// revalidate=3600 since the snapshot only changes on bootstrap.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Link } from "@/components/primitives/Link";
import { StarRating } from "@/components/primitives/StarRating";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import {
  getShowBySlug,
  getShowNeighbors,
} from "@/lib/feeds/serializd";
import { getShowsWithEnrichment } from "@/lib/feeds/review-corpus";
import {
  applyCompletedCardFilters,
  asString,
  buildCompletedCards,
  buildInProgressCards,
  findGenreBySlug,
  formatWatchedDate,
  genreFromSlug,
  parseShowFilters,
  parseShowSort,
  resolveSeasonPosterUrl,
  seasonNumberForReview,
  slugifyGenre,
  type CompletedCard,
  type InProgressCard as InProgressCardType,
  type Review,
  type Season,
  type Show,
} from "@/lib/feeds/serializd-utils";
import { primaryNetwork } from "@/lib/feeds/stats/network-canon";
import { findEntityBySlug } from "@/lib/feeds/slug";
import {
  tvFacetForBasePath,
  resolveTvFacet,
  indexableTvCollections,
  showsInTvFamily,
  tvCollectionMemberSort,
  TV_FACET_PIN,
} from "@/lib/feeds/facet-index";
import { BackToTelevision } from "../BackToTelevision";

type Params = { showSlug: string };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const revalidate = 3600;

// ─── SEO metadata ────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { showSlug } = await params;
  const show = getShowBySlug(showSlug);
  if (!show) {
    return {
      title: "Show not found",
      alternates: { canonical: `/television/${showSlug}` },
    };
  }
  // Description = first ~155 chars of the most useful prose review,
  // preferring Show-level → Season-level → first review with prose.
  // Skip episode-level reviews for the meta description (they're
  // typically short reaction logs).
  const sourceReview =
    show.reviews.find((r) => r.level === "show" && r.reviewText.trim() !== "") ??
    show.reviews.find((r) => r.level === "season" && r.reviewText.trim() !== "") ??
    show.reviews.find((r) => r.reviewText.trim() !== "");
  const trimmedProse = sourceReview
    ? sourceReview.reviewText.replace(/\s+/g, " ").trim()
    : "";
  const description =
    trimmedProse.length > 155
      ? `${trimmedProse.slice(0, 152)}…`
      : trimmedProse ||
        `Reviews of ${show.name} (${show.premiereYear}) by Malcolm Xavier across show, season, and episode levels.`;

  // OG image: prefer TMDB backdrop (1280×720) — landscape, ideal
  // for unfurlers. When no backdrop is available, fall straight to
  // the sitewide programmatic OG card rather than the portrait
  // poster (780×1170 reads poorly in LinkedIn / Slack / iMessage,
  // which all expect landscape). Same posture as /films detail
  // page; portrait-poster path was removed per
  // tv-og-image-portrait-fallback.
  const ogImages = show.tmdb?.backdropPath
    ? [
        {
          url: `https://image.tmdb.org/t/p/w1280${show.tmdb.backdropPath}`,
          width: 1280,
          height: 720,
          alt: `${show.name} backdrop`,
        },
      ]
    : [
        {
          // Sitewide programmatic OG card (Satori-rendered at
          // /opengraph-image, 1200×630). next/metadata resolves
          // the relative URL via metadataBase at render time.
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${show.name}—Malcolm Xavier`,
        },
      ];

  return {
    title: {
      absolute: `${show.name} (${show.premiereYear})—Reviews by Malcolm Xavier`,
    },
    description,
    alternates: { canonical: `/television/${show.slug}` },
    openGraph: {
      // Match the HTML <title> shape ("Reviews by Malcolm Xavier"
      // suffix) so social unfurls clarify the link's purpose. The
      // bare "Show Name (Year)" form looked like a TMDB / IMDB
      // share rather than a personal-review page; the suffix
      // anchors the unfurl as Malcolm's editorial work.
      title: `${show.name} (${show.premiereYear})—Reviews by Malcolm Xavier`,
      description,
      url: `/television/${show.slug}`,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${show.name} (${show.premiereYear})—Reviews by Malcolm Xavier`,
      description,
      images: ogImages?.map((img) => img.url),
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────

export default async function TelevisionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { showSlug } = await params;
  const sp = await searchParams;
  const show = getShowBySlug(showSlug);
  if (!show) notFound();

  // Adjacent-show navigation. Two paths:
  //   • If `?from=<encoded-listing-url>` is present (the user
  //     arrived via a card click), reconstruct that listing's
  //     filter+sort context and find the current show's actual
  //     visual neighbors in that filtered+sorted card list.
  //   • Otherwise (direct entry, shared link, deep link), fall
  //     back to the snapshot's latestActivityDate-ordered
  //     neighbors via getShowNeighbors.
  const fromParam = asString(sp.from);
  // Cache the breadcrumb label once so the JSX doesn't run
  // describeFilterContext twice per render (conditional + value).
  // Server-side helper, fast — but no reason to call it twice. The
  // enriched corpus is needed to resolve facet/collection canonical
  // names; getShowsWithEnrichment is module-cached so this shares the
  // same array findContextualNeighbors loads internally.
  const { shows: contextShows } = getShowsWithEnrichment();
  const filterContext = describeFilterContext(fromParam, contextShows);
  const contextual = findContextualNeighbors(show.id, fromParam);
  const fallback = getShowNeighbors(show.id);
  const { newer: newerShow, older: olderShow } = contextual ?? fallback;
  // The from param survives multi-hop browsing — neighbor links
  // re-encode it so a click on "older" carries the same context.
  const neighborFrom = fromParam ? encodeURIComponent(fromParam) : null;

  // Group reviews by level for hierarchy rendering.
  const showReviews = show.reviews.filter((r) => r.level === "show");
  const seasonReviewsByNum = new Map<number, Review>();
  const episodeReviewsByNum = new Map<number, Review[]>();
  for (const r of show.reviews) {
    if (r.level === "season") {
      const sn = seasonNumberForReview(show, r);
      if (sn !== null) seasonReviewsByNum.set(sn, r);
    } else if (r.level === "episode") {
      const sn = seasonNumberForReview(show, r);
      if (sn === null) continue;
      const list = episodeReviewsByNum.get(sn) ?? [];
      list.push(r);
      episodeReviewsByNum.set(sn, list);
    }
  }
  // Sort episode reviews per season by episode number asc so the
  // detail-page narrative reads E1 → E2 → … (matches how the user
  // would re-watch). seasonNumberAsc ordering for the seasons
  // themselves happens at the iteration site.
  for (const list of episodeReviewsByNum.values()) {
    list.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
  }
  // Suppress the Specials season (seasonNumber === 0) by default.
  // TMDB tags an enormous range of bonus content as Specials —
  // promo featurettes, behind-the-scenes packs, holiday one-offs —
  // most of which Malcolm hasn't engaged with and doesn't want
  // surfaced as a placeholder "Unreviewed" block on the detail
  // page. The rule (set 2026-05-07): hide Specials unless at least
  // one signal exists for it — a Season-level review, an episode-
  // level review on a Specials episode, an in-progress flag, or a
  // Serializd watched-marker. The signal check covers all four
  // sources so any future engagement (rating, prose, episode log,
  // or watched tap) automatically un-hides the section without a
  // manual override.
  const specialsSeason = show.seasons.find((s) => s.seasonNumber === 0);
  const specialsHasSignal =
    specialsSeason !== undefined &&
    ((show.reviewedSeasonNumbers ?? []).includes(0) ||
      (show.inProgressSeasonNumbers ?? []).includes(0) ||
      (show.watchedUnreviewedSeasonNumbers ?? []).includes(0) ||
      show.reviews.some((r) => r.seasonId === specialsSeason.serializdId));
  // Iterate seasons in number order, surfacing Specials (season 0)
  // last since it's tangential to the main run when it appears.
  const orderedSeasons = [...show.seasons]
    .filter((s) => s.seasonNumber !== 0 || specialsHasSignal)
    .sort((a, b) => {
      const aIsSpecial = a.seasonNumber === 0;
      const bIsSpecial = b.seasonNumber === 0;
      if (aIsSpecial && !bIsSpecial) return 1;
      if (!aIsSpecial && bIsSpecial) return -1;
      return a.seasonNumber - b.seasonNumber;
    });

  // Show-level rating for the hero — null unless at least one
  // Show-level review carries a rating. Picks the most recent
  // Show review's rating (showReviews is filtered above; first
  // entry is newest since show.reviews is pre-sorted reviewDate
  // desc).
  const showLevelRating = showReviews[0]?.rating ?? null;

  const jsonLd = buildPageJsonLd(show);

  return (
    <div data-subbrand="tv">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="lg">
        <div
          style={{
            paddingTop: "var(--scale-600)",
            paddingBottom: "var(--scale-400)",
          }}
        >
          {/* Filter-context breadcrumb — quiet kicker above the
              back link, surfaced only when the visitor came from
              a filtered listing. Tells them where they were
              exploring so the detail page doesn't strip their
              mental model. The back link itself still goes to
              the source URL via BackToTelevision; this label is
              purely informational. */}
          {filterContext ? (
            // marginBottom var(--scale-400) (16px) gives the
            // breadcrumb visual breathing room from the
            // BackToTelevision link below — both render mono
            // uppercase, and the previous scale-200 (8px) gap
            // crowded them into a single visual unit. The bump
            // disambiguates "where you came from" (caption-grey
            // breadcrumb) from "go back" (text-action-blue link).
            <div style={{ marginBottom: "var(--scale-400)" }}>
              <Kicker>Television · {filterContext}</Kicker>
            </div>
          ) : null}
          {/* Suspense wrap — BackToTelevision uses useSearchParams,
              which Next.js 15+ requires inside a Suspense boundary
              for static prerender. fallback=null since the link is
              small chrome that hydrates fast. */}
          <Suspense fallback={null}>
            <BackToTelevision />
          </Suspense>
        </div>

        {/* ─── Hero (poster + title block) ─────────────────────── */}
        <Section padding="sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:items-end md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
            {show.posterUrl ? (
              <div
                className="relative w-full overflow-hidden rounded-md"
                style={{
                  aspectRatio: "2 / 3",
                  background: "var(--surface-default)",
                  border: "1px solid var(--border-default)",
                  // Cap the poster at 240px on narrow viewports so
                  // it doesn't fill the entire 375px first fold
                  // (the season-block posters below cap at 200px,
                  // so an unconstrained hero poster broke the
                  // rhythm). Desktop is unaffected — md+ already
                  // constrains the column to 200/240px.
                  maxWidth: "240px",
                }}
              >
                <Image
                  src={show.posterUrl}
                  alt={`${show.name} poster`}
                  fill
                  sizes="(max-width: 768px) 80vw, 240px"
                  style={{ objectFit: "cover" }}
                  priority
                />
              </div>
            ) : null}

            <Stack gap="400">
              <Kicker accent>Show</Kicker>
              <Display>{show.name}</Display>
              <p style={metadataLineStyle}>
                {show.premiereYear || ""}
                {show.tmdb?.type ? ` · ${show.tmdb.type}` : ""}
                {show.tmdb?.status ? ` · ${show.tmdb.status}` : ""}
                {show.tmdb?.networks && show.tmdb.networks.length > 0
                  ? ` · ${primaryNetwork(show.tmdb.networks)}`
                  : ""}
              </p>
              {/* Hero rating shows ONLY when there's a Show-level
                  review with a rating — i.e. the show has been
                  rated as a whole. show.primaryRating (most recent
                  review across any level) is too context-divorced
                  to surface here; a Season or Episode rating means
                  something different than "this show, rated."
                  Most recent activity stays — that's level-
                  agnostic and useful regardless. */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {showLevelRating !== null ? (
                  <StarRating
                    rating={showLevelRating}
                    size={20}
                    showEmpty
                  />
                ) : null}
                {show.liked ? (
                  <span
                    role="img"
                    aria-label="Liked"
                    title="Liked"
                    className="star-rating-fill"
                    style={{ fontSize: 18 }}
                  >
                    ♥
                  </span>
                ) : null}
                <span style={metadataLineStyle}>
                  Most recent activity{" "}
                  {formatWatchedDate(show.latestActivityDate.slice(0, 10))}
                </span>
              </div>
              {/* Genre chips — link to /television/genre/<slug>.
                  Mirrors /films's chip pattern but uses the
                  .show-detail-genre-chip class for sub-brand-specific
                  hover styling (see components.css). */}
              {show.tmdb?.genres && show.tmdb.genres.length > 0 ? (
                <ul
                  role="list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {show.tmdb.genres.map((g) => (
                    <li key={g}>
                      <NextLink
                        href={`/television/genre/${slugifyGenre(g)}`}
                        className="show-detail-genre-chip"
                        style={genreChipStyle}
                      >
                        {g}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p style={{ margin: 0 }}>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.SERIALIZD_CLICK}
                  eventData={{
                    kind: "show-detail",
                    showId: show.serializdShowId,
                  }}
                >
                  <Link href={show.serializdUrl}>View on Serializd ↗</Link>
                </TrackOnClick>
              </p>
            </Stack>
          </div>
        </Section>

        {/* ─── Show-level review (if any) ──────────────────────── */}
        {showReviews.length > 0 ? (
          <Section padding="md" bordered>
            <div
              id="show-review"
              // scroll-margin-top so anchor scrolling (#show-review)
              // lands the heading clear of the sticky site nav.
              style={{ scrollMarginTop: "5rem" }}
              className="md:grid md:grid-cols-[200px_1fr] md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-10"
            >
              <div aria-hidden="true" />
              <div style={{ maxWidth: "65ch" }}>
                <Stack gap="600">
                  <Headline level={2}>The whole show</Headline>
                  {showReviews.map((review, i) => (
                    <ReviewBlock
                      key={`show-${i}`}
                      review={review}
                      anchorId={`show-review-${i}`}
                    />
                  ))}
                </Stack>
              </div>
            </div>
          </Section>
        ) : null}

        {/* ─── Seasons ─────────────────────────────────────────── */}
        {/* Layout note: the section heading uses the same poster-
            column / content-column grid as the hero, with the
            poster slot empty (the show poster sits right above it
            in the hero). Each SeasonBlock owns its own grid row,
            so each season can fill the poster column with its
            own poster — distinct visual identity per season,
            aligned with the show's overall column rhythm. */}
        {orderedSeasons.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="800">
              <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
                <div aria-hidden="true" />
                <Headline level={2}>Season by season</Headline>
              </div>
              {orderedSeasons.map((season) => (
                <SeasonBlock
                  key={season.serializdId}
                  show={show}
                  season={season}
                  seasonReview={
                    seasonReviewsByNum.get(season.seasonNumber) ?? null
                  }
                  episodeReviews={
                    episodeReviewsByNum.get(season.seasonNumber) ?? []
                  }
                  watchedUnreviewed={show.watchedUnreviewedSeasonNumbers.includes(
                    season.seasonNumber,
                  )}
                  inProgress={show.inProgressSeasonNumbers.includes(
                    season.seasonNumber,
                  )}
                />
              ))}
            </Stack>
          </Section>
        ) : null}

        {/* ─── Adjacent shows (chronological prev/next) ────────
            Sibling-to-sibling links between detail pages. Newer
            LEFT, older RIGHT — matches /films's listing-order
            convention so a reader arriving from /television
            carries "further right = older" as their mental model.
            See FilmDetailPage's adjacent-reviews comment for the
            full rationale. */}
        {(newerShow || olderShow) ? (
          <Section padding="md" bordered>
            <nav
              aria-label="Adjacent shows"
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
            >
              {newerShow ? (
                <NeighborLink
                  show={newerShow}
                  direction="newer"
                  fromParam={neighborFrom}
                />
              ) : (
                <span aria-hidden="true" />
              )}
              {olderShow ? (
                <NeighborLink
                  show={olderShow}
                  direction="older"
                  fromParam={neighborFrom}
                />
              ) : (
                <span aria-hidden="true" />
              )}
            </nav>
          </Section>
        ) : null}
      </Container>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function ReviewBlock({
  review,
  anchorId,
}: {
  review: Review;
  anchorId: string;
}) {
  const paragraphs = review.reviewText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <article id={anchorId}>
      <Stack gap="400">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <p
            style={{
              ...metadataLineStyle,
              margin: 0,
              fontWeight: "inherit",
            }}
          >
            Watched {formatWatchedDate(review.watchedDate.slice(0, 10))}
          </p>
          {review.rating !== null ? (
            <StarRating rating={review.rating} size={16} />
          ) : null}
          {review.isRewatch ? <Pill>Rewatch</Pill> : null}
          {review.containsSpoiler ? (
            <Pill tone="warning">Contains spoilers</Pill>
          ) : null}
        </div>
        <div>
          {paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <p key={i} style={proseParagraphStyle}>
                {para}
              </p>
            ))
          ) : null}
        </div>
      </Stack>
    </article>
  );
}

function SeasonBlock({
  show,
  season,
  seasonReview,
  episodeReviews,
  watchedUnreviewed,
  inProgress,
}: {
  /** Parent show — used to resolve the season's TMDB poster URL
   *  (via the shared resolveSeasonPosterUrl helper) for the
   *  poster column. */
  show: Show;
  season: Season;
  seasonReview: Review | null;
  episodeReviews: Review[];
  /** Season is in `show.watchedUnreviewedSeasonNumbers` — watched
   *  pre-Serializd or otherwise without a writeup. Renders a
   *  "Watched" badge. */
  watchedUnreviewed: boolean;
  /** Season is in `show.inProgressSeasonNumbers` — episode-only
   *  reviews exist, no Season-level writeup. Renders an "In
   *  progress" badge. */
  inProgress: boolean;
}) {
  // Season-specific poster URL via the shared helper. Null when
  // TMDB hasn't populated a poster (common for "Specials" /
  // season-0 entries). On null we leave the column empty rather
  // than falling back to the show poster — the show poster is
  // already in the hero, repeating it here would be redundant.
  const seasonPosterUrl = resolveSeasonPosterUrl(show, season.seasonNumber);
  // Status discriminator. A Season review with prose is "reviewed"
  // (full content). A Season review with rating-only (no prose) is
  // "watched" — Malcolm completed the season and rated it but
  // didn't write a recap. Episode-only signal is "in-progress".
  // Watched-from-API with no diary entry at all is "watched"
  // without a rating.
  //
  // Why rating-only reads as "watched": the user explicitly noted
  // that a rated-but-not-reviewed season should still carry the
  // Watched tag — the rating is its own complete signal at the
  // season level, but a prose-less Season block would otherwise
  // render as an empty review with rating, which reads more
  // confusing than helpful. Watched + rating is more compact and
  // accurate.
  const reviewHasProse =
    seasonReview !== null && seasonReview.reviewText.trim() !== "";
  // Pull the rating from the rating-only Season review when
  // present; null otherwise. The watchedSeasons API doesn't
  // surface ratings today, so the API-only "watched" case has no
  // rating to display.
  const watchedRating: number | null =
    seasonReview !== null && !reviewHasProse
      ? seasonReview.rating
      : null;
  const heading =
    season.seasonNumber === 0
      ? "Specials"
      : season.name && season.name !== `Season ${season.seasonNumber}`
        ? `${season.name} (Season ${season.seasonNumber})`
        : `Season ${season.seasonNumber}`;
  const hasReviewContent = reviewHasProse || episodeReviews.length > 0;
  // Status precedence (most-specific signal wins):
  //   1. reviewed     → Season review with prose. Full content.
  //   2. watched      → Season review rating-only (rated but no
  //                     writeup) OR API-only watched flag. Both
  //                     express "season completed" without a
  //                     writeup; the rating-only branch carries
  //                     a rating for the badge to surface.
  //   3. in-progress  → episode reviews exist, no Season review.
  //   4. unreviewed   → no signal either way (default).
  // Mutually exclusive by construction — bootstrap dedupes
  // watchedUnreviewedSeasonNumbers against reviewed/in-progress
  // buckets, and the local `reviewHasProse` flag here disambig-
  // uates rating-only Season reviews from full ones.
  const status: "reviewed" | "watched" | "in-progress" | "unreviewed" =
    reviewHasProse
      ? "reviewed"
      : seasonReview !== null
        ? "watched"
        : inProgress
          ? "in-progress"
          : watchedUnreviewed
            ? "watched"
            : "unreviewed";
  // Only the truly-unreviewed (status unknown) variant fades — the
  // watched / in-progress / reviewed cases all carry positive
  // information and earn the eye's attention.
  const dim = status === "unreviewed" && !hasReviewContent;
  return (
    <section
      id={`season-${season.seasonNumber}`}
      // scroll-margin-top compensates for the sticky site nav so
      // anchor scrolling (#season-N) lands the heading in view
      // rather than tucked behind the nav. 5rem matches the nav's
      // own sticky-top offset used by FilmsShell's filter sidebar.
      style={
        // 0.65 keeps the visual dim effect for unreviewed seasons
        // while clearing SC 1.4.3 with headroom (effective light-
        // mode contrast was ~4.74:1 at 0.55 — borderline; 0.65 lifts
        // it well above the 4.5:1 floor for body text).
        dim ? { opacity: 0.65, scrollMarginTop: "5rem" } : { scrollMarginTop: "5rem" }
      }
    >
      <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8 md:items-start lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* Season poster — fills the same left column the hero
            show-poster lives in. Empty when the season has no
            TMDB poster (the show poster is in the hero already;
            repeating it would be redundant and noisy on shows
            with many seasons). On mobile (<md), the column
            collapses to a single stack — poster on top of
            content. */}
        <div>
          {seasonPosterUrl ? (
            <div
              className="relative w-full overflow-hidden rounded-md"
              style={{
                aspectRatio: "2 / 3",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
                // Cap the rendered width on mobile so a portrait
                // poster doesn't dominate the viewport when the
                // grid collapses to one column. md+ the explicit
                // grid column size already constrains the width.
                maxWidth: 200,
              }}
            >
              <Image
                src={seasonPosterUrl}
                alt={`${heading} poster`}
                fill
                sizes="(max-width: 768px) 200px, 240px"
                style={{ objectFit: "cover" }}
                placeholder="empty"
              />
            </div>
          ) : null}
        </div>
        <div style={{ maxWidth: "65ch" }}>
          <Stack gap="400">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Headline level={3}>{heading}</Headline>
              {/* Watched badge — minimal label since "Watched"
                  alone communicates the state. Surfaces on both
                  the rating-only "watched" status (where the
                  badge is the only signal of completion) AND on
                  the "reviewed" status (where the Watched fact
                  is implicit in the review existing, but the
                  badge makes the completion legible at-a-glance
                  next to the heading). The rating beside the
                  badge only shows for the rating-only branch —
                  reviewed seasons display their rating inside
                  the ReviewBlock below, so duplicating it here
                  would be noisy. */}
              {status === "watched" || status === "reviewed" ? (
                <>
                  <SeasonStatusBadge tone="watched">Watched</SeasonStatusBadge>
                  {status === "watched" && watchedRating !== null ? (
                    <StarRating rating={watchedRating} size={14} />
                  ) : null}
                </>
              ) : null}
              {status === "in-progress" && !seasonReview ? (
                <SeasonStatusBadge tone="in-progress">In progress</SeasonStatusBadge>
              ) : null}
            </div>
            {/* Render the full ReviewBlock only when there's prose
                to show. Rating-only Season reviews surface their
                rating inline with the Watched badge above;
                rendering them here would produce an empty prose
                section. */}
            {reviewHasProse && seasonReview ? (
              <ReviewBlock
                review={seasonReview}
                anchorId={`season-${season.seasonNumber}-review`}
              />
            ) : null}
            {episodeReviews.length > 0 ? (
              <Stack gap="300">
                <Kicker>Episode notes</Kicker>
                <ul
                  role="list"
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {episodeReviews.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        paddingTop: 12,
                        paddingBottom: 12,
                        borderTop: "1px solid var(--border-default)",
                      }}
                    >
                      <EpisodeRow review={r} />
                    </li>
                  ))}
                </ul>
              </Stack>
            ) : null}
            {/* Watched: no caption — the badge says it. Unreviewed
                gets an italic "Not reviewed here." since there's
                no other signal carrying the state. */}
            {status === "unreviewed" ? (
              <p
                style={{
                  ...metadataLineStyle,
                  // Override the muted caption color with high-contrast
                  // body text. This line only renders on unreviewed
                  // seasons, which is exactly the `dim` case (the section
                  // carries opacity 0.65). At that opacity the caption
                  // grey composites to ~3.2:1 (fails AA); body text holds
                  // ~5.4:1. We de-emphasize by size/italic, not by a
                  // muted color the dim would push under the floor.
                  color: "var(--text-body)",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                Not reviewed here.
              </p>
            ) : null}
          </Stack>
        </div>
      </div>
    </section>
  );
}

/**
 * Small status pill rendered inline with the season heading.
 * Two tones, both AA-contrast against the cluster's surfaces:
 *   • "watched"     → subtle green (watched-no-writeup is a
 *                     positive completion signal).
 *   • "in-progress" → cluster blue (matches the watching badge
 *                     on InProgressCard for visual continuity).
 */
function SeasonStatusBadge({
  tone,
  children,
}: {
  tone: "watched" | "in-progress";
  children: React.ReactNode;
}) {
  // Both tones now route through theme-flipped CSS classes for
  // the bg+text pair. The earlier in-progress inline path used
  // var(--blue-700) which is theme-stable in token terms, but
  // the badge BOUNDARY contrast in dark mode (blue-700 on black
  // = ~1.38:1) failed SC 1.4.11. The .season-status-in-progress
  // class flips to a lighter blue with dark text in dark mode so
  // the edge pops against the black page — same pattern
  // .season-status-watched uses for the green tone.
  return (
    <span
      className={
        tone === "watched"
          ? "season-status-watched"
          : "season-status-in-progress"
      }
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 3,
      }}
    >
      {children}
    </span>
  );
}

function EpisodeRow({ review }: { review: Review }) {
  const epLabel =
    review.episodeNumber !== null
      ? `E${review.episodeNumber}${review.episodeName ? ` · ${review.episodeName}` : ""}`
      : review.episodeName ?? "Episode";
  const proseParagraphs = review.reviewText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <Stack gap="100">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-sm-font-size)",
            color: "var(--text-heading)",
            letterSpacing: "0.04em",
          }}
        >
          {epLabel}
        </span>
        {review.rating !== null ? (
          <StarRating rating={review.rating} size={12} />
        ) : null}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-caption)",
            letterSpacing: "0.04em",
          }}
        >
          {formatWatchedDate(review.watchedDate.slice(0, 10))}
        </span>
      </div>
      {proseParagraphs.length > 0 ? (
        <div>
          {proseParagraphs.map((para, i) => (
            <p
              key={i}
              style={{ ...proseParagraphStyle, fontSize: "var(--p-sm-font-size)" }}
            >
              {para}
            </p>
          ))}
        </div>
      ) : null}
    </Stack>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 3,
        border: "1px solid var(--border-interactive)",
        // tone="warning" routes through --text-warning so the
        // pill renders yellow regardless of cluster context. Inside
        // [data-subbrand="tv"] the --text-action alias resolves to
        // the cluster's blue, which made the "Contains spoilers"
        // pill read as a link rather than a caution signal — same
        // posture as /films which uses --text-warning here.
        color:
          tone === "warning"
            ? "var(--text-warning)"
            : "var(--text-caption)",
      }}
    >
      {children}
    </span>
  );
}

function NeighborLink({
  show,
  direction,
  fromParam,
}: {
  show: Show;
  direction: "newer" | "older";
  /** URL-encoded source listing — re-attached to the neighbor
   *  link's href so multi-hop browsing keeps the user's original
   *  filter+sort context alive across detail pages. Null when
   *  the current detail page was entered directly (no `from`
   *  param to forward). */
  fromParam: string | null;
}) {
  const href = fromParam
    ? `/television/${show.slug}?ref=internal&from=${fromParam}`
    : `/television/${show.slug}?ref=internal`;
  return (
    <NextLink
      href={href}
      style={{
        textDecoration: "none",
        display: "block",
        padding: "var(--scale-400)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--border-radius-md)",
        outlineColor: "var(--border-focus)",
        // Defensive reset against the browser's default blue
        // anchor color — matches the /films and /music
        // NeighborLink wrappers. Inner spans all set explicit
        // colors today, but this guards against a future inner
        // refactor exposing the default blue mid-card.
        color: "inherit",
      }}
      className="hover:[border-color:var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Stack gap="100">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-caption)",
          }}
        >
          {direction === "newer" ? "← Newer review" : "Older review →"}
        </span>
        <span
          style={{
            // --font-primary (Roboto Mono) matches the rest of the
            // TV cluster's show-name surfaces (ShowCard via
            // Headline, Display on the detail hero) and aligns with
            // /films and /music NeighborLinks. The earlier
            // --font-secondary (Roboto Slab) was an outlier flagged
            // in the 2026-05-07 re-review.
            fontFamily: "var(--font-primary)",
            fontSize: "var(--p-md-font-size)",
            color: "var(--text-heading)",
          }}
        >
          {show.name}{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-caption)",
              letterSpacing: "0.04em",
            }}
          >
            ({show.premiereYear})
          </span>
        </span>
      </Stack>
    </NextLink>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
// seasonNumberForReview + asString both live in serializd-utils
// and are imported above. Local re-declarations were removed in
// the Batch C cleanup so all consumers stay in lockstep.

/**
 * Translate a `?from=<encoded-listing-url>` value into a short
 * editorial breadcrumb label so the detail-page hero shows the
 * filter context the visitor came from. Examples:
 *   /television/genre/drama                          → "Drama"
 *   /television?genre=Drama&rating=5                 → "Drama · 5★"
 *   /television?rating=5,4.5                         → "5/4.5★"
 *   /television?watchedYear=2025                     → "2025"
 *   /television?watchedWindow=12mo                   → "Past 12mo"
 *   /television?cardKind=show                        → "Shows"
 *   /television/watching                             → "Watching"
 * Returns null when there's nothing distinctive to surface (e.g.
 * the visitor came from the bare /television listing) so the
 * caller can skip rendering the breadcrumb.
 */
function describeFilterContext(
  fromUrl: string | undefined,
  shows: Show[],
): string | null {
  if (!fromUrl) return null;
  let parsed: URL;
  try {
    // The `from` param is a relative URL; resolve against a stub
    // origin so URL parsing works without a real host.
    parsed = new URL(fromUrl, "http://stub.local");
  } catch {
    return null;
  }
  const labels: string[] = [];
  const genreMatch = parsed.pathname.match(/^\/television\/genre\/([^/]+)/);
  // A two-segment /television/<seg>/<slug> path that names a real WS6b
  // facet (tvFacetForBasePath is null for genre/collections).
  const facetPathMatch = parsed.pathname.match(/^\/television\/([^/]+)\/([^/]+)$/);
  const facetFromPath = facetPathMatch
    ? tvFacetForBasePath(facetPathMatch[1])
    : null;
  if (genreMatch) {
    // Multi-word genre slugs (sci-fi--fantasy, action--adventure,
    // war--politics) carry double-dashes that the slug-to-titlecase
    // walker can't resolve back to the proper "Sci-Fi & Fantasy"
    // form, so genreFromSlug returns the static-mapped TMDB name
    // for those cases. Single-word slugs (drama, comedy, ...) fall
    // through to the titlecase walker.
    const slug = genreMatch[1];
    labels.push(
      genreFromSlug(slug) ??
        slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
    );
  } else if (parsed.pathname.startsWith("/television/watching")) {
    labels.push("Watching");
  } else if (parsed.pathname.startsWith("/television/collections/")) {
    // WS7 collection leaf — name the collection (canonical).
    const slug = parsed.pathname.slice("/television/collections/".length);
    const routable = indexableTvCollections(shows);
    const name = findEntityBySlug(routable.map((c) => c.name), slug);
    if (name) labels.push(name);
  } else if (facetFromPath && facetPathMatch) {
    // WS6b facet route — name the entity (canonical), e.g. "Mark Ruffalo".
    const resolved = resolveTvFacet(facetFromPath, shows, facetPathMatch[2]);
    if (resolved) labels.push(resolved.name);
  } else {
    const genre = parsed.searchParams.get("genre");
    if (genre) {
      // Multi-genre arrives as CSV (e.g. ?genre=Drama,Comedy from
      // toggleGenre's join). Split + rejoin with " · " so the
      // breadcrumb reads "Drama · Comedy" instead of the raw
      // "Drama,Comedy" — mirrors how rating and watchedYear
      // handle their multi-value params below.
      const genres = genre.split(",").filter(Boolean);
      if (genres.length > 0) labels.push(genres.join(" · "));
    }
  }
  const rating = parsed.searchParams.get("rating");
  if (rating) {
    const ratings = rating.split(",").filter(Boolean);
    labels.push(
      ratings.length === 1
        ? `${ratings[0]}★`
        : `${ratings.join("/")}★`,
    );
  }
  const watchedYear = parsed.searchParams.get("watchedYear");
  if (watchedYear) {
    labels.push(watchedYear.split(",").filter(Boolean).join("/"));
  }
  if (parsed.searchParams.get("watchedWindow") === "12mo") {
    labels.push("Past 12mo");
  }
  const cardKind = parsed.searchParams.get("cardKind");
  if (cardKind === "show") labels.push("Shows");
  else if (cardKind === "season") labels.push("Seasons");
  return labels.length > 0 ? labels.join(" · ") : null;
}

/**
 * Compute filter-aware adjacent-show neighbors when the user
 * arrived via a card click. Replays the source listing's
 * predicates (parsed from the encoded `from` URL), dedupes the
 * resulting card list to unique shows in encounter order, and
 * returns the show immediately before / after the current one.
 *
 * Returns null when the `from` URL is missing, malformed, or
 * doesn't match a recognized listing pathname — caller falls
 * back to the snapshot's latestActivityDate ordering.
 *
 * Recognized source pathnames:
 *   • /television              → completed-card listing with
 *                                user's full filter+sort state
 *   • /television/watching     → in-progress card listing
 *                                (sorted by most recent episode
 *                                review)
 *   • /television/genre/<slug> → completed cards scoped to the
 *                                pinned genre + any user filters
 */
function findContextualNeighbors(
  currentShowId: string,
  fromParam: string | undefined,
): { newer: Show | null; older: Show | null } | null {
  if (!fromParam) return null;
  let url: URL;
  try {
    url = new URL(fromParam, "http://internal.local");
  } catch {
    return null;
  }
  const pathname = url.pathname;
  const sp: Record<string, string | string[] | undefined> =
    Object.fromEntries(url.searchParams.entries());
  const filters = parseShowFilters(sp);
  const sort = parseShowSort(sp);
  // Enriched corpus: the facet arm's predicates (actor/creator/network/…)
  // and the collection arm's membership read show.enrichment. The
  // pre-existing genre/reviews/watching arms don't read enrichment, so the
  // switch from getShows() is behaviour-neutral for them.
  const { shows, summary } = getShowsWithEnrichment();
  let orderedShows: Show[];
  if (pathname === "/television/watching") {
    const cards = buildInProgressCards(shows);
    cards.sort((a, b) => {
      const aDate = a.episodeReviews[0]?.reviewDate ?? "";
      const bDate = b.episodeReviews[0]?.reviewDate ?? "";
      return bDate.localeCompare(aDate);
    });
    orderedShows = uniqueShowsInOrder(cards.map((c: InProgressCardType) => c.show));
  } else if (pathname.startsWith("/television/genre/")) {
    const slug = pathname.slice("/television/genre/".length);
    const genre = findGenreBySlug(summary.genreDistribution, slug);
    if (!genre) return null;
    const allCards = buildCompletedCards(shows);
    const filteredCards = applyCompletedCardFilters(
      allCards,
      { ...filters, genres: [genre] },
      sort,
    );
    orderedShows = uniqueShowsInOrder(filteredCards.map((c: CompletedCard) => c.show));
  } else if (pathname.startsWith("/television/collections/")) {
    // WS7 collection leaf: walk the family in premiere order (matches the
    // leaf page; user filters/sort don't apply on a collection page).
    const slug = pathname.slice("/television/collections/".length);
    const routable = indexableTvCollections(shows);
    const name = findEntityBySlug(routable.map((c) => c.name), slug);
    const family = name ? routable.find((c) => c.name === name) : undefined;
    if (!family) return null;
    orderedShows = showsInTvFamily(shows, family.key).sort(tvCollectionMemberSort);
  } else if (pathname === "/television/reviews" || pathname === "/television") {
    // The corpus grid lives at /television/reviews now; the bare
    // "/television" arm is kept so any detail link shared before the
    // move (carrying ?from=/television) still resolves filter-aware
    // neighbors instead of silently falling back to default ordering.
    const allCards = buildCompletedCards(shows);
    const filteredCards = applyCompletedCardFilters(allCards, filters, sort);
    orderedShows = uniqueShowsInOrder(filteredCards.map((c: CompletedCard) => c.show));
  } else {
    // WS6b facet route: /television/<facet>/<slug>. Pin the facet value
    // (by name for network/type, else by slug — exactly as the facet route
    // does) and replay the user's other filters. Any unrecognized
    // two-segment path → null → chronological fallback.
    const facetMatch = pathname.match(/^\/television\/([^/]+)\/([^/]+)$/);
    const facet = facetMatch ? tvFacetForBasePath(facetMatch[1]) : null;
    if (!facet || !facetMatch) return null;
    const { pinKey, nameBased } = TV_FACET_PIN[facet];
    const pinValue = nameBased
      ? resolveTvFacet(facet, shows, facetMatch[2])?.name ?? null
      : facetMatch[2];
    if (pinValue === null) return null;
    const allCards = buildCompletedCards(shows);
    const filteredCards = applyCompletedCardFilters(
      allCards,
      { ...filters, [pinKey]: [pinValue] },
      sort,
    );
    orderedShows = uniqueShowsInOrder(filteredCards.map((c: CompletedCard) => c.show));
  }
  const idx = orderedShows.findIndex((s) => s.id === currentShowId);
  if (idx === -1) return null;
  return {
    newer: idx > 0 ? orderedShows[idx - 1] : null,
    older: idx + 1 < orderedShows.length ? orderedShows[idx + 1] : null,
  };
}

/**
 * Dedupe a Show[] keeping only the first occurrence of each
 * unique show id. Card lists carry the same show multiple times
 * (a show with both a Show review and Season reviews surfaces as
 * multiple cards on the listing); for prev/next navigation we
 * want one card per show in their listing-encounter order.
 */
function uniqueShowsInOrder(shows: Show[]): Show[] {
  const seen = new Set<string>();
  const out: Show[] = [];
  for (const s of shows) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

// ─── JSON-LD ─────────────────────────────────────────────────────

/**
 * Build the page-level JSON-LD payload.
 *
 *   • TVSeries — the show entity, with TMDB sameAs for entity-link
 *     consolidation. genre + datePublished + image populated when
 *     TMDB enrichment is present.
 *   • Review (per Show-level review) — itemReviewed = TVSeries.
 *   • Review (per Season-level review) — itemReviewed = TVSeason
 *     (referenced by partOfSeries; the season entity isn't
 *     standalone-emitted to keep the @graph compact).
 *   • BreadcrumbList — Television > {Show name}.
 *
 * Episode-level Review entities are intentionally NOT emitted —
 * adds bytes (potentially hundreds per show) without earning
 * matching SERP rich-result eligibility at this catalog's scale.
 * Add later if AI-search retrievers start citing per-episode
 * notes specifically.
 */
function buildPageJsonLd(show: Show) {
  const detailUrl = `${SITE_URL}/television/${show.slug}`;
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Television",
        item: `${SITE_URL}/television`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${show.name} (${show.premiereYear})`,
        item: detailUrl,
      },
    ],
  };
  const tvSeries: Record<string, unknown> = {
    "@type": "TVSeries",
    "@id": `${detailUrl}#tvseries`,
    name: show.name,
    url: detailUrl,
    // Description + author tie the entity to Malcolm's Person graph
    // and give AI-search retrievers a coherent show summary. The
    // description fallback mirrors what generateMetadata uses as
    // its safe default — same phrasing, no truncation needed since
    // JSON-LD has no length cap.
    description: `Reviews of ${show.name} (${show.premiereYear}) by Malcolm Xavier across show, season, and episode levels.`,
    author: {
      "@type": "Person",
      name: "Malcolm Xavier",
      "@id": `${SITE_URL}/#person`,
    },
    ...(show.premiereDate ? { datePublished: show.premiereDate } : {}),
    ...(show.tmdb?.posterPath
      ? { image: `https://image.tmdb.org/t/p/w780${show.tmdb.posterPath}` }
      : {}),
    ...(show.tmdb?.id
      ? { sameAs: `https://www.themoviedb.org/tv/${show.tmdb.id}` }
      : {}),
    ...(show.tmdb?.genres && show.tmdb.genres.length > 0
      ? { genre: show.tmdb.genres }
      : {}),
    ...(show.tmdb?.numberOfSeasons
      ? { numberOfSeasons: show.tmdb.numberOfSeasons }
      : {}),
    ...(show.tmdb?.numberOfEpisodes
      ? { numberOfEpisodes: show.tmdb.numberOfEpisodes }
      : {}),
  };

  const reviewBlocks: Record<string, unknown>[] = [];
  for (const review of show.reviews) {
    if (review.level === "episode") continue; // see comment above
    if (review.reviewText.trim() === "") continue;
    // Google's Review snippet validator requires itemReviewed to
    // carry an explicit @type AND name (NOT just an @id reference
    // into the @graph — even though schema.org allows that, the
    // validator flags it as invalid). Make both Show-level and
    // Season-level entities self-contained: @type + name + url
    // + the structural fields. Caught by Rich Results Test on
    // 2026-05-07; previous shape rendered "3 invalid items
    // detected" against Abbott Elementary's three Season-level
    // prose reviews.
    const itemReviewed: Record<string, unknown> =
      review.level === "show"
        ? {
            "@type": "TVSeries",
            "@id": `${detailUrl}#tvseries`,
            name: show.name,
            url: detailUrl,
          }
        : (() => {
            // Cache the result so the JSON-LD builder makes one
            // pass over show.seasons per Season-level review
            // instead of two (the prior shape called it twice —
            // once for the truthy check, once for the value).
            const sn = seasonNumberForReview(show, review);
            const seasonName =
              sn !== null
                ? `${show.name}: Season ${sn}`
                : `${show.name}: Season`;
            const seasonUrl =
              sn !== null
                ? `${detailUrl}#season-${sn}`
                : detailUrl;
            return {
              "@type": "TVSeason",
              name: seasonName,
              url: seasonUrl,
              partOfSeries: {
                "@type": "TVSeries",
                "@id": `${detailUrl}#tvseries`,
                name: show.name,
              },
              ...(sn !== null ? { seasonNumber: sn } : {}),
            };
          })();
    reviewBlocks.push({
      "@type": "Review",
      itemReviewed,
      ...(review.rating !== null
        ? {
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 0.5,
            },
          }
        : {}),
      author: {
        "@type": "Person",
        name: "Malcolm Xavier",
        "@id": `${SITE_URL}/#person`,
      },
      datePublished: review.reviewDate,
      reviewBody: review.reviewText,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [tvSeries, ...reviewBlocks, breadcrumb],
  };
}

// ─── Inline styles ────────────────────────────────────────────────

const metadataLineStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-sm-font-size)",
  lineHeight: "var(--p-sm-line-height)",
  letterSpacing: "0.02em",
  color: "var(--text-caption)",
  margin: 0,
};

const proseParagraphStyle: React.CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: "var(--p-md-font-size)",
  lineHeight: "var(--p-md-line-height)",
  color: "var(--text-body)",
  margin: 0,
  marginBottom: "var(--scale-400)",
};

// Genre chip — small mono pill that renders in muted caption color
// at rest, with .show-detail-genre-chip class providing the blue
// hover/focus color via components.css. Same shape as /films but
// the cluster's blue rather than orange.
const genreChipStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  // var(--p-xs-font-size) (12px) keeps the chip inside the type
  // scale — the prior fontSize: 11 sat below the --p-xs floor
  // and was 1px smaller than the matching Films chip. Lifted in
  // the 2026-05-07 re-review along with the Films chip parity fix.
  fontSize: "var(--p-xs-font-size)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  // 6×10 padding keeps the chip pill-shaped while clearing the
  // 24px SC 2.5.8 target-size floor (was 4×10 → ~21px tall).
  padding: "6px 10px",
  border: "1px solid var(--border-default)",
  borderRadius: 999,
};
