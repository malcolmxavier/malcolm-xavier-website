// ─────────────────────────────────────────────────────────────────
// /booth — the product page for the Booth.
//
// WHY THIS PAGE EXISTS. Everything under /booth/* is rewritten to a
// separate, private project (see the rewrites in next.config.ts) that
// serves a recorded copy of the Booth behind a password. Until this
// page existed the only thing in front of it was an HTTP Basic dialog:
// a grey browser box, no context, and no way to ask for access.
//
// It sits at /booth deliberately. The rewrite for the demo is declared
// `afterFiles`, which means a real file route here wins the bare
// /booth path while /booth/today and the rest still reach the demo —
// so the product page and the thing it opens share one address, and a
// link to "the Booth" is one link.
//
// HOW IT IS SHAPED. As a product page, not a portfolio entry: a band
// per claim, the screenshot that proves it beside the prose that makes
// it, and the call to action inside the band rather than under it. A
// band is one horizontal slab of the page, and consecutive bands
// touch, so nothing sits in the space between two of them. Most carry
// a colour; the two that introduce a run of others do not, because a
// page where every slab is tinted has no rest in it and the tint
// stops meaning anything. There is no author section. The tool is the
// argument; the byline is in the footer, the nav, and every other
// page on this site.
//
// WIDTH. This is the one page on the site that does not sit inside
// the shared content well. Everywhere else, Container is what lines
// the header, the footer, and every page up against each other, and
// that is right for a page that is a document. This page is a wall of
// colour, and a wall of colour stopped short of the window reads as a
// document about a product rather than as the product — the dark
// margin turns every band into a slide on a page instead of a surface
// the reader is looking at. So the bands run edge to edge and carry
// the well themselves: each one pads its own content in to
// --booth-well, sized for screenshots, since a screenshot is only an
// argument at a size you can read it at. The site's rail was then
// widened to that well plus its two gutters, so the bands' content
// lines up with the header and the footer even though the colour does
// not stop where they do. The prose inside still sets to PROSE_WIDTH,
// so the measure never grew.
//
// COPY. Every word a reader sees lives in ./copy.ts, and none of it
// lives here. That file also carries the editing rules — real glyphs
// rather than entities, and the three registers this page is allowed
// to speak in. Change wording there; change shape here.
//
// TYPE. One Display (the h1), one Headline level 2 per section, one
// Lede per section at most, and Body for everything else. Captions
// and metadata are the only things allowed to go smaller.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Button } from "@/components/primitives/Button";
import { Link } from "@/components/primitives/Link";
import { Card } from "@/components/primitives/Card";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { CONTACT } from "../resume/resume-data";
import { SignIn } from "./SignIn";
import { Shot, ShotStyles } from "./Shot";
import {
  ACCESS,
  HERO,
  HOW_IT_WORKS,
  META,
  MOVES,
  SURFACES,
  VOCABULARY_COPY,
} from "./copy";

// ─── Metadata ────────────────────────────────────────────────────
// Per-page openGraph + twitter blocks because the App Router REPLACES
// the parent layout's OG block when a page declares its own.
export const metadata: Metadata = {
  title: META.pageTitle,
  description: META.description,
  alternates: { canonical: "/booth" },
  openGraph: {
    title: META.name,
    description: META.description,
    type: "website",
    url: "/booth",
    siteName: "Malcolm Xavier",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: META.name,
    description: META.description,
  },
};

// ─── Shared measurements ─────────────────────────────────────────
// One prose measure for the single-column sections. The single most
// visible thing wrong with an earlier version was that every section
// picked its own width, so the eye had to find the left edge again on
// each scroll.
const PROSE_WIDTH = "max-w-[46rem]";

// Two optical sizes under the section heading, and no more. The scale's
// own h2 and h3 are 48px and 40px, which is a 17% step — too small a gap
// to read as a level change, so every sub-heading looked like a section
// title. These keep the semantic level (an h3 is still an h3 for a screen
// reader) and borrow a smaller step: 32px for a named part of a section,
// 24px for an item inside a card or a list.
const SUB_HEADING: React.CSSProperties = {
  fontSize: "var(--h4-font-size)",
  lineHeight: "var(--h4-line-height)",
};
const ITEM_HEADING: React.CSSProperties = {
  fontSize: "var(--h5-font-size)",
  lineHeight: "var(--h5-line-height)",
  letterSpacing: "0",
};

