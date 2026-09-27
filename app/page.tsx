// ─────────────────────────────────────────────────────────────────
// / — landing page.
//
// Architecture (per PLAN.md):
//   1. Hero          Greeting h1 · Lede positioning (2 lines) · CTAs.
//                    Primary CTA → /resume, secondary → /consulting.
//                    Reshaped 2026-09-26: the STATUS eyebrow came out,
//                    the lede went from three dense paragraphs to two
//                    short lines, and the h1 became "Welcome to my
//                    world." rather than the name. See the notes in the
//                    hero itself — the reasoning is load-bearing.
//   2. Matrix        Sub-brand tile grid — conditionally rendered
//                    from SUB_BRAND_TILES. Currently: Music only.
//                    Tiles get added to the array as Film / TV / etc
//                    ship; no placeholders.
//   3. About teaser  3-sentence bio. "Read more →" goes to /about.
//                    TODO(creative-cv): the quiet inline Creative-CV
//                    link is deferred until /creative-cv exists.
//                    Tracked via l-creative-cv-todo (2026-04-29
//                    /full-review).
//   4. Contact       Action-oriented CTAs (Calendly, email) +
//                    quieter "elsewhere" line.
//
// The strings are kept inline rather than pulled into a content file
// because landing copy is tight and changes often during the editorial
// pass — 2026-09-26 revised the hero lede five times in one sitting,
// which is the argument for inline rather than against it.
//
// The HERO lede is no longer a first-draft sketch: Malcolm directed it
// line by line that day and it is his wording. The rest of the page's
// prose still is a sketch. That distinction matters for the open
// voice-pass-site-copy work, whose whole premise is him writing this
// copy rather than approving a draft of it.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
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
import { Card } from "@/components/primitives/Card";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { HeroCtaInView } from "@/components/analytics/HeroCtaInView";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import type { SubBrand } from "@/lib/sub-brands";
import { CONTACT } from "./resume/resume-data";

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
// Override when a voice-led phrase reads more truly than the
// generic verb-noun (e.g. "Hear Me Out" for Music, "Pass the
// Popcorn" for Films — both invite the reader rather than just
// describing the surface).
type SubBrandTile = {
  href: string;
  label: string;
  blurb: React.ReactNode;
  cta?: string;
  accent: SubBrand;
};

const SUB_BRAND_TILES: SubBrandTile[] = [
  {
    href: "/films",
    label: "Films",
    cta: "Pass the Popcorn",
    blurb: (
      <>
        300+ films a year, with strong opinions and Letterboxd
        receipts.
      </>
    ),
    accent: "film",
  },
  {
    href: "/television",
    label: "Television",
    cta: "Grab the Remote",
    blurb: (
      <>
        Appointment viewing, binge fodder, channel
        surfing—100+ seasons a year on Serializd.
      </>
    ),
    accent: "tv",
  },
  {
    href: "/music",
    label: "Music",
    cta: "Hear Me Out",
    blurb: (
      <>
        A new playlist each month. Now playing:{" "}
        <em>settle the score</em>.
      </>
    ),
    accent: "music",
  },
];

