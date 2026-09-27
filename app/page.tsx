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
//
// THE HERO IS THE WHOLE PAGE as of 2026-09-26. Three modules below it were
// removed, and the reasons are separate:
//
//   • Sub-brand matrix (Films / Television / Music tiles, plus the
//     "Or, explore the rest ↓" scroll cue that existed only to point at
//     it). Not deleted for being weak — the cultural corner is moving to
//     Fourth Unit and will return as its own module when that is ready.
//   • About teaser and Contact section. There is enough site content and
//     context by now that prompting a visitor to go read /about or /contact
//     is not doing useful work.
//
// No crawl paths were lost: the Nav and the Footer still link /about,
// /case-studies, /consulting, /contact, /films, /television, /music and
// /booth, so removal thinned this page's own content rather than the
// site's link graph. Nothing referenced the deleted #explore anchor.
//
// The page is one Section now. If a module comes back, it goes below the
// hero as its own Section — do not reach for a variant of the hero grid.
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
import { Lede } from "@/components/typography/Lede";
import { Button } from "@/components/primitives/Button";
import { HeroCtaInView } from "@/components/analytics/HeroCtaInView";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export default function Home() {
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

          {/* Two-column on md+ via CSS grid; single-column flow below it.
              Reworked 2026-09-26 — the comments here previously described
              a 22rem portrait, a three-paragraph lede and a ~28rem left
              column, none of which survived that pass.

              THE IMAGE IS THE ANCHOR — sized first, and everything
              else follows from it.

              --hero-portrait is the only number to edit. The portrait is
              that wide, square, flush to the left edge of its column, and
              --hero-cols makes the right column exactly that width so no
              strip is left over beside it. The text column is
              minmax(0, 1fr) and takes whatever remains.

              It is a clamp rather than a constant, and the reason is the
              tablet range rather than any love of fluid type — see the
              note on the property itself. What matters here is that ONE
              number still drives the whole composition; the anchor rule is
              intact, the anchor just has a size that depends on the
              viewport now.

              Why not a share of the column (e.g. 85% of a half-container,
              which was tried): that made the portrait about 44rem square
              at desktop, and a raw percentage has no ceiling — a headshot
              has a right size, not a right percentage. The clamp keeps a
              hard 32rem cap for exactly that reason.

              History, because three shapes were tried on 2026-09-26 and
              each failed differently:

                • The portrait taking its HEIGHT from the text
                  (lg:self-stretch). Obeyed the 2026-04-28 audit note —
                  match by construction, never by arithmetic — and still
                  had the relationship backwards, because that note settled
                  how not to match them and never which one drives.
                • A 50/50 split with the portrait flush-left inside its
                  half. Left a strip beside the image that grew with the
                  viewport, 78px at 1100px and 360px past 1664px. Capping
                  the hero's width closed it and moved the emptiness
                  outside the hero; a stat block put content in it and read
                  as an afterthought, because a sliver is not a column and
                  nothing content-shaped belongs in one.
                • Filling that strip with a decorative matte. Rejected on
                  sight.

              The strip is gone by construction now, which is why the
              portrait's size is the lever for how close the image reads to
              the words: growing it both moves the column left and narrows
              the measure. Because both sides scale together, the RATIO
              holds across the range — the portrait stays near 80% of the
              text column's width from 768 up to the cap, where a constant
              32rem swung it from 112% at 1024 to 68% at 1440. Past the cap
              the portrait stops and the measure alone keeps growing, which
              is why the ratio eases back to 68% at 1440; if the measure
              reads too wide up there, the fix is capping the lede itself,
              which puts the leftover inside the text column as ordinary
              typographic space rather than between text and image.

              Geometry: top-anchored (md:items-start). The Display in row 1
              col 1 and the portrait spanning rows 1+2 in col 2 share a top
              edge by construction. Whitespace ends up below whichever
              column is shorter, and that is breathing space rather than a
              missed alignment. The rejected alternative was md:items-end,
              which pushed the portrait's top well below the heading.

              The column gap is 24px on tablet against 48px at lg, which is
              not a taste call — it is the same SHARE of the content width
              at both ends (~3.5%), where a flat 48px would have been twice
              its desktop weight at 768. It also decides where the CTA row
              stops fitting on one line: the two buttons need ~404px, the
              text column is 0.62 × viewport − 104, so they sit side by
              side from 819px up. iPad Air (820) and iPad Pro 11 (834)
              clear it; iPad Mini (768) is the one tablet that wraps them
              to two rows, and that is left alone rather than solved by
              shrinking the buttons or the portrait — a wrapped row at the
              narrowest tablet is the graceful outcome, and flex-wrap on
              the row already handles it.

              Which column is shorter CHANGES with the viewport, and that
              is expected rather than a bug to chase. The copy is a fixed
              number of words, so below roughly 950px it runs taller than
              the portrait and the whitespace sits to the right of the
              buttons; above that the portrait is taller and the whitespace
              sits under the copy, which is the desktop composition.

              Rhythm down the left column, and every number here comes from
              a Stack gap rather than from padding on a child:

                                 token   rendered   knob
                name    → lede    56px     ~42px    grid lg:gap-y-14
                lede p1 → lede p2  28px     ~34px    inner Stack gap 700
                lede    → CTA row  32px     ~41px    outer Stack gap 800

              The heading gap is 40px (md:gap-y-10) between 768 and 1023,
              because the h1 is ~54px there against ~96px at desktop and
              the space under a display heading is judged against the
              heading, not in absolute px. 56px under a 54px face reads at
              0.78em where desktop reads 0.44em — visibly looser at the
              size where there is least room to spare. The other two gaps
              do not scale: they sit between body-sized things, which do
              not change size across the range.

              TWO COLUMNS BECAUSE THE TOKENS ARE NOT COMPARABLE — read the
              descender note below before changing any of them. The three
              tokens are measured from three different places, so the
              rendered column is the only one where the numbers mean the
              same thing. 56 and 32 are eleven px apart as tokens and about
              one px apart on screen.

              The shape: the heading and the CTA row sit at matching
              distance from the lede, and the paragraph seam inside it is
              slightly tighter than both. So the two paragraphs read as one
              block, evenly placed between the thing above and the thing
              below. Malcolm asked for the CTA gap to match the heading gap
              on 2026-09-26 — before that it was 16px, which left the
              buttons crammed under copy that had just been given room to
              breathe. An earlier note here argued the paragraph seam
              should be the LARGEST of the three so the block read as one
              unit with one seam; that held when the heading gap was 20px
              and stopped being true the moment the heading got its air.

              The CTA row carried a pt-2 until 2026-09-26, which put its
              box 8px above the buttons and made that last gap 28px while
              reading as 20px in the markup. Spacing lives in the gap; if
              the row needs more air, the outer Stack's gap is the knob.

              The heading gap went 12 → 20 → 56 across 2026-09-26, and the
              number is the least interesting part of that. Display carries
              text-box-trim: trim-both with edge cap/alphabetic, so its box
              hugs the glyphs — there is no invisible leading softening the
              gap the way there is everywhere else on the site. An earlier
              note here concluded from that "the token IS the whole visual
              gap", which is wrong in the expensive direction: the box is
              tighter than the glyphs, not equal to them.

              THE DESCENDER IS WHY THIS TOKEN IS SO MUCH LARGER THAN IT
              LOOKS. text-box-edge: cap alphabetic trims the bottom to the
              ALPHABETIC BASELINE, so every descender renders outside the
              box, below it. "Welcome to my world." has a y and a comma
              hanging into the gap, about 0.22em — roughly 21px at the
              96px size. The lede then eats about 7px of its own box in
              half-leading before its caps start. So the ink-to-ink gap a
              person actually sees is token - 21 + 7, i.e. TOKEN MINUS 14.

              THE CTA GAP RUNS THE OTHER WAY, which is the whole reason the
              rhythm table above needs two columns. Nothing is trimmed down
              there: the lede's last line keeps its descent and half-leading
              as empty box below the baseline, and "work." has no descender
              ink to fill it, so about 9px of that box is blank. A button's
              border is exactly its box edge. That gap renders at roughly
              TOKEN PLUS 9. Hence 56 above and 32 below landing within a px
              of each other on screen — a trimmed box loses 14 and an
              untrimmed one gains 9, a 23px swing between two tokens that
              look like they should differ by 24.
              At the old 20px that is a 6px visual gap, which is why it
              read as touching at every value tried and why raising 12 → 20
              changed nothing anybody could see. 56px buys ~42px of real
              air, about 0.44em under the heading, which is the ordinary
              proportion for a display face over body copy.

              A ceiling of 28px was written here earlier and it was wrong.
              The reasoning was that the 28px paragraph seam must dominate
              or the heading binds to paragraph one — the inversion is real
              and the arithmetic comparing them was not, because the two
              numbers are measured from different places. The heading token
              runs from a trimmed BASELINE and loses 14px to the descender;
              the seam runs between two untrimmed text boxes and gains a
              few px of leading. Compared as ink, 56 here is ~42px against
              the seam's ~31px, so the heading is the larger step and the
              hierarchy is right way up. Compare rendered space, never
              tokens, whenever one side is trimmed and the other is not.

              The other trap: the "way too big" gap rejected earlier the
              same day was not this token at all. That hero ran
              lg:justify-between over a full-height stack, so the slack
              under the image was being distributed into the text rows —
              the token was 16px while the visible gap was whatever was
              left over. No large token has ever been rejected here.

              DOM order — name → portrait → lede + CTAs — is correct for
              the single-column flow below md, and the explicit md grid
              placement re-anchors the portrait to col 2 without changing
              it. Below md there is no grid at all: the portrait sits
              between the name and the copy, and its my-5 governs that
              spacing rather than any gap here. */}
          <div
            className="md:grid md:grid-cols-[var(--hero-cols)] md:grid-rows-[auto_1fr] md:gap-x-6 md:gap-y-10 md:items-start lg:gap-x-12 lg:gap-y-14"
            style={{
              // FLUID, and the fluidity is the fix rather than a flourish.
              // A fixed 32rem made the two-column layout land differently
              // at every tablet width: at 1024 the portrait was 512 of 896
              // usable px, leaving a 344px ribbon for the copy, so the
              // heading broke to two lines and the buttons stacked. Below
              // 1024 the grid did not engage at all and a blown-up phone
              // layout ran the lede the full 688–943px. Scaling the one
              // number keeps the SAME composition from 768 up.
              //
              // 38vw hits the 32rem cap at 1348px, which is the point of
              // that number: every desktop viewport gets EXACTLY the 32rem
              // Malcolm approved, so this change is invisible above 1348
              // and does all its work below. 32rem/1440 = 35.5vw was the
              // obvious slope and was wrong for that reason — it caps at
              // 1443, so a browser window at 1400 would have quietly
              // resized a portrait that was already signed off.
              //
              // The 17rem floor is a guard rather than a working value:
              // 38vw only falls below it under 716px, and two columns
              // start at 768.
              ["--hero-portrait" as string]: "clamp(17rem, 38vw, 32rem)",
              // The template lives in a property, not in the utility.
              // Tailwind compiled NO RULE for
              // lg:grid-cols-[minmax(0,1fr)_var(--hero-portrait)] — the
              // class sat in the markup and the stylesheet had nothing,
              // so the layout silently did not change. Arbitrary values
              // fail OPEN, which is worth knowing: the page renders fine
              // and the edit just does not happen. A var-only arbitrary
              // does compile, so the composition goes here where CSS
              // resolves it and --hero-portrait stays the only number.
              ["--hero-cols" as string]: "minmax(0, 1fr) var(--hero-portrait)",
            }}
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
            <Display
              style={{
                fontSize: "clamp(3.25rem, 7vw, 6rem)",
                // UNITLESS, and it must stay that way. Display reads
                // line-height from --h1-line-height, which is an ABSOLUTE
                // 72px tuned for the token's 60px font. Overriding
                // font-size alone left a 96px face in a 72px line box at
                // desktop — a 0.75 ratio, so two heading lines overlapped
                // and, worse, the glyphs overflowed the element's box
                // downward. text-box-trim: trim-both can only remove
                // POSITIVE half-leading; with the line box smaller than the
                // glyphs there is nothing to trim, so the descenders hung
                // below the box while the grid gap was measured from the
                // box. The gap beneath the heading was therefore its token
                // value MINUS that overflow, which is why raising it from
                // 12px to 20px barely moved anything.
                //
                // A ratio tracks the clamp at every width, so the pairing
                // holds instead of being correct at one size.
                lineHeight: "1.05",
              }}
            >
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

                Sizing and placement: md:w-[var(--hero-portrait)] and
                md:mx-0, so it is square and flush to the LEFT edge of its
                column rather than centred in it. What --hero-portrait
                resolves to, why it is a clamp with a hard cap rather than
                a share of the column, and why the image is what the rest
                of the hero sizes against are all in the grid comment above
                — it is one rule and it belongs in one place. Deliberately
                not restated here: this comment has already gone stale once
                by carrying its own copy of the number (it said 24rem while
                the property said 32rem).

                On PHONES this still sits BETWEEN the name and the lede so
                the portrait reads as a hero element introducing the copy
                below. That is the single-column branch only — tablets get
                the two-column grid from 768 up.

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
              className="relative my-5 mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-md border md:my-0 md:mx-0 md:w-[var(--hero-portrait)] md:max-w-none md:row-start-1 md:row-span-2 md:col-start-2"
              style={{
                borderColor: "var(--border-default)",
              }}
            >
              <Image
                src="/headshot.jpg"
                alt="Portrait of Malcolm Xavier"
                fill
                // Mirrors --hero-portrait above: the same 38vw, capped at
                // 32rem, and 16rem for the single-column layout below md.
                // Kept in step by hand — sizes cannot read a custom
                // property, and a stale value here costs a wrong-sized
                // download on the page's LCP element.
                sizes="(min-width: 768px) min(38vw, 32rem), 16rem"
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

                This carried lg:h-full + lg:justify-between until
                2026-09-26, to make the copy occupy the row height the
                portrait sets and bottom-align the CTA row with the
                portrait's lower edge. Removed once the portrait grew to
                32rem: the copy is much shorter than the image, so
                justify-between stopped being an alignment and became a
                chasm — several hundred pixels of nothing between the lede
                and the buttons, and the gap token below was not governing
                that space at all, which made it look unfixable by tuning.

                Top-aligned now, so the gaps mean what they say. The
                leftover height lands BELOW the buttons instead, beside the
                lower part of the portrait, which is the ordinary
                shorter-column whitespace the grid comment describes. */}
            <Stack gap="800">
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
                    • People Inc, Muck Rack, User Interviews, Fullstack
                      Academy — the employer receipts. They are what
                      /resume is for, and the primary CTA points at it.

                  So the hero asserts and the rest of the site proves.
                  The availability line is second and last because it is
                  the sentence the resume CTA directly below answers.

                  A SECOND SENTENCE was added later the same day. The
                  right column had been narrowed to the portrait's exact
                  width and the copy inherited the slack, so at that
                  measure two short lines read as sparse rather than spare.

                  Three candidates were tried and rejected before this one,
                  and the rejections are the useful part:

                    • "I built this site with Claude Code as my build
                      partner" — a receipt, and he did not want the second
                      sentence to be one.
                    • "obsessed with all things media — hundreds of film
                      reviews and dozens of playlists" — distracting, and
                      the cultural corner is the very next section on the
                      page, so it argued for a click it already had.
                    • Anything carrying a figure. The numbers live on
                      /resume and in the fixtures, and a figure written
                      into hero copy goes stale on a cron refresh without
                      anything reporting it.

                  So the second sentence is a POINT OF VIEW rather than
                  evidence, and it adds the one dimension sentence one does
                  not carry. Growth, marketing, data platforms and
                  AI-native are all in the first sentence; the law is not,
                  and it is the rarest thing in the stack — the site's own
                  SITE_DESCRIPTION in app/layout.tsx names it alongside the
                  artist's eye and the theater background.

                  Deliberately phrased to avoid claiming a career sequence.
                  An earlier draft read "I came to data platforms through
                  privacy law", which asserts the degree came first and
                  caused the rest; that ordering has not been verified and
                  is not the point anyway. */}
              <Stack gap="700">
                <Lede>
                  I’m a senior product manager who builds AI‑native
                  growth, marketing, and data platforms. I help teams
                  strengthen their relationships with users through
                  lifecycle marketing and the operational systems behind
                  it.
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
        </Stack>
      </Section>

    </Container>
  );
}
