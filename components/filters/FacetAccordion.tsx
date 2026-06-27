// ─────────────────────────────────────────────────────────────────
// FacetAccordion — a disclosure that collapses the secondary (Wave-B)
// filter rails behind one "More filters" toggle.
//
// The mobile drawer renders every facet section unconditionally, which
// is a long scroll before the "Show results" button. This tucks the
// long tail (language, country, studio/network group, release, budget,
// decade) into a single collapsed section so the common filters (rating,
// genre, watched) sit near the top.
//
// `collapsible` is driven per render instance, not by a media query:
// the shells already render FilterContent twice (a desktop sidebar and a
// mobile drawer), so the sidebar passes collapsible={false} (everything
// stays expanded — the sticky sidebar has its own scroll and length
// isn't the problem there) and the drawer passes collapsible={true}.
//
// Accessibility: a real disclosure — <button aria-expanded aria-controls>
// toggling a region that is `hidden` when collapsed (so its controls
// leave the tab order and the drawer's focus-trap skips them). Toggling
// `hidden` is instant, so there's no motion to guard against
// prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useId, useState, type ReactNode } from "react";

export type FacetAccordionProps = {
  /** The disclosure's accessible name + visible label, e.g. "More filters". */
  label: string;
  /** When false, render the children inline with no disclosure chrome
   *  (desktop sidebar — always expanded). */
  collapsible: boolean;
  /** Open state on first render when collapsible (default collapsed). */
  defaultOpen?: boolean;
  children: ReactNode;
};

export function FacetAccordion({
  label,
  collapsible,
  defaultOpen = false,
  children,
}: FacetAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  // Desktop / non-collapsible: the rails render directly into the parent
  // Stack, exactly as before — a true no-op for that surface.
  if (!collapsible) return <>{children}</>;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          // Mono caption register, matching the rail Kicker labels.
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-sm-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-caption)",
          outlineColor: "var(--border-focus)",
        }}
      >
        <span>{label}</span>
        {/* +/− affordance; aria-hidden because aria-expanded already
            carries the open/closed state for AT. A fixed-size centered box so
            the "+" and the (taller, lighter-looking) "−" occupy the same area
            and read at a matched visual weight instead of jumping. */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1em",
            height: "1em",
            fontSize: "1em",
            lineHeight: 1,
          }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {/* The region re-establishes the inter-rail spacing the parent
          Stack would otherwise give. `hidden` (not unmount) keeps state
          stable across toggles and removes the subtree from the tab
          order + a11y tree when closed. */}
      <div
        id={regionId}
        hidden={!open}
        style={{
          display: open ? "flex" : undefined,
          flexDirection: "column",
          gap: "var(--scale-500)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
