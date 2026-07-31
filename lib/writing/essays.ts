// ─────────────────────────────────────────────────────────────────
// The /writing essay registry — the single source of truth for the
// hub grid, the per-pillar pages, the ItemList JSON-LD, and the
// sitemap. Reading from one place means a new essay lands in every
// surface at once (the same discipline CASE_STUDIES uses on the
// case-study side).
//
// Adding an essay is two steps:
//   1. Author its body module under app/writing/_essays/<slug>.tsx,
//      exporting `meta` (EssayMeta) + a default body component.
//   2. Import it and add it to REGISTERED below.
// ─────────────────────────────────────────────────────────────────

import type { Essay, PillarMeta, WritingPillar } from "./types";
import MsInLawDataGovernance, {
  meta as msInLawDataGovernance,
} from "@/app/writing/_essays/ms-in-law-data-governance";

export type { Essay, EssayMeta, WritingPillar } from "./types";

/** Pillar order for nav/hub listing (also the ItemList order). */
export const WRITING_PILLAR_SLUGS: WritingPillar[] = [
  "growth",
  "media",
  "ai",
  "craft",
];

/** Display metadata per pillar. */
export const WRITING_PILLARS: Record<WritingPillar, PillarMeta> = {
  growth: {
    slug: "growth",
    label: "Growth",
    blurb:
      "Experimentation, lifecycle, and the systems that move activation and retention.",
  },
  media: {
    slug: "media",
    label: "Media",
    blurb:
      "How publishing, streaming, and content businesses actually work under the hood.",
  },
  ai: {
    slug: "ai",
    label: "AI",
    blurb:
      "Building with AI as a collaborator—prompting, evaluation, and shipping real work.",
  },
  craft: {
    slug: "craft",
    label: "Craft",
    blurb:
      "The interdisciplinary practice behind the decisions: law, theatre, and a non-linear career.",
  },
};

// Registered essays, unsorted. Register new body modules here.
const REGISTERED: Essay[] = [
  { ...msInLawDataGovernance, Body: MsInLawDataGovernance },
];

/** All essays, newest-first by postDate (the canonical sort key). */
export const ESSAYS: Essay[] = [...REGISTERED].sort((a, b) =>
  b.postDate.localeCompare(a.postDate),
);

/** Essays in one pillar, newest-first. */
export function essaysByPillar(pillar: WritingPillar): Essay[] {
  return ESSAYS.filter((e) => e.pillar === pillar);
}

/** Pillars that currently have at least one essay. Drives which pillar
 *  pages prerender and which the hub links to — so an empty pillar
 *  never ships as a thin placeholder (it 404s until it has content). */
export function activePillars(): WritingPillar[] {
  return WRITING_PILLAR_SLUGS.filter((p) => essaysByPillar(p).length > 0);
}

/** Look up a single essay by its pillar + slug (the route params). */
export function getEssay(pillar: string, slug: string): Essay | undefined {
  return ESSAYS.find((e) => e.pillar === pillar && e.slug === slug);
}

/** Format a postDate (YYYY-MM-DD) for display. Noon-Pacific pins the
 *  wall-clock date so a UTC build environment doesn't shift it a day. */
export function formatEssayDate(postDate: string): string {
  return new Date(`${postDate}T12:00:00-07:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
