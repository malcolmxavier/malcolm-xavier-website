// ─────────────────────────────────────────────────────────────────
// TmdbAttribution — TMDB credit shown in the footer on /films and
// /films/[slug]. TMDB's API ToS requires visible attribution on
// any surface using their data; we render it inline with the
// © dateline rather than scattering it on every page.
//
// Client component (uses usePathname) so the footer itself can
// stay server-rendered. Returns null on non-films routes.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

export function TmdbAttribution() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/films")) return null;

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
      Film metadata{" "}
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
