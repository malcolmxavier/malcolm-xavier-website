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
// WIDTH. This is the one page on the site that does not sit in the
// shared content well. Everywhere else, Container's 80rem rail is
// what lines the header, the footer, and every page up against each
// other, and that rail is right for a page that is a document. This
// page is a wall of colour, and a wall of colour stopped 160px short
// of the window reads as a document about a product rather than as
// the product — the dark margin turns every band into a slide on a
// page instead of a surface the reader is looking at. So the bands
// run edge to edge and carry the well themselves: each one pads its
// own content in to --booth-well, which is wider than the site's rail
// because the evidence on this page is screenshots and a screenshot
// is only an argument at a size you can read it at. The prose inside
// still sets to PROSE_WIDTH, so the measure never grew.
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
  REQUEST_ACCESS_LABEL,
  SURFACES,
  SURFACES_INTRO,
  VOCABULARY,
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
    },
  ],
};

/**
 * The section-closing call to action.
 *
 * Every section ends with one, and they all point at the same place —
 * what changes is the sentence in front of it, which is the argument
 * that section just made. Rendering them through one component is what
 * keeps the repeated calls to action reading as a spine rather than as
 * nagging, and it means the tracked event is identical everywhere.
 */
function RequestAccess({
  label = REQUEST_ACCESS_LABEL,
  lead,
  variant = "secondary",
  size = "md",
}: {
  label?: string;
  lead?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
      <TrackOnClick
        event={ANALYTICS_EVENTS.EMAIL_CLICK}
        eventData={{ kind: "direct", surface: "booth" }}
      >
        <Button as="a" href={ACCESS_HREF} variant={variant} size={size}>
          {label}
        </Button>
      </TrackOnClick>
      {lead ? (
        <Body size="sm" style={{ color: "var(--text-caption)" }}>
          {lead}
        </Body>
      ) : null}
    </div>
  );
}

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
          <div className="booth-surface booth-band booth-band--green">
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

            <Shot
              name="today"
              preload
              alt={HERO.shotAlt}
              caption={HERO.shotCaption}
              sizes="(min-width: 96rem) 49rem, (min-width: 64rem) 45rem, 100vw"
            />
          </div>
        </Section>

        {/* ─── How it works ─────────────────────────────────────── */}
        <Section id="how-it-works" style={sectionAnchorStyle}>
          <Stack gap="600" className="booth-band">
            <Stack gap="300" className={PROSE_WIDTH}>
              <Headline level={2}>{HOW_IT_WORKS.heading}</Headline>
              <Lede>{HOW_IT_WORKS.lede}</Lede>
            </Stack>
            <Grid cols={3} gap="400">
              {MOVES.map((move, i) => (
                <Card
                  key={move.title}
                  padded={false}
                  className="h-full"
                  // Flat, never a gradient: these three are the legend for
                  // the page's palette, and a legend has to state its colour
                  // plainly. The border stays so the card still reads as the
                  // same object the rest of the site's cards are.
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
                    <Headline level={3} style={ITEM_HEADING}>
                      {move.title}
                    </Headline>
                    <Body>{move.body}</Body>
                  </div>
                </Card>
              ))}
            </Grid>
            {/* The third move carries the rule that used to sit in its
                own section at the foot of the page. It belongs here:
                it is the claim the three steps are all instances of. */}
            <Stack gap="400" className={PROSE_WIDTH}>
              <Body>{HOW_IT_WORKS.closer}</Body>
              <RequestAccess lead={HOW_IT_WORKS.ctaLead} />
            </Stack>
          </Stack>
        </Section>

        {/* ─── The surfaces ─────────────────────────────────────────
            Two-up from 64rem, with the sides swapping row to row. The
            layout is in the ShotStyles sheet rather than in Grid, which
            splits at 40rem — two 20rem columns puts a 1440px capture at
            a size where it is texture rather than a screenshot, and the
            tablet width is where this page is most likely to be opened
            in a meeting.

            The first row is flipped rather than the second, because the
            hero above is row one of the same rhythm and reads
            left-text. Even indices flip, so the page alternates
            unbroken from the top: hero left, Today right, the week
            left, and so on. */}
        <Section id="surfaces" style={sectionAnchorStyle}>
          {/* gap 0, because the bands inside supply their own padding and
              have to touch. Any gap here is an uncoloured stripe. */}
          <Stack gap="0">
            <div className="booth-band">
              <Stack gap="300" className={PROSE_WIDTH}>
                <Headline level={2}>{SURFACES_INTRO.heading}</Headline>
                <Lede>{SURFACES_INTRO.lede}</Lede>
              </Stack>
            </div>

            <Stack gap="0" as="ol" className="m-0 list-none p-0">
              {SURFACES.map((surface, i) => (
                <li
                  key={surface.name}
                  className={[
                    "booth-surface",
                    "booth-band",
                    `booth-band--${surface.tint}`,
                    // A flipped row puts its prose on the right, so the
                    // wash has to start there too. One condition drives
                    // both, which is what stops them drifting apart.
                    i % 2 === 0 ? "booth-surface--flip booth-band--right" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Stack gap="200">
                    <Headline level={3} style={SUB_HEADING}>
                      {surface.name}
                    </Headline>
                    <Body>{surface.what}</Body>
                    <Body>{surface.how}</Body>
                    {surface.rule ? <RuleNote>{surface.rule}</RuleNote> : null}
                    <RequestAccess
                      label={surface.cta}
                      variant={surface.close ? "primary" : "secondary"}
                    />
                  </Stack>
                  <Shot
                    name={surface.shot}
                    alt={`The Booth’s ${surface.name} view. ${surface.what}`}
                    caption={surface.caption}
                    sizes="(min-width: 96rem) 49rem, (min-width: 64rem) 45rem, 100vw"
                  />
                </li>
              ))}
            </Stack>
          </Stack>
        </Section>

        {/* ─── One engine, any vocabulary ───────────────────────────
            The commercial argument, and the reason the demo wears a
            different set of words rather than being a censored copy of
            the live installation. Both columns are configurations that
            exist; neither is a customer. */}
        <Section id="vocabulary" style={sectionAnchorStyle}>
          {/* The heading sits inside the prose column rather than above the
              pair. The wash starts on the side the text is on, so a heading
              set apart from its own argument would be the one line on the
              page left standing off its colour.

              The argument runs beside the evidence for it, on the same
              alternating rhythm the surfaces above use — and flipped,
              because the last surface row read text-left. The table is this
              section’s screenshot: the claim is that a word is a setting,
              and two shipped configurations side by side are what shows it. */}
          <div className="booth-surface booth-surface--flip booth-band booth-band--orange booth-band--right">
            <Stack gap="400">
              <Headline level={2}>{VOCABULARY_COPY.heading}</Headline>
              <Lede>{VOCABULARY_COPY.lede}</Lede>
              {VOCABULARY_COPY.body.map((paragraph) => (
                <Body key={paragraph.slice(0, 32)}>{paragraph}</Body>
              ))}
              <RequestAccess
                variant="primary"
                lead={VOCABULARY_COPY.ctaLead}
              />
            </Stack>

            {/* The row label is a <th scope="row"> so a screen reader
                announces “Early interest — Prospects — Shortlisted” as one
                statement rather than reading three disconnected word lists.
                overflow-x-auto is the escape hatch for the narrowest
                columns: the grid track is minmax(0, …), so the table can
                scroll inside it without widening the page. */}
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-left"
                style={{ fontSize: "var(--p-font-size)" }}
              >
                <caption className="sr-only">{VOCABULARY_COPY.caption}</caption>
                <thead>
                  <tr>
                    {VOCABULARY_COPY.columns.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b py-2 pr-4 font-normal"
                        style={{
                          borderColor: "var(--border-default)",
                          color: "var(--text-caption)",
                          fontSize: "var(--p-sm-font-size)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VOCABULARY.map((row) => (
                    <tr key={row.a}>
                      {/* The concept, in the reader’s own language. Set in
                          the caption colour so the two configured words are
                          what the eye lands on. */}
                      <th
                        scope="row"
                        className="border-b py-2 pr-4 font-normal"
                        style={{
                          borderColor: "var(--border-default)",
                          color: "var(--text-caption)",
                        }}
                      >
                        {row.of}
                      </th>
                      <td
                        className="border-b py-2 pr-4"
                        style={{ borderColor: "var(--border-default)" }}
                      >
                        {row.a}
                      </td>
                      <td
                        className="border-b py-2 pr-4"
                        style={{ borderColor: "var(--border-default)" }}
                      >
                        {row.b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          </div>
        </Section>

        {/* ─── Getting in ──────────────────────────────────────────
            The trust close as well as the access route. The rule about
            what the automated jobs can reach is printed here rather
            than in a section of its own: it is the last doubt a reader
            has before asking for a login, so it belongs against the
            ask. */}
        <Section id="access" style={sectionAnchorStyle}>
          <Grid cols={2} gap="500" className="booth-band booth-band--green">
            <Stack gap="400">
              <Headline level={2}>{ACCESS.heading}</Headline>
              <Body>{ACCESS.body}</Body>
              <RuleNote>{ACCESS.rule}</RuleNote>
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
