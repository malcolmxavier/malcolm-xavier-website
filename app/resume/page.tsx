// ─────────────────────────────────────────────────────────────────
// /resume — recruiter-first web resume.
//
// Hierarchy mirrors the PDF source (see _design/source/):
//
//   1. Hero
//        ┌────────────────────┬──────────────────┐
//        │ Status kicker      │                  │
//        │ MALCOLM XAVIER     │  phone           │
//        │ positioning line   │  email           │
//        │                    │  LinkedIn        │
//        │                    │  GitHub          │
//        │                    │  Los Angeles, CA │
//        └────────────────────┴──────────────────┘
//        ────────────────  hr  ────────────────
//        Summary paragraph (Lede)
//        [Download PDF]  [View LinkedIn]
//
//   2. Work experience  Each role as <article>:
//        Company — Location           (anchor headline)
//        Role title — Dates           (sub-line, semibold + muted)
//        Italic context
//        ● bullets
//
//   3. Education  Compact entries — credential, institution, dates.
//   4. Case studies  Card grid linking to live external work.
//   5. Closing CTA  Light email/LinkedIn nudge.
//
// All copy lives in ./resume-data.ts. This file owns layout only.
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
import { Button } from "@/components/primitives/Button";
import { Link } from "@/components/primitives/Link";
import { Card } from "@/components/primitives/Card";
import {
  IconPhone,
  IconEmail,
  IconLinkedIn,
  IconGitHub,
  IconLocation,
  IconDownload,
} from "@/components/icons";
import {
  CONTACT,
  STATUS,
  HEADLINE,
  SUMMARY,
  ROLES,
  EDUCATION,
  CASE_STUDIES,
  type ResumeRole,
  type ResumeEducation,
  type ResumeCaseStudy,
} from "./resume-data";

// SEO metadata. Distinct title so resume pastes well in Slack /
// iMessage previews and search results.
export const metadata: Metadata = {
  title: "Resume — Malcolm Xavier",
  description:
    "Senior Product Manager · Growth and Data · Media, Publishing, and Streaming · AI-Native. Currently interviewing.",
};

// ─── Helper sub-components ─────────────────────────────────────────

/**
 * One work-experience block. Renders as an <article> so each role
 * is its own document outline node — assistive tech can navigate
 * role-by-role.
 *
 * Hierarchy mirrors the PDF resume:
 *   • Company is the visual anchor (Headline)
 *   • Title + Dates ride below as a semi-bold body line
 *   • Italic context, then bullets
 */