export default function Home() {
  const mailHref = `mailto:${CONTACT.email}`;

  return (
    <Container>
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section padding="lg">
        <Stack gap="500">
          {/* The STATUS eyebrow used to sit FULL-WIDTH here, above the
              two-column area. Removed 2026-09-26: the hero was carrying
              four things that each wanted to be read first — eyebrow,
              name, three-paragraph lede, CTA row — and the availability
              line is the one that survives being said later. It is NOT
              a demotion of the job signal; it is one fewer competing
              element so the pitch lands, and the line itself moved into
              the closing sentence of the lede where it hands off to the
              resume CTA. STATUS is still exported and still renders on
              /resume, which is the recruiter document. */}

          {/* Two-column on lg+ via CSS grid; single-column flow below it.
              Reworked 2026-09-26 — the comments here previously described
              a 22rem portrait, a three-paragraph lede and a ~28rem left
              column, none of which survived that pass.

              THE IMAGE IS THE ANCHOR. Two values are held and they do
              different jobs, which is the part that kept getting confused:

                • The 50/50 split (lg:grid-cols-2) is for the TEXT. Half a
                  container is a measure the lede actually wraps at, and
                  the wrapping is what gives the copy block height.
                • --hero-portrait (24rem) is for the IMAGE: absolute and
                  square, flush to the left edge of its column. Not a
                  fraction of the column — at 85% of a half-container the
                  portrait came out around 44rem square, and a fraction
                  also ties a headshot's size to the viewport when a
                  headshot has a right size rather than a right percentage.

              Neither is expressed in terms of the other, so the copy's
              height follows whichever of the two is taller and changing
              one never forces a re-tune of the other. An earlier cut had
              the portrait take its height FROM the text via
              lg:self-stretch: that obeyed the 2026-04-28 audit note —
              match by construction, never by arithmetic — and still had
              the relationship backwards, because that note settled how
              not to match them and never said which one drives.

              Geometry: top-anchored (lg:items-start). The Display in row 1
              col 1 and the portrait spanning rows 1+2 in col 2 share a top
              edge by construction. Whitespace ends up below whichever
              column is shorter, and that is breathing space rather than a
              missed alignment. The rejected alternative was lg:items-end,
              which pushed the portrait's top well below the heading.

              Rhythm down the left column, and every number here comes from
              a Stack gap rather than from padding on a child:

                name    → lede     16px   grid lg:gap-y-4
                lede l1 → lede l2  20px   inner Stack gap 500
                lede    → CTA row  20px   outer Stack gap 500

              The CTA row carried a pt-2 until 2026-09-26, which put its
              box 8px above the buttons and made that last gap 28px while
              reading as 20px in the markup. Spacing lives in the gap; if
              the row needs more air, the outer Stack's gap is the knob.
              Caveat on the last row: the outer Stack is lg:justify-between,
              so when the PORTRAIT is the taller column that 20px opens up
              and the CTA row bottom-aligns with the portrait instead.

              DOM order — name → portrait → lede + CTAs — is correct for
              the single-column flow below lg, and the explicit lg grid
              placement re-anchors the portrait to col 2 without changing
              it. Below lg there is no grid at all: the portrait sits
              between the name and the copy, and its my-5 governs that
              spacing rather than any gap here. */}
          <div
            className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-4 lg:items-start"
            style={{ ["--hero-portrait" as string]: "24rem" }}
          >
            {/* The Display component now trims its line-box to the cap
                line (top) by default, so the visible top of "M" aligns
                with the box-top of the Display — which equals the
                headshot's box-top under items-start. (This trim used to
                live inline here; it moved into the Display component so
                the alignment holds without a per-page override.) */}
            {/* KNOWN EXCEPTION, not a finished state. Display's size prop
                tops out at "h1" and the approved hero is larger, so this
                overrides the type scale inline — which is the one thing
                the type system says not to do: tokens/ is canonical and
                app/globals.css is generated from it. The right home is a
                new scale step above h1 in tokens/, and that is a change to
                the sitewide scale rather than to this page, so it is not
                being made inside a homepage hotfix. clamp() so the
                override still behaves across breakpoints in the meantime.

                The h1 is a greeting rather than his name as of 2026-09-26.
                Adjudicated the same day: the name is no longer in the
                heading hierarchy on this page, and that is accepted — the
                Person JSON-LD in app/layout.tsx still carries the entity,
                the <title> still carries the name, and it is obvious whose
                site this is. Don't "fix" it back. */}
            <Display style={{ fontSize: "clamp(3.25rem, 7vw, 6rem)" }}>
              Welcome to my world.
            </Display>

            {/* Headshot. Square everywhere; 16rem on mobile, and on lg+
                as tall as the text beside it with the width following.

                The square is deliberate and stays: the source is 2:3
                (1640×2464), and the square frame plus the 1.5× zoom
                below is what produces the tight, pushed-in crop. A 2:3
                frame was tried on 2026-09-26 and reverted the same
                sitting — it stops cropping, which is a different and
                more literal photograph than this hero wants.

                Sizing and placement: lg:w-[var(--hero-portrait)] and
                lg:mx-0, so it is 24rem square and flush to the LEFT edge
                of its column rather than centred in it. Why it is an
                absolute rather than a share of the column, and why the
                image is what the rest of the hero sizes against, is in the
                grid comment above — it is one rule and it belongs in one
                place.

                On mobile/tablet this still sits BETWEEN the name and the
                lede so the portrait reads as a hero element introducing
                the copy below.

                my-5 (20px) matches --scale-500, the same rhythm
                the surrounding Stack uses for vertical gaps; the
                portrait's vertical margin handles the mobile
                spacing (no margin-bottom on Display) so the
                spacing is consistent on both sides without the
                Display needing its own typography-level rule.
                aspect-ratio 1/1 + width-driven layout means the
                height derives cleanly without position-absolute
                Image fill collapsing the parent's intrinsic
                width. */}
            <div
              className="relative my-5 mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-md border md:max-w-[20rem] lg:my-0 lg:mx-0 lg:w-[var(--hero-portrait)] lg:max-w-none lg:row-start-1 lg:row-span-2 lg:col-start-2"
              style={{
                borderColor: "var(--border-default)",
              }}
            >
              <Image
                src="/headshot.jpg"
                alt="Portrait of Malcolm Xavier"
                fill
                sizes="(min-width: 1024px) 24rem, 16rem"
                // This headshot is the homepage LCP element. Next 16
                // deprecated the old `priority` prop; the explicit
                // replacement is `preload` (inserts the <link rel=preload>
                // in <head> so the browser discovers the image before it
                // parses the body) plus `fetchPriority="high"` (tells the
                // browser to fetch it ahead of other resources). The
                // deprecated `priority` emitted the preload link but not
                // the fetchpriority hint — this pair restores both, the
                // canonical web.dev pattern for a single above-the-fold
                // LCP image.
                preload
                fetchPriority="high"
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

            {/* Lede + CTAs — auto-placed into row 2 col 1 on lg+
                (col 2 row 1+2 is taken by the headshot's explicit
                span). On <lg, this sits below the headshot in
                the single-column flow.

                lg:h-full + lg:justify-between is the second half of the
                anchor rule: the portrait spans both rows, so IT sets the
                row heights, and this makes the copy occupy that height
                rather than sitting in the top of it. The lede stays at
                the top under the name; the CTA row is pushed to the
                bottom, where it lands on the portrait's bottom edge. The
                red guides make that alignment visible. */}
            <Stack gap="500" className="lg:h-full lg:justify-between">
              {/* Two-paragraph lede. Nested Stack with a smaller
                  gap so the paragraphs feel like one block visually
                  while still breathing apart from each other and
                  from the button row below.

                  Was three dense paragraphs (~85 words) until 2026-09-26;
                  it is two short lines now. The goal was not a quieter
                  pitch, it was FEWER COMPETING ELEMENTS so the one point
                  sticks — the hero had an eyebrow, a name, three
                  paragraphs, and a CTA row all asking to be read first.

                  What the cuts gave up, deliberately, because each is
                  argued better elsewhere than asserted here:
                    • "MS in Law … BA in theater … the combination shows
                      up in everything I do" — the only paragraph with no
                      evidence in it, telling the reader he had range
                      instead of showing any. The About teaser further
                      down this page actually has the personality this
                      was summarising.
                    • "I built this site with Claude Code as my build
                      partner" — the receipt for AI‑native. Safe to drop
                      HERE because /case-studies/building-this-site is
                      that receipt at length, and /resume carries The
                      Booth as the AI‑native system.
                    • People Inc, Muck Rack, User Interviews, Fullstack
                      Academy — the employer receipts. They are what
                      /resume is for, and the primary CTA points at it.

                  So the hero asserts and the rest of the site proves.
                  The availability line is second and last because it is
                  the sentence the resume CTA directly below answers. */}
              <Stack gap="500">
                <Lede>
                  I’m a senior product manager who builds AI‑native
                  growth, marketing, and data platforms.
                </Lede>

                <Lede>
                  I’m currently interviewing and open to full-time,
                  contract, and fractional product work.
                </Lede>
              </Stack>

              {/* Resume stays the single dominant CTA. The secondary
                  slot pointed at /contact until 2026-09-26; it points at
                  /consulting now, because the lede above it widened from
                  "senior PM roles" to full-time, contract, and fractional
                  work, and /consulting is the only surface that answers
                  the second half of that sentence. A hero that offers
                  contract work and then routes to a contact form makes
                  the reader do the translating.

                  /contact is not lost — the page's own "Get in touch"
                  section further down carries the full surface (Calendly
                  + email + LinkedIn + GitHub). What it loses is hero
                  placement, which is the trade.

                  Label changed with the destination: "Get in touch" on a
                  services page is a mismatch the reader notices.

                  Still no standalone LinkedIn CTA: most recruiter inbound
                  already comes from LinkedIn, so a link back would crowd
                  the hero without earning its keep. */}
              {/* No pt-2 here, deliberately. It used to carry one, which
                  put the row's box 8px above the buttons themselves: the
                  gap you saw was the Stack's 20px PLUS the padding, while
                  everything above it was pure Stack gap. That made the
                  rhythm down the column uneven in a way nothing in the
                  markup admitted to — the offset was hiding inside a child
                  instead of living in the one place that owns spacing.
                  Vertical rhythm belongs to the Stack's gap, which is what
                  the component exists for; if this row needs more air, the
                  outer Stack's gap is the knob, not padding on the row. */}
              <div className="flex flex-wrap gap-3">
                {/* Hero resume CTA — wrapped in HeroCtaInView so the
                    dashboard can separate "didn't see it" from "saw
                    it, didn't bite" via the IntersectionObserver. */}
                <HeroCtaInView event={ANALYTICS_EVENTS.HERO_CTA_INVIEW}>
                  <Button as="a" href="/resume" variant="primary" size="lg">
                    View my resume →
                  </Button>
                </HeroCtaInView>
                <Button as="a" href="/consulting" variant="secondary" size="lg">
                  Work with me →
                </Button>
              </div>
            </Stack>
          </div>

          {/* Scroll-down affordance — anchors to #explore (the matrix
              section below). Centered, mono-kicker styled so it reads
              as an editorial "more below" marker rather than a
              competing CTA. The matrix section keeps its own
              "The cultural corner." headline as the actual section
              title; this is just the scroll cue.
              <Kicker as="a"> renders the same mono-uppercase shape
              with hover/focus styling for interactivity. */}
          {SUB_BRAND_TILES.length > 0 ? (
            <div className="flex justify-center pt-6">
              <Kicker as="a" href="#explore">
                Or, explore the rest &darr;
              </Kicker>
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
            <div
              // Tile count → responsive column count:
              //   1   → 1 col (full-width callout)
              //   2+  → 1 col mobile, 2 cols sm+
              //
              // Two-per-row is the locked matrix rule (preserves
              // editorial blurb width and lets each tile breathe).
              // For odd tile counts, the last card sits alone in
              // row 2 at half-width — that orphan is accepted by
              // design, NOT a bug. This reverses the 2026-05-08
              // TV-launch fix (tv-rev2-3up-grid-tablet-orphan),
              // which had routed 3 tiles through sm:grid-cols-3
              // to avoid the row-2 orphan; the 2-per-row rule
              // wins over orphan-avoidance.
              className={`grid ${
                SUB_BRAND_TILES.length >= 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1"
              }`}
              style={{ gap: "var(--scale-600)" }}
            >
              {SUB_BRAND_TILES.map((tile) => (
                <Card key={tile.href} accent={tile.accent}>
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
                          wrapper — purple in this context.

                          Wrapped in TrackOnClick so the dashboard
                          reports per-tile engagement (tile slug as
                          metadata). */}
                      <TrackOnClick
                        event={ANALYTICS_EVENTS.SUBBRAND_TILE_CLICK}
                        eventData={{ tile: tile.accent }}
                      >
                        <Link href={tile.href}>
                          {tile.cta ?? `Visit ${tile.label}`} →
                        </Link>
                      </TrackOnClick>
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
            </div>
          </Stack>
        </Section>
      ) : null}

      {/* ─── About teaser ──────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Stack gap="400">
          <Kicker>About</Kicker>
          <Headline level={2}>Off the clock.</Headline>
          <Body>
            Massachusetts → NYC → Chicago → LA.
            When I’m not building, I might be out on a run or
            playing some video games. But most likely I’m
            seated at my local AMC or curled up on my couch with
            some TV. When I want to let loose, I’m usually
            trying to find a concert.
          </Body>
          {/* "Read more →" goes to /about (the long version).
              TODO(creative-cv): drop a quiet inline link to
              /creative-cv here when that page ships, per the
              talent-scout audience rule. */}
          <Link href="/about">Get to know me →</Link>
        </Stack>
      </Section>

      {/* ─── Contact ───────────────────────────────────────────── */}
      <Section padding="md" bordered>
        <Stack gap="400">
          <Kicker>Get in touch</Kicker>
          <Headline level={2}>Let’s talk.</Headline>
          <Body>
            Hiring a senior PM to build growth, marketing, or data
            platforms? Want to compare notes on product, AI, or
            privacy? Pick a slot or drop a note.
          </Body>

          <div className="flex flex-wrap gap-3 pt-2">
            <TrackOnClick
              event={ANALYTICS_EVENTS.CALENDLY_CLICK}
              eventData={{ kind: "outbound", surface: "homepage-contact" }}
            >
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
            </TrackOnClick>
            <TrackOnClick
              event={ANALYTICS_EVENTS.EMAIL_CLICK}
              eventData={{ kind: "direct", surface: "homepage-contact" }}
            >
              <Button as="a" href={mailHref} variant="secondary" size="lg">
                Email
              </Button>
            </TrackOnClick>
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
