// ─────────────────────────────────────────────────────────────────
// ScrollProgress — sticky scroll progress bar for the case study.
//
// Reduces the original quiz-project's SiteChrome (which combined a
// Basecamp wordmark header + ProgressBar) down to just the progress
// bar. malxavi's site Nav already lives above this on the page, so
// adding a Basecamp-branded header here would double-up the navigation
// at the top.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";

export function ScrollProgress() {
  const [fraction, setFraction] = useState(0);

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
    // Anchored at top-14 (56px) so the bar sits flush against the
    // bottom edge of the malxavi Nav (which is sticky top-0 with
    // py-4 padding). z-30 keeps the bar one layer beneath the Nav
    // so any blurred-Nav overlap stays clean.
    <div className="sticky top-14 z-30">
      <ProgressBar fraction={fraction} />
    </div>
  );
}
