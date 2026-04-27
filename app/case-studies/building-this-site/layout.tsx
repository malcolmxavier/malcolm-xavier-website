// ─────────────────────────────────────────────────────────────────
// /case-studies/building-this-site — route layout.
//
// Meta case study on shipping malxavi.com itself. Same recruiter-
// cluster brand the rest of the site uses (Instrument Serif + DM
// Sans + Roboto Mono, semantic text/surface/border tokens, all
// loaded from the root layout), so this layout is a pure metadata
// declaration with no fonts or page-specific CSS attached.
//
// No `case-study.css` import: the .case-glass treatment from the
// Basecamp study is intentionally not carried over here. Cards
// render as flat rounded surfaces, matching the editorial-restraint
// posture of the meta narrative.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Building this site — Case Study",
  description:
    "A meta case study on shipping this portfolio in seven days with Claude Code as build partner. Architecture bets, two production incidents, and what AI-native PM work looks like when the human stays in the loop.",
  alternates: {
    canonical: "/case-studies/building-this-site",
  },
  openGraph: {
    title: "Building this site — Case Study",
    description:
      "A meta case study on shipping this portfolio in seven days with Claude Code as build partner. Architecture bets, two production incidents, and what AI-native PM work looks like when the human stays in the loop.",
    type: "article",
  },
};

export default function BuildingThisSiteCaseStudyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
