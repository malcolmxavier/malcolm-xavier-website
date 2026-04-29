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
import "./case-study.css";

const ARTICLE_URL = "https://malxavi.com/case-studies/basecamp-coffee";
const ARTICLE_HEADLINE = "Basecamp Coffee — Case Study";
const ARTICLE_DESCRIPTION =
  "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.";

export const metadata: Metadata = {
  title: "Basecamp Coffee—Case Study",
  description: ARTICLE_DESCRIPTION,
  alternates: {
    canonical: "/case-studies/basecamp-coffee",
  },
  openGraph: {
    title: "Basecamp Coffee—Case Study",
    description: ARTICLE_DESCRIPTION,
    type: "article",
  },
};

// JSON-LD: Article + BreadcrumbList for the case study. `author` and
// `publisher` reference the sitewide Person `@id` defined in
// `app/layout.tsx`, so AI-search systems extract a clean attribution
// graph (this article was written by the entity who runs the site).
// Per the 2026-04-29 /full-review (a-no-jsonld) — Article schema is
// what eligibles long-form for Google's "Top stories" carousel and
// gives Perplexity / ChatGPT search structured author attribution.
const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${ARTICLE_URL}/#article`,
      headline: ARTICLE_HEADLINE,
      description: ARTICLE_DESCRIPTION,
      url: ARTICLE_URL,
      datePublished: "2026-04-26",
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
          name: "Basecamp Coffee",
          item: ARTICLE_URL,
        },
      ],
    },
  ],
};

export default function BasecampCaseStudyLayout({
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
