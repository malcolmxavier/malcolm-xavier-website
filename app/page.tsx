// ─────────────────────────────────────────────────────────────────
// / — landing page.
//
// Architecture (per PLAN.md):
//   1. Hero          Status kicker · Name · Lede positioning · CTAs
//                    Primary CTA → /resume.
//   2. Matrix        Sub-brand tile grid — SKIPPED tonight per the
//                    "no public placeholders" rule (no sub-brand
//                    pages live yet). Re-introduce as a conditional
//                    map-render once Newsletter/Film/TV/etc. ship.
//   3. About teaser  3-sentence bio. "Read more →" + the quiet
//                    inline Creative-CV link are deferred until
//                    /about and /creative-cv exist.
//   4. Contact       Action-oriented CTAs (Calendly, email) +
//                    quieter "elsewhere" line.
//
// Voice across the page is a first-draft sketch in Malcolm's voice —
// expect to revise. The strings are kept inline rather than pulled
// into a content file because landing copy is tight and changes
// often during the editorial pass.
// ─────────────────────────────────────────────────────────────────

import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Button } from "@/components/primitives/Button";
import { Link } from "@/components/primitives/Link";
import { CONTACT, STATUS } from "./resume/resume-data";

export default function Home() {
  const mailHref = `mailto:${CONTACT.email}`;
  // Letterboxd is the only "elsewhere" link on landing per PLAN —
  // signals the cultural side without elevating it.
  const letterboxdHref = "https://letterboxd.com/malxavi/";

  return (
    <Container size="md">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section padding="lg">
        <Stack gap="500">
          {/* Status — same string as /resume so availability stays
              in sync everywhere it appears. */}
          <Kicker accent>{STATUS}</Kicker>

          <Display>Malcolm Xavier</Display>

          <Lede>
            Senior product manager — growth, data, and AI. Most
            recently I built MarTech infrastructure for 22M+ users
            across 40 brands at People Inc. Before that: Muck Rack,
            User Interviews, Fullstack Academy. MS in Law
            (privacy + IP), BA in theater. The combination shows up
            in everything I make.
          </Lede>

          {/* Recruiter pull is undiluted: resume is the single
              dominant CTA. Email sits beside it as a peer. */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button as="a" href="/resume" variant="primary" size="lg">
              See my resume →
            </Button>
            <Button as="a" href={mailHref} variant="secondary" size="lg">
              Send a note
            </Button>
          </div>
        </Stack>
      </Section>

      {/* ─── About teaser ──────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Stack gap="400">
          <Kicker>About</Kicker>
          <Headline level={2}>Off the clock.</Headline>
          <Body>
            Currently in Los Angeles, originally from Massachusetts,
            but really a New Yorker. I write a Sunday newsletter,
            watch too many movies, and play more video games than is
            reasonable.
          </Body>
          {/* When /about ships → add "Read more →" link here.
              When /creative-cv ships → add a quiet inline CV link
              for the talent-scout audience per PLAN.md. */}
        </Stack>
      </Section>

      {/* ─── Contact ───────────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Stack gap="400">
          <Kicker>Get in touch</Kicker>
          <Headline level={2}>Let&rsquo;s talk.</Headline>
          <Body>
            Hiring a senior PM in media or streaming? Want to compare
            notes on growth, data, AI, or anything else above? Pick a
            slot or drop a note.
          </Body>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              as="a"
              href={CONTACT.calendly}
              variant="primary"
              size="lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a 30-min chat
            </Button>
            <Button as="a" href={mailHref} variant="secondary" size="lg">
              Email
            </Button>
          </div>

          {/* Quieter "elsewhere" line — secondary channels for
              folks who'd rather not book or email. Letterboxd is
              the cultural breadcrumb that telegraphs the sub-brand
              matrix coming later. */}
          <Body
            size="sm"
            style={{ color: "var(--text-caption)", maxWidth: "60ch" }}
          >
            Or find me on{" "}
            <Link href={CONTACT.linkedin} quiet>
              LinkedIn
            </Link>
            ,{" "}
            <Link href={CONTACT.github} quiet>
              GitHub
            </Link>
            , or{" "}
            <Link href={letterboxdHref} quiet>
              Letterboxd
            </Link>
            .
          </Body>
        </Stack>
      </Section>
    </Container>
  );
}
