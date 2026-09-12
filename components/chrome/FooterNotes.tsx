// ─────────────────────────────────────────────────────────────────
// FooterNotes — the right-hand slot of the footer band.
//
// Holds the two notes that only some of the site owes the reader:
// the editorial critic disclaimer and the TMDB attribution TMDB's
// API ToS requires. Both are scoped to the review clusters
// (/films, /television), so on most of the site this whole slot is
// absent.
//
// It exists as its own client component for that absence. The two
// notes each decide their own visibility from the pathname, which
// left the Footer — a server component — holding a wrapper it could
// not know was empty, and an empty flex item still takes a row of
// its own and a row's worth of gap. Checking the route once here
// means the slot is either present or gone, and the footer's left
// cluster closes up behind it with nothing to tidy away.
//
// Layout: full width on its own line up to lg, where the footer is
// still stacking. From xl it joins the footer's single row as the
// flex item that takes the leftover width, flushed right against
// the content well — the side the link columns leave empty.
// ─────────────────────────────────────────────────────────────────

"use client";

import { usePathname } from "next/navigation";
import { CriticDisclaimer, isCriticRoute } from "./CriticDisclaimer";
import { TmdbAttribution } from "./TmdbAttribution";

export function FooterNotes() {
  const pathname = usePathname();
  if (!isCriticRoute(pathname)) return null;

  return (
    <div
      className={[
        "flex w-full flex-col gap-3",
        // Up to xl: its own full-width line below the columns.
        "sm:basis-full",
        // xl+: the row's last item, taking what the columns leave.
        // min-w-0 lets it shrink below its content's natural width so
        // long notes wrap instead of pushing the row wide.
        "xl:min-w-0 xl:flex-1 xl:basis-0 xl:items-end xl:text-right",
      ].join(" ")}
    >
      <CriticDisclaimer />
      <TmdbAttribution />
    </div>
  );
}