function RoleBlock({ role }: { role: ResumeRole }) {
  return (
    <article>
      <Stack gap="300">
        {/* Anchor line: Company — Location.
            Company name renders as a Link when role.url is present.
            Color via the accent prop, which maps to the
            link-accent-* classes in components.css (yellow / blue /
            red / etc. — roughly each company's brand color). */}
        <Headline
          level={3}
          style={{
            fontSize: "var(--h4-font-size)",
            lineHeight: "var(--h4-line-height)",
          }}
        >
          {role.url ? (
            <Link href={role.url} accent={role.accent}>
              {role.company}
            </Link>
          ) : (
            role.company
          )}
          {role.location ? (
            <span
              style={{
                color: "var(--text-caption)",
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              {" — "}
              {role.location}
            </span>
          ) : null}
        </Headline>

        {/* Sub-line: Title — Dates. Title carries the weight; dates
            sit muted alongside it. */}
        <p
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-md-font-size)",
            lineHeight: "var(--p-md-line-height)",
            color: "var(--text-body)",
            fontWeight: 600,
          }}
        >
          {role.title}
          <span
            style={{
              fontWeight: 400,
              color: "var(--text-caption)",
            }}
          >
            {" — "}
            {role.dates}
          </span>
        </p>

        {/* Italic single-line context, like the resume PDF */}
        <Body
          size="md"
          style={{
            maxWidth: "70ch",
            color: "var(--text-caption)",
            fontStyle: "italic",
          }}
        >
          {role.context}
        </Body>

        {/* Achievement bullets — only render the <ul> when there
            are any. Some roles (e.g. Independent Consulting) collapse
            their content into the context line above and have an
            empty bullets array. */}
        {role.bullets.length > 0 ? (
          <ul
            className="list-disc"
            style={{ paddingInlineStart: "1.25rem" }}
          >
            {role.bullets.map((bullet, idx) => (
              <li
                key={idx}
                style={{
                  fontFamily: "var(--font-secondary)",
                  fontSize: "var(--p-md-font-size)",
                  lineHeight: "var(--p-md-line-height)",
                  color: "var(--text-body)",
                  marginBlockEnd: "var(--scale-200)",
                  maxWidth: "70ch",
                }}
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </Stack>
    </article>
  );
}

/**
 * One education block. Same hierarchy convention as RoleBlock —
 * institution is the anchor, credential rides below.
 */
function EducationBlock({ entry }: { entry: ResumeEducation }) {
  return (
    <article>
      <Stack gap="200">
        <Headline
          level={3}
          style={{
            fontSize: "var(--h5-font-size)",
            lineHeight: "var(--h5-line-height)",
          }}
        >
          {entry.institution}
          <span
            style={{
              color: "var(--text-caption)",
              fontWeight: 400,
              fontStyle: "italic",
            }}
          >
            {" — "}
            {entry.location}
          </span>
        </Headline>

        <p
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-md-font-size)",
            lineHeight: "var(--p-md-line-height)",
            color: "var(--text-body)",
            fontWeight: 600,
          }}
        >
          {entry.credential}
          {entry.honors ? (
            <span style={{ fontWeight: 400, color: "var(--text-caption)" }}>
              {" — "}
              {entry.honors}
            </span>
          ) : null}
          <span style={{ fontWeight: 400, color: "var(--text-caption)" }}>
            {" — "}
            {entry.dates}
          </span>
        </p>

        {entry.context ? (
          <Body
            size="md"
            style={{
              maxWidth: "70ch",
              color: "var(--text-caption)",
              fontStyle: "italic",
            }}
          >
            {entry.context}
          </Body>
        ) : null}

        {entry.details.length > 0 ? (
          <ul className="list-disc" style={{ paddingInlineStart: "1.25rem" }}>
            {entry.details.map((d, i) => (
              <li
                key={i}
                style={{
                  fontFamily: "var(--font-secondary)",
                  fontSize: "var(--p-sm-font-size)",
                  lineHeight: "var(--p-sm-line-height)",
                  color: "var(--text-body)",
                  marginBlockEnd: "var(--scale-100)",
                  maxWidth: "70ch",
                }}
              >
                {d}
              </li>
            ))}
          </ul>
        ) : null}
      </Stack>
    </article>
  );
}

/**
 * Sticky table-of-contents that lives in the left gutter on desktop
 * (lg+) and is hidden below that breakpoint where there isn't room.
 *
 * Each item is a hash anchor pointing to a section id on the page;
 * the matching <Section> sets `scrollMarginTop` so the sticky Nav
 * doesn't clip the section heading after a TOC jump.
 *
 * Active-state / scroll-spy is intentionally deferred — anchor jumps
 * are good enough for tonight; the highlight pass comes when we tune
 * the broader information-hierarchy on this page.
 */
function TableOfContents() {
  const items = [
    // First entry returns the user to the hero. The hero Section
    // carries id="top" + scrollMarginTop so the jump lands cleanly
    // below the sticky Nav rather than getting tucked behind it.
    { href: "#top", label: "↑ Top" },
    { href: "#work-experience", label: "01 · Work experience" },
    { href: "#education", label: "02 · Education" },
    { href: "#case-studies", label: "03 · Case studies" },
    { href: "#contact", label: "Let's talk" },
  ];

  // Shared link styling — mono, uppercase, tracking-wide, muted body
  // color with a hover lift and a visible focus ring.
  const linkClasses = [
    "block rounded-sm",
    "transition-colors motion-reduce:transition-none",
    "hover:[color:var(--text-action-hover)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
  ].join(" ");

  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--p-xs-font-size)",
    lineHeight: "var(--p-xs-line-height)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-body)",
    outlineColor: "var(--border-focus)",
    textDecoration: "none",
    paddingBlock: "var(--scale-100)",
  };

  return (
    <aside className="hidden lg:block">
      {/* Sticky offset (top-24 ≈ 6rem) clears the sticky Nav with
          breathing room — same offset matches scrollMarginTop on
          each section so jump targets don't get tucked behind the Nav. */}
      <nav
        aria-label="On this page"
        className="sticky top-24"
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-xs-font-size)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-caption)",
            marginBlockEnd: "var(--scale-400)",
          }}
        >
          On this page
        </p>
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href} className={linkClasses} style={linkStyle}>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}

/**
 * Case-study card — currently links externally to the standalone
 * quiz-project deployment. Post-MVP this absorbs into /case-studies/.
 */
