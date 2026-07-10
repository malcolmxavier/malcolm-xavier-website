// ─────────────────────────────────────────────────────────────────
// Review-card share image generator (the one bespoke image treatment
// in the share upgrade).
//
// Unlike app/opengraph-image.tsx and the case-study cards — which are
// link-unfurl OG images referenced from <head> — these are
// DOWNLOADABLE / native-shareable image assets. A reader shares a
// specific take from the share controls; this card is the accompanying
// image they can drop into an Instagram Story, a group chat, or a
// tweet.
//
// Two formats:
//   • landscape — 1200×630, the universal social-card ratio (X, feed
//     posts, iMessage). Poster sits left, review copy right.
//   • story     — 1080×1920, the 9:16 Instagram / TikTok Story canvas.
//     Poster stacked over the copy, with generous top/bottom margins
//     so the content sits clear of the Story UI overlays (profile row
//     at the top, reply bar at the bottom).
//
// Chrome + overlap rule: the card carries a branded MASTHEAD across the
// top — a sub-brand accent border under the site wordmark + review
// kicker — instead of a bottom-corner watermark. That keeps the source
// mark clear of the review copy no matter how long the copy runs, and
// keeps it out of the Story bottom overlay. Everything below the
// masthead is laid out in normal flex flow (no absolutely-positioned
// elements), so review text structurally cannot overlap the chrome;
// the excerpt is additionally truncated to a per-format budget so a
// long review can't push the copy into the Story reply-bar zone.
//
// IP note (TMDB): the poster is third-party art embedded in a
// downloadable image. Per the share plan's IP call, there is NO
// per-card TMDB attribution — matching Letterboxd, which credits TMDB
// at the site level (see the footer), not per card.
//
// Why hex literals (not CSS vars): Satori (the renderer behind
// next/og) doesn't resolve CSS custom properties. The values below
// mirror the canonical --{color}-* swatches in app/globals.css; if a
// swatch changes there, update this file by hand alongside the other
// OG generators.
// ─────────────────────────────────────────────────────────────────

import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og/load-google-font";

export type ReviewCardFormat = "landscape" | "story";
export type ReviewCardSubBrand = "film" | "tv";

export type ReviewCardInput = {
  /** Aspect/canvas to render. */
  format: ReviewCardFormat;
  /** Drives the accent color + default kicker. */
  subBrand: ReviewCardSubBrand;
  /** Work title (e.g. "The Substance"). */
  title: string;
  /** Release / premiere year, rendered beside the title. */
  year: string | number | null;
  /** 0.5–5.0 in 0.5 steps, or null when unrated. */
  rating: number | null;
  /** Review prose — truncated to a card-appropriate length here. */
  excerpt: string;
  /** Absolute TMDB poster URL, or null (renders a text-only card). */
  posterUrl: string | null;
  /** Optional level label for TV ("Season 2", "Season 2, Episode 3").
   *  Omitted on film and whole-show cards. */
  contextLabel?: string;
};

// Canvas dimensions per format.
const DIMENSIONS: Record<ReviewCardFormat, { width: number; height: number }> =
  {
    landscape: { width: 1200, height: 630 },
    story: { width: 1080, height: 1920 },
  };

// Sub-brand accent — the masthead border, the accent dot, and any
// prominent brand cue use this. Chosen for legibility on the black
// canvas: film uses orange-500 (reads well on black); TV is LIFTED to
// blue-300 because the canonical blue-500 (#0d1dcd) is near-invisible
// as a line/border on black. Both still read as the cluster's color.
const ACCENT_HEX: Record<ReviewCardSubBrand, string> = {
  film: "#ef941e", // orange-500
  tv: "#6e78e1", // blue-300 (lifted from blue-500 for on-black contrast)
};

// Rating star colors. The site renders rating stars in green
// (.star-rating-fill → --green-400 on dark surfaces), independent of
// sub-brand — so the card matches on-site rating semantics rather than
// the cluster accent. green-400 reads cleanly on the black canvas.
// Empty/half-star ghost slots use the muted neutral (matching the year
// grey elsewhere on the card) so the unfilled scale reads as backdrop.
const STAR_HEX = "#3dfd53"; // green-400 — filled
const STAR_EMPTY_HEX = "#737373"; // neutral — unfilled ghost

// Per-format excerpt budgets (characters). Deliberately conservative:
// the copy must fit ABOVE the Story reply-bar overlay on the tall
// canvas, and must not out-run the poster height on the landscape one.
const EXCERPT_BUDGET: Record<ReviewCardFormat, number> = {
  landscape: 210,
  story: 200,
};

