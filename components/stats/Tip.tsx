// ─────────────────────────────────────────────────────────────────
// Tip — a designed, CSS-only chart tooltip.
//
// The dashboard's holistic hover affordance: every chart datum can carry
// a Tip that surfaces its underlying number(s) on hover (and, where the
// trigger opts into focusability, on keyboard focus). Replaces the
// browser's native `title=` tooltips with a styled, theme-aware chip.
//
// Server-rendered, no client JS: a trigger element gets the `stats-tip`
// class (and, optionally, `tabIndex={0}`), and renders a <Tip> as its
// last child. CSS reveals the chip on `.stats-tip:hover` /
// `.stats-tip:focus-within` (see app/components.css). The chip is
// `aria-hidden` because the same fact already lives in the trigger's
// `aria-label`, so assistive tech hears it once, not twice — the chip is
// purely a visual enhancement for sighted users.
//
// Usage:
//   <li className="stats-tip" aria-label={readout}>
//     …visible bar…
//     <Tip>{readout}</Tip>
//   </li>
//
// For a focusable trigger (keyboard users can reveal it), spread
// `tipTrigger(true)` instead of writing the class by hand.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

/**
 * Props to spread onto a tooltip trigger element. `focusable` adds a tab
 * stop so keyboard users can reveal the chip — reserve it for charts
 * whose number is otherwise hidden (e.g. the rating columns), so the
 * dashboard doesn't sprout hundreds of tab stops for data that's already
 * printed inline elsewhere.
 */
export function tipTrigger(focusable = false): {
  className: string;
  tabIndex?: 0;
} {
  return focusable ? { className: "stats-tip", tabIndex: 0 } : { className: "stats-tip" };
}

/** The hover chip itself — render as the last child of a `.stats-tip`. */
export function Tip({ children }: { children: ReactNode }) {
  return (
    // aria-hidden: the trigger's aria-label already carries the fact, so
    // the chip is visual-only and mustn't double-announce to screen
    // readers. role="tooltip" is intentionally omitted for the same
    // reason (it would re-expose the hidden node).
    <span className="stats-tip__pop" aria-hidden="true">
      {children}
    </span>
  );
}
