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

/** The two thresholds a pillar page has to clear, and they are different
 *  numbers because linking and indexing are different asks.
 *
 *  LINK at three. The grid is 2-up, so two cards is a single row and reads
 *  as a stub; three starts to read as a list. Sending a reader to a short
 *  list is fine — it is still the fastest route to the rest of a theme.
 *
 *  INDEX at five. A pillar page in a search result has to be a better
 *  answer than the essay itself or the hub, and below five it is neither:
 *  it restates a subset of the hub using the same words as the essays it
 *  lists. Three thin pillar pages competing with their own contents is
 *  cannibalisation, not an AEO surface — which is what shipped before this
 *  gate existed, with all four pillars in the sitemap and three of them
 *  holding one card.
 *
 *  Linked-but-noindex is the deliberate middle state, and it is a normal
 *  one: `noindex, follow` is exactly the posture for a page that helps a
 *  reader navigate without being worth ranking. The combination to avoid
 *  runs the other way — indexed but unlinked, which is an orphan.
 *
 *  Malcolm set both numbers on 2026-09-28. An earlier cut used a single
 *  threshold of 2 for everything, which was a constant borrowed from the
 *  theme-browse gate rather than a number anybody had chosen. */
const PILLAR_LINK_MIN = 3;
const PILLAR_INDEX_MIN = 5;

/** How many pillars must be LINK-ready before the hub offers the browse. */
const THEME_MIN_PILLARS = 3;

/** Whether this pillar is worth sending a reader to. */
export function pillarLinkReady(pillar: WritingPillar): boolean {
  return essaysByPillar(pillar).length >= PILLAR_LINK_MIN;
}

/** Whether this pillar is worth putting in front of a search engine.
 *  Drives both the sitemap and the page's own robots directive, so the
 *  two can never disagree. */
export function pillarIndexReady(pillar: WritingPillar): boolean {
  return essaysByPillar(pillar).length >= PILLAR_INDEX_MIN;
}

/** The pillars the hub may link to, in registry order. */
export function linkablePillars(): WritingPillar[] {
  return WRITING_PILLAR_SLUGS.filter(pillarLinkReady);
}

/** The pillars a crawler should be told about, in registry order. */
export function indexablePillars(): WritingPillar[] {
  return WRITING_PILLAR_SLUGS.filter(pillarIndexReady);
}

/** Whether the hub should offer "Browse by theme" yet.
 *
 *  It is gated because a theme link that lands on a one-card page is a
 *  worse experience than no theme nav at all.
 *
 *  The test is deliberately NOT a total essay count. A corpus of nine
 *  split 6/1/1/1 would clear any total and still offer a browse with
 *  nothing to browse — the question is whether a reader gets a real
 *  choice, which is a question about the distribution.
 *
 *  It counts LINK-ready pillars rather than carrying a threshold of its
 *  own, so there is one definition of "worth browsing into" and the
 *  browse can never offer a chip the rest of the site treats as too thin
 *  to link. */
export function themeBrowseReady(): boolean {
  return linkablePillars().length >= THEME_MIN_PILLARS;
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
