// ─────────────────────────────────────────────────────────────────
// FilterPreview — dev-only look-and-feel harness for the stats filter
// chips (STATS-FILTERS-SPEC §2/§3/§4). Not a product surface: it exists
// so the tri-state visual language can be judged on REAL tokens (the
// throwaway sketch used approximate ones) across both clusters, and so
// the step-9 axe pass has a rendered target while the real rails are
// still being wired into the dashboards.
//
// Theme is root-level in this design system (the nav AUTO/theme control
// drives [data-theme] on the document), and [data-theme="dark"]
// [data-subbrand] re-binds the cluster accent — so a nested "light"
// column can't escape a dark root. Rather than fight that, this renders
// both clusters once in the CURRENT theme; flip the nav theme toggle to
// judge the other.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { FilterRail } from "@/components/filters/FilterRail";
import { SummaryFilterChip } from "@/components/filters/SummaryFilterChip";
import { nextTriState, type TriState } from "@/lib/feeds/stats/tri-state";

// A small bounded dimension to drive the rail. Seeded so all three states
// are visible at rest without any clicking.
const SEED: Record<string, TriState> = {
  horror: "include",
  thriller: "neutral",
  comedy: "exclude",
  drama: "neutral",
  documentary: "neutral",
};

const GENRE_LABELS: Record<string, string> = {
  horror: "Horror",
  thriller: "Thriller",
  comedy: "Comedy",
  drama: "Drama",
  documentary: "Documentary",
};

// One cluster panel: the live rail + a pair of summary chips.
function ClusterPanel({
  subbrand,
  chipClassName,
  idPrefix,
  title,
}: {
  subbrand: "film" | "tv";
  chipClassName: string;
  idPrefix: string;
  title: string;
}) {
  const [states, setStates] = useState<Record<string, TriState>>(SEED);

  // High-cardinality summary chips, each with live include/exclude + remove
  // state so both Style-B controls are exercisable in the preview.
  const [entities, setEntities] = useState<
    Array<{ id: string; label: string; excluded: boolean }>
  >([
    { id: "nolan", label: "Christopher Nolan", excluded: false },
    { id: "us", label: "United States", excluded: false },
  ]);

  const cycle = (slug: string) =>
    setStates((prev) => ({ ...prev, [slug]: nextTriState(prev[slug]) }));

  const toggleEntity = (id: string) =>
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, excluded: !e.excluded } : e)),
    );
  const removeEntity = (id: string) =>
    setEntities((prev) => prev.filter((e) => e.id !== id));

  const values = Object.keys(SEED).map((slug) => ({
    slug,
    label: GENRE_LABELS[slug],
    state: states[slug],
  }));

  return (
    <div
      data-subbrand={subbrand}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: 20,
        background: "var(--surface-muted)",
        color: "var(--text-body)",
        borderRadius: 8,
      }}
    >
      <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-caption)" }}>
        {title}
      </h2>
      <FilterRail
        label="Genre"
        idPrefix={idPrefix}
        chipClassName={chipClassName}
        values={values}
        onCycle={cycle}
      />
      {/* High-cardinality summary chips: click the pill body to toggle
          include⇄exclude; the corner-bubble × removes. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 36, alignItems: "center" }}>
        {entities.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-caption)" }}>
            (all summary chips removed — reload to reset)
          </span>
        ) : (
          entities.map((e) => (
            <SummaryFilterChip
              key={e.id}
              label={e.label}
              excluded={e.excluded}
              onToggle={() => toggleEntity(e.id)}
              onRemove={() => removeEntity(e.id)}
              chipClassName={chipClassName}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function FilterPreview() {
  return (
    <main style={{ padding: 32, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, marginBottom: 8 }}>
        Stats filter chips — look-and-feel preview
      </h1>
      <p style={{ fontSize: 13, marginBottom: 24, maxWidth: 640, lineHeight: 1.5 }}>
        Dev-only. Rail chips cycle neutral → include → exclude on click
        (Style A). Summary chips toggle include ⇄ exclude via the −/+ control
        (Style B). Exclude = error-hue fill, leading −, strikethrough. Flip the
        nav theme toggle to see the other theme.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <ClusterPanel
          subbrand="film"
          chipClassName="film-filter-chip"
          idPrefix="preview-film"
          title="Film cluster"
        />
        <ClusterPanel
          subbrand="tv"
          chipClassName="show-filter-chip"
          idPrefix="preview-tv"
          title="Television cluster"
        />
      </div>
    </main>
  );
}
