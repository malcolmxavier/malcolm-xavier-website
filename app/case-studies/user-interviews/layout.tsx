// /case-studies/user-interviews — work-experience case-study layout.
// Metadata + JSON-LD (Article + BreadcrumbList). The recruiter-cluster
// brand (Instrument Serif + DM Sans + Roboto Mono, semantic tokens)
// comes from the root layout, so this layout is metadata-only except
// for the case-glass.css import for the glass-card chrome.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL, LINKEDIN_PROFILE_URL, twitterAttribution } from "@/lib/site-config";
import { BUILD_TIMESTAMP } from "@/lib/build-meta";
import { getCaseStudyAccent } from "@/app/resume/resume-data";
import "@/components/case-study/case-glass.css";

const SLUG = "user-interviews";
// Resolved at module load. The UI role doesn't set an explicit
// accent (the loud-link default green is already User Interviews'
// brand color), so getCaseStudyAccent falls back to "green". The
// resulting --cs-accent-* values match the chrome's pre-themed
// hardcoded greens, so this study renders identically to before
// while still going through the unified themed code path.
const ACCENT = getCaseStudyAccent(SLUG);
const TITLE = "Steering leading indicators";
// Social-card title is intentionally different from the on-page H1
// and SERP title. The conceptual editorial title ("Steering leading
// indicators") wins on the page where the reader has context; the
// social card needs to win in a feed where the recipient has none —
// so the unfurl leads with the searchable subtitle phrase, mirrors
// the on-page hero subtitle exactly (editorial integrity bonus), and
// drops the "—Case Study" suffix because at 66 chars the social
// title is already long enough without it (OG `type: "article"` plus
// the URL path signal case-study status to crawlers regardless).
const SOCIAL_TITLE =
  "Targeting, retention, and marketplace mechanics at User Interviews";
const DESCRIPTION =
  "How occupational targeting lifted Early Qualification Rate 15% at User Interviews—a leading-indicator bet on a two-sided UXR marketplace.";
const EMPLOYER = "User Interviews";
const EMPLOYER_URL = "https://www.userinterviews.com";
// Role period covered by the case study. These dates are the
// startDate/endDate on the OrganizationRole below — they tell
// Schema.org parsers that the author was affiliated with the
// EMPLOYER during this window, not currently. Mirrors the
// `dates: "Sep 2020 – Feb 2022"` on the matching role in
// app/resume/resume-data.tsx; keep in sync if either side moves.
const ROLE_TITLE = "Product Manager";
const ROLE_START = "2020-09";
const ROLE_END = "2022-02";
// ISO 8601 with timezone. Google's Rich Results validator flags date-only
// values as "missing a timezone" for Article datePublished/dateModified —
// the format-only fix is to append T<time>-07:00 (Pacific) or +00:00 (UTC).
// Real publish date is 2026-05-16 (case study merged to main and Vercel
// deployed that afternoon); the earlier "2026-05-14" was a draft-time
// placeholder set while authoring locally.
const PUBLISHED = "2026-05-16T22:00:00-07:00";
// MODIFIED is the build timestamp — frozen at module load, refreshed
// every deploy. See lib/build-meta.ts for the rationale.
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
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    // Same rationale as openGraph.images above — the file convention
    // auto-populates twitter:image from opengraph-image.tsx.
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
          in app/components.css. See the muck-rack layout for the
          fuller comment — this study uses the same pattern. */}
      {ACCENT ? <div data-cs-accent={ACCENT}>{children}</div> : children}
    </>
  );
}