/**
 * Trim review prose to a card budget without cutting mid-word.
 *
 * Strips the inline HTML markup Letterboxd preserves in the review
 * text (currently just `<i>…</i>` for italics) — the on-page renderer
 * turns those into <em> nodes, but this card is flat text, so the raw
 * tags would otherwise render literally ("<i>Jurassic Park</i>").
 * Then collapses whitespace (review text carries paragraph breaks),
 * backs off to the last space before the budget, and appends an
 * ellipsis. Returns the whole string when it already fits.
 */
function truncateExcerpt(text: string, budget: number): string {
  const stripped = text.replace(/<\/?[a-z][^>]*>/gi, "");
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  if (collapsed.length <= budget) return collapsed;
  const clipped = collapsed.slice(0, budget);
  const lastSpace = clipped.lastIndexOf(" ");
  // Guard against a budget that lands inside a single very long token
  // (no space to back off to) — fall back to the hard clip in that case.
  const base = lastSpace > budget * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}

// Shared 5-point star path (viewBox 0–24), rendered filled or outlined.
const STAR_PATH =
  "M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.402 8.174L12 18.896l-7.336 3.868 1.402-8.174L.132 9.21l8.2-1.192z";

/** A solid star in the given color. */
function SolidStar({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/** An outlined (unfilled) star in the given color. */
function OutlineStar({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

/** A left-half-filled star: a muted outline with the solid green fill
 *  clipped to the left half via an overflow-hidden overlay — the same
 *  technique the on-site StarRating uses, and one Satori supports. */
function HalfStar({ size }: { size: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex" }}>
      <div style={{ position: "absolute", top: 0, left: 0, display: "flex" }}>
        <OutlineStar size={size} color={STAR_EMPTY_HEX} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size / 2,
          height: size,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <SolidStar size={size} color={STAR_HEX} />
      </div>
    </div>
  );
}

/**
 * The full 5-slot rating strip, half-step, matching the on-site
 * StarRating: full slots solid green, a half slot left-filled, empty
 * slots muted outlines. Shows all five slots (the scale reference) so a
 * viewer who meets the card out of context — dropped into a Story or a
 * group chat — reads "3.5 out of 5" from the shape alone, no number
 * needed.
 */
function StarStrip({
  rating,
  size,
  gap,
}: {
  rating: number;
  size: number;
  gap: number;
}) {
  // Clamp to [0, 5] in 0.5 steps so a stray decimal renders cleanly.
  const clamped = Math.min(5, Math.max(0, Math.round(rating * 2) / 2));
  const slots = [1, 2, 3, 4, 5].map((slot) =>
    clamped >= slot ? "full" : clamped >= slot - 0.5 ? "half" : "empty",
  );
  return (
    <div style={{ display: "flex", gap }}>
      {slots.map((state, i) =>
        state === "full" ? (
          <SolidStar key={`slot-${i + 1}`} size={size} color={STAR_HEX} />
        ) : state === "half" ? (
          <HalfStar key={`slot-${i + 1}`} size={size} />
        ) : (
          <OutlineStar key={`slot-${i + 1}`} size={size} color={STAR_EMPTY_HEX} />
        ),
      )}
    </div>
  );
}

/**
 * Render a downloadable review card as an ImageResponse.
 *
 * Callers (the film + TV `review-image` route handlers) resolve the
 * review from their own snapshot, then hand the display fields here.
 * All layout, typography, and font loading lives in this one place so
 * the two clusters can't drift apart.
 */
export async function renderReviewCard(
  input: ReviewCardInput,
): Promise<ImageResponse> {
  const { format, subBrand, title, year, rating, posterUrl, contextLabel } =
    input;
  const size = DIMENSIONS[format];
  const isStory = format === "story";
  const accent = ACCENT_HEX[subBrand];

  const baseKicker = subBrand === "film" ? "FILM REVIEW" : "TV REVIEW";
  const kicker = contextLabel
    ? `${baseKicker} · ${contextLabel.toUpperCase()}`
    : baseKicker;
  const excerpt = truncateExcerpt(input.excerpt, EXCERPT_BUDGET[format]);
  const yearText = year !== null && year !== "" ? String(year) : "";
  // The rating renders as the 5-slot star strip (see StarStrip) — the
  // same visual language as the on-site StarRating — so no numeric
  // string is drawn on the card.
  const wordmark = "malxavi.com";

  // Subset each font to exactly the glyphs it renders (keeps the
  // build-time download tiny — see loadGoogleFont). Every string that
  // appears in a given family MUST be included, or its glyphs render
  // blank.
  const serifText = title;
  const sansText = `${excerpt}${yearText}`;
  const monoText = `${kicker}${wordmark}`;

  const [instrumentSerif, dmSans, robotoMono] = await Promise.all([
    loadGoogleFont("Instrument+Serif", serifText),
    loadGoogleFont("DM+Sans", sansText),
    loadGoogleFont("Roboto+Mono", monoText),
  ]);

  // Poster dimensions per format (2:3, the canonical poster ratio).
  // The story poster is sized down from a full-bleed hero so the copy
  // block still clears the bottom safe margin.
  const poster = isStory
    ? { width: 560, height: 840 }
    : { width: 300, height: 450 };

  // ─── Masthead — the branded top border (source identity). ───────
  const masthead = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        padding: isStory ? "0 80px 28px" : "0 72px 20px",
        // The "branded border": a sub-brand accent rule spanning the
        // full width beneath the wordmark + kicker.
        borderBottom: `3px solid ${accent}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Accent dot — the compact brand mark, echoing the OG card's
            sub-brand dot band. */}
        <span
          style={{
            width: isStory ? 18 : 15,
            height: isStory ? 18 : 15,
            borderRadius: "50%",
            background: accent,
            display: "flex",
          }}
        />
        <span
          style={{
            fontFamily: "Roboto Mono",
            fontSize: isStory ? 34 : 26,
            letterSpacing: "0.02em",
            color: "#e5e5e5",
            display: "flex",
          }}
        >
          {wordmark}
        </span>
      </div>
      <span
        style={{
          fontFamily: "Roboto Mono",
          fontSize: isStory ? 26 : 21,
          letterSpacing: "0.16em",
          color: "#a3a3a3",
          display: "flex",
        }}
      >
        {kicker}
      </span>
    </div>
  );

  const titleBlock = (
    <div
      style={{
        display: "flex",
        // Wrap the title + year as inline-ish flow: a long title fills
        // the width and wraps internally, and the muted year drops to
        // the next line rather than overflowing the right edge (Satori
        // lays flex children in a row otherwise). baseline keeps the
        // year aligned to the title when they share a line.
        flexWrap: "wrap",
        alignItems: "baseline",
        fontFamily: "Instrument Serif",
        fontSize: isStory ? 88 : 62,
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        color: "#ffffff",
      }}
    >
      {title}
      {yearText ? (
        <span style={{ color: "#737373" }}>&nbsp;({yearText})</span>
      ) : null}
    </div>
  );

  const ratingRow =
    rating !== null ? (
      <StarStrip rating={rating} size={isStory ? 46 : 34} gap={isStory ? 7 : 5} />
    ) : null;

  const excerptBlock = (
    <div
      style={{
        display: "flex",
        fontFamily: "DM Sans",
        fontSize: isStory ? 38 : 29,
        lineHeight: 1.4,
        fontWeight: 400,
        color: "#d4d4d4",
      }}
    >
      {excerpt}
    </div>
  );

  const posterBox = posterUrl ? (
    <div
      style={{
        width: poster.width,
        height: poster.height,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexShrink: 0,
        // Faint frame so a light poster edge doesn't bleed into the
        // black canvas.
        border: "1px solid #262626",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori
          renders <img>, not next/image, inside ImageResponse. */}
      <img
        src={posterUrl}
        alt=""
        width={poster.width}
        height={poster.height}
        style={{ objectFit: "cover" }}
      />
    </div>
  ) : null;

  const canvas = isStory ? (
    // ─── Story (1080×1920) — masthead, then poster stacked over copy.
    //     Top padding clears the Story profile row; the body's bottom
    //     padding (300px) reserves the reply-bar safe zone so copy
    //     never lands under it. ──────────────────────────────────────
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        paddingTop: 96,
        fontFamily: "DM Sans",
      }}
    >
      {masthead}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "72px 80px 300px",
          gap: 56,
        }}
      >
        {posterBox}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: "100%",
          }}
        >
          {titleBlock}
          {ratingRow}
          {excerptBlock}
        </div>
      </div>
    </div>
  ) : (
    // ─── Landscape (1200×630) — masthead, then poster left, copy right.
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        paddingTop: 44,
        fontFamily: "DM Sans",
      }}
    >
      {masthead}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          padding: "36px 72px",
          gap: 52,
        }}
      >
        {posterBox}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            flex: 1,
          }}
        >
          {titleBlock}
          {ratingRow}
          {excerptBlock}
        </div>
      </div>
    </div>
  );

  return new ImageResponse(canvas, {
    ...size,
    fonts: [
      { name: "Instrument Serif", data: instrumentSerif, style: "normal", weight: 400 },
      { name: "DM Sans", data: dmSans, style: "normal", weight: 400 },
      { name: "Roboto Mono", data: robotoMono, style: "normal", weight: 400 },
    ],
    // The card is a pure function of the snapshot, which only changes
    // on a manual/cron refresh — so it's safe to cache hard at the
    // edge and revalidate in the background. Spares every share tap a
    // fresh Satori render + Google Font fetch.
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
