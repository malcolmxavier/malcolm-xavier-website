// ─────────────────────────────────────────────────────────────────
// TmdbAttribution — TMDB credit shown in the footer on every
// review surface that consumes TMDB metadata. /films pulls poster,
// genre, runtime, director; /tv (Serializd-backed) will pull the
// same when it ships.
//
// TMDB's API ToS requires visible attribution on any surface using
// their data; we render it inline with the © dateline rather than
// scattering it on every page.
//
// Route matching reuses CRITIC_ROUTE_PREFIXES from CriticDisclaimer
// so the two route sets can never drift — adding /tv there
// automatically opts it in to TMDB attribution here too.
//
// Client component (uses usePathname) so the footer itself can
// stay server-rendered. Returns null on non-review routes.
// ─────────────────────────────────────────────────────────────────

"use client";

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

  return (
    <p
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        lineHeight: "var(--p-xs-line-height)",
        color: "var(--text-caption)",
        letterSpacing: "0.04em",
        margin: 0,
      }}
    >
      {label}{" "}
      <NextLink
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "inherit",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
        }}
      >
        powered by TMDB ↗
      </NextLink>
      . This site is not endorsed or certified by TMDB.
    </p>
  );
}

function labelFor(pathname: string | null): string {
  if (pathname?.startsWith("/films")) return "Film metadata";
  if (pathname?.startsWith("/tv")) return "TV metadata";
  return "Metadata";
}
