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
// HOW IT IS SHAPED. As a product page, not a portfolio entry: a
// section per claim, the screenshot that proves it beside the prose
// that makes it, and one call to action closing each section. There is
// no author section. The tool is the argument; the byline is in the
// footer, the nav, and every other page on this site.
//
// THREE REGISTERS, AND THIS PAGE ONLY EVER SPEAKS THE THIRD.
//   1. Engine ids — `lane`, `emitter`, `job-search`, `item.id`. These
//      are stable identifiers in code and are never rendered anywhere
//      a person can read them.
//   2. Installation vocabulary — what one configured instance calls a
//      thing. "Role" in the author's own install, "Opportunity" in the
//      demo. Set per install in booth/vocabulary.json.
//   3. Product language — what this page, the onboarding screen, and
//      any marketing about the Booth call things to somebody who has
//      never seen it.
// An earlier version of this page leaked register 1 into register 3:
// "ranked" and "lane" are how the system is described internally, not
// how a buyer describes their own work. The external words are
// "prioritized" and "workstream". Keep them consistent here, on the
// onboarding screen, and in anything published about the Booth.
//
// TYPE AND WIDTH. One Display (the h1), one Headline level 2 per
// section, one Lede per section at most, and Body for everything else.
// Captions and metadata are the only things allowed to go smaller.
// Prose is capped at PROSE_WIDTH in the single-column sections so the
// measure never changes; the surfaces run two-up and take their
// measure from the column instead.
//
// CLAIMS. Every factual statement here describes the real system. The
// vocabulary table is generated from the two profiles that actually
// ship in booth/vocabulary.json — nothing in it is illustrative.
// Nothing on this page claims a business outcome, because the Booth
// has not produced one that has been measured.
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
import { Card } from "@/components/primitives/Card";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { CONTACT } from "../resume/resume-data";
import { SignIn } from "./SignIn";
import { Shot, ShotStyles } from "./Shot";

// ─── Metadata ────────────────────────────────────────────────────
// Per-page openGraph + twitter blocks because the App Router REPLACES
// the parent layout's OG block when a page declares its own.
const BOOTH_TITLE = "The Booth";
const BOOTH_DESCRIPTION =
  "A working surface that merges every workstream into one prioritized day, sized against the hours you actually have, and writes every decision back into the system that owns the record. Access on request.";

