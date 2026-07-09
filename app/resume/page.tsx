// ─────────────────────────────────────────────────────────────────
// /resume — recruiter-first web resume.
//
// Hierarchy mirrors the PDF source (see _private/_source/):
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
//        Company · Location           (anchor headline)
//        Role title · Dates           (sub-line, semibold + muted)
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
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Button } from "@/components/primitives/Button";
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { formatLastUpdated } from "@/lib/case-studies/basecamp-coffee/last-updated";
import {
  TableOfContents,
  type TocItem,
} from "@/components/chrome/TableOfContents";
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
  slugifyRoleAnchor,
  type ResumeRole,
  type ResumeEducation,
} from "./resume-data";
import { CaseStudyCarousel } from "./CaseStudyCarousel";

// SEO metadata. Distinct title so resume pastes well in Slack /
// iMessage previews and search results. The explicit `canonical`
// override keeps Googlebot from treating /resume as a duplicate of
// the root layout's canonical-of-"/" (caught in the 2026-04-29
// /full-review, c-canonicals-all-root).
//
// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these explicit blocks, /resume shared
// on LinkedIn unfurled with the sitewide stub title and no per-page
// description. (2026-04-29 /full-review, a-per-page-og-twitter.)
const RESUME_DESCRIPTION =
  "Malcolm Xavier’s web resume. Senior PM with growth, data, and AI work across media and streaming. Currently interviewing. Download PDF or book a call.";
const RESUME_OG_TITLE = "Malcolm Xavier · Senior PM Resume";

