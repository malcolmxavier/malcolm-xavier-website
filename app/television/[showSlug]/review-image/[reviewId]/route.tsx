// ─────────────────────────────────────────────────────────────────
// /television/[showSlug]/review-image/[reviewId] — downloadable
// review card for a TV take. The TV counterpart to the film
// review-image route; see that file and lib/og/review-card.tsx for
// the full rationale (downloadable asset, not a link-unfurl OG image).
//
// Keying: `reviewId` is the index into the flat, pre-sorted
// `show.reviews` array. The detail page anchors reviews per level
// (#show-review-0, #season-2-review, …) rather than by flat index, so
// unlike the film route this index is NOT the on-page anchor — the
// share control passes it explicitly. A flat index still gives every
// review (show / season / episode) one stable, addressable card.
//
// The card is level-aware: a season or episode review gets a "Season 2"
// / "Season 2, Episode 3" context label (via formatLevelLabel) and,
// where TMDB has one, the season's own poster instead of the show
// poster — so a shared season take reads as that season, not the show
// at large.
// ─────────────────────────────────────────────────────────────────

import { getShowBySlug } from "@/lib/feeds/serializd";
import {
  formatLevelLabel,
  resolveSeasonPosterUrl,
  seasonNumberForReview,
} from "@/lib/feeds/serializd-utils";
import {
  renderReviewCard,
  type ReviewCardFormat,
} from "@/lib/og/review-card";

type Params = { showSlug: string; reviewId: string };

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { showSlug, reviewId } = await params;
  const show = getShowBySlug(showSlug);
  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const index = Number(reviewId);
  const review =
    Number.isInteger(index) && index >= 0 ? show.reviews[index] : undefined;
  if (!review) {
    return new Response("Review not found", { status: 404 });
  }

  const format: ReviewCardFormat =
    new URL(request.url).searchParams.get("format") === "story"
      ? "story"
      : "landscape";

  // Level context: a whole-show review carries no label; season /
  // episode reviews get "Season N" / "Season N, Episode M".
  const seasonNumber = seasonNumberForReview(show, review);
  const levelLabel = formatLevelLabel(review, seasonNumber);

  // Poster: prefer the reviewed season's own art for season/episode
  // takes, so the card reads as that season; fall back to the show
  // poster. Bump the stored w342 art to w500 for a crisper card.
  const seasonPoster =
    review.level !== "show" && seasonNumber !== null
      ? resolveSeasonPosterUrl(show, seasonNumber)
      : null;
  const posterUrl = (seasonPoster ?? show.posterUrl)?.replace(
    "/t/p/w342",
    "/t/p/w500",
  ) ?? null;

  return renderReviewCard({
    format,
    subBrand: "tv",
    title: show.name,
    year: show.premiereYear,
    rating: review.rating,
    excerpt: review.reviewText,
    posterUrl,
    contextLabel: levelLabel || undefined,
  });
}