// Shared anchor offset so in-page jumps land below the sticky Nav.
const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

// The prose size for text that sits beside something tall — the surface
// rows beside their captures, and the ask beside the sign-in card. Read
// from custom properties that Shot.tsx steps at 64rem, 80rem, and 96rem;
// the comment there carries the reasoning. Prose in a single-column
// section keeps the ordinary body step, which is why this is applied at
// call sites rather than to the page.
const ROW_PROSE: React.CSSProperties = {
  fontSize: "var(--booth-row-size)",
  lineHeight: "var(--booth-row-leading)",
  // Overrides the primitives' own 60ch cap. That cap is a measure for a
  // full-width document column and never binds inside a half-width grid
  // column, so the row's line length was set by the viewport instead.
  // Below 64rem the variable resolves to the same 60ch the primitives
  // use, so the single-column stack is untouched.
  maxWidth: "var(--booth-row-measure)",
};

// The one address access is requested at. Written once so the label
// and the subject line can never drift apart across the call sites.
const ACCESS_HREF = `mailto:${CONTACT.email}?subject=Booth%20access`;

// ─── JSON-LD ─────────────────────────────────────────────────────
// Two nodes, connected the way STRUCTURED-DATA.md asks: the page is
// part of the site and about the person. No SoftwareApplication node —
// the Booth is not downloadable, installable, or for sale today, and
// claiming the type to win a rich result would be a claim about the
// thing rather than a description of it.
const BOOTH_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/booth/#webpage`,
      url: `${SITE_URL}/booth`,
      name: META.name,
      description: META.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#person` },
      author: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

/**
 * A design rule, printed against the surface it governs.
 *
 * Set apart from the prose above it by a rule and a smaller size
 * rather than by a colour, because these are asides rather than
 * headings — the accent on this page marks where a section turns over,
 * and spending it inside a section would flatten that signal.
 */
function RuleNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-1 border-t pt-3"
      style={{ borderColor: "var(--border-default)" }}
    >
      <Body size="sm" style={{ color: "var(--text-caption)" }}>
        {children}
      </Body>
    </div>
  );
}

