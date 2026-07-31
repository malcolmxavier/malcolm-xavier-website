// ─────────────────────────────────────────────────────────────────
// Types for the /projects section — academic and analytical portfolio
// pieces (a data-science capstone, two Master-of-Science-in-Law papers)
// hosted as first-class on-domain reading experiences rather than
// rented links or bare PDFs.
//
// Kept separate from the registry (projects.ts) so a project body
// module can import the metadata SHAPE from here without creating a
// runtime import cycle against the registry that imports the body
// module back — the same split /writing uses (lib/writing/types.ts).
// ─────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";

/** One author credited on a project. `self: true` marks Malcolm — the
 *  shell links that author to the sitewide Person node in JSON-LD and
 *  leads the byline with him; co-authors render as plain names. */
export interface ProjectAuthor {
  name: string;
  self?: boolean;
}

/** A downloadable companion file (the full report, the datafolio, a
 *  paper PDF). Served as a static asset from public/projects/<slug>/,
 *  so these open in a new tab via a plain anchor — never next/link,
 *  which would try to client-route a non-route file. */
export interface ProjectDownload {
  label: string;
  /** Same-origin path under public/, e.g. /projects/<slug>/report.pdf */
  href: string;
  /** Short affordance detail shown beside the label, e.g. "PDF · 490 KB". */
  meta?: string;
}

/** One entry in a project's table of contents. `id` must match the
 *  `id` on a <ProjectSection> in the body; `label` is the short rail
 *  text (e.g. "II. Hyperrealism"), which can be terser than the full
 *  on-page section heading. */
export interface ProjectTocItem {
  id: string;
  label: string;
}

/** A not-yet-available companion (e.g. an MSL presentation video and
 *  deck still gated behind Northwestern). Rendered as a labelled
 *  "coming with the recording" slot so the page acknowledges the
 *  artifact without shipping a dead link or a placeholder route. */
export interface ProjectCompanion {
  label: string;
  note: string;
}

/** Metadata a project body module exports alongside its default
 *  component. Drives the page shell, the JSON-LD graph, and (in
 *  Phase 2) the /projects index card and sitemap entry. */
export interface ProjectMeta {
  slug: string;
  /** Small mono kicker above the title, e.g. "Data-science capstone". */
  kind: string;
  /** On-page H1 — the full title, no length constraint. */
  title: string;
  /** Shorter SERP `<title>` base. Falls back to `title`. */
  metaTitle?: string;
  /** One-line framing shown under the H1. */
  subtitle?: string;
  /** One- to two-sentence summary — meta description and card blurb. */
  description: string;
  /** Byline, self-author first. */
  authors: ProjectAuthor[];
  /** Human-readable date shown in the dateline, e.g. "2021" or
   *  "Northwestern · 2023". Decoupled from the machine date so the
   *  visible precision can stay honest when only the year is known. */
  dateDisplay: string;
  /** YYYY-MM-DD — the machine date for JSON-LD and chronological sort. */
  datePublished: string;
  /** Estimated reading time in minutes — rendered as "N min read",
   *  mirroring the case-study hero's detail. Hand-set per project (as
   *  case studies do) rather than auto-counted, so a curated page's
   *  estimate can reflect the actual on-page copy. */
  readMin: number;
  /** Provenance backlink shown in the dateline (e.g. "DS4A" jumping to
   *  the matching résumé education entry). Mirrors the case-study →
   *  résumé-role backlink so the credential chip isn't dead weight.
   *  Omit for projects with no résumé credential to point at. */
  credential?: { label: string; href: string };
  /** Table of contents for a long, sectioned piece. When present, the
   *  shell renders a sticky sidebar rail (desktop) plus an inline
   *  collapsible "Contents" on mobile; each entry jump-links to the
   *  matching <ProjectSection id>. Omit for short, unsectioned pieces. */
  toc?: ProjectTocItem[];
  /** Downloadable companion files. */
  downloads?: ProjectDownload[];
  /** Heading for the downloads box. Defaults to "Read the full work" —
   *  right when the on-page text is a curated excerpt and the download
   *  is the complete work (DS4A). Override when the full text is already
   *  on the page and the download is just a portable copy (the MSL
   *  papers use "Take it with you"), so the box never tells a reader to
   *  "read the full work" they're already reading. */
  downloadsHeading?: string;
  /** A pending, not-yet-available companion (MSL video + deck). */
  companion?: ProjectCompanion;
  /** Slugs of related projects to cross-link at the foot (MSL Y1 ↔ Y2). */
  related?: string[];
  /** Phase 1: true — the page carries `noindex` so it works as a
   *  résumé-link target without entering search. Phase 2 flips this to
   *  false (or removed) when the /projects index and /guides ship. */
  noindex?: boolean;
}

/** A registered project: its metadata plus the body component. */
export interface Project extends ProjectMeta {
  Body: ComponentType;
}
