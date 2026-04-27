// ─────────────────────────────────────────────────────────────────
// ScrollProgress — sticky scroll progress bar pinned just below the
// malxavi Nav's bottom edge.
//
// Positioning uses runtime measurement of the Nav's actual height
// (rather than a hardcoded top value) so the bar lands cleanly
// adjacent to the Nav's bottom border regardless of font scaling,
// line-height reflow, or future Nav padding changes.
//
// Why `position: sticky` (not `fixed`):
//
// The Nav is `position: sticky top:0`. During rubber-band overscroll
// at the top of the page (the user pulls the document downward), a
// sticky Nav un-sticks and rides DOWN with the document — that's
// the standard sticky behavior once the natural position re-enters
// the viewport. A `fixed` progress bar, by contrast, stays anchored
// to the viewport. The two elements detach during overscroll and a
// visible gap (filled with the html background / canvas color)
// opens between them — the "parallel lines at top" issue.
//
// Making this bar sticky at top:navBottom gives it identical
// overscroll physics to the Nav: both un-stick together, both ride
// down together, and their bottom/top edges stay flush. No gap.
//
// Render-order requirement: the bar's natural document position
// MUST be at navBottom for sticky-at-navBottom to land it there at
// scroll = 0 (sticky elements sit at their natural position until
// scroll forces them to stick). The bar is rendered as the first
// child of the case study page component, which is the first child
// of <main>, which is the first sibling of the Nav. So its natural
// y is exactly navBottom in normal flow. ✓
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";

export function ScrollProgress() {
  const [fraction, setFraction] = useState(0);
  // Default of 56px matches the Nav's expected height when py-4 +
  // typical text content + 1px border render at the default font
  // size. measureNav() overrides this once the Nav is in the DOM.
  const [navBottom, setNavBottom] = useState(56);

  useEffect(() => {
    // Re-measure on resize because the Nav may grow taller on
    // narrow viewports where the wordmark wraps, or when the user
    // bumps their browser font-size.
    function measureNav() {
      const nav = document.querySelector("header");
      if (nav) {
        setNavBottom(Math.round(nav.getBoundingClientRect().height));
      }
    }
    measureNav();
    window.addEventListener("resize", measureNav, { passive: true });
    return () => window.removeEventListener("resize", measureNav);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    function update() {
      rafId = null;
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      const current = window.scrollY;
      const f = total > 0 ? current / total : 1;
      setFraction(Math.max(0, Math.min(1, f)));
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
  }, []);

  return (
    // sticky at top:navBottom — the bar sits at its natural flow
    // position (right below Nav at scroll=0) and sticks there as the
    // user scrolls past it. Crucially, sticky shares the Nav's
    // overscroll behavior: both un-stick during rubber-band and
    // ride down together, staying flush. z-50 keeps the bar above
    // the Nav's backdrop-blur layer at any overlap. The wrapper is
    // a block element so it spans 100% of <main> width naturally —
    // no need for left-0 right-0 (those were viewport-anchoring for
    // the previous fixed-positioned implementation).
    <div
      className="sticky z-50"
      data-scroll-progress
      style={{ top: `${navBottom}px` }}
    >
      <ProgressBar fraction={fraction} />
    </div>
  );
}
