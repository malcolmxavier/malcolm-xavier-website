// /case-studies/people-inc — work-experience case-study layout.
// Metadata + JSON-LD (Article + BreadcrumbList). The recruiter-cluster
// brand (Instrument Serif + DM Sans + Roboto Mono, semantic tokens)
// comes from the root layout, so this layout is metadata-only except
// for the case-glass.css import that opts the study into elevated
// card chrome on EvidenceCard / IterationCard / Stat.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site-config";
import { BUILD_TIMESTAMP } from "@/lib/build-meta";
import { getCaseStudyAccent } from "@/app/resume/resume-data";
import "@/components/case-study/case-glass.css";

const SLUG = "people-inc";
// Resolved at module load. People Inc.'s role carries `accent: "yellow"`,
// so this resolves to "yellow" and the layout wrapper below tints the
// chrome (TOC active rail, progress bar, Hero accent, in-body links)
// to People Inc.'s brand color. See app/components.css for the
// --cs-accent-* tokens this attribute hooks into.
const ACCENT = getCaseStudyAccent(SLUG);
const TITLE = "Infrastructure enables personalization";
// Social-card title is intentionally different from the on-page H1
// and SERP title. The editorial title wins on the page where the
// reader has context; the social card needs to win in a feed where
// the recipient has none — so the unfurl leads with a searchable
// phrase + employer rather than the conceptual title alone. Mirrors
// the User Interviews and Muck Rack studies' split approach.
const SOCIAL_TITLE =
  "Operationalizing personalization at People Inc.";
const DESCRIPTION =
  "How a newsletter-migration mandate became a multi-year identity and onboarding roadmap—driving 33% YoY email revenue growth across People Inc.'s 40+ brands.";
const EMPLOYER = "People Inc.";
const EMPLOYER_URL = "https://people.inc";
// Role period covered by the case study. These dates are the
// startDate/endDate on the OrganizationRole below — they tell
// Schema.org parsers that the author was affiliated with the
// EMPLOYER during this window, not currently. Mirrors the
// `dates: "Feb 2024 – Oct 2025"` on the matching role in
// app/resume/resume-data.tsx; keep in sync if either side moves.
const ROLE_TITLE = "Senior Product Manager, Audience Relationships";
const ROLE_START = "2024-02";
const ROLE_END = "2025-10";
// ISO 8601 with timezone. Google's Rich Results validator flags
// date-only values on Article datePublished/dateModified as "missing
// a timezone" — append T<time>-07:00 (Pacific) or +00:00 (UTC).
// Real publish date is 2026-05-23.
const PUBLISHED = "2026-05-23T12:00:00-07:00";
// MODIFIED is the build timestamp — frozen at module load, refreshed
// every deploy. Signals "re-crawl me" to Google after any edit. See
// lib/build-meta.ts for the rationale.
const MODIFIED = BUILD_TIMESTAMP;

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
  // metadata.title drops the `—Case Study` suffix so the root layout's
  // `—Malcolm Xavier` template append doesn't push the SERP title past
  // Google's ~60 char ceiling. The JSON-LD `headline` field below keeps
  // the full `${TITLE}—Case Study` form (no length constraint there).
  title: TITLE,
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
        alt: "Malcolm Xavier—Senior product manager. Tech, media, and streaming.",
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
        caption: "Malcolm Xavier—Senior product manager. Tech, media, and streaming.",
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
        name: "Malcolm Xavier",
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
      // Publisher is the person, without role context — affiliation
      // belongs on the author entity (the byline), not the publisher.
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
      {/* Wrapper carries data-cs-accent so the chrome under it picks
          up the employer's brand color via the --cs-accent-* tokens
          in app/components.css. Falls through to a fragment when
          ACCENT is null (defensive — wouldn't happen for a properly
          configured work case study, but keeps the layout safe if
          the lookup ever returns null). */}
      {ACCENT ? <div data-cs-accent={ACCENT}>{children}</div> : children}
    </>
  );
}
