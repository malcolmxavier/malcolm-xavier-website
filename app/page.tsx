// ─────────────────────────────────────────────────────────────────
// / — landing page.
//
// Architecture (per PLAN.md):
//   1. Hero          Status kicker · Name · Lede positioning · CTAs
//                    Primary CTA → /resume.
//   2. Matrix        Sub-brand tile grid — conditionally rendered
//                    from SUB_BRAND_TILES. Currently: Music only.
//                    Tiles get added to the array as Film / TV / etc
//                    ship; no placeholders.
//   3. About teaser  3-sentence bio. "Read more →" goes to /about.
//                    The quiet inline Creative-CV link is deferred
//                    until /creative-cv exists.
//   4. Contact       Action-oriented CTAs (Calendly, email) +
//                    quieter "elsewhere" line.
//
// Voice across the page is a first-draft sketch in Malcolm's voice —
// expect to revise. The strings are kept inline rather than pulled
// into a content file because landing copy is tight and changes
// often during the editorial pass.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
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
import { CONTACT, STATUS } from "./resume/resume-data";

// Sub-brand tiles for the matrix. As Film / TV / etc ship, add
// entries here; the matrix renders only what's listed. Each tile
// links to its sub-brand page and carries the right accent stripe.
//
// `blurb` is React.ReactNode (not just string) so individual entries
// can italicize words, link inline, etc. — e.g. <em>settle the score</em>
// for an album or playlist title.
//
// `cta` is an optional override for the call-to-action text. When
// omitted, falls back to "Visit {label}" — fine for most sub-brands.
// Override when a verb-noun phrase reads more naturally (e.g.
// "Explore Playlists" for Music).
type SubBrandTile = {
  href: string;
  label: string;
  blurb: React.ReactNode;
  cta?: string;
  accent: "music" | "film" | "tv" | "newsletter" | "games" | "books" | "podcast";
};

const SUB_BRAND_TILES: SubBrandTile[] = [
  {
    href: "/music",
    label: "Music",
    cta: "Explore Playlists",
    blurb: (
      <>
        I release a new playlist each month.{" "}
        <em>settle the score</em> was made for this website
        release.
        <br />
        Check that out, then explore previously released
        playlists.
      </>
    ),
    accent: "music",
  },
];

