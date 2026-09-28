// ─────────────────────────────────────────────────────────────────
// The /essays essay registry — the single source of truth for the
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
} from "@/app/essays/_essays/ms-in-law-data-governance";
import GrowthPersonalizationAiDataPrimer, {
  meta as growthPersonalizationAiDataPrimer,
} from "@/app/essays/_essays/growth-personalization-ai-data-primer";
import TechnicallySpeaking, {
  meta as technicallySpeaking,
} from "@/app/essays/_essays/technically-speaking";
import RoadmapToMakingBetterChoices, {
  meta as roadmapToMakingBetterChoices,
} from "@/app/essays/_essays/roadmap-to-making-better-choices";
import ContextRulesEverything, {
  meta as contextRulesEverything,
} from "@/app/essays/_essays/context-rules-everything";
import PersonalizationIsAPlatform, {
  meta as personalizationIsAPlatform,
} from "@/app/essays/_essays/personalization-is-a-platform";

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
    // This line does five jobs on /essays/craft: the on-page lede, the meta
    // description, the Open Graph and Twitter card descriptions, and the
    // JSON-LD description. So it has to describe the contents accurately for
    // a machine, not just read well under the headline.
    //
    // It used to open "The interdisciplinary practice…" and then name law,
    // theatre, and a non-linear career. Two problems. The pillar was about to
    // take essays on being technical and on negotiating, which are practice
    // rather than biography, and naming the background alone left them with
    // nowhere to sit. And "interdisciplinary" is the framing Malcolm's own
    // vocabulary work refused — the crossing is a move, not a subject.
    //
    // "The life around it" is deliberately open where a list would not be: a
    // career can be non-linear and still be entirely professional, and this
    // pillar has to hold the theatre, the standup, and the restaurant years
    // without the blurb having to enumerate them.
    blurb:
      "The practice behind the decisions, shaped by a non-linear career and the life around it.",
  },
};

// Registered essays, unsorted. Register new body modules here.
const REGISTERED: Essay[] = [
  { ...msInLawDataGovernance, Body: MsInLawDataGovernance },
  { ...growthPersonalizationAiDataPrimer, Body: GrowthPersonalizationAiDataPrimer },
  { ...technicallySpeaking, Body: TechnicallySpeaking },
  { ...roadmapToMakingBetterChoices, Body: RoadmapToMakingBetterChoices },
  { ...contextRulesEverything, Body: ContextRulesEverything },
  { ...personalizationIsAPlatform, Body: PersonalizationIsAPlatform },
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

/** Minimum essays a pillar needs before it is worth browsing into, and
 *  how many pillars must clear that bar before the hub offers the browse
 *  at all. */
const THEME_MIN_PER_PILLAR = 2;
const THEME_MIN_PILLARS = 3;

/** Whether the hub should offer "Browse by theme" yet.
 *
 *  It is gated because a theme link that lands on a one-card page is a
 *  worse experience than no theme nav at all, and on 2026-09-28 three of
 *  the four pillars held exactly one essay.
 *
 *  The test is deliberately NOT a total essay count. A corpus of nine
 *  split 6/1/1/1 would clear any total and still offer a browse with
 *  nothing to browse — the question is whether a reader gets a real
 *  choice, which is a question about the distribution. Three pillars
 *  carrying two each is the point where they do. */
export function themeBrowseReady(): boolean {
  const qualifying = WRITING_PILLAR_SLUGS.filter(
    (p) => essaysByPillar(p).length >= THEME_MIN_PER_PILLAR,
  );
  return qualifying.length >= THEME_MIN_PILLARS;
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
