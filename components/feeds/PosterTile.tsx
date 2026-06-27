// ─────────────────────────────────────────────────────────────────
// PosterTile — a single 2:3 poster card for the editorial landings'
// "Now" and "Favorites" modules.
//
// Decoupled from the grid's FilmCard/ShowCard (which are bound to the
// AppliedFilm / CompletedCard shapes + the grid's back-nav markers).
// This takes plain primitives so it can render a corpus film, a TV
// show, or an out-of-corpus favorite (which has only a slug, title,
// year, and a TMDB poster) uniformly.
//
// Link target is internal (NextLink → a detail page) or external
// (a real <a> → the source platform, marked with the ↗ convention)
// depending on `external`. Corpus entries link to their on-site detail
// page. When `href` is omitted the tile renders display-only (a plain
// non-interactive block) — used on the landings for out-of-corpus
// favorites, which have no on-site page and (per the no-off-site-leak
// rule) no longer link out to Letterboxd / Serializd either.
//
// Poster + aspect handling mirrors FilmCard exactly so tiles read as
// siblings of the grid cards. No "use client" — pure presentational.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import NextLink from "next/link";
import type { CSSProperties } from "react";
import { Stack } from "@/components/layout/Stack";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { StarRating } from "@/components/primitives/StarRating";

export function PosterTile({
  href,
  external = false,
  originHref,
  posterUrl,
  title,
  subtitle,
  rating = null,
  rank = null,
  // Default sizes for a ~4-up (desktop) / 2-up (mobile) row. Override
  // if the consuming grid uses a different column count.
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 18vw",
}: {
  /** On-site detail route. Omit to render a non-interactive,
   *  display-only tile (out-of-corpus favorites with no on-site page). */
  href?: string;
  /** External (platform) link vs internal detail route. Ignored when
   *  `href` is omitted. */
  external?: boolean;
  /** Source-listing URL (e.g. "/films/collections/john-wick"). When set on
   *  an internal tile, the detail href gains `?ref=internal&from=<encoded>`
   *  so the detail page replays this listing for adjacent-title nav + the
   *  back-link. Opt-in (collection leaves); ignored for external/display
   *  tiles. */
  originHref?: string;
  posterUrl: string | null;
  title: string;
  /** Secondary line — year, or "year · dir. X". The ↗ external marker
   *  is appended here automatically when `external`. */
  subtitle?: string;
  /** Optional star rating (corpus entries); null hides the row. */
  rating?: number | null;
  /** Optional 1-based rank, for ranked lists. Renders a corner badge on
   *  the poster (decorative) plus an sr-only "Ranked #N" prefix on the
   *  title so the order is conveyed without prefixing the visible title. */
  rank?: number | null;
  sizes?: string;
}) {
  const inner = (
    <Stack gap="300" className="h-full">
      {/* Poster — 2:3, CSS aspect-ratio so card height is set before
          the image loads (no layout shift). Matches FilmCard. */}
      <div
        className="relative w-full overflow-hidden rounded-md"
        style={{
          aspectRatio: "2 / 3",
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
        }}
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt="" /* decorative — the title is adjacent in the body */
            fill
            sizes={sizes}
            style={{ objectFit: "cover" }}
            placeholder="empty"
          />
        ) : (
          // Rare poster-less entry — render the title in mono so the
          // tile still reads as "a title," matching FilmCard's fallback.
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            style={placeholderStyle}
            aria-hidden="true"
          >
            {title}
          </div>
        )}
        {/* Rank badge — a corner chip for ranked lists. Decorative: the
            rank is announced via the sr-only prefix on the title below, so
            this is aria-hidden to avoid a double read. */}
        {rank != null ? (
          <span style={rankBadgeStyle} aria-hidden="true">
            {rank}
          </span>
        ) : null}
      </div>
      <Stack gap="100">
        <Headline
          level={3}
          className="line-clamp-2"
          style={{
            fontSize: "var(--p-md-font-size)",
            lineHeight: "var(--p-md-line-height)",
          }}
        >
          {/* sr-only rank prefix so AT hears "Ranked #1: Hacks" while the
              visible title stays clean (the rank shows as the poster badge). */}
          {rank != null ? (
            <span className="sr-only">Ranked #{rank}: </span>
          ) : null}
          {title}
        </Headline>
        {subtitle || external ? (
          <Kicker>
            {subtitle}
            {external ? `${subtitle ? " " : ""}↗` : ""}
          </Kicker>
        ) : null}
        {rating !== null ? <StarRating rating={rating} size={14} /> : null}
      </Stack>
    </Stack>
  );

  const className =
    "block h-full focus-visible:outline-2 focus-visible:outline-offset-4";
  const style: CSSProperties = {
    textDecoration: "none",
    outlineColor: "var(--border-focus)",
  };

  // No href → display-only tile: a plain block with no link semantics,
  // no focus ring (nothing to focus). External links open in a new tab
  // with the usual security rel; the ↗ in the subtitle is the visible
  // cue. Internal links use NextLink for prefetch + client nav.
  if (!href) {
    return <div className="block h-full">{inner}</div>;
  }
  // Internal tiles with an originHref carry the back-nav marker + the
  // encoded source listing, so the detail page can replay it (filter-aware
  // neighbours + the return back-link). External tiles never do.
  const internalHref =
    !external && originHref
      ? `${href}${href.includes("?") ? "&" : "?"}ref=internal&from=${encodeURIComponent(originHref)}`
      : href;
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {inner}
    </a>
  ) : (
    <NextLink href={internalHref} className={className} style={style}>
      {inner}
    </NextLink>
  );
}

const placeholderStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  letterSpacing: "0.04em",
  color: "var(--text-caption)",
  textAlign: "center",
};

// Rank chip pinned to the poster's top-left. High-contrast dark plate with
// white numerals (a fixed dark surface, not a theme token, so it holds its
// contrast over any poster art in both light and dark mode). Mono numerals
// match the cluster's numeric voice.
const rankBadgeStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  left: 6,
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  background: "rgba(17, 17, 17, 0.86)",
  color: "#ffffff",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: "0.02em",
};
