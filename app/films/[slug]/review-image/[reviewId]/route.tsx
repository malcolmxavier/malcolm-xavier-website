// ─────────────────────────────────────────────────────────────────
// /films/[slug]/review-image/[reviewId] — downloadable review card.
//
// Renders a single film review as a shareable image (see
// lib/og/review-card.tsx for the design + the two formats). This is a
// route handler, NOT an opengraph-image.tsx: the image isn't a
// link-unfurl preview (a review shares the detail page's URL, which
// already has its own og:image) — it's an asset the reader downloads
// or drops into an Instagram Story via the per-review "share this
// take" control.
//
// Keying: `reviewId` is the review's index into `film.reviews`, which
// is exactly the `#review-N` anchor the detail page renders and the
// share control deep-links to — so the image URL and the anchor stay
// in lockstep with no separate id scheme.
//
// Query: `?format=story` → 1080×1920 (9:16 Story canvas); anything
// else (default) → 1200×630 landscape.
//
// Snapshot-only: getFilmBySlug reads the bundled fixture, so there is
// no live API call at request time (matches the detail page).
// ─────────────────────────────────────────────────────────────────

import { getFilmBySlug } from "@/lib/feeds/letterboxd";
import {
  renderReviewCard,
  type ReviewCardFormat,
} from "@/lib/og/review-card";

type Params = { slug: string; reviewId: string };

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { slug, reviewId } = await params;
  const film = getFilmBySlug(slug);
  if (!film) {
    return new Response("Film not found", { status: 404 });
  }

  // reviewId is the numeric index into the pre-sorted reviews array
  // (the same index the #review-N anchor uses). Reject anything that
  // isn't a valid, in-range integer rather than coercing silently.
  const index = Number(reviewId);
  const review =
    Number.isInteger(index) && index >= 0 ? film.reviews[index] : undefined;
  if (!review) {
    return new Response("Review not found", { status: 404 });
  }

  // Landscape is the default; only an explicit ?format=story switches
  // to the 9:16 canvas.
  const format: ReviewCardFormat =
    new URL(request.url).searchParams.get("format") === "story"
      ? "story"
      : "landscape";

  // Bump the stored w342 poster to w500 for a crisper card; the card
  // renders the poster at 2–3× that footprint. Falls back to the TMDB
  // path, then to a text-only card when no art exists.
  const posterUrl =
    film.posterUrl?.replace("/t/p/w342/", "/t/p/w500/") ??
    (film.tmdb?.posterPath
      ? `https://image.tmdb.org/t/p/w500${film.tmdb.posterPath}`
      : null);

  return renderReviewCard({
    format,
    subBrand: "film",
    title: film.title,
    year: film.releaseYear,
    rating: review.rating,
    excerpt: review.reviewText,
    posterUrl,
  });
}