export default function Home() {
  const mailHref = `mailto:${CONTACT.email}`;

  return (
    <Container size="md">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section padding="lg">
        <Stack gap="500">
          {/* Status kicker sits FULL-WIDTH above the two-column
              area so the headshot's top edge can align with the
              top of "Malcolm Xavier" rather than extending up
              past it. */}
          <Kicker accent>{STATUS}</Kicker>

          {/* Two-column on lg+ via CSS grid with items-end (bottom
              alignment). Right column has a fixed width matched
              roughly to the text content's height — picking 22rem
              keeps the image top close to the name top while the
              square's bottom edge sits in line with the button
              row. Adjust the column width up/down to retune the
              vertical alignment if text-content height shifts. */}
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:items-end">
            <Stack gap="500">
              <Display>Malcolm Xavier</Display>

              {/* Three-paragraph lede. Nested Stack with a smaller
                  gap so the paragraphs feel like one block visually
                  while still breathing apart from each other and
                  from the Display + button rows above and below. */}
              <Stack gap="400">
                <Lede>
                  I&rsquo;m a senior product manager who specializes
                  in building growth and data platforms. I&rsquo;m
                  AI-native&mdash;building and enabling AI-powered
                  tools and workflows is part of my typical scope of
                  work.
                </Lede>

                <Lede>
                  Most recently I built MarTech infrastructure for
                  22M+ users across 40 brands at People Inc. Before
                  that: Muck Rack, User Interviews, Fullstack
                  Academy.
                </Lede>

                <Lede>
                  I have an MS in Law (privacy + IP) and a BA in
                  theater. The combination of my technical, legal,
                  and creative skills shows up in everything I do.
                </Lede>
              </Stack>

              {/* Recruiter pull is undiluted: resume is the single
                  dominant CTA. Contact page sits beside it as a
                  peer (was previously a direct mailto, but
                  /contact has the full surface — Calendly +
                  email + LinkedIn + GitHub — so we route there).
                  No standalone LinkedIn CTA: most recruiter
                  inbound is already from LinkedIn, so adding a
                  link back would crowd the hero without earning
                  its keep. */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button as="a" href="/resume" variant="primary" size="lg">
                  View my resume →
                </Button>
                <Button as="a" href="/contact" variant="secondary" size="lg">
                  Get in touch &rarr;
                </Button>
              </div>
            </Stack>

            {/* Square headshot. 22rem wide on desktop (matches the
                grid column), 16rem max on mobile. aspect-ratio 1/1
                + width-driven layout means the height derives
                cleanly without the position-absolute Image fill
                collapsing the parent's intrinsic width. */}
            <div
              className="relative mt-10 mx-auto w-full max-w-[16rem] overflow-hidden rounded-md border lg:mt-0 lg:max-w-none"
              style={{
                aspectRatio: "1 / 1",
                borderColor: "var(--border-default)",
              }}
            >
              <Image
                src="/headshot.jpg"
                alt="Portrait of Malcolm Xavier"
                fill
                sizes="(min-width: 1024px) 22rem, 16rem"
                priority
                style={{
                  objectFit: "cover",
                  // Keep the face in frame after zoom-in. 22% from
                  // top hits roughly the eye-line on the source
                  // portrait; tweak if the crop reads too tight or
                  // too loose.
                  objectPosition: "center 22%",
                  // Tighten the face crop without re-exporting the
                  // image. 1.5× zoom inside the square container.
                  transform: "scale(1.5)",
                  transformOrigin: "center 22%",
                }}
              />
            </div>
          </div>

          {/* Scroll-down affordance — anchors to #explore (the matrix
              section below). Centered, mono-kicker styled so it reads
              as an editorial "more below" marker rather than a
              competing CTA. The matrix section keeps its own
              "The cultural corner." headline as the actual section
              title; this is just the scroll cue. */}
          {SUB_BRAND_TILES.length > 0 ? (
            <div className="flex justify-center pt-6">
              <a
                href="#explore"
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 hover:[color:var(--text-action-hover)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                  lineHeight: "var(--p-xs-line-height)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-caption)",
                  outlineColor: "var(--border-focus)",
                  textDecoration: "none",
                }}
              >
                Or, explore the rest &darr;
              </a>
            </div>
          ) : null}
        </Stack>
      </Section>

      {/* ─── Sub-brand matrix (conditional) ────────────────────── */}
      {SUB_BRAND_TILES.length > 0 ? (
        // id="explore" is the anchor target for the hero scroll-down
        // affordance. scrollMarginTop clears the sticky Nav so the
        // jump lands cleanly below the chrome rather than tucked
        // behind it.
        <Section
          id="explore"
          padding="md"
          bordered
          style={{ scrollMarginTop: "6rem" }}
        >
          <Stack gap="500">
            <Headline level={2}>The cultural corner.</Headline>
            <Grid
              cols={
                // 1 tile reads as a single-column callout; 2-3 fill
                // a tablet-width row; 4+ shifts to the proper matrix.
                SUB_BRAND_TILES.length >= 3
                  ? 3
                  : SUB_BRAND_TILES.length >= 2
                  ? 2
                  : 1
              }
              gap="600"
            >
              {SUB_BRAND_TILES.map((tile) => (
                <Card key={tile.href} accent={tile.accent} interactive>
                  <Stack gap="300">
                    <Kicker>{tile.label}</Kicker>
                    <Headline
                      level={3}
                      style={{
                        fontSize: "var(--h5-font-size)",
                        lineHeight: "var(--h5-line-height)",
                      }}
                    >
                      {/* Loud Link (no quiet) so the underline reads
                          ahead of hover and the CTA pre-announces
                          itself as a link. Color comes from the
                          [data-subbrand="music"] rule on the Card
                          wrapper — purple in this context. */}
                      <Link href={tile.href}>
                        {tile.cta ?? `Visit ${tile.label}`} &rarr;
                      </Link>
                    </Headline>
                    {/* Override Body's default 60ch max-width so the
                        blurb spans the full card width, then clamp
                        at 2 lines so longer-than-expected blurbs
                        don't blow out card heights or push the row
                        out of vertical alignment with siblings. */}
                    <Body
                      size="sm"
                      className="line-clamp-2"
                      style={{ maxWidth: "100%" }}
                    >
                      {tile.blurb}
                    </Body>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Section>
      ) : null}

      {/* ─── About teaser ──────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Stack gap="400">
          <Kicker>About</Kicker>
          <Headline level={2}>Off the clock.</Headline>
          <Body>
            Massachusetts &rarr; NYC &rarr; Chicago &rarr; LA.
            When I&rsquo;m not building, I might be out on a run or
            playing some video games. But most likely I&rsquo;m
            seated at my local AMC or curled up on my couch with
            some TV. When I want to let loose, I&rsquo;m usually
            trying to find a concert.
          </Body>
          {/* "Read more →" goes to /about (the long version).
              Quiet inline link to /creative-cv lands here when that
              page ships, per the talent-scout audience rule. */}
          <Link href="/about">Get to know me &rarr;</Link>
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

          {/* Quieter "elsewhere" line — secondary professional
              channels for folks who'd rather not book or email.
              Letterboxd intentionally NOT included here: the
              whole Contact block is a professional pitch, so the
              cultural breadcrumb belongs in the matrix above
              (Music card today, more sub-brands later) rather
              than mixed in with the recruiter reach-out paths. */}
          <Body
            size="sm"
            style={{ color: "var(--text-caption)", maxWidth: "60ch" }}
          >
            Or find me on{" "}
            <Link href={CONTACT.linkedin}>LinkedIn ↗</Link>
            {" "}or{" "}
            <Link href={CONTACT.github}>GitHub ↗</Link>.
          </Body>
        </Stack>
      </Section>
    </Container>
  );
}
