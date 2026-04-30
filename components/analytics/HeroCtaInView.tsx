"use client";

// ─────────────────────────────────────────────────────────────────
// HeroCtaInView — IntersectionObserver wrapper that fires
// `hero_cta_inview` once when the wrapped element enters the
// viewport.
//
// Companion event to CALENDLY_CLICK and RESUME_PDF_DOWNLOAD. Without
// this, the dashboard can count clicks but not "saw the CTA but
// didn't click" — the denominator for conversion-rate analysis.
// Page views are too coarse (many recruiters bounce at the fold
// without scrolling far enough to see the resume CTA on long
// viewports).
//
// Fires once per page-load, not on each scroll. The observer
// disconnects after firing so re-enters don't re-fire.
//
// Threshold 0.5 — the CTA is "seen" once half of it is visible.
// Stricter than 0 (any pixel) but more permissive than 1 (full
// element on screen).
//
// Closes h-hero-cta-no-inview from the 2026-04-29 /full-review.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

import type { AnalyticsEvent } from "@/lib/analytics";

type HeroCtaInViewProps = {
  event: AnalyticsEvent;
  children: ReactNode;
};

export function HeroCtaInView({ event, children }: HeroCtaInViewProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const target = wrapperRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) {
            track(event);
            firedRef.current = true;
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [event]);

  // Plain inline span — IntersectionObserver requires a real layout
  // box to observe. `display: contents` (which TrackOnClick uses)
  // removes the box from the layout tree, which would leave the
  // observer with nothing to measure. Inline span has a tight
  // inline-level box that wraps its children; doesn't affect the
  // surrounding flex / grid layout.
  return <span ref={wrapperRef}>{children}</span>;
}
