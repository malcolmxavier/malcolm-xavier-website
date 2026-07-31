// ─────────────────────────────────────────────────────────────────
// Types for the /writing essays section.
//
// Kept separate from the registry (essays.ts) so an essay body module
// can import the metadata SHAPE from here without creating a runtime
// import cycle against the registry that imports the body module back.
// ─────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";

/** The four recruiter-side writing pillars. Cultural content is
 *  intentionally excluded — it belongs to the Fourth Unit / Dispatches
 *  surface, not the recruiter site. */
export type WritingPillar = "growth" | "media" | "ai" | "craft";

/** Metadata an essay body module exports alongside its default
 *  component.
 *
 *  `postDate` (original LinkedIn publish date, YYYY-MM-DD) is the
 *  canonical sort key across the hub, the pillar pages, the ItemList
 *  schema, and the sitemap — so an essay imported retroactively slots
 *  into its true chronological position rather than being prepended as
 *  newest. */
export interface EssayMeta {
  slug: string;
  pillar: WritingPillar;
  /** On-page H1 — the full editorial headline, no length constraint. */
  title: string;
  /** Shorter SERP `<title>` base (root layout appends the byline, so
   *  keep the combined result under ~60 chars). Falls back to `title`. */
  metaTitle?: string;
  /** One- to two-sentence summary — meta description and card blurb. */
  description: string;
  /** Original LinkedIn publish date, YYYY-MM-DD. Canonical sort key. */
  postDate: string;
  /** Optional CTA intent carried over from the source post. */
  cta?: "job" | "newsletter" | "none";
  /** OG card title, pre-split into deliberate lines (Satori won't
   *  balance a soft-wrapped title). Falls back to `[title]`. */
  ogTitleLines?: string[];
  /** OG card title size in px. Falls back to a safe default. */
  ogTitleSize?: number;
  /** OG card subtitle. Falls back to `description`. */
  ogSubtitle?: string;
}

/** A registered essay: its metadata plus the body component. */
export interface Essay extends EssayMeta {
  Body: ComponentType;
}

/** Display metadata for a writing pillar. */
export interface PillarMeta {
  slug: WritingPillar;
  label: string;
  /** Short framing line for the pillar landing and the hub. */
  blurb: string;
}
