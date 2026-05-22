// /case-studies/muck-rack — work-experience case-study layout.
// Metadata + JSON-LD (Article + BreadcrumbList). The recruiter-cluster
// brand (Instrument Serif + DM Sans + Roboto Mono, semantic tokens)
// comes from the root layout, so this layout is metadata-only except
// for the case-glass.css import that opts the study into elevated
// card chrome on EvidenceCard / IterationCard / Stat.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site-config";
import "@/components/case-study/case-glass.css";

const SLUG = "muck-rack";
const TITLE = "Data platforms: quality over quantity";
// Social-card title is intentionally different from the on-page H1
// and SERP title. The editorial title wins on the page where the
// reader has context; the social card needs to win in a feed where
// the recipient has none — so the unfurl leads with a searchable
// phrase + employer rather than the conceptual title alone. Mirrors
// the User Interviews study's split approach (editorial title in
// SERP, searchable phrase in social card).
const SOCIAL_TITLE =
  "Decomposing the ingestion monolith at Muck Rack";
const DESCRIPTION =
  "How decomposing a content ingestion ETL monolith into microservices lifted daily ingestion 350% YoY at Muck Rack—a platform PM quality-over-quantity bet.";
const EMPLOYER = "Muck Rack";
const EMPLOYER_URL = "https://muckrack.com";
// Role period covered by the case study. These dates are the
// startDate/endDate on the OrganizationRole below — they tell
// Schema.org parsers that the author was affiliated with the
// EMPLOYER during this window, not currently. Mirrors the
// `dates: "Sep 2022 – Feb 2024"` on the matching role in
// app/resume/resume-data.tsx; keep in sync if either side moves.
const ROLE_TITLE = "Technical Product Manager, Content and Data Ingestion";
const ROLE_START = "2022-09";
const ROLE_END = "2024-02";
// ISO 8601 with timezone. Google's Rich Results validator flags
// date-only values on Article datePublished/dateModified as "missing
// a timezone" — append T<time>-07:00 (Pacific) or +00:00 (UTC).
// Real publish date is 2026-05-18 (case study authored today).
const PUBLISHED = "2026-05-18T12:00:00-07:00";
const MODIFIED = "2026-05-18T12:00:00-07:00";

const ARTICLE_URL = `${SITE_URL}/case-studies/${SLUG}`;
const ARTICLE_HEADLINE = `${TITLE}—Case Study`;

// ─── Page metadata ────────────────────────────────────────────────
// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent OG blocks. Without these, the
// page would unfurl with the sitewide stub on LinkedIn / Slack.
//
// `type: "article"` is what eligibles long-form for Google Top Stories
// and is the right schema for Perplexity / ChatGPT search citation.

export const metadata: Metadata = {
  title: `${TITLE}—Case Study`,
  description: DESCRIPTION,
  alternates: {
    canonical: `/case-studies/${SLUG}`,
  },
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    type: "article",
    url: ARTICLE_URL,
    siteName: "Malcolm Xavier",
    locale: "en_US",
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
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
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

// ─── JSON-LD ──────────────────────────────────────────────────────
// Article + BreadcrumbList. The author references the sitewide
// Person `@id` from app/layout.tsx with `"@type": "Person"` re-
// asserted inline so Rich Results validators resolve the entity
// even when they don't follow `@id` across separate <script>
// blocks. The `affiliation` is an OrganizationRole with
// startDate/endDate — Schema.org's pattern for time-bounded
// affiliations. This tells AI-search systems and crawlers that
// the author was at EMPLOYER during the role period, not that
// they're currently there. Mirrors the resume's role dates.
//
// `image` is a required field for Google Article rich results.
// Mirrors the OG image URL declared in metadata.openGraph.images.

const ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${ARTICLE_URL}/#article`,
      headline: ARTICLE_HEADLINE,
      description: DESCRIPTION,
      image: {
        "@type": "ImageObject",
        url: `${SITE_URL}/opengraph-image`,
        contentUrl: `${SITE_URL}/opengraph-image`,
        caption: "Malcolm Xavier—Senior product manager. Tech, media, streaming.",
        width: 1200,
        height: 630,
      },
      url: ARTICLE_URL,
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
      inLanguage: "en-US",
      articleSection: "Case Study",
      author: {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        affiliation: {
          "@type": "OrganizationRole",
          roleName: ROLE_TITLE,
          startDate: ROLE_START,
          endDate: ROLE_END,
          affiliation: {
            "@type": "Organization",
            name: EMPLOYER,
            url: EMPLOYER_URL,
          },
        },
      },
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
          name: TITLE,
          item: ARTICLE_URL,
        },
      ],
    },
  ],
};

export default function WorkCaseStudyLayout({
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
