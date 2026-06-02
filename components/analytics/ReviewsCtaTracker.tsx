"use client";

// ─────────────────────────────────────────────────────────────────
// ReviewsCtaTracker — wraps a sub-brand landing's primary "Browse all
// reviews" CTA and instruments the "thin gate" in one shot:
//
//   • LANDING_REVIEWS_CTA_CLICK {surface} — the click itself (the
//     numerator for "what share of landing visitors push through to
//     the corpus").
//   • LANDING_DWELL_TO_CTA {surface, timeMs} — ms from page mount to
//     that first click, i.e. how long the editorial landing held the
//     visitor before they headed to the grid. The signal that tells
//     us whether the landing earns its place or is just a tax on the
//     way to reviews.
//
// Same display:contents wrapper pattern as TrackOnClick (no layout
// box of its own, no competing click handler with the inner NextLink)
// — but it also records mount time so the click can carry dwell. Mount
// of this wrapper ≈ landing load: it sits in the hero, rendered on
// first paint.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function ReviewsCtaTracker({
  surface,
  children,
}: {
  /** "films_landing" | "tv_landing" — which landing the CTA is on. */
  surface: string;
  children: ReactNode;
}) {
  const mountRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    // performance.now() is monotonic — immune to wall-clock changes —
    // which is what we want for an elapsed-time measure.
    mountRef.current = performance.now();
  }, []);

  const handleClick = () => {
    // Guard so a double-click doesn't double-count the dwell sample.
    if (firedRef.current) {
      track(ANALYTICS_EVENTS.LANDING_REVIEWS_CTA_CLICK, { surface });
      return;
    }
    firedRef.current = true;
    const timeMs =
      mountRef.current !== null
        ? Math.round(performance.now() - mountRef.current)
        : 0;
    track(ANALYTICS_EVENTS.LANDING_REVIEWS_CTA_CLICK, { surface });
    track(ANALYTICS_EVENTS.LANDING_DWELL_TO_CTA, { surface, timeMs });
  };

  return (
    <span onClick={handleClick} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
