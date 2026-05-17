// ─────────────────────────────────────────────────────────────────
// /case-studies/architecture-under-contract — route layout.
//
// Sequel to building-this-site, focused on the integration layer for
// /music, /films, and /television. Same recruiter-cluster brand the
// rest of the site uses (Instrument Serif + DM Sans + Roboto Mono,
// semantic text/surface/border tokens, all loaded from the root
// layout), so this layout is metadata + JSON-LD only.
//
// No `case-glass.css` import — matches building-this-site, not the
// Basecamp study. Cards render as flat rounded surfaces, in keeping
// with the editorial-restraint posture of the meta-narrative cluster.
//
// Per-page openGraph + twitter blocks declared explicitly because
// Next.js App Router REPLACES (does not merge) the root layout's OG
// block when a child layout declares its own metadata. Without these,
// case-study URLs unfurl on LinkedIn / Slack with the sitewide stub.
// Pattern mirrors `app/case-studies/building-this-site/layout.tsx`.
// Per the 2026-05-11 /full-review pre-publish pass.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site-config";

const ARTICLE_URL = `${SITE_URL}/case-studies/architecture-under-contract`;
const ARTICLE_HEADLINE = "Architecture under contract—Case Study";
const ARTICLE_DESCRIPTION =
  "Three pages, three completely different upstreams, one rendering contract. Polite-client posture for the one with no API; TMDB enrichment for two.";

export const metadata: Metadata = {
  title: ARTICLE_HEADLINE,
  description: ARTICLE_DESCRIPTION,
  alternates: {
    canonical: "/case-studies/architecture-under-contract",
  },
  openGraph: {
    title: ARTICLE_HEADLINE,
    description: ARTICLE_DESCRIPTION,
    type: "article",
    url: "/case-studies/architecture-under-contract",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    publishedTime: "2026-05-12",
    modifiedTime: "2026-05-12",
    authors: ["Malcolm Xavier"],
    // No explicit `images` array — the App Router file convention
    // resolves `opengraph-image.tsx` at this route segment to the
    // article-specific card, auto-populating og:image / og:image:width
    // / og:image:height / og:image:alt. An explicit array here would
    // either fight or duplicate the file-convention output. See
    // ./opengraph-image.tsx for the article-specific render.
  },
  twitter: {
    card: "summary_large_image",
    title: ARTICLE_HEADLINE,
    description: ARTICLE_DESCRIPTION,
    // Same rationale as openGraph.images above — the file convention
    // auto-populates twitter:image from opengraph-image.tsx.
  },
};

// JSON-LD: Article + BreadcrumbList. Mirrors the sibling case-study
// layouts — author/publisher point at the sitewide Person @id from
// `app/layout.tsx`. Three-level breadcrumb because `/case-studies`
// is a real index route now (unlike at the time building-this-site
// was originally authored).
const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${ARTICLE_URL}/#article`,
      headline: ARTICLE_HEADLINE,
      description: ARTICLE_DESCRIPTION,
      // image is a required field for Google Article rich results.
      // Points at the per-route opengraph-image.tsx render (article-
      // specific Satori card), NOT the sitewide /opengraph-image, so
      // Google's rich-result preview and OG unfurl both show the
      // article title rather than the recruiter-hero canvas.
      image: {
        "@type": "ImageObject",
        url: `${ARTICLE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
      },
      url: ARTICLE_URL,
      datePublished: "2026-05-12T12:00:00-07:00",
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
          name: "Architecture under contract",
          item: ARTICLE_URL,
        },
      ],
    },
  ],
};

export default function FeedTrilogyCaseStudyLayout({
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