export default function BoothPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Machine-generated from the constant above, never user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BOOTH_SCHEMA) }}
      />
      <ShotStyles />

      {/* booth-brand remaps --font-primary and --font-mono for the
          subtree (app/components.css), which is what puts every heading
          into Big Shoulders and every label into Anonymous Pro without
          a font-family on a single element here. Body and lede are
          untouched on purpose: the Booth departs in its marquee and its
          paperwork, and reading text is still the site's. */}
      <div className="booth-brand">
        {/* ─── Hero ───────────────────────────────────────────────
            One claim, one paragraph under it, two ways forward, and
            the product itself beside them. This is the first row of
            the alternating two-up rhythm the surfaces section
            continues: claim on one side, screen on the other, sides
            swapping down the page. It reads left-text so that the
            first surface row below can read right-text and the
            alternation runs unbroken from the top of the page. */}
        <Section id="top" style={sectionAnchorStyle} padding="lg">
          <div className="booth-surface booth-surface--flush booth-band booth-band--green">
            <Stack gap="700" className={PROSE_WIDTH}>
              <Display as="h1">{HERO.heading}</Display>
              <Lede>{HERO.lede}</Lede>
              <div className="flex flex-wrap items-center gap-3">
                <TrackOnClick
                  event={ANALYTICS_EVENTS.EMAIL_CLICK}
                  eventData={{ kind: "direct", surface: "booth" }}
                >
                  <Button as="a" href={ACCESS_HREF} variant="primary" size="lg">
                    {HERO.primaryCta}
                  </Button>
                </TrackOnClick>
                <Button as="a" href="#sign-in" variant="secondary" size="lg">
                  {HERO.secondaryCta}
                </Button>
              </div>
            </Stack>

            {/* No caption. The paragraph beside it is the caption — this
                capture is the hero's illustration rather than an exhibit
                being annotated, which is what the surface shots
                below are. */}
            <Shot
              name="today"
              preload
              alt={HERO.shotAlt}
              sizes="(min-width: 96rem) 49rem, (min-width: 64rem) 45rem, 100vw"
            />
          </div>
        </Section>

        {/* ─── How it works ─────────────────────────────────────── */}
        <Section id="how-it-works" style={sectionAnchorStyle}>
          <Stack gap="600" className="booth-band">
            <Stack gap="300" className={`${PROSE_WIDTH} booth-prose-column`}>
              <Headline level={2}>{HOW_IT_WORKS.heading}</Headline>
              <Lede>{HOW_IT_WORKS.lede}</Lede>
            </Stack>
            {/* cols={1} plus an lg step, rather than cols={3}, which
                would take the shared ramp: one column, then two from
                40rem, then three. Two is the wrong middle for these
                three. They are numbered steps, so a 2-up grid breaks
                the sequence across an uneven row and leaves step 3 —
                the move most tools skip — alone beside an empty half.
                Everywhere else on the
                site a 3-grid holds tiles, where an uneven last row is
                the normal shape of a collection; a sequence is the one
                case it is not. So these go one-up until there is room
                for all three side by side. */}
            <Grid cols={1} gap="400" className="lg:grid-cols-3">
              {MOVES.map((move, i) => (
                <Card
                  key={move.title}
                  padded={false}
                  className="h-full"
                  // Flat, never a gradient: these three are the legend for
                  // the page's palette, and a legend has to state its colour
                  // plainly. The border Card draws is left alone, but what it
                  // does depends on the theme: in light it is --border-default
                  // against a pale tint and neither edge of it clears 1.3:1,
                  // so the fill is what shapes the card and the border is
                  // effectively not there. In dark the tints are deep enough
                  // to sit close to the page, and the same border is the only
                  // thing separating them from it. Worth knowing before
                  // anyone removes it on the evidence of a light-mode
                  // screenshot.
                  style={{ background: `var(--booth-${move.tint})` }}
                >
                  <div className="flex h-full flex-col gap-2 p-5">
                    {/* The counter is not an eyebrow. The heading says
                        there are three moves and the cards carry them in
                        order, but the order is the claim — each move is
                        only possible once the one before it has happened
                        — and a number is what lets a reader hold that
                        while reading across three cards. */}
                    <Kicker as="p">
                      {HOW_IT_WORKS.stepPrefix} {i + 1}
                    </Kicker>
                    <Headline
                      level={3}
                      className="booth-move-title"
                      style={ITEM_HEADING}
                    >
                      {move.title}
                    </Headline>
                    <Body>{move.body}</Body>
                  </div>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Section>

        {/* ─── The surfaces ─────────────────────────────────────────
            Two-up from 64rem, with the sides swapping row to row. The
            layout is in the ShotStyles sheet rather than in Grid, which
            splits at 40rem — two 20rem columns puts a 1440px capture at
            a size where it is texture rather than a screenshot, and the
            tablet width is where this page is most likely to be opened
            in a meeting.

            Even indices flip, so the section opens on the side the
            hero did not: Today's prose right, the calendar's left, the
            network right, the pipeline left, the backlog right. There is no
            heading above the rows — the day itself answers the promise
            the section before it makes, and a paragraph announcing the
            views stood between the two saying what the rows already
            say. */}
        <Section id="surfaces" style={sectionAnchorStyle}>
          {/* gap 0, because the bands inside supply their own padding and
              have to touch. Any gap here is an uncoloured stripe. */}
          <Stack gap="0" as="ol" className="m-0 list-none p-0">
            {SURFACES.map((surface, i) => (
              <li
                key={surface.name}
                className={[
                  "booth-surface",
                  "booth-band",
                  `booth-band--${surface.tint}`,
                  // Two axes, deliberately separate. Which side the
                  // prose takes is a question about the reading
                  // rhythm down the page, and which side the wash
                  // starts on is a question about the colour; a
                  // single condition driving both means neither can
                  // be changed without changing the other.
                  i % 2 === 0 ? "booth-surface--flip" : "",
                  i % 2 === 0 ? "booth-band--right" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Stack gap="300">
                  <Headline level={2} style={SUB_HEADING}>
                    {surface.name}
                  </Headline>
                  <Lede style={ROW_PROSE}>{surface.what}</Lede>
                  <Body style={ROW_PROSE}>{surface.how}</Body>
                  {surface.rule ? <RuleNote>{surface.rule}</RuleNote> : null}
                </Stack>
                <Shot
                  name={surface.shot}
                  alt={`${surface.name} in the Booth. ${surface.what}`}
                  caption={surface.caption}
                  sizes="(min-width: 96rem) 49rem, (min-width: 64rem) 45rem, 100vw"
                />
              </li>
            ))}
          </Stack>
        </Section>

        {/* ─── Set up in your own words ─────────────────────────
            The commercial argument, and the last thing said before the
            ask, which is why it hands straight down into it.

            Prose and nothing else. This band used to set the author's
            own configuration beside the demo's in a six-row table, and
            the table was the section's screenshot: the claim is that a
            word is a setting, and two shipped configurations side by
            side were what showed it. What it actually showed was an
            audit of the software — two columns of synonyms, under five
            paragraphs establishing which installation each column was
            — where the reader's question is whether it can be theirs.

            The column takes the hero's measure rather than the band's
            full well. Every other band on the page is two columns, so
            a single block running the whole well would be the one
            measure on the page with nothing to agree with.

            No booth-surface here, and that is the point of the class
            being absent rather than an omission: booth-surface is the
            two-column grid every other band needs to stand its prose
            beside a capture. With the table gone this band has one
            child, which would sit in the 1fr column at half the well
            and then be halved again by the measure below — a quarter
            of the page, wrapping every four or five words. */}
        <Section id="vocabulary" style={sectionAnchorStyle}>
          <div className="booth-band booth-band--green">
            <Stack gap="400" className="booth-prose-column">
              <Headline level={2}>{VOCABULARY_COPY.heading}</Headline>
              <Lede>{VOCABULARY_COPY.lede}</Lede>
              {VOCABULARY_COPY.body.map((paragraph) => (
                <Body key={paragraph.slice(0, 32)}>{paragraph}</Body>
              ))}
            </Stack>
          </div>
        </Section>

        {/* ─── Getting in ──────────────────────────────────────────
            The ask. Both things a reader can have are named here and
            nowhere else: the login, which is what the buttons do, and
            the build, which is a link out to where it is priced. */}
        <Section id="access" style={sectionAnchorStyle}>
          {/* booth-stepped-prose is what the two paragraphs below read
              their size from. The card beside them is a bordered box
              with a form in it, which carries far more weight than two
              lines of 16px text — so the offer was losing its own
              section to the thing a reader only needs if they already
              have a login. */}
          <Grid cols={2} gap="500" className="booth-band booth-stepped-prose">
            <Stack gap="400">
              <Headline level={2}>{ACCESS.heading}</Headline>
              <Body style={ROW_PROSE}>{ACCESS.body}</Body>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <TrackOnClick
                  event={ANALYTICS_EVENTS.EMAIL_CLICK}
                  eventData={{ kind: "direct", surface: "booth" }}
                >
                  <Button
                    as="a"
                    href={ACCESS_HREF}
                    variant="primary"
                    size="lg"
                  >
                    {ACCESS.primaryCta}
                  </Button>
                </TrackOnClick>
                <TrackOnClick
                  event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                  eventData={{ kind: "outbound", surface: "booth" }}
                >
                  <Button
                    as="a"
                    href={CONTACT.calendly}
                    variant="secondary"
                    size="lg"
                  >
                    {ACCESS.secondaryCta}
                  </Button>
                </TrackOnClick>
              </div>
              {/* The build note sits after the buttons, at full body size.
                  An earlier draft set the same offer in small caption type
                  inside a feature band, where it was easy to miss; the only
                  thing that can be bought outright does not get shrunk. */}
              <Body style={ROW_PROSE}>
                {ACCESS.offer.before}
                <Link href={ACCESS.offer.href} jump>
                  {ACCESS.offer.linkLabel}
                </Link>
                {ACCESS.offer.after}
              </Body>
            </Stack>

            <Card id="sign-in" style={sectionAnchorStyle}>
              <Stack gap="400">
                <Stack gap="200">
                  <Headline level={3} style={ITEM_HEADING}>
                    {ACCESS.signInHeading}
                  </Headline>
                  <Body size="sm" style={{ color: "var(--text-caption)" }}>
                    {ACCESS.signInBody}
                  </Body>
                </Stack>
                <SignIn />
              </Stack>
            </Card>
          </Grid>
        </Section>
      </div>
    </>
  );
}
