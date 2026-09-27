// ─────────────────────────────────────────────────────────────────
// The /research registry — the single source of truth for the dynamic
// route, the sitemap entries, the per-item OG cards, and the /research
// index grid. Reading from one place means a new item lands in every
// surface at once — the same discipline CASE_STUDIES and the /writing
// ESSAYS registry use.
//
// The directory keeps its `projects` name on purpose: the section was
// renamed to /research at the URL level only (see the note in
// app/research/[slug]/page.tsx). These identifiers are internal.
//
// Adding an item is two steps:
//   1. Author its body module under app/research/_research/<slug>.tsx,
//      exporting `meta` (ProjectMeta) + a default body component.
//   2. Import it and add it to REGISTERED below.
// ─────────────────────────────────────────────────────────────────

import type { Project } from "./types";
import SeaLevelRiseFlorida, {
  meta as seaLevelRiseFlorida,
} from "@/app/research/_research/sea-level-rise-florida";
import WhenYouHearSomeFeedback, {
  meta as ethicsVideoSharingApps,
} from "@/app/research/_research/ethics-video-sharing-apps";
import TheRevolutionWillNotBeLiveStreamed, {
  meta as privacyLawSocialMediaEra,
} from "@/app/research/_research/privacy-law-social-media-era";

export type { Project, ProjectMeta } from "./types";

// Registered projects, unsorted. Register new body modules here.
const REGISTERED: Project[] = [
  { ...seaLevelRiseFlorida, Body: SeaLevelRiseFlorida },
  { ...ethicsVideoSharingApps, Body: WhenYouHearSomeFeedback },
  { ...privacyLawSocialMediaEra, Body: TheRevolutionWillNotBeLiveStreamed },
];

/** All projects, newest-first by datePublished (the canonical sort key). */
export const PROJECTS: Project[] = [...REGISTERED].sort((a, b) =>
  b.datePublished.localeCompare(a.datePublished),
);

/** Look up a single project by its slug (the route param). */
export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

/** Format a datePublished (YYYY-MM-DD) for display. Noon-Pacific pins
 *  the wall-clock date so a UTC build environment doesn't shift it a
 *  day. Callers usually prefer meta.dateDisplay; this is here for the
 *  /research index cards, where a uniform machine-derived date is
 *  wanted instead of each item's hand-written dateDisplay. */
export function formatProjectDate(datePublished: string): string {
  return new Date(`${datePublished}T12:00:00-07:00`).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
}

/** Compose a byline string from a project's authors — self-author
 *  first, co-authors folded into a "with A, B, and C" tail with an
 *  Oxford comma. Returns just the lead name when solo-authored. */
export function formatByline(
  authors: { name: string; self?: boolean }[],
): string {
  if (authors.length === 0) return "";
  const [lead, ...rest] = authors;
  if (rest.length === 0) return lead.name;
  const names = rest.map((a) => a.name);
  const joined =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  return `${lead.name}, with ${joined}`;
}
