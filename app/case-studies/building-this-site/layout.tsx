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
import { SITE_URL, LINKEDIN_PROFILE_URL, twitterAttribution } from "@/lib/site-config";
import { BUILD_TIMESTAMP } from "@/lib/build-meta";

const ARTICLE_URL = `${SITE_URL}/case-studies/building-this-site`;
const ARTICLE_HEADLINE = "Building this site—Case Study";
// Description trimmed from 210 chars (Google would truncate above
// ~160) to ~155, matching the workshopped copy from the 2026-04-29
// /full-review (a-meta-descriptions-thin).
const ARTICLE_DESCRIPTION =
  "How I shipped this portfolio in seven days with Claude Code as build partner. Architecture bets, production incidents, and AI-native PM work in practice.";

export const metadata: Metadata = {
  title: "Building this site—Case Study",
  description: ARTICLE_DESCRIPTION,
  alternates: {
    canonical: "/case-studies/building-this-site",
  },
  // Full openGraph block — the prior partial declared only title /
  // description / type, which under Next.js App Router REPLACES
  // (does not merge with) the root layout's OG block, dropping
  // og:image, og:url, og:site_name, og:locale and the matching
  // twitter:image. Result: case study URLs unfurled as blank cards
  // on LinkedIn / Slack. (2026-04-29 /full-review,
  // a-per-page-og-twitter.)
  openGraph: {
    title: "Building this site—Case Study",
    description: ARTICLE_DESCRIPTION,
    type: "article",
    url: ARTICLE_URL,
    siteName: "Malcolm Xavier",
    locale: "en_US",
    publishedTime: "2026-04-29",
    modifiedTime: BUILD_TIMESTAMP,
    // Readable name for general consumers; the LinkedIn profile URL is
    // the article:author target LinkedIn resolves to link the byline.
    authors: ["Malcolm Xavier", LINKEDIN_PROFILE_URL],
    // No explicit `images` array — the App Router file convention
    // resolves `opengraph-image.tsx` at this route segment to the
    // article-specific card, auto-populating og:image / og:image:width
    // / og:image:height / og:image:alt. An explicit array here would
    // either fight or duplicate the file-convention output. See
    // ./opengraph-image.tsx for the article-specific render.
  },
  twitter: {
    card: "summary_large_image",
    ...twitterAttribution,
    title: "Building this site—Case Study",
    description: ARTICLE_DESCRIPTION,
    // Same rationale as openGraph.images above — the file convention
    // auto-populates twitter:image from opengraph-image.tsx.
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
      // image is a required field for Google Article rich results.
      // Points at THIS article's own opengraph-image route (its
      // route-specific Satori card, via file convention), NOT the
      // sitewide /opengraph-image — so the Article rich result shows the
      // case-study card, not the recruiter-hero canvas. 1200x630.
      image: {
        "@type": "ImageObject",
        url: `${ARTICLE_URL}/opengraph-image`,
        contentUrl: `${ARTICLE_URL}/opengraph-image`,
        caption: "Malcolm Xavier—Senior product manager. Tech, media, and streaming.",
        width: 1200,
        height: 630,
      },
      url: ARTICLE_URL,
      datePublished: "2026-04-29T12:00:00-07:00",
      dateModified: BUILD_TIMESTAMP,
      inLanguage: "en-US",
      articleSection: "Case Study",
      // `"@type": "Person"` and `name` are re-asserted inline so Rich
      // Results validators resolve the entity even when they don't
      // follow `@id` across separate <script> blocks.
      author: {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: "Malcolm Xavier",
      },
      publisher: {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: "Malcolm Xavier",
      },
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