export const metadata: Metadata = {
  title: "The Booth · One prioritized day, out of every system you work in",
  description: BOOTH_DESCRIPTION,
  alternates: { canonical: "/booth" },
  openGraph: {
    title: BOOTH_TITLE,
    description: BOOTH_DESCRIPTION,
    type: "website",
    url: "/booth",
    siteName: "Malcolm Xavier",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: BOOTH_TITLE,
    description: BOOTH_DESCRIPTION,
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

// Section eyebrows take the Booth's accent, the same green the nav
// chip carries. Scoped to the ones that open a section and withheld
// from the step counters inside the How-it-works cards: green marks a
// place the page turns over, and three of them in a row of cards would
// spend on a counter what is worth spending on a heading. Kicker sets
// its colour inline, so this has to arrive as a style rather than as a
// rule in the scope above.
const BOOTH_KICKER: React.CSSProperties = { color: "var(--booth-accent)" };

// Shared anchor offset so in-page jumps land below the sticky Nav.
const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

// The one address access is requested at. Written once so the label
// and the subject line can never drift apart across the call sites.
const ACCESS_HREF = `mailto:${CONTACT.email}?subject=Booth%20access`;

// ─── How it works ────────────────────────────────────────────────
// Three moves, in the order they happen. This is the "broad overview"
// a reader needs before any individual surface means anything.
const MOVES = [
  {
    title: "It reads the systems that already own the work",
    body: "Nothing is re-entered. Mail, a calendar, a pipeline file, a content board, and a dependency map are read where they live, and each stays the system of record for its own work.",
  },
  {
    title: "It builds one day and puts it in order",
    body: "Every workstream is interleaved so no day is all one kind of work, meetings come off the top as fixed points, and what is left is sized against the hours you actually have rather than stacked into a list nobody could finish.",
  },
  {
    title: "A decision is written back, and says where it landed",
    body: "Done, not today, and won’t do each propagate into the system that owns the record, and return a receipt naming every file written and every system skipped with the reason.",
  },
];

// ─── The surfaces ────────────────────────────────────────────────
// Four views, each with the capture that proves it, laid out two-up:
// the claim on the left and the screen it is a claim about on the
// right. `shot` is the basename of a pair in /public/booth-shots.
//
// `rule` is optional and is where a design decision lives that only
// makes sense against the surface it governs. These used to be their
// own section at the foot of the page, which separated every rule from
// the thing it was a rule about and asked the reader to hold four
// screens in their head to understand three constraints.
const SURFACES = [
  {
    name: "Today",
    shot: "today",
    what: "The merged day, and the only view that answers what to do now.",
    how: "Each card carries the workstream it came from and the decision buttons that write it back. Habits sit outside the budget until one is genuinely late, and anything with a clock on it is converted into your own timezone exactly once.",
    caption: "Today, with the day’s fixed points at the top and the budget already spent against them.",
  },
  {
    name: "The week",
    shot: "calendar",
    what: "Where everything sits, which is a different question from what is next.",
    how: "Recurring work is stored as rules and expanded on read, never written into days—so extending the schedule is not a migration, and a habit skipped on Tuesday is skipped on Tuesday only. Moving something here is a real write, with the same refusals the command line enforces.",
    caption: "The week. Dragging a card takes the day, because a card’s position is its date.",
  },
  {
    name: "The pipeline",
    shot: "pipeline",
    what: "Opportunities, meetings, people, and the routes into an organization.",
    how: "It reads the mailbox. A loss notice closes an opportunity, a reply closes the card that asked for it and records everybody who was on the thread, and a prioritized list of who might introduce you is built out of what the file already knows rather than out of a connection degree.",
    caption: "The pipeline, grouped by stage. Stage names come from a settings file, not the code.",
    rule: "It writes to your records without being asked, and shows its work. Every automated change logs what it replaced, the words it was read out of, and which run made it, with an undo on the record it touched—because the risk that matters is not who made the change, it is whether it can be taken back.",
  },
  {
    name: "The map",
    shot: "backlog",
    what: "Every open initiative across every project, in one dependency graph.",
    how: "Rows are workstreams and columns are depth, so the first column is everything that can be started today. It is the planning surface the other three draw work from.",
    caption: "The dependency map. The first column is what is unblocked right now.",
  },
];

// ─── One engine, any vocabulary ──────────────────────────────────
// Read out of the two profiles that ship in booth/vocabulary.json.
// Both columns are real configurations, and neither belongs to a
// customer: the left is the installation this site runs, the right is
// the demo anybody can be let into. Naming a client here would be a
// claim about who is using it rather than about what it does.
//
// The engine key each pair shares used to be a third column. It was
// the truest column on the page and the wrong one to show: a reader
// who does not write software has no use for `stage.prospects`, and
// putting it first made a claim about flexibility read as a claim
// about configuration files. What replaced it is the same row label in
// plain language, because two columns of bare words is a list of
// synonyms — the reader has to be told what the thing IS before two
// names for it mean anything.
const VOCABULARY = [
  { of: "The thing you are pursuing", a: "Role", b: "Opportunity" },
  { of: "Early interest, nothing committed", a: "Prospects", b: "Shortlisted" },
  { of: "You have made your move", a: "Applied", b: "Proposed" },
  { of: "A live conversation", a: "Interviewing", b: "In progress" },
  { of: "Both sides have agreed", a: "Offer", b: "Agreement" },
  { of: "A warm route in", a: "Referral", b: "Introduction" },
];

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
      name: BOOTH_TITLE,
      description: BOOTH_DESCRIPTION,
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
  label = "Request access",
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
      <Container className="booth-brand">
        {/* ─── Hero ───────────────────────────────────────────────
            One claim, one paragraph under it, two ways forward, and
            the product itself beside them. This is the first row of
            the alternating two-up rhythm the surfaces section
            continues: claim on one side, screen on the other, sides
            swapping down the page. It reads left-text so that the
            first surface row below can read right-text and the
            alternation runs unbroken from the top of the page. */}
        <Section id="top" style={sectionAnchorStyle} padding="lg">
          <div className="booth-surface">
            <Stack gap="700" className={PROSE_WIDTH}>
              <Stack gap="300">
                <Kicker as="p" style={BOOTH_KICKER}>The Booth</Kicker>
                <Display as="h1">
                  One prioritized day, out of every system you work in
                </Display>
              </Stack>
              <Lede>
                The Booth reads the tools that already own your work, merges
                what is live into a single day prioritized against the hours
                you actually have, and writes every decision back where it came
                from.
              </Lede>
              <div className="flex flex-wrap items-center gap-3">
                <TrackOnClick
                  event={ANALYTICS_EVENTS.EMAIL_CLICK}
                  eventData={{ kind: "direct", surface: "booth" }}
                >
                  <Button as="a" href={ACCESS_HREF} variant="primary" size="lg">
                    Request access
                  </Button>
                </TrackOnClick>
                <Button as="a" href="#sign-in" variant="secondary" size="lg">
                  Sign in
                </Button>
              </div>
            </Stack>

            <Shot
              name="today"
              preload
              alt="The Booth’s Today view: a standing-routine column on the left, the day’s prioritized cards in the centre each tagged with the workstream it came from and carrying Done, Not today, and Won’t do buttons, and a Coming up column on the right."
              caption="Today, in the demo instance. Every person, organization, and message in it is invented."
              sizes="(min-width: 64rem) 38rem, 100vw"
            />
          </div>
        </Section>

        {/* ─── How it works ─────────────────────────────────────── */}
        <Section id="how-it-works" style={sectionAnchorStyle} bordered>
          <Stack gap="600">
            <Stack gap="300" className={PROSE_WIDTH}>
              <Kicker as="p" style={BOOTH_KICKER}>How it works</Kicker>
              <Headline level={2}>Three moves, and the day is real</Headline>
              <Lede>
                There is no inbox to keep clean and no board to groom. The work
                stays where it is; what the Booth owns is the order.
              </Lede>
            </Stack>
            <Grid cols={3} gap="400">
              {MOVES.map((move, i) => (
                <Card key={move.title} padded={false} className="h-full">
                  <div className="flex h-full flex-col gap-2 p-5">
                    <Kicker as="p">Step {i + 1}</Kicker>
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
              <Body>
                That third move is the one most tools skip. Every card is a
                projection of some other system’s record, so “done” has nowhere
                to live on the card itself. One write path takes the decision
                and propagates it, then returns a receipt naming what it wrote
                and what it could not. Some decisions genuinely cannot
                propagate—those say so on the receipt rather than diverging
                quietly.
              </Body>
              <RequestAccess lead="Access is issued by hand, usually the same day." />
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
        <Section id="surfaces" style={sectionAnchorStyle} bordered>
          <Stack gap="700">
            <Stack gap="300" className={PROSE_WIDTH}>
              <Kicker as="p" style={BOOTH_KICKER}>The surfaces</Kicker>
              <Headline level={2}>Four views over one set of records</Headline>
              <Lede>
                Not four tools. One day, one week, one pipeline, and one map,
                all reading the same records—which is why a decision taken on
                any of them means the same thing on the others.
              </Lede>
            </Stack>

            <Stack gap="600" as="ol" className="m-0 list-none p-0">
              {SURFACES.map((surface, i) => (
                <li
                  key={surface.name}
                  className={
                    i % 2 === 0
                      ? "booth-surface booth-surface--flip"
                      : "booth-surface"
                  }
                >
                  <Stack gap="200">
                    <Headline level={3} style={SUB_HEADING}>
                      {surface.name}
                    </Headline>
                    <Body>{surface.what}</Body>
                    <Body>{surface.how}</Body>
                    {surface.rule ? <RuleNote>{surface.rule}</RuleNote> : null}
                  </Stack>
                  <Shot
                    name={surface.shot}
                    alt={`The Booth’s ${surface.name} view. ${surface.what}`}
                    caption={surface.caption}
                    sizes="(min-width: 64rem) 38rem, 100vw"
                  />
                </li>
              ))}
            </Stack>

            <div className={PROSE_WIDTH}>
              <RequestAccess label="See it running" />
            </div>
          </Stack>
        </Section>

        {/* ─── One engine, any vocabulary ───────────────────────────
            The commercial argument, and the reason the demo wears a
            different set of words rather than being a censored copy of
            the live installation. Both columns are configurations that
            exist; neither is a customer. */}
        <Section id="vocabulary" style={sectionAnchorStyle} bordered>
          <Stack gap="600">
            <Stack gap="300" className={PROSE_WIDTH}>
              <Kicker as="p" style={BOOTH_KICKER}>Configuration</Kicker>
              <Headline level={2}>
                Every word on these screens is a setting
              </Headline>
              <Lede>
                Nothing here is hard-coded to one kind of business. What you
                call a deal, a stage, a meeting, an introduction—each of them
                is a setting, so the same system runs a sales desk, an
                admissions office, or a development team without being
                rebuilt.
              </Lede>
            </Stack>

            <div className={PROSE_WIDTH}>
              <Body>
                Two configurations ship with it, and both are running today.
                One is set up for a job search. The other is the demo—the same
                build, dressed as a partnerships desk, with every organization
                and person in it invented. Same software, same screens, a
                different list of words. Nothing was forked and nothing was
                rebuilt.
              </Body>
            </div>

            {/* Capped rather than left at the container’s full 80rem: three
                columns spread that wide put a word and its counterpart at
                opposite ends of the screen, which is the one comparison this
                table exists to make. The row label is a <th scope="row"> so a
                screen reader announces “Early interest — Prospects — Shortlisted”
                rather than reading two disconnected word lists. */}
            <div className="overflow-x-auto max-w-[52rem]">
              <table
                className="w-full border-collapse text-left"
                style={{ fontSize: "var(--p-font-size)" }}
              >
                <caption className="sr-only">
                  The same records under two shipped configurations: what each
                  thing is, and the word each configuration uses for it.
                </caption>
                <thead>
                  <tr>
                    {["What it is", "A job search", "The demo"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b py-2 pr-6 font-normal"
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
                        className="border-b py-2 pr-6 font-normal"
                        style={{
                          borderColor: "var(--border-default)",
                          color: "var(--text-caption)",
                        }}
                      >
                        {row.of}
                      </th>
                      <td
                        className="border-b py-2 pr-6"
                        style={{ borderColor: "var(--border-default)" }}
                      >
                        {row.a}
                      </td>
                      <td
                        className="border-b py-2 pr-6"
                        style={{ borderColor: "var(--border-default)" }}
                      >
                        {row.b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={PROSE_WIDTH}>
              <Stack gap="400">
                <Body>
                  That is the part worth a buyer’s attention. A CRM that fits an
                  admissions funnel, a development office, or a two-person
                  agency is not a different product—it is the same system and a
                  list somebody wrote in an afternoon.
                </Body>
                <RequestAccess
                  label="Request access"
                  lead={
                    "Setting an instance up in a team’s own words is scoped work; " +
                    "rates are on the consulting page."
                  }
                />
              </Stack>
            </div>
          </Stack>
        </Section>

        {/* ─── Getting in ──────────────────────────────────────────
            The trust close as well as the access route. The rule about
            what the automated jobs can reach is printed here rather
            than in a section of its own: it is the last doubt a reader
            has before asking for a login, so it belongs against the
            ask. */}
        <Section id="access" style={sectionAnchorStyle} bordered padding="lg">
          <Grid cols={2} gap="500">
            <Stack gap="400">
              <Stack gap="300">
                <Kicker as="p" style={BOOTH_KICKER}>Access</Kicker>
                <Headline level={2}>Ask for a login</Headline>
              </Stack>
              <Body>
                Logins are issued one at a time, so the demo stays something
                shown deliberately rather than a link that ends up indexed. Say
                who you are and what you want to see, and a username and a
                password come back, usually the same day.
              </Body>
              <RuleNote>
                On the question every reader eventually asks: two of the jobs
                behind these surfaces can search the web, and both are denied
                the data folder outright. What they legitimately need is copied
                into a separate directory whose one rule is that everything in
                it is safe to read beside the internet. There is no exception
                list, because an exception is where the next sensitive file
                quietly becomes readable.
              </RuleNote>
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
                    Request access
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
                    Book 30 minutes
                  </Button>
                </TrackOnClick>
              </div>
            </Stack>

            <Card id="sign-in" style={sectionAnchorStyle}>
              <Stack gap="400">
                <Stack gap="200">
                  <Headline level={3} style={ITEM_HEADING}>
                    Already have one?
                  </Headline>
                  <Body size="sm" style={{ color: "var(--text-caption)" }}>
                    Sign in with the username and password you were sent.
                  </Body>
                </Stack>
                <SignIn />
              </Stack>
            </Card>
          </Grid>
        </Section>
      </Container>
    </>
  );
}
