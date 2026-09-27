// ─────────────────────────────────────────────────────────────────
// Open Graph / Twitter card for /research/[slug] — one card per item,
// generated from the slug. Layout is owned by the shared generator
// (lib/og/case-study-card.tsx); this file is copy plus the per-item
// line breaks.
//
// Unlike /case-studies, where each article is its own route segment and
// therefore its own wrapper file, /research is a single dynamic route —
// so the per-item copy lives in the CARD_COPY table below rather than
// in three sibling files. Two fields genuinely cannot come from the
// registry:
//
//   • titleLines — Satori won't balance a soft-wrapped headline, so the
//     wrap has to be authored rather than derived from meta.title.
//   • titleSize  — dialed so the longest line fills the card without
//     spilling. The 128px default suits a short title; a long one steps
//     down (the same calibration each case-study wrapper does).
//
// Everything else is read from the registry, so a copy change on the
// page reaches the card without a second edit: the eyebrow is the
// item's `kind` (the same mono kicker the page renders above its H1)
// and the card subtitle is `subtitle`, verbatim.
//
// A slug with no CARD_COPY row still renders — it falls back to the
// registry title on one line — so registering a new item can never
// break the build on a missing table entry. It will want a row, though:
// anything longer than about twenty characters needs a deliberate wrap.
// ─────────────────────────────────────────────────────────────────

import {
  renderCaseStudyCard,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/case-study-card";
import { PROJECTS, getProject } from "@/lib/projects/projects";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// One `alt` serves the whole route: the App Router reads it as a static
// export, so it cannot vary per slug the way the rendered copy does.
// Written at the section level for that reason — it describes what the
// card IS, which is true of all three, rather than restating a title a
// screen-reader user is about to hear from the page itself.
export const alt =
  "Research by Malcolm Xavier—a share card with the title of the piece set over the malxavi.com masthead.";

// Prerender all three cards at build time. The page's own
// generateStaticParams covers the page route only; a metadata image is
// a separate route module and needs its own, or these render on demand.
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

/** Per-item card copy: the authored headline wrap, and a title size
 *  when the default 128px would overflow. */
const CARD_COPY: Record<string, { titleLines: string[]; titleSize?: number }> = {
  // Two short halves split at the comma — the title's own caesura, and
  // both lines clear the card at the default size.
  "sea-level-rise-florida": {
    titleLines: ["Oceans Rise,", "Properties Fall"],
  },
  // Split before the negation so each line is a readable phrase.
  // Stepped to 112px: "Not Be Live Streamed" is 20 characters, which
  // spills the 1008px content width at the default.
  "privacy-law-social-media-era": {
    titleLines: ["The Revolution Will", "Not Be Live Streamed"],
    titleSize: 112,
  },
  // A 53-character lyric, split at its comma. 84px is the same step the
  // muck-rack card uses for a 27-character line.
  "ethics-video-sharing-apps": {
    titleLines: ["When You Hear Some Feedback,", "Keep Going Take It Higher"],
    titleSize: 84,
  },
};

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  // `dynamicParams` is off on the page, so an unregistered slug never
  // reaches a reader — but the image route is generated independently,
  // so it answers with the section card rather than throwing.
  const copy = CARD_COPY[slug];
  return renderCaseStudyCard({
    titleLines: copy?.titleLines ?? [project?.title ?? "Research"],
    titleSize: copy?.titleSize,
    subtitle: project?.subtitle ?? project?.description ?? "",
    eyebrow: project?.kind ?? "Research",
  });
}
