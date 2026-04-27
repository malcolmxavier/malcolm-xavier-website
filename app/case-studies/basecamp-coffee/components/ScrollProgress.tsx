// ─────────────────────────────────────────────────────────────────
// ScrollProgress — fixed scroll progress bar pinned to the bottom
// edge of the malxavi Nav.
//
// Positioning uses runtime measurement of the Nav's actual height
// (rather than a hardcoded top value) so the bar lands EXACTLY at
// the Nav's bottom border regardless of font scaling, line-height
// reflow, or future Nav padding changes. The bar overlaps the Nav's
// 1px `border-b` by 1px and z-50 paints over it, so the user sees
// one continuous edge — bar IS the Nav's bottom border, not a
// second line below it.
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
    // top = navBottom - 1 puts the bar exactly on top of the Nav's
    // 1px border. z-50 paints the bar above the Nav (z-40), so the
    // visible result is one edge: the progress bar IS the Nav's
    // bottom border. fixed (not sticky) so the bar stays put even
    // when the user reaches the footer at the end of the article.
    <div
      className="fixed left-0 right-0 z-50"
      style={{ top: `${navBottom - 1}px` }}
    >
      <ProgressBar fraction={fraction} />
    </div>
  );
}
