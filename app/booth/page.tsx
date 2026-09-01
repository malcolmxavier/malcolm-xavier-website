// ─────────────────────────────────────────────────────────────────
// /booth — the public front door to the Booth demo.
//
// WHY THIS PAGE EXISTS. Everything under /booth/* is rewritten to a
// separate, private project (see the rewrites in next.config.ts) that
// serves a recorded copy of the Booth behind a password. Until now the
// only thing in front of it was an HTTP Basic dialog: a grey browser
// box, no context, no way to ask for access, and nothing at all if you
// arrived from a link and did not already have a credential. This page
// is what a person meets instead.
//
// It sits at /booth deliberately. The rewrite for the demo is declared
// `afterFiles`, which means a real file route here wins the bare
// /booth path while /booth/today and the rest still reach the demo —
// so the landing page and the thing it opens share one address, and a
// link to "the Booth" is one link.
//
// AUDIENCE, in order. A prospect Malcolm has already given a login to
// and who needs to get in; somebody who followed a link and wants to
// know what they are looking at; and a buyer who reads the page and
// wants the person who built it. The layout runs in that order, which
// is why the sign-in card is in the hero rather than at the foot.
//
// CLAIMS. Every factual statement here describes the real system, and
// the two numbers are the ones behind the decision to generate the
// demo corpus rather than scrub the real one — they come from the
// measurement recorded in demo/README.md in the workspace. Nothing on
// this page claims a business outcome, because the Booth has not
// produced one that has been measured.
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
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { CONTACT } from "../resume/resume-data";
import { SignIn } from "./SignIn";

// ─── Metadata ────────────────────────────────────────────────────
// Per-page openGraph + twitter blocks because the App Router REPLACES
// the parent layout's OG block when a page declares its own.
const BOOTH_TITLE = "The Booth";
const BOOTH_DESCRIPTION =
  "A private operating surface for one person’s week—six lanes of work merged into a single day, ranked against a time budget, with every decision written back into the system that owns the record. Demo available on request.";

