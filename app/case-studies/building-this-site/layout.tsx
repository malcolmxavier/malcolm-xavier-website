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

const ARTICLE_URL = "https://malxavi.com/case-studies/building-this-site";
const ARTICLE_HEADLINE = "Building this site — Case Study";
const ARTICLE_DESCRIPTION =
  "A meta case study on shipping this portfolio in seven days with Claude Code as build partner. Architecture bets, two production incidents, and what AI-native PM work looks like when the human stays in the loop.";

export const metadata: Metadata = {
  title: "Building this site—Case Study",
  description: ARTICLE_DESCRIPTION,
  alternates: {
    canonical: "/case-studies/building-this-site",
  },
  openGraph: {
    title: "Building this site—Case Study",
    description: ARTICLE_DESCRIPTION,
    type: "article",
  },
};

// JSON-LD: Article + BreadcrumbList. Mirrors the basecamp-coffee
// layout — author/publisher point at the sitewide Person @id from
// `app/layout.tsx`. Per the 2026-04-29 /full-review (a-no-jsonld).
const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${ARTICLE_URL}/#article`,
      headline: ARTICLE_HEADLINE,
      description: ARTICLE_DESCRIPTION,
      url: ARTICLE_URL,
      datePublished: "2026-04-29",
      dateModified: "2026-04-29",
      inLanguage: "en-US",
      articleSection: "Case Study",
      author: { "@id": "https://malxavi.com/#person" },
      publisher: { "@id": "https://malxavi.com/#person" },
      mainEntityOfPage: ARTICLE_URL,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://malxavi.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Building this site",
          item: ARTICLE_URL,
        },
      ],
    },
  ],
};

export default function BuildingThisSiteCaseStudyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ARTICLE_SCHEMA),
        }}
      />
      {children}
    </>
  );
}
