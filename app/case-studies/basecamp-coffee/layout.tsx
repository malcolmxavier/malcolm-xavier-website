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
import { SITE_URL } from "@/lib/site-config";
// Glass-card chrome lives in a shared location now (see
// components/case-study/case-glass.css). The previous local
// case-study.css had been deleted; this layout opts into the glass
// treatment by importing the shared file. Future case studies that
// want flat cards simply omit this import.
import "@/components/case-study/case-glass.css";

const ARTICLE_URL = `${SITE_URL}/case-studies/basecamp-coffee`;
const ARTICLE_HEADLINE = "Basecamp Coffee—Case Study";
const ARTICLE_DESCRIPTION =
  "How I used Claude Code to diagnose a collapsing loyalty program and ship a working prototype. A Growth PM portfolio artifact.";

export const metadata: Metadata = {
  title: "Basecamp Coffee—Case Study",
  description: ARTICLE_DESCRIPTION,
  alternates: {
    canonical: "/case-studies/basecamp-coffee",
  },
  // Full openGraph block — the prior partial declared only title /
  // description / type, which under Next.js App Router REPLACES
  // (does not merge with) the root layout's OG block, dropping
  // og:image, og:url, og:site_name, og:locale and the matching
  // twitter:image. Result: case study URLs unfurled as blank cards
  // on LinkedIn / Slack. (2026-04-29 /full-review,
  // a-per-page-og-twitter.)
  openGraph: {
    title: "Basecamp Coffee—Case Study",
    description: ARTICLE_DESCRIPTION,
    type: "article",
    url: ARTICLE_URL,
    siteName: "Malcolm Xavier",
    locale: "en_US",
    publishedTime: "2026-04-26",
    modifiedTime: "2026-04-29",
    authors: ["Malcolm Xavier"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Malcolm Xavier—Senior product manager. Tech, media, streaming.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Basecamp Coffee—Case Study",
    description: ARTICLE_DESCRIPTION,
    images: ["/opengraph-image"],
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
      // image is a required field for Google Article rich results.
      // Mirrors the OG image URL declared in metadata.openGraph.images;
      // dimensions match the Satori-rendered /opengraph-image route.
      image: {
        "@type": "ImageObject",
        url: `${SITE_URL}/opengraph-image`,
        contentUrl: `${SITE_URL}/opengraph-image`,
        caption: "Malcolm Xavier—Senior product manager. Tech, media, streaming.",
        width: 1200,
        height: 630,
      },
      url: ARTICLE_URL,
      datePublished: "2026-04-26T12:00:00-07:00",
      dateModified: "2026-05-16T12:00:00-07:00",
      inLanguage: "en-US",
      articleSection: "Case Study",
      author: { "@id": `${SITE_URL}/#person` },
      publisher: { "@id": `${SITE_URL}/#person` },
      mainEntityOfPage: ARTICLE_URL,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Case studies",
          item: `${SITE_URL}/case-studies`,
        },
        {
          "@type": "ListItem",
          position: 3,
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