export const metadata: Metadata = {
  title: "The Booth · A working surface, demonstrated",
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

// ─── What it does ────────────────────────────────────────────────
// Four surfaces, in the order somebody clicking through the demo will
// meet them. Each is one claim about what the view is FOR, then one
// about how it works — the second half is what stops the set reading
// as four names for a to-do list.
const SURFACES = [
  {
    name: "Today",
    what: "The merged day, and the only view that answers what to do now.",
    how: "Every lane’s work is interleaved so no day is all one kind, each card carries the lane it came from, and the whole day is sized against a time budget rather than a list. Meetings come off the top as fixed points; habits sit outside the budget until one is genuinely late.",
  },
  {
    name: "The week",
    what: "Where everything sits, which is a different question from what is next.",
    how: "Recurring work is stored as rules and expanded on read, never written into days—so extending the schedule is not a migration, and a habit skipped on Tuesday is skipped on Tuesday only.",
  },
  {
    name: "The career file",
    what: "Roles, rounds, contacts, and the routes into a company.",
    how: "It reads the mailbox. A rejection closes a role, a reply closes the card that asked for it and records everyone who was on the thread, and a ranked list of who might introduce you is built out of what the file already knows rather than out of a connection degree.",
  },
  {
    name: "The map",
    what: "Every open initiative across every project, in one dependency graph.",
    how: "Rows are lanes and columns are depth, so the first column is everything that can be started today. It is the planning surface the other three draw work from.",
  },
];

// ─── The rules underneath ────────────────────────────────────────
// The design decisions worth a stranger's attention. These are the
// part that reads as product thinking rather than as a feature list,
// so they are prose rather than a grid.
const PRINCIPLES = [
  {
    title: "A decision is written once, and says where it landed",
    body: "Every card is a projection of some other system’s record, so “done” has nowhere to live on the card itself. One write path takes a decision and propagates it into the system that owns it—and returns a receipt naming every file it wrote and every system it skipped, with the reason. Some decisions genuinely cannot propagate. Those say so rather than diverging quietly.",
  },
  {
    title: "Automation writes to the record, and shows its work",
    body: "The mail lane closes roles and creates contacts without being asked. Every automated write logs the value it replaced, the words it was read out of, and which run made it, with an undo on the record it touched—because the risk that matters is not who wrote the change, it is whether the change can be taken back.",
  },
  {
    title: "Anything that can reach the internet cannot reach the data",
    body: "Two of the jobs behind these surfaces hold a web search. Both are denied the state folder outright, and what they legitimately need is projected into a separate directory whose one rule is that everything in it is safe to read beside the internet. The deny is a blanket with no hole cut in it, because a hole is where the next sensitive file quietly becomes readable.",
  },
];

// Shared anchor offset so in-page jumps land below the sticky Nav.
const sectionAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

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

export default function BoothPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Machine-generated from the constant above, never user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BOOTH_SCHEMA) }}
      />

      <Container size="lg">
        <div className="mx-auto max-w-[64rem] lg:max-w-none">
          {/* ─── Hero ─────────────────────────────────────────────
              Two columns from lg: the pitch on the left, the way in on
              the right. The sign-in card is in the hero and not at the
              foot because the most common visitor is somebody who
              already has a login and wants to use it—making them read
              the page first would be the site talking to itself. Below
              lg it stacks under the pitch, which is the right order
              for the visitor who does not have one yet. */}
          <Section id="top" style={sectionAnchorStyle} padding="lg">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:items-start">
              <Stack gap="600">
                <Stack gap="300">
                  <Kicker as="p">The Booth</Kicker>
                  <Display as="h1">The surface I run my week from</Display>
                </Stack>
                <Stack gap="300">
                  <Lede>
                    Six lanes of work—a job search, this website, an editorial
                    calendar, a newsletter build, operations, and a personal
                    list—merged into one day and ranked against a time budget.
                    Every decision made on it is written back into whatever
                    system owns the record, and tells you where it landed.
                  </Lede>
                  <Body style={{ color: "var(--text-caption)" }}>
                    It is the tool I actually work out of, built in Claude Code
                    over a few months of using it. The demo behind this page is
                    the real surface running on a recorded day with an invented
                    corpus—not a mockup, and not a video.
                  </Body>
                </Stack>
              </Stack>

              <Card
                id="sign-in"
                style={sectionAnchorStyle}
                className="mt-10 lg:mt-0 lg:sticky lg:top-24"
              >
                <Stack gap="400">
                  <Stack gap="200">
                    <Headline level={2}>Have a login?</Headline>
                    <Body size="sm" style={{ color: "var(--text-caption)" }}>
                      Sign in with the username and password I sent you.
                    </Body>
                  </Stack>
                  <SignIn />
                </Stack>
              </Card>
            </div>
          </Section>

          {/* ─── What you're looking at ───────────────────────────
              Ahead of the feature tour on purpose. The first question a
              stranger has about a demo of somebody's real working tool
              is whose data is in it, and answering it late reads as
              answering it reluctantly. */}
          <Section
            id="what-youre-looking-at"
            style={sectionAnchorStyle}
            bordered
          >
            <Stack gap="500">
              <Stack gap="300">
                <Kicker as="p">The demo</Kicker>
                <Headline level={2}>What you are looking at</Headline>
              </Stack>
              <Body>
                Every person, company, role, message, and post in the demo is
                invented. The corpus is generated from the schema rather than
                scrubbed out of mine, and that was a measurement rather than a
                preference: across my real contacts, 99% are identified by their
                job title and employer alone, and 71% are the only person on file
                at their employer. Renaming the row changes nothing—“Senior
                Engineering Manager, Games at &lt;employer&gt;” is a search that
                returns one human. A structure-preserving scrub produces
                pseudonymized data, and pseudonymized data is still personal data
                precisely because it can be re-identified. Generating from schema
                removes the question: there is nothing to verify, because nothing
                was read.
              </Body>
              <Body>
                The clock is frozen at one date so the day does not slide into an
                empty week. Two things stay live rather than recorded: decide a
                card and the day re-plans itself against the minutes that just
                came back, and a note typed into a network card is genuinely read
                for what it says about the relationship. The rest is a recording
                of the real surface answering its own requests.
              </Body>
            </Stack>
          </Section>

          {/* ─── What it does ─────────────────────────────────────── */}
          <Section id="what-it-does" style={sectionAnchorStyle} bordered>
            <Stack gap="500">
              <Stack gap="300">
                <Kicker as="p">The surfaces</Kicker>
                <Headline level={2}>Four views over one set of records</Headline>
                <Lede>
                  Not four tools. One day, one week, one career file, and one
                  map, all reading the same records—which is why a decision taken
                  on any of them means the same thing on the others.
                </Lede>
              </Stack>
              <Grid cols={2} gap="400">
                {SURFACES.map((surface) => (
                  <Card key={surface.name} padded={false} className="h-full">
                    <div className="flex h-full flex-col gap-2 p-5">
                      <Headline level={3}>{surface.name}</Headline>
                      <Body size="sm">{surface.what}</Body>
                      <Body size="sm" style={{ color: "var(--text-caption)" }}>
                        {surface.how}
                      </Body>
                    </div>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </Section>

          {/* ─── The rules underneath ─────────────────────────────── */}
          <Section id="how-it-works" style={sectionAnchorStyle} bordered>
            <Stack gap="500">
              <Stack gap="300">
                <Kicker as="p">The design</Kicker>
                <Headline level={2}>Three rules the whole thing obeys</Headline>
                <Lede>
                  The interesting part of this project is not the views. It is
                  the constraints underneath them, which is also the part that
                  transfers to a team.
                </Lede>
              </Stack>
              <Stack gap="500" as="ol" className="m-0 list-none p-0">
                {PRINCIPLES.map((rule) => (
                  <li key={rule.title}>
                    <Stack gap="200">
                      <Headline level={3}>{rule.title}</Headline>
                      <Body>{rule.body}</Body>
                    </Stack>
                  </li>
                ))}
              </Stack>
            </Stack>
          </Section>

          {/* ─── Getting in, and getting me ───────────────────────── */}
          <Section id="ask" style={sectionAnchorStyle} bordered padding="lg">
            <Stack gap="500">
              <Stack gap="300">
                <Kicker as="p">Next</Kicker>
                <Headline level={2}>Two things you might want</Headline>
              </Stack>
              <Grid cols={2} gap="400">
                <Card padded={false} className="h-full">
                  <div className="flex h-full flex-col gap-3 p-5">
                    <Headline level={3}>A look inside</Headline>
                    <Body size="sm">
                      Logins are issued one at a time, so the demo stays
                      something I show people deliberately rather than a link
                      that ends up indexed. Email me and I will send a username
                      and a password, usually the same day.
                    </Body>
                    <div className="mt-auto flex flex-wrap gap-3 pt-2">
                      <TrackOnClick
                        event={ANALYTICS_EVENTS.EMAIL_CLICK}
                        eventData={{ kind: "direct", surface: "booth" }}
                      >
                        <Button
                          as="a"
                          href={`mailto:${CONTACT.email}?subject=Booth%20demo%20login`}
                          variant="primary"
                          size="md"
                        >
                          Ask for a login
                        </Button>
                      </TrackOnClick>
                    </div>
                  </div>
                </Card>

                <Card padded={false} className="h-full">
                  <div className="flex h-full flex-col gap-3 p-5">
                    <Headline level={3}>Something like it, for your team</Headline>
                    <Body size="sm">
                      The Booth is what my consulting work looks like when the
                      client is me: lifecycle and data infrastructure, built to
                      be operated rather than admired. Rates and scoped
                      engagements are on the{" "}
                      <Link href="/consulting">consulting page</Link>, and a
                      30-minute call is the fastest way to find out whether this
                      is the shape of the problem you have.
                    </Body>
                    <div className="mt-auto flex flex-wrap gap-3 pt-2">
                      <TrackOnClick
                        event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                        eventData={{ kind: "outbound", surface: "booth" }}
                      >
                        <Button
                          as="a"
                          href={CONTACT.calendly}
                          variant="secondary"
                          size="md"
                        >
                          Book 30 minutes
                        </Button>
                      </TrackOnClick>
                    </div>
                  </div>
                </Card>
              </Grid>

              <Body size="sm" style={{ color: "var(--text-caption)" }}>
                More on how I work:{" "}
                <Link href="/case-studies">case studies</Link>,{" "}
                <Link href="/resume">résumé</Link>, and{" "}
                <Link href={CONTACT.linkedin}>LinkedIn</Link>.
              </Body>
            </Stack>
          </Section>
        </div>
      </Container>
    </>
  );
}
