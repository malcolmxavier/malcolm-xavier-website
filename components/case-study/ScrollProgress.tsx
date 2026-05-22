// ─────────────────────────────────────────────────────────────────
// ScrollProgress — sticky scroll progress bar pinned just below the
// Nav's bottom edge. Drop-in for any case-study route:
//
//     import { ScrollProgress } from "@/components/case-study/ScrollProgress";
//     ...
//     <ScrollProgress />
//
// Render it as the FIRST child of the page so its natural document
// position is exactly at navBottom (sticky elements sit at their
// natural position until scroll forces them to stick — see render-
// order note below).
//
// CSS for the track + gradient + Nav-border suppression is imported
// here, so case studies don't need to wire up any extra stylesheet.
//
// Why `position: sticky` (not `fixed`):
//
// The Nav is `position: sticky top:0`. During rubber-band overscroll
// at the top of the page, a sticky Nav un-sticks and rides DOWN with
// the document. A `fixed` progress bar, by contrast, stays anchored
// to the viewport. The two elements detach during overscroll and a
// visible gap (filled with the html background / canvas color) opens
// between them — the "parallel lines at top" issue.
//
// Making this bar sticky at top:navBottom gives it identical
// overscroll physics to the Nav: both un-stick together, both ride
// down together, and their bottom/top edges stay flush. No gap.
//
// Render-order requirement: the bar's natural document position
// MUST be at navBottom for sticky-at-navBottom to land it there at
// scroll = 0. Render it as the first child of the case study page
// component, before the article and any sticky/fixed siblings.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";
import "./scroll-progress.css";

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
    let resizeRafId: number | null = null;

    function measureNav() {
      // Select via the data-site-nav hook (set on Nav.tsx) rather
      // than the bare "header" tag — any future <header>-using
      // component (modal headers, banner-route mocks, etc.) would
      // silently break the bar's offset otherwise.
      const nav = document.querySelector<HTMLElement>("[data-site-nav]");
      if (nav) {
        setNavBottom(Math.round(nav.getBoundingClientRect().height));
      }
    }

    // rAF-throttle the resize handler. getBoundingClientRect forces
    // a synchronous layout read; firing it on every native resize
    // event (which storms during window drag or mobile-keyboard
    // appearance) is a jank source. Coalescing to one read per frame
    // keeps measurements current without thrashing layout.
    function onResize() {
      if (resizeRafId === null)
        resizeRafId = requestAnimationFrame(() => {
          resizeRafId = null;
          measureNav();
        });
    }

    measureNav();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
    };
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
    // user scrolls past it. z-50 keeps the bar above the Nav's
    // backdrop-blur layer at any overlap. The data-scroll-progress
    // attribute is the marker scroll-progress.css uses to suppress
    // the Nav's bottom border on routes where the bar is rendered.
    <div
      className="sticky z-50"
      data-scroll-progress
      style={{ top: `${navBottom}px` }}
    >
      <ProgressBar fraction={fraction} />
    </div>
  );
}
