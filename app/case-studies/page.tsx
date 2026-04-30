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
  CASE_STUDIES,
  type ResumeCaseStudy,
} from "../resume/resume-data";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these, /case-studies shared anywhere
// would unfurl with the sitewide stub. (2026-04-29 /full-review,
// a-per-page-og-twitter.)
const INDEX_DESCRIPTION =
  "Long-form case studies from Malcolm Xavier — Growth PM artifacts and the meta build of this portfolio. Both written with Claude Code as build partner.";
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

export default function CaseStudiesIndex() {
  return (
    <Container size="md">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section padding="lg">
        <Stack gap="500">
          <Kicker>Case studies</Kicker>
          <Display>The long-form work.</Display>
          <Lede>
            Two studies today. Both written with Claude Code as build
            partner — one is a Growth PM artifact dissecting a
            collapsing loyalty program, the other is the meta version
            of how this site itself was shipped.
          </Lede>
        </Stack>
      </Section>

      {/* ─── Studies grid ──────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Grid
          // 1 study reads as a single-column callout; 2 fills a tablet
          // row; 3+ shifts to a proper grid. Same conditional-cols
          // pattern the homepage matrix uses.
          cols={
            CASE_STUDIES.length >= 3
              ? 3
              : CASE_STUDIES.length >= 2
              ? 2
              : 1
          }
          gap="600"
        >
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </Grid>
      </Section>
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
          level={2}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {study.title}
        </Headline>
        <Body size="md">{study.description}</Body>
        <Link href={study.href}>Read the case study &rarr;</Link>
        {study.liveHref && (
          <Link href={study.liveHref} quiet>
            Visit the live project &#8599;
          </Link>
        )}
      </Stack>
    </Card>
  );
}
