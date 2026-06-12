// ─────────────────────────────────────────────────────────────────
// StatsTips — touch support for the chart hover chips.
//
// The Tip chips reveal on `:hover`/`:focus-within` in CSS, which covers
// pointer + keyboard but never fires on touch (no hover, and tap-to-focus
// on non-button elements is unreliable across mobile browsers). This thin
// client controller closes that gap: on a touch device it makes a tap on
// any `.stats-tip` toggle its chip open (closing any other), with a tap
// elsewhere or Escape dismissing it.
//
// It's pure event delegation on the document — zero per-chart JS, so the
// charts themselves stay server-rendered. On pointer devices it no-ops
// entirely and the CSS hover path is left alone.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";

export function StatsTips() {
  useEffect(() => {
    // Only needed where the primary input can't hover (touch). Pointer
    // devices keep the CSS :hover/:focus-within path untouched.
    const coarse = window.matchMedia("(hover: none)");
    let openEl: Element | null = null;

    const close = () => {
      if (openEl) {
        openEl.classList.remove("stats-tip--open");
        openEl = null;
      }
      // A focusable trigger (the rating columns) could keep its chip up via
      // :focus-within after the tap; drop focus so "tap elsewhere" really
      // dismisses.
      const active = document.activeElement as HTMLElement | null;
      if (active?.classList?.contains("stats-tip")) active.blur();
    };

    const onClick = (e: MouseEvent) => {
      if (!coarse.matches) return; // hover devices: CSS handles it
      const trigger = (e.target as Element | null)?.closest?.(".stats-tip");
      if (!trigger) {
        close();
        return;
      }
      if (trigger === openEl) {
        close();
        return;
      }
      close();
      trigger.classList.add("stats-tip--open");
      openEl = trigger;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
