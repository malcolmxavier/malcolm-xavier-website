// ─────────────────────────────────────────────────────────────────
// useScrollSpy — shared scroll-position-to-active-section hook.
//
// Extracted from TableOfContents so CaseStudyTocRail can run the
// scroll-spy ONCE and pass the resulting activeId to both of its
// breakpoint-conditional TableOfContents children. The earlier
// shape — each TableOfContents instance owned its own listener —
// meant lg+ viewports ran two rAF-throttled scroll handlers in
// parallel, computing identical reading-point arithmetic and racing
// each other's state updates.
//
// Rule for "active": linear-interpolation reading point.
//
// readingPoint (document coords) = topOffset + scrollProgress * (docHeight - topOffset)
//   where scrollProgress = scrollY / maxScroll (clamped to [0,1])
//
// The active section is whichever section's [start, nextStart)
// document-y range contains the reading point. Decouples
// "is this section on screen" (breaks on short docs / tall
// viewports) from "how far has the user scrolled" (works on any
// doc/viewport combo). See TableOfContents.tsx history for the
// case that motivated this rule (iPad Pro 12.9" on the resume).
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "./TableOfContents";

/**
 * Returns the id of the section the user is currently "reading,"
 * derived from scroll position via the reading-point rule above.
 * Re-runs on scroll and resize, throttled to one update per
 * animation frame so the listener stays cheap.
 *
 * @param items     the TocItems whose sections we're tracking
 * @param topOffset px from viewport top that anchors the scroll-
 *                  progress curve. Defaults to 120 (≈ sticky Nav
 *                  height); pass higher for routes with a taller
 *                  sticky header.
 * @param enabled   when false, the hook skips listener setup and
 *                  returns an empty string. Used by TableOfContents
 *                  in controlled mode: the consumer (e.g.
 *                  CaseStudyTocRail rendering two child TOCs) calls
 *                  useScrollSpy once at the parent and passes the
 *                  id down — the children's internal hook call
 *                  resolves to a no-op so we don't end up with
 *                  duplicate listeners.
 */
export function useScrollSpy(
  items: TocItem[],
  topOffset = 120,
  enabled = true,
): string {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;
    const ids = items.map((i) => i.href.replace(/^#/, "")).filter(Boolean);
    let rafId: number | null = null;

    function update() {
      rafId = null;

      const docHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const maxScroll = Math.max(0, docHeight - viewportHeight);
      // Clamp progress to [0,1] — Safari's elastic overscroll can
      // push scrollY above maxScroll briefly during inertial bounce.
      const scrollProgress =
        maxScroll > 0
          ? Math.min(1, Math.max(0, scrollY / maxScroll))
          : 0;
      const readingPoint =
        topOffset + scrollProgress * (docHeight - topOffset);

      const tops: { id: string; top: number }[] = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        tops.push({ id, top: el.getBoundingClientRect().top + scrollY });
      }

      let current = tops[0]?.id ?? "";
      for (let i = 0; i < tops.length; i++) {
        const start = tops[i].top;
        const isLast = i === tops.length - 1;
        const end = isLast ? Infinity : tops[i + 1].top;
        if (readingPoint >= start && readingPoint < end) {
          current = tops[i].id;
          break;
        }
      }
      setActiveId(current);
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [items, topOffset, enabled]);

  return activeId;
}
