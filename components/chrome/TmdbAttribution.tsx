// ─────────────────────────────────────────────────────────────────
// TmdbAttribution — TMDB credit shown in the footer on every
// review surface that consumes TMDB metadata. /films pulls poster,
// genre, runtime, director; /tv (Serializd-backed) will pull the
// same when it ships.
//
// TMDB's API ToS (themoviedb.org/api-terms-of-use) requires:
//   1. The TMDB logo identifying our use of TMDB / TMDB APIs / TMDB
//      Content (rendered as an SVG in /public/images/tmdb-logo.svg).
//   2. The logo must be less prominent than our own marks — kept
//      small (height: 14px) and tucked into the footer chrome,
//      below the editorial CriticDisclaimer.
//   3. The exact disclaimer notice must appear prominently:
//      "This website uses TMDB and the TMDB APIs but is not
//      endorsed, certified, or otherwise approved by TMDB."
//
// Route matching reuses CRITIC_ROUTE_PREFIXES from CriticDisclaimer
// so the two route sets can never drift — adding /tv there
// automatically opts it in to TMDB attribution here too.
//
// Client component (uses usePathname) so the footer itself can
// stay server-rendered. Returns null on non-review routes.
// ─────────────────────────────────────────────────────────────────

"use client";

import Image from "next/image";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { isCriticRoute } from "./CriticDisclaimer";

export function TmdbAttribution() {
  const pathname = usePathname();
  if (!isCriticRoute(pathname)) return null;

  // Route-aware leading noun — "Film metadata" on /films, "TV
  // metadata" on /tv. Falls back to "Metadata" for any future
  // review surface added to CRITIC_ROUTE_PREFIXES that doesn't
  // map cleanly. Specificity is small, but it keeps the credit
  // from saying "Film metadata" on a TV page and vice versa.
  const label = labelFor(pathname);

  // Single-paragraph layout: route-aware label, logo+arrow link,
  // mid-dot separator, then the verbatim ToS disclaimer. Renders
  // as one continuous caption that wraps naturally inside its
  // column (right-aligned on tablet+, left-aligned on mobile).
  // text-wrap: balance keeps the wrap visually even when the
  // disclaimer breaks across two lines on narrower viewports.
  return (
    <p style={{ ...captionStyle, textWrap: "balance" }}>
      {label} via{" "}
      <NextLink
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="The Movie Database (opens in a new tab)"
        style={{
          color: "inherit",
          textDecoration: "none",
          // Align the logo image with the text baseline so the
          // mark sits inline like a wordmark instead of floating
          // above or below the surrounding caption.
          verticalAlign: "middle",
        }}
      >
        <Image
          src="/images/tmdb-logo.svg"
          alt="The Movie Database"
          width={108}
          height={14}
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            // Slight margin so the logo doesn't kiss the
            // surrounding text on either side.
            marginInline: 4,
          }}
          // SVG asset — Next.js shouldn't try to optimize it
          // (the optimizer treats SVGs as opaque and can break
          // gradients/embedded styles).
          unoptimized
        />
        <span style={{ verticalAlign: "middle" }}>↗</span>
      </NextLink>
      {" · "}
      {/* The disclaimer wording below is mandated verbatim by
          TMDB's API ToS — do not paraphrase or trim. */}
      This website uses TMDB and the TMDB APIs but is not
      endorsed, certified, or otherwise approved by TMDB.
    </p>
  );
}

function labelFor(pathname: string | null): string {
  if (pathname?.startsWith("/films")) return "Film metadata";
  if (pathname?.startsWith("/tv")) return "TV metadata";
  return "Metadata";
}

// Shared caption styling for both lines. Mono caption matches the
// rest of the footer chrome (© dateline, "Stay in touch" labels,
// etc.) so the TMDB block reads as utility chrome rather than
// editorial voice.
const captionStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: "var(--p-xs-line-height)",
  color: "var(--text-caption)",
  letterSpacing: "0.04em",
  margin: 0,
} as const;
