// ─────────────────────────────────────────────────────────────────
// ReviewLensStrip — the "Start here" row of curated lenses above the
// reviews grid. Each lens is a one-tap chip that applies a bundle of
// filter/sort params (a named view). Reuses the shared Chip for visual
// consistency with the filter rails; the active lens reads pressed.
//
// Presentational only — the shell computes the active lens id from the
// URL and handles applying / clearing on select.
// ─────────────────────────────────────────────────────────────────

"use client";

import { Kicker } from "@/components/typography/Kicker";
import { Chip } from "./Chip";
import type { ReviewLens } from "@/lib/feeds/review-lenses";

export type ReviewLensStripProps = {
  lenses: ReviewLens[];
  /** Id of the lens whose params exactly match the current URL, or null. */
  activeId: string | null;
  onSelect: (lens: ReviewLens) => void;
  /** Cluster chip transition class — "film-filter-chip" / "show-filter-chip". */
  chipClassName: string;
};

export function ReviewLensStrip({
  lenses,
  activeId,
  onSelect,
  chipClassName,
}: ReviewLensStripProps) {
  if (lenses.length === 0) return null;
  return (
    <div role="group" aria-label="Curated views">
      <Kicker>Start here</Kicker>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        {lenses.map((lens) => (
          <Chip
            key={lens.id}
            isActive={lens.id === activeId}
            onClick={() => onSelect(lens)}
            ariaLabel={lens.description}
            chipClassName={chipClassName}
          >
            {lens.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
