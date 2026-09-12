// ─────────────────────────────────────────────────────────────────
// Container — the site's content well. One width, everywhere.
//
// There used to be three sizes (42rem / 64rem / 80rem). 38 of the 44
// call sites asked for the widest, six asked for the middle one, and
// nothing ever asked for the narrow one — so what the prop actually
// bought was a way for a page to land its left edge somewhere the
// page beside it did not, which is what it did. The size map is gone
// and so is the prop: the header, the footer, and every page now line
// up against the same rail.
//
// A page that needs a narrower *measure* — a reading column, where the
// constraint is line length rather than page geometry — narrows inside
// this, the way /booth and /resume already do. That is a different
// thing from the well itself and belongs to the page, not here.
//
// The width is `--container-page`, declared in scripts/build-tokens.mjs
// and reachable as `max-w-page` from any className on the site.
//
// Includes responsive horizontal padding so content never butts the
// viewport edge on mobile.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({
  className = "",
  children,
  ...rest
}: ContainerProps) {
  return (
    <div
      // Mobile: 24px padding. Tablet+: 40px. Desktop+: 64px.
      // Centered with mx-auto; max-w-page is the declared content width.
      className={`mx-auto w-full max-w-page px-6 sm:px-10 lg:px-16 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