export const metadata: Metadata = {
  // Title surfaces "Senior PM" — the keyword recruiters actually
  // Google. The root layout's `%s—Malcolm Xavier` template appends
  // the brand name once; not duplicating it here. Closes
  // h-titles-underdeveloped from the 2026-04-29 /full-review.
  title: "Resume · Senior PM",
  description: RESUME_DESCRIPTION,
  alternates: {
    canonical: "/resume",
  },
  openGraph: {
    title: RESUME_OG_TITLE,
    description: RESUME_DESCRIPTION,
    type: "profile",
    url: "/resume",
    siteName: "Malcolm Xavier",
    locale: "en_US",
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
    title: RESUME_OG_TITLE,
    description: RESUME_DESCRIPTION,
    images: ["/opengraph-image"],
  },
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
  // Stable per-role anchor id. Work-case-study layouts target this
  // via `From my time at <Employer> · <Title>` backlinks under their
  // hero, so the case study can deep-link a reader straight back to
  // the role on the resume.
  const anchorId = slugifyRoleAnchor(role);
  return (
    <article id={anchorId} style={{ scrollMarginTop: "6rem" }}>
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
              className="italic-inline"
              style={{
                color: "var(--text-caption)",
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              {" · "}
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
            {" · "}
            {role.dates}
          </span>
        </p>

        {/* Italic single-line context, like the resume PDF */}
        <Body
          size="md"
          className="italic-kern"
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
                // Composite key — role-anchor + index + text prefix.
                // Bullets are typed React.ReactNode (occasionally JSX),
                // so String() coerces safely; for plain-string bullets
                // (the common case) this gives a text-stable key that
                // tolerates reordering. Closes m-resume-bullet-keys
                // from the 2026-04-29 /full-review.
                key={`${role.company}-${role.dates}-${idx}-${String(bullet).slice(0, 24)}`}
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
        {/* Related-case-study footer link. Renders only on roles
            that opt in via the `relatedCaseStudies` field; absent
            when the array is unset or empty. Subtle by design. */}
        <RoleCaseStudyLink role={role} />
      </Stack>
    </article>
  );
}

/**
 * Subtle inline arrow link surfaced under a role's bullets when
 * `role.relatedCaseStudies` is set. One slug deep-links straight to
 * the case study; two or more roll up to /case-studies#work so the
 * resume itself stays tight. The role's accent flows through to the
 * link to signal which role the studies relate to.
 */
function RoleCaseStudyLink({ role }: { role: ResumeRole }) {
  const slugs = role.relatedCaseStudies;
  if (!slugs || slugs.length === 0) return null;

  // No `color` here — the Link primitive's `accent` prop owns the
  // text color so the affordance reads at the body weight (or accent
  // tone) rather than crushing the link to caption-grey alongside
  // the role's bullets. Drops the previous `color: var(--text-caption)`
  // on the wrapper which was muting the Link's intended accent.
  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--p-xs-font-size)",
    lineHeight: "var(--p-xs-line-height)",
    margin: 0,
  };

  if (slugs.length === 1) {
    const study = CASE_STUDIES.find((s) => s.slug === slugs[0]);
    // Fallback to a constructed path so a typo would still render
    // a navigable (if 404'ing) link rather than throwing — though
    // the load-time assertion in resume-data.tsx should catch
    // typos before they ever get here.
    const href = study?.href ?? `/case-studies/${slugs[0]}`;
    const ariaLabel = study
      ? `Read the case study: ${study.title}`
      : `Read the case study for ${role.company}`;
    return (
      <p style={linkStyle}>
        {/* TrackOnClick instruments the resume → case-study half of
            the cross-link loop; the paired case-study → resume
            half is wrapped on the case-study hero kicker.
            aria-label disambiguates the link in screen-reader
            rotor lists. */}
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: `resume-role-${slugs[0]}`, direction: "to-case-study" }}
        >
          <Link href={href} accent={role.accent} aria-label={ariaLabel}>
            → Read the case study
          </Link>
        </TrackOnClick>
      </p>
    );
  }

  return (
    <p style={linkStyle}>
      <TrackOnClick
        event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
        eventData={{ surface: `resume-role-${slugs[0]}-multi`, direction: "to-case-study-index" }}
      >
        <Link
          href="/case-studies#work"
          accent={role.accent}
          aria-label={`Related case studies for ${role.company} (${slugs.length})`}
        >
          → Related case studies ({slugs.length})
        </Link>
      </TrackOnClick>
    </p>
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
            className="italic-inline"
            style={{
              color: "var(--text-caption)",
              fontWeight: 400,
              fontStyle: "italic",
            }}
          >
            {" · "}
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
              {" · "}
              {entry.honors}
            </span>
          ) : null}
          <span style={{ fontWeight: 400, color: "var(--text-caption)" }}>
            {" · "}
            {entry.dates}
          </span>
        </p>

        {entry.context ? (
          <Body
            size="md"
            className="italic-kern"
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
                // Stable composite key (institution-anchor + text prefix
                // + index). Same reasoning as the role-bullet keys above.
                key={`${entry.institution}-${i}-${d.slice(0, 24)}`}
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
 * (lg+) and is hidden below that breakpoint. Renders the shared
 * TableOfContents component (chrome) inside a sticky-positioned
 * <aside> so the rail stays visible while readers scroll, and gets
 * scroll-spy + smooth scroll + recruiter-green active state for free.
 *
 * Each item is a hash anchor pointing to a section id on the page;
 * the matching <Section> sets `scrollMarginTop` so the sticky Nav
 * doesn't clip the section heading after a TOC jump.
 */
const TOC_ITEMS: TocItem[] = [
  // First entry returns the user to the hero. The hero Section
  // carries id="top" + scrollMarginTop so the jump lands cleanly
  // below the sticky Nav rather than getting tucked behind it.
  { href: "#top", label: "↑ Top" },
  { href: "#work-experience", prefix: "01", label: "Work experience" },
  { href: "#education", prefix: "02", label: "Education" },
  { href: "#case-studies", prefix: "03", label: "Case studies" },
  { href: "#contact", label: "Let’s talk" },
];

function ResumeTableOfContents() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <TableOfContents items={TOC_ITEMS} />
      </div>
    </aside>
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
        <ResumeTableOfContents />
        <div>
        {/* ─── Hero ──────────────────────────────────────────────── */}
        <Section id="top" style={sectionAnchorStyle} padding="md">
          <Stack gap="500">
            {/* Status — web-only addition that's not in the PDF.
                Recruiters see availability before anything else. */}
            <Stack gap="100">
              <Kicker accent>{STATUS}</Kicker>
              {/* "Last updated" dateline — answers the implicit
                  recruiter question "is this current?" The case
                  studies use the same formatter for parity. Closes
                  m-resume-no-last-updated from the 2026-04-29
                  /full-review. */}
              <Dateline>Last updated {formatLastUpdated()}</Dateline>
            </Stack>
  
            {/* Stacked hero: Name → Positioning → Contact strip.
                Each block reads top-to-bottom with no awkward column
                wrapping. The positioning headline gets the full content
                width so it never breaks mid-phrase. */}
            <Stack gap="300">
              <Display>Malcolm Xavier</Display>
              <p
                className="italic-kern"
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
              // a list of contact channels. Bumped row leading to 1.5
              // and added vertical padding so each tappable <li> clears
              // the WCAG 2.2 SC 2.5.8 24×24 minimum target. role="list"
              // because Safari iOS strips the implicit role under
              // list-style: none.
              role="list"
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--p-xs-font-size)",
                lineHeight: "1.5",
                color: "var(--text-caption)",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              <li className="inline-flex items-center gap-1.5 py-1 min-h-6">
                <IconPhone />
                <Link href={telHref}>{CONTACT.phone}</Link>
              </li>
              <li className="inline-flex items-center gap-1.5 py-1 min-h-6">
                <IconEmail />
                <TrackOnClick
                  event={ANALYTICS_EVENTS.EMAIL_CLICK}
                  eventData={{ kind: "direct", surface: "resume-contact-strip" }}
                >
                  <Link href={mailHref}>{CONTACT.email}</Link>
                </TrackOnClick>
              </li>
              <li className="inline-flex items-center gap-1.5 py-1 min-h-6">
                <IconLinkedIn />
                <Link href={CONTACT.linkedin}>LinkedIn ↗</Link>
              </li>
              <li className="inline-flex items-center gap-1.5 py-1 min-h-6">
                <IconGitHub />
                <Link href={CONTACT.github}>GitHub ↗</Link>
              </li>
              <li className="inline-flex items-center gap-1.5 py-1 min-h-6">
                <IconLocation />
                <span>{CONTACT.location}</span>
              </li>
            </ul>
  
            {/* Visual rule — mimics the horizontal line on the PDF
                that sits between the header and the summary. Drawn
                against --text-heading so it carries weight without
                relying on the near-invisible --border-default. The
                prior `opacity: 0.85` magic number was dropped per
                l-resume-hr-magic-opacity from the 2026-04-29
                /full-review — let the token carry the weight. */}
            <hr
              style={{
                border: "none",
                borderTop: "2px solid var(--text-heading)",
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
              <TrackOnClick event={ANALYTICS_EVENTS.RESUME_PDF_DOWNLOAD}>
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
              </TrackOnClick>
              {/* "Send this to a hiring manager" mailto button —
                  compresses the friction when a recruiter wants to
                  upstream the resume to a hiring manager. The
                  ?ref=share query tag attributes shared traffic for
                  later analytics. Subject + body URI-encoded so
                  Outlook / Apple Mail / Gmail render correctly.
                  Closes h-resume-no-forward (Option B) from the
                  2026-04-29 /full-review.

                  EMAIL_CLICK with kind=forward distinguishes this
                  upstream-share action from kind=direct mailto
                  events. */}
              <TrackOnClick
                event={ANALYTICS_EVENTS.EMAIL_CLICK}
                eventData={{ kind: "forward", surface: "resume-hero" }}
              >
                <Button
                  as="a"
                  href={`mailto:?subject=${encodeURIComponent(
                    "Malcolm Xavier — Senior PM",
                  )}&body=${encodeURIComponent(
                    `Worth a look: ${SITE_URL}/resume?ref=share`,
                  )}`}
                  variant="secondary"
                  size="lg"
                >
                  Send this to a hiring manager
                </Button>
              </TrackOnClick>
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
            <Kicker as="h2">01 · Work experience</Kicker>
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
            <Kicker as="h2">02 · Education</Kicker>
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
          {/* Carousel owns the section's kicker + control row so the
              arrow buttons sit on the same baseline as the heading.
              Section's <Stack> wrapping is collapsed since the
              carousel renders its own internal vertical rhythm. */}
          <CaseStudyCarousel kickerLabel="03 · Case studies" />
        </Section>
  
        {/* ─── Closing CTA ───────────────────────────────────────── */}
        <Section
          id="contact"
          style={sectionAnchorStyle}
          padding="md"
          bordered
        >
          {/* Three peer-equal inline links diluted the primary action.
              Bottom-of-resume readers are highest-intent — the
              hierarchy now leads with a primary LinkedIn button
              (the canonical recruiter inbound channel) and demotes
              email + Calendly to inline secondary links. Closes
              m-resume-closing-cta-flat from the 2026-04-29
              /full-review. */}
          <Stack gap="400" align="start">
            <Headline level={2}>Let’s talk.</Headline>
            <Body>
              If you’re hiring for a Senior PM in media, publishing, or
              streaming—or you’d just like to compare notes—LinkedIn
              is fastest. Or send an{" "}
              <TrackOnClick
                event={ANALYTICS_EVENTS.EMAIL_CLICK}
                eventData={{ kind: "direct", surface: "resume-closing" }}
              >
                <Link href={mailHref}>email</Link>
              </TrackOnClick>
              {" "}or pick a slot for a{" "}
              <TrackOnClick
                event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                eventData={{ kind: "outbound", surface: "resume-closing" }}
              >
                <Link href={CONTACT.calendly}>30-minute product chat</Link>
              </TrackOnClick>
              .
            </Body>
            <Button
              as="a"
              href={CONTACT.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
            >
              Connect on LinkedIn ↗
            </Button>
          </Stack>
        </Section>
        </div>
      </div>
    </Container>
  );
}
