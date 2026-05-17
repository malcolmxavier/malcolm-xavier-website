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
import { SITE_URL } from "@/lib/site-config";

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
    url: "/case-studies/building-this-site",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    publishedTime: "2026-04-29",
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
    title: "Building this site—Case Study",
    description: ARTICLE_DESCRIPTION,
    images: ["/opengraph-image"],
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
      // Mirrors the OG image URL declared in metadata.openGraph.images;
      // dimensions match the Satori-rendered /opengraph-image route.
      image: {
        "@type": "ImageObject",
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
      },
      url: ARTICLE_URL,
      datePublished: "2026-04-29",
      dateModified: "2026-04-29",
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
