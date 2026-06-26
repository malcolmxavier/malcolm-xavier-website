// ─────────────────────────────────────────────────────────────────
// /case-studies — index page listing all case studies.
//
// Why this exists: until this route shipped, /case-studies/* studies
// were only reachable via the resume page or via the meta study's
// mid-article cross-link. Direct readers (someone who landed on a
// study via search, share link, or LinkedIn unfurl) had no way to
// browse the rest. Closes m-no-case-studies-index and the index half
// of a-case-study-no-next-step from the 2026-04-29 /full-review.
//
// Implementation: reuses CASE_STUDIES from app/resume/resume-data.tsx
// as the source of truth so a new study lands in three places at once
// (resume card grid, this index, and the sitemap). The card markup
// below mirrors CaseStudyCard from app/resume/page.tsx without
// re-exporting it — duplication is small, and keeping the resume's
// version private avoids cross-route coupling for ~25 lines of JSX.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Card } from "@/components/primitives/Card";
import { Link } from "@/components/primitives/Link";
import {
  TableOfContents,
  type TocItem,
} from "@/components/chrome/TableOfContents";
import {
  type ResumeCaseStudy,
  sortedCaseStudiesNewestFirst,
} from "../resume/resume-data";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these, /case-studies shared anywhere
// would unfurl with the sitewide stub. (2026-04-29 /full-review,
// a-per-page-og-twitter.)
const INDEX_DESCRIPTION =
  "Long-form case studies from Malcolm Xavier on PM craft, AI-native shipping, and growth experiments. All written with Claude Code as build partner.";
const INDEX_OG_TITLE = "Case Studies · Malcolm Xavier";

export const metadata: Metadata = {
  title: "Case studies",
  description: INDEX_DESCRIPTION,
  alternates: {
    canonical: "/case-studies",
  },
  openGraph: {
    title: INDEX_OG_TITLE,
    description: INDEX_DESCRIPTION,
    type: "website",
    url: "/case-studies",
    siteName: "Malcolm Xavier",
    locale: "en_US",
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
    title: INDEX_OG_TITLE,
    description: INDEX_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/**
 * Sticky table-of-contents that lives in the left gutter on desktop
 * (lg+) and is hidden below that breakpoint. Mirrors the resume
 * page's ResumeTableOfContents pattern so the two index-style
 * surfaces (/resume and /case-studies) feel like the same primitive.
 *
 * Each item is a hash anchor pointing to a section id on the page;
 * matching <Section> elements set `scrollMarginTop` so the sticky
 * Nav doesn't clip the section heading after a TOC jump.
 *
 * Designed to grow: adding a new section (e.g. "Product teardowns")
 * is one new TOC_ITEMS entry plus one new <Section id="..."> below.
 */
const TOC_ITEMS: TocItem[] = [
  { href: "#top", label: "↑ Top" },
  { href: "#work", prefix: "01", label: "Work" },
  { href: "#project", prefix: "02", label: "Project" },
];

function CaseStudiesTableOfContents() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <TableOfContents items={TOC_ITEMS} ariaLabel="Page sections" />
      </div>
    </aside>
  );
}

// Shared anchor offset so TOC jumps land below the sticky Nav.
// Matches the TOC's `top-24` sticky offset for visual consistency,
// and mirrors the resume page's `sectionAnchorStyle`.
const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

export default function CaseStudiesIndex() {
  // Personal/site case studies (no employer) and work-experience
  // case studies (employer set) render in two distinct sections so
  // a recruiter can scan the categories independently. The work
  // section is suppressed entirely when empty — no "coming soon"
  // placeholder.
  //
  // Both lists are sorted newest-first by publishedAt so the lead
  // tile of each section is the most recent study; with the locked
  // 2-col grid, reading left-to-right then top-to-bottom traverses
  // the publication timeline in reverse chronological order.
  const sorted = sortedCaseStudiesNewestFirst();
  const projectStudies = sorted.filter((s) => !s.employer);
  const workStudies = sorted.filter((s) => s.employer);

  return (
    <Container size="lg">
      {/* Two-column on desktop: TOC in the left gutter, content on the
          right. Below lg, the TOC is hidden and the content reverts to
          a single readable column constrained to ~64rem. Mirrors the
          resume page's grid wrapper for visual parity across the two
          index surfaces. */}
      <div className="mx-auto max-w-[64rem] lg:max-w-none lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <CaseStudiesTableOfContents />
        <div>
          {/* ─── Hero ──────────────────────────────────────────────── */}
          <Section id="top" style={sectionAnchorStyle} padding="lg">
            <Stack gap="500">
              <Kicker>Case studies</Kicker>
              <Display>The long-form work.</Display>
              <Lede>
                Work case studies from past roles up top; project case
                studies and meta builds below. All written with Claude
                Code as build partner.
              </Lede>
            </Stack>
          </Section>

          {/* All sections use cols={2}. Index policy is "every section
              renders in a 2-col grid, full stop" — keeps single-card
              orphans at the same half-width as multi-card neighbors,
              regardless of which section has how many cards. Grid is
              `grid-cols-1 sm:grid-cols-2`, so mobile still stacks. */}

          {/* Section order is Work → Project (and eventually →
              Teardowns). Work-experience is the higher-priority signal
              for the recruiter audience; project case studies + meta
              builds follow as the "how I think and build" surface. */}

          {/* ─── Work case studies — only when there are any ───────── */}
          {workStudies.length > 0 ? (
            <Section id="work" style={sectionAnchorStyle} padding="md" bordered>
              <Stack gap="500">
                <Kicker as="h2">Work case studies</Kicker>
                <Grid cols={2} gap="600">
                  {workStudies.map((study) => (
                    <CaseStudyCard key={study.slug} study={study} />
                  ))}
                </Grid>
              </Stack>
            </Section>
          ) : null}

          {/* ─── Project case studies ──────────────────────────────── */}
          <Section id="project" style={sectionAnchorStyle} padding="md" bordered>
            <Stack gap="500">
              <Kicker as="h2">Project case studies</Kicker>
              <Grid cols={2} gap="600">
                {projectStudies.map((study) => (
                  <CaseStudyCard key={study.slug} study={study} />
                ))}
              </Grid>
            </Stack>
          </Section>
        </div>
      </div>
    </Container>
  );
}

// One card per case study. Mirrors the shape used on /resume so the
// two surfaces read as the same primitive — but kept private here
// to avoid cross-route coupling for a small piece of JSX.
function CaseStudyCard({ study }: { study: ResumeCaseStudy }) {
  return (
    <Card accent={study.accent}>
      <Stack gap="300">
        <Kicker>Case study</Kicker>
        <Headline
          level={3}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {study.title}
        </Headline>
        <Body size="md">{study.description}</Body>
        {/* aria-label disambiguates "Read the case study →" in
            screen-reader rotor/link lists where multiple cards on
            this page would otherwise expose identical strings.
            Sighted users see the same visible label; AT users hear
            the case-study title appended. */}
        <Link
          href={study.href}
          aria-label={`Read the case study: ${study.title}`}
        >
          Read the case study →
        </Link>
        {study.liveHref && (
          <Link
            href={study.liveHref}
            quiet
            aria-label={`Visit the live project: ${study.title}`}
          >
            Visit the live project &#8599;
          </Link>
        )}
      </Stack>
    </Card>
  );
}
