// ─────────────────────────────────────────────────────────────────
// /case-studies/basecamp-coffee — route layout.
//
// Almost a no-op — its only job is to declare metadata for the
// case study route. The page itself uses malxavi.com's recruiter-
// cluster brand (Instrument Serif + DM Sans + Roboto Mono, semantic
// text/surface/border tokens), all of which are loaded by the root
// layout, so no extra fonts or CSS are needed here.
//
// Why we re-skinned (originally this case study lived inside its
// own Basecamp Coffee brand world): the live Basecamp project still
// runs at quiz-project-flax-beta.vercel.app and serves the original
// brand. The version on malxavi.com is a re-skin of that work into
// Malcolm's portfolio brand voice, so the recruiter audience reads
// the case study without crossing a brand boundary.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Basecamp Coffee — Case Study",
  description:
    "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.",
  alternates: {
    canonical: "/case-studies/basecamp-coffee",
  },
  openGraph: {
    title: "Basecamp Coffee — Case Study",
    description:
      "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.",
    type: "article",
  },
};

export default function BasecampCaseStudyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