function CaseStudyCard({ study }: { study: ResumeCaseStudy }) {
  return (
    <Card accent={study.accent} interactive>
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
        <Link href={study.href}>Read the case study</Link>
      </Stack>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function ResumePage() {
  // Pre-format contact pieces so the JSX stays clean.
  const telHref = `tel:${CONTACT.phone.replace(/[^0-9+]/g, "")}`;
  const mailHref = `mailto:${CONTACT.email}`;

  // Shared anchor offset so TOC jumps land below the sticky Nav.
  // Matches the TOC's `top-24` sticky offset for visual consistency.
  const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

  return (
    <Container size="lg">
      {/* Two-column on desktop: TOC in the left gutter, content on the
          right. Below lg, the TOC is hidden and the content reverts to
          a single readable column constrained to ~64rem. */}
      <div className="mx-auto max-w-[64rem] lg:max-w-none lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <TableOfContents />
        <div>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section id="top" style={sectionAnchorStyle} padding="md">
        <Stack gap="500">
          {/* Status — web-only addition that's not in the PDF.
              Recruiters see availability before anything else. */}
          <Kicker accent>{STATUS}</Kicker>

          {/* Stacked hero: Name → Positioning → Contact strip.
              Each block reads top-to-bottom with no awkward column
              wrapping. The positioning headline gets the full content
              width so it never breaks mid-phrase. */}
          <Stack gap="300">
            <Display>Malcolm Xavier</Display>
            <p
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: "var(--h5-font-size)",
                lineHeight: "var(--h5-line-height)",
                color: "var(--text-caption)",
                fontStyle: "italic",
              }}
            >
              {HEADLINE}
            </p>
          </Stack>

          {/* Inline contact strip. Each item is a small icon + text
              pair; the row wraps gracefully on narrower viewports.
              Icons inherit text color via currentColor and are
              decorative (aria-hidden) since the adjacent text already
              identifies the channel. */}
          <ul
            // <ul> instead of <div> so screen readers announce
            // "list of 5 items" — the contact strip is, semantically,
            // a list of contact channels.
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--p-xs-font-size)",
              lineHeight: "var(--p-xs-line-height)",
              color: "var(--text-caption)",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li className="inline-flex items-center gap-1.5">
              <IconPhone />
              <Link href={telHref}>{CONTACT.phone}</Link>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconEmail />
              <Link href={mailHref}>{CONTACT.email}</Link>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconLinkedIn />
              <Link href={CONTACT.linkedin}>LinkedIn ↗</Link>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconGitHub />
              <Link href={CONTACT.github}>GitHub ↗</Link>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <IconLocation />
              <span>{CONTACT.location}</span>
            </li>
          </ul>

          {/* Visual rule — mimics the horizontal line on the PDF
              that sits between the header and the summary. Drawn
              against --text-heading so it carries weight without
              relying on the near-invisible --border-default. */}
          <hr
            style={{
              border: "none",
              borderTop: "2px solid var(--text-heading)",
              opacity: 0.85,
              margin: 0,
            }}
            aria-hidden
          />

          {/* Summary — the elevator pitch */}
          <Lede>{SUMMARY}</Lede>

          {/* Primary CTAs. Wraps on mobile.
              The download attribute pins the saved filename to
              "Malcolm Xavier Resume.pdf"; the PDF's embedded Title
              metadata also reads "Malcolm Xavier Resume" so browsers
              that prefer metadata for the tab/Save-As dialog don't
              leak the original Google Doc name. */}
          <div className="flex flex-wrap gap-3">
            <Button
              as="a"
              href="/resume/malcolm-xavier-resume.pdf"
              download="Malcolm Xavier Resume.pdf"
              variant="primary"
              size="lg"
            >
              <IconDownload />
              Download PDF
            </Button>
            <Button
              as="a"
              href={CONTACT.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="lg"
            >
              View on LinkedIn ↗
            </Button>
          </div>
        </Stack>
      </Section>

      {/* ─── Work Experience ───────────────────────────────────── */}
      <Section
        id="work-experience"
        style={sectionAnchorStyle}
        padding="md"
        bordered
      >
        <Stack gap="700">
          <Kicker>01 · Work experience</Kicker>
          {ROLES.map((role) => (
            <RoleBlock key={`${role.company}-${role.dates}`} role={role} />
          ))}
        </Stack>
      </Section>

      {/* ─── Education ─────────────────────────────────────────── */}
      <Section
        id="education"
        style={sectionAnchorStyle}
        padding="md"
        bordered
      >
        <Stack gap="700">
          <Kicker>02 · Education</Kicker>
          {EDUCATION.map((entry) => (
            <EducationBlock key={entry.institution} entry={entry} />
          ))}
        </Stack>
      </Section>

      {/* ─── Case studies ──────────────────────────────────────── */}
      <Section
        id="case-studies"
        style={sectionAnchorStyle}
        padding="md"
        bordered
      >
        <Stack gap="600">
          <Stack gap="200">
            <Kicker>03 · Case studies</Kicker>
            <Body>
              More to come. The first case study lives in its own
              standalone deployment; it'll move into this site post-MVP.
            </Body>
          </Stack>
          <Grid cols={CASE_STUDIES.length >= 2 ? 2 : 1} gap="600">
            {CASE_STUDIES.map((study) => (
              <CaseStudyCard key={study.slug} study={study} />
            ))}
          </Grid>
        </Stack>
      </Section>

      {/* ─── Closing CTA ───────────────────────────────────────── */}
      <Section
        id="contact"
        style={sectionAnchorStyle}
        padding="md"
        bordered
      >
        <Stack gap="400" align="start">
          <Headline level={2}>Let's talk.</Headline>
          <Body>
            If you're hiring for a Senior PM in media, publishing, or
            streaming — or you'd just like to compare notes — pick a
            slot for a{" "}
            <Link href={CONTACT.calendly}>30-minute product chat</Link>,
            send an <Link href={mailHref}>email</Link>, or reach out
            on <Link href={CONTACT.linkedin}>LinkedIn ↗</Link>.
          </Body>
        </Stack>
      </Section>
        </div>
      </div>
    </Container>
  );
}
