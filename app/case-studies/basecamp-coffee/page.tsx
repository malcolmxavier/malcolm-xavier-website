// ─────────────────────────────────────────────────────────────────
// /case-studies/basecamp-coffee — the Basecamp Rewards turnaround
// case study. Ported from the standalone Basecamp Coffee project at
// github.com/malcolmxavier/quiz-project. Brand styling (cream-on-
// brown, Fraunces / Space Grotesk / JetBrains Mono, glass cards)
// lives in basecamp.css scoped to data-case-study="basecamp", which
// the route layout wraps around this page.
//
// Differences from the original:
//   - SiteChrome (Basecamp wordmark + scroll progress) is replaced
//     by a bare ScrollProgress because malxavi.com's Nav already
//     sits above this page.
//   - Footer dropped — root layout already renders malxavi's Footer
//     at the bottom of every route.
//   - "Take the quiz" inline links point at the live prototype on
//     quiz-project-flax-beta.vercel.app (kept alive after the
//     /case-study path is redirected to this page).
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Link } from "@/components/primitives/Link";
import {
  TableOfContents,
  type TocItem,
} from "@/components/chrome/TableOfContents";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import { CaseStudyHero } from "@/components/case-study/Hero";
import {
  Beat,
  BeatSeparator,
  Body,
  ClaudeNote,
  Code,
  Emph,
  EvidenceCard,
  EvidenceGrid,
  GateCard,
  HarnessFeature,
  HarnessGrid,
  IterationCard,
  IterationGrid,
  type MetricRow,
  MetricsTable,
  Pullquote,
  Stat,
  StatRow,
  SuccessGate,
} from "@/components/case-study/primitives";
import { menu } from "@/lib/case-studies/basecamp-coffee/data/menu";
import { archetypeById } from "@/lib/case-studies/basecamp-coffee/data/archetypes";
import { computeCoverage } from "@/lib/case-studies/basecamp-coffee/coverage";
import { formatLastUpdated } from "@/lib/case-studies/basecamp-coffee/last-updated";
import type {
  Drink,
  MilkMode,
  Strength,
  Temperature,
} from "@/lib/case-studies/basecamp-coffee/types";

// External "Take the quiz" link. The live prototype stays at this
// URL even after we redirect the /case-study path to this page.
const QUIZ_HREF = "https://quiz-project-flax-beta.vercel.app/";

// Computed at render time on the server — coverage is deterministic and
// stays in sync with menu/question data automatically.
const COVERAGE = computeCoverage();
const SHARE_BY_DRINK_ID = new Map(COVERAGE.perDrink.map((d) => [d.drinkId, d.share]));

// TOC items follow the shared TableOfContents schema. The first
// entry is a return-to-top action; the rest mirror the article's
// 7-beat structure.
const TOC_ITEMS: TocItem[] = [
  { href: "#intro", label: "↑ Top" },
  { href: "#signal", prefix: "01", label: "The Signal" },
  { href: "#data", prefix: "02", label: "The Data" },
  { href: "#triangulation", prefix: "03", label: "The Triangulation" },
  { href: "#bet", prefix: "04", label: "The Bet" },
  { href: "#experiment", prefix: "05", label: "The Experiment" },
  { href: "#artifact", prefix: "06", label: "The Artifact" },
  { href: "#how-built", prefix: "07", label: "How This Was Built" },
];

// Metadata lives on the route layout (./layout.tsx) — declaring it
// again here would just duplicate the values.

export default function BasecampCoffeeCaseStudy() {
  return (
    <>
      <ScrollProgress />
      {/* Fixed-position TOC rail in the left margin on xl+. Hidden
          on smaller viewports where there isn't room beside the
          centered article column. */}
      <aside
        aria-label="Article sections"
        className="hidden xl:block fixed top-32 left-4 w-[180px] 2xl:left-8 2xl:w-[220px] z-30"
      >
        <TableOfContents items={TOC_ITEMS} ariaLabel="Article sections" />
      </aside>
      <article>
        <Hero />
        <BeatSeparator />
        <BeatSignal />
        <BeatSeparator />
        <BeatData />
        <BeatSeparator />
        <BeatTriangulation />
        <BeatSeparator />
        <BeatBet />
        <BeatSeparator />
        <BeatExperiment />
        <BeatSeparator />
        <BeatArtifact />
        <BeatSeparator />
        <BeatHowBuilt />
      </article>
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────
// Page-specific content wrapped around the shared CaseStudyHero
// primitive. CaseStudyHero owns the layout, typography, and dateline
// row; this wrapper supplies the case-study-specific copy + intro
// links (the external "The quiz" arrow needs the inline-style font
// override to read upright inside the surrounding italic lede).
function Hero() {
  return (
    <CaseStudyHero
      title="Claude x Growth PM"
      subtitle="Basecamp Rewards: A Turnaround"
      readMin={10}
      updatedDate={formatLastUpdated()}
    >
      This page is an overview of two things at once. First and foremost, this is documentation of my
      first pass at using Claude Code as a building and thinking partner in developing a site. Second, it&apos;s a
      case study of a loyalty-program turnaround, using the Basecamp Coffee scenario as a practice space
      for demonstrating my Growth PM skills and what I&apos;ve learned about using Claude Code as a partner.{' '}
      <Link href={QUIZ_HREF}>
        The quiz{' '}
        {/* Surrounding lede is Instrument Serif italic, which
            renders the unicode arrow slanted and light. Force the
            arrow back to upright sans so it reads as a clean
            external-link affordance. */}
        <span
          style={{
            fontFamily: "var(--font-secondary), system-ui, sans-serif",
            fontStyle: "normal",
          }}
        >
          ↗
        </span>
      </Link>{' '}
      is the prototype that came out of it. What follows is the story of how
      it got there.
    </CaseStudyHero>
  );
}

// ─── Beat 1 — The Signal ─────────────────────────────────────
function BeatSignal() {
  return (
    <Beat id="signal" number="01" title="The Signal" claudeTag="file-tree exploration" headline="Brand healthy. Program on fire.">
      <Body>
        <p>
          The first data that told me what was actually broken: <Emph>Brand NPS 67, Program NPS 12</Emph>.{' '}
          Same customer base, same roasters, a 55-point gap between how people felt about Basecamp
          and how they felt about the rewards program.
        </p>
        <p>
          The divergence tangibly frames the problem and its criticality. If brand NPS had dropped with program NPS, this might have
          been a brand crisis. But it didn&apos;t.
        </p>
        <p>
          Customers still loved the coffee, the shops, the baristas. They
          specifically disliked the rewards program. An isolated program-design failure was dragging down
          a healthy business.
        </p>
        <p>
          For context: Basecamp Rewards is a standard points-per-purchase program built around three
          tiers—<Emph>Trailblazer → Explorer → Summit</Emph>. The mechanics are conventional and,
          for accounting reasons, locked. The program isn&apos;t broken in the plumbing; it&apos;s broken
          in what customers feel when they use it.
        </p>
      </Body>

      <StatRow>
        <Stat big="67" eyebrow="Brand NPS" caption="Basecamp Coffee overall. Stable across the decline window." />
        <Stat big="12" eyebrow="Program NPS" caption="Basecamp Rewards specifically. -65% from 34 six months ago." />
      </StatRow>

      <ClaudeNote>
        First move: I pointed Claude at the <Code>inherited-chaos/</Code> directory and asked it
        to triage. Member data CSV, advisor emails, failed campaign post-mortems, customer feedback
        by month, competitor research—hundreds of pages from the outgoing manager. Claude built
        a mental map of the corpus; I asked it to highlight what was load-bearing. The NPS
        divergence surfaced from <Code>organized/feedback-synthesis.md</Code> almost immediately.
        <span className="block mt-3 text-[var(--text-heading)] font-medium">
          Claude didn&apos;t pick the insight; it found the data points that led me to it.
        </span>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 2 — The Data ───────────────────────────────────────
function BeatData() {
  const rows: MetricRow[] = [
    { metric: 'Signups', was: '1,850', now: '4,120', target: '15,000', nowTone: 'muted' },
    { metric: 'MAU', was: '1,200', now: '480', target: '8,000', nowTone: 'down' },
    { metric: '30-day retention', was: '45%', now: '27%', target: '60%', nowTone: 'down' },
    { metric: 'Days between visits', was: '4.2', now: '10.4', target: '—', nowTone: 'down' },
    { metric: 'Cost per member', was: '$8.50', now: '$14.50', target: '< $11', nowTone: 'down' },
    { metric: 'LTV', was: '$47', now: '$29', target: '—', nowTone: 'down' },
    { metric: 'ROI', was: '1.8', now: '0.5', target: '—', nowTone: 'down' },
    { metric: 'Program NPS', was: '34', now: '12', target: '25+', nowTone: 'down' },
  ];

  return (
    <Beat id="data" number="02" title="The Data" claudeTag="data synthesis" headline="Signups masking indifference.">
      <Body>
        <p>Six months of metric movement. Three patterns mattered.</p>
      </Body>

      <div className="my-8 md:my-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <EvidenceCard eyebrow="Pattern 01" title="Hollow growth">
          Signups +123%, MAU -60%. A leaky bucket that would lead to a churn and burn strategy if not addressed directly.
          Management pointed to signups as good news; ironically, it was overshadowing more important data.
        </EvidenceCard>
        <EvidenceCard eyebrow="Pattern 02" title="Unit-econ inversion">
          LTV collapsed from $47 to $29 while cost-per-member climbed from $8.50 to $14.50. ROI went
          from 1.8 to 0.5. At the current slope, the program was one to two months from net-negative.
        </EvidenceCard>
        <EvidenceCard eyebrow="Pattern 03" title="Cadence rot">
          Average days between visits: 4.2 → 10.4. Cadence is the leading indicator; retention and
          LTV are lagging. Members who used to come in twice a week were coming in every other week.
          They weren&apos;t leaving angrily, but they weren&apos;t coming back excited either.
        </EvidenceCard>
      </div>

      <MetricsTable rows={rows} />

      <ClaudeNote>
        I loaded the member-data CSV into context and asked Claude to extract what had actually moved.
        It surfaced the table above. I then asked it to separate <Emph>vanity metrics</Emph> from{' '}
        <Emph>load-bearing metrics</Emph>—what would a skeptical CFO say if I brought them the signup
        number alone? That reframe made the hollow-growth diagnosis unavoidable.
        <span className="block mt-3">
          I should note that this is a problem the data shows, irrespective of the rewards program.{' '}
          <span className="text-[var(--text-heading)] font-medium">
            The hypothesis here is just that the rewards program is a lever that can be pulled to start fixing the problem.
          </span>
        </span>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 3 — The Triangulation ──────────────────────────────
function BeatTriangulation() {
  return (
    <Beat
      id="triangulation"
      number="03"
      title="The Triangulation"
      claudeTag="multi-agent review"
      headline="Smoke signal to house on fire."
    >
      <Body>
        <p>
          When a system is failing, one bad signal is the smell of smoke. Four independent signals
          starts feeling like the coffee is burning.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Signal 01" title="Member behavior">
          Cadence rotting, tier stagnation (89% stuck at Trailblazer, the first tier of the program), 23-second app sessions. Members
          weren&apos;t rage-quitting—they were drifting away indifferent. Worse than anger. It&apos;s{' '}
          <Emph>forgetting</Emph>.
        </EvidenceCard>
        <EvidenceCard eyebrow="Signal 02" title="Customer voice">
          &ldquo;Fine but forgettable&rdquo; showed up in customer feedback for three consecutive months.
          And: &ldquo;Your coffee has personality. Your rewards program doesn&apos;t.&rdquo;
        </EvidenceCard>
        <EvidenceCard eyebrow="Signal 03" title="Competitor-by-feature">
          Every failed Basecamp campaign had a competitor who won at the same mechanic. Double Points
          Weekend vs. Starbucks Star Dash. Social Share vs. Dutch Bros sticker culture. Pattern:
          winners led with <Emph>identity</Emph>, then layered mechanics.
        </EvidenceCard>
        <EvidenceCard eyebrow="Signal 04" title="Market whitespace">
          Starbucks owns <Emph>convenient</Emph>. Dutch Bros owns <Emph>fun</Emph>. Peet&apos;s owns{' '}
          <Emph>quality</Emph>. Roast &amp; Co. owns <Emph>craft</Emph>. Nobody in the PNW market owned{' '}
          <Emph>coffee identity</Emph>.
        </EvidenceCard>
      </EvidenceGrid>

      <Pullquote attribution="customer feedback, March">
        Dutch Bros remembers my name. Starbucks at least has games.
      </Pullquote>

      <ClaudeNote>
        I had Claude spin up three custom sub-agents: an <Emph>Exec (ROI lens)</Emph>, a{' '}
        <Emph>Product Designer (identity/emotion lens)</Emph>, a{' '}
        <Emph>Barista Lead (ground-truth lens)</Emph>. Then, I fed them the synthesis and hypothesis, asking for pressure-testing. They converged from different angles —
        Exec said &ldquo;numbers or kill it,&rdquo; Designer said &ldquo;identity vacuum, not loyalty
        problem,&rdquo; Barista said &ldquo;customers ask &lsquo;what should I try?&rsquo; ten times a day
        and we can&apos;t tell them.&rdquo; Then I built a fourth agent of my own: a{' '}
        <Emph>Growth Product Strategist</Emph>, tuned for funnel/activation/retention-loop product thinking.
        <span className="block mt-3">
          The three generalists told me whether the synthesis held up from their angles. The growth agent
          checked for growth levers that formed the hypothesis; that&apos;s the lens that matters most in my day job.
          I also stored it globally as a reusable agent, which means I can reach for it on my forthcoming projects...
        </span>
        <span className="block mt-3">
          Output from the first three agents is in <Code>reviews/synthesis-feedback.md</Code>.
          In the real world, these agents would be tuned to actual stakeholders and their behaviors. The automated, cross-lens analysis would enable me to move through stakeholder opportunity validation to solution recommendation(s) more efficiently.
        </span>
      </ClaudeNote>

      <Pullquote attribution="Product Designer sub-agent">
        Basecamp doesn&apos;t have a loyalty problem. It has an identity vacuum.
      </Pullquote>
    </Beat>
  );
}

// ─── Beat 4 — The Bet ────────────────────────────────────────
function BeatBet() {
  return (
    <Beat id="bet" number="04" title="The Bet" claudeTag="thinking partner" headline="Personality over points.">
      <Body>
        <p>
          The mechanics couldn&apos;t change — the points structure is legally locked (accounting
          reasons). That removed a tempting distraction. The question now was: <Emph>what would make members want to come back, independent
          of the mechanics?</Emph>
        </p>
        <p>
          <Emph>Hypothesis:</Emph> if we give users a coffee-identity artifact—an archetype they
          claim, a matched drink, something shareable—cadence recovers, retention follows, program NPS
          stops bleeding.
        </p>
        <p>
          That&apos;s testable. And with quality experiment design you must define what success looks like before you run it (which means
          you must define failure too). This is where growth and data strategy meet.
        </p>
      </Body>

      <Pullquote attribution="Barista Lead sub-agent">
        People light up when we ask about their coffee preferences. The app doesn&apos;t capture any
        of that.
      </Pullquote>

      <ClaudeNote>
        The move from &ldquo;convergent evidence&rdquo; to &ldquo;specific hypothesis&rdquo; is where
        Claude earns its keep as a thinking partner. I iterated on what the evidence actually implied —
        not &ldquo;people want personality in general&rdquo; but specifically{' '}
        <Emph>a claimable archetype with a matched drink</Emph>. Decisions and open research questions
        went into project memory so I wouldn&apos;t re-litigate them tomorrow.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 5 — The Experiment ─────────────────────────────────
function BeatExperiment() {
  return (
    <Beat
      id="experiment"
      number="05"
      title="The Experiment"
      claudeTag="artifact drafting"
      headline="Succeed or sunset."
    >
      <Body>
        <p>The pilot:</p>
        <ul className="m-0 pl-5 text-[17px] md:text-[19px] leading-[1.5] text-[var(--text-caption)] list-disc marker:text-[var(--text-caption)]">
          <li><Emph>2 stores</Emph>, selected for representative member profiles</li>
          <li><Emph>60 days</Emph> of operation</li>
          <li><Emph>$15K capped spend</Emph>, including tech + comms</li>
          <li><Emph>3-of-4 success gate</Emph>—miss 2+ and we sunset the program</li>
        </ul>
        <p>
          A pilot without clear success (and failure) conditions is a project, not an experiment. The explicit success
          criteria are what make it a test:
        </p>
      </Body>

      <SuccessGate>
        <GateCard metric="MAU" threshold="≥ 800" caption="from current 480" />
        <GateCard metric="30-day retention" threshold="≥ 38%" caption="from 27%" />
        <GateCard metric="Cost per member" threshold="< $11" caption="from $14.50" />
        <GateCard metric="Program NPS" threshold="> 25" caption="from 12" />
      </SuccessGate>

      <ClaudeNote>
        Claude drafted the pilot memo and the success-gate framing, stress-tested against the Exec
        sub-agent&apos;s &ldquo;show me a number&rdquo; critique, and tightened the success conditions.
        The research debt—what we <Emph>don&apos;t know</Emph>{' '}but would need to validate post-pilot—lives in a memory file tagged &ldquo;known unknowns&rdquo; so it can&apos;t get lost.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 6 — The Artifact ───────────────────────────────────
function BeatArtifact() {
  return (
    <Beat
      id="artifact"
      number="06"
      title="The Artifact"
      claudeTag="claude code · build partner"
      claudeTagLiteral
      headline="The prototype is live."
    >
      <Body>
        <p>
          <Link href={QUIZ_HREF}>Take the quiz ↗</Link>. Sixty seconds. It maps you to one of 16 archetypes, recommends a drink from the actual
          Basecamp menu, and mints a one-time discount code. The recommender is a pure function—facet
          state in (from the user&apos;s answers), drink and archetype out. No AI call at runtime. The intelligence is in the facet
          system.
        </p>
      </Body>

      <FacetMatrix />

      <DrinkMatrix />

      <Body>
        <p>
          <Emph>Deliberately not in the MVP:</Emph>
        </p>
        <ul className="m-0 pl-5 text-[17px] md:text-[19px] leading-[1.5] text-[var(--text-caption)] list-disc marker:text-[var(--text-caption)]">
          <li>
            Auth/user accounts
            <ul className="mt-1.5 mb-2 pl-5 text-[15px] md:text-[16px] leading-[1.5] list-[circle] marker:text-[var(--text-caption)]">
              <li>This would theoretically be integrated into the Basecamp app/site, but it is not MVP scope. The session code is minted once per pageview to prevent gaming within a single visit; cross-session gaming is the gap auth would close.</li>
            </ul>
          </li>
          <li>
            POS/order-flow integration
            <ul className="mt-1.5 mb-2 pl-5 text-[15px] md:text-[16px] leading-[1.5] list-[circle] marker:text-[var(--text-caption)]">
              <li>The discount code copy CTA is an MVP shortcut. Ideally, the button would initiate the order flow.</li>
            </ul>
          </li>
          <li>
            Analytics instrumentation
            <ul className="mt-1.5 mb-2 pl-5 text-[15px] md:text-[16px] leading-[1.5] list-[circle] marker:text-[var(--text-caption)]">
              <li>Hooks documented, not wired.</li>
            </ul>
          </li>
        </ul>
        <p>
          What you see is the prototype that answers <Emph>&ldquo;could a 60-second identity artifact
          drive a meaningful visit moment?&rdquo;</Emph> A production version would wire the rest.
        </p>
        <p>
          A handful of design/growth/data/architecture decisions from the build are worth pulling
          up—short annotations on what we tried, what we chose, and what we gave up. Each one is
          present-tense enough to ship and future-minded enough to survive the production rewrite.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="Architecture" title="Pure recommender at runtime">
          Could have wired a model call per result—flexible, but expensive on latency, reliability,
          and cost. Chose a pure function in <Code>lib/recommender.ts</Code>: facet state in, drink and
          archetype out. Deterministic, zero-latency, testable. A coverage audit script verifies every
          one of the 16 drinks stays reachable after any scoring change.
        </IterationCard>
        <IterationCard lens="Architecture · Data" title="Facet mapping, not personality buckets">
          First instinct: map users directly to personality archetypes. The valid recommendation set
          is the actual menu, though—16 real SKUs. Rewrote to decompose drinks into facets
          (temperature, strength, milk, sweetness, flavor, roast, style) and score. By construction,
          every archetype points at a drink a customer can order. Size is deliberately excluded.
        </IterationCard>
        <IterationCard lens="Design · Data" title="Oblique prompts, not direct facet questions">
          Early quiz asked &ldquo;how strong do you like your coffee?&rdquo; Users picked the category
          they thought they should, not the one they meant. Rewrote every prompt into sensory/ritual
          framing—<Emph>striking a match</Emph>, <Emph>drawing a bath</Emph>. Answer text never names
          the facet it probes. Lost some directness; gained honest taste signal.
        </IterationCard>
        <IterationCard lens="Architecture · UX" title="Committed vs. draft state">
          First cut updated the drink card live as the editor mutated. This was too flickery—every toggle
          felt like the rug moving. Split state: <Code>committedState</Code> drives the displayed
          recommendation, <Code>draftState</Code> is what the editor mutates. The card re-computes
          only when the user hits &ldquo;Find my new ritual.&rdquo; Iteration, not chaos.
        </IterationCard>
        <IterationCard lens="Data · Growth" title="Session code as measurement">
          Initial draft re-minted the discount code on every preference update. That broke the instrument.
          Locked the code on first quiz completion, preserved across edits AND re-takes. Measurement can now include alignment between the recommendation (as encoded in the discount code) and the drink actually purchased, in addition to conversion.
          We can also review alignment between percentage of users recommended a certain drink and the likelihood of that output to help frame this data.
        </IterationCard>
        <IterationCard lens="Growth · UX" title="Editable profile, not one-shot">
          Course requirements end at the quiz and results. I added the editable taste
          profile from my expertise. A user who hits a result they don&apos;t like can tweak instead of re-taking the
          quiz. This sets up the pattern for a persistent profile in production. In theory, there would be a
          separate user profile that also houses the taste profile utility. That gives users a consistent surface to return to, and gives the business a reliable core data stream.
        </IterationCard>
      </IterationGrid>

      <ClaudeNote>
        Next.js 16 app, built with Claude Code over a weekend. GitHub → Vercel on every push to{' '}
        <Code>main</Code>. Claude wrote most of the code; I wrote the spec, steered the architecture,
        reviewed diffs, and caught &ldquo;almost right&rdquo; decisions that matter. (It&apos;s important to note that they were countless throughout the process; AI is fallible still.)
        That balance—human sets direction, Claude executes, human reviews—is what I think of as
        the modern PM (Builder) workflow.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 7 — How This Was Built ─────────────────────────────
function BeatHowBuilt() {
  return (
    <Beat id="how-built" number="07" title="How This Was Built" headline="The Claude Code workflow.">
      <Body>
        <p>The features I leaned on, concretely:</p>
      </Body>

      <HarnessGrid>
        <HarnessFeature name="Project memory">
          A <Code>MEMORY.md</Code> index plus topic-scoped files (feedback rules, project state,
          references). Decisions and voice preferences persist across sessions. When I come back
          tomorrow, Claude already knows how I work.
        </HarnessFeature>
        <HarnessFeature name="Custom sub-agents">
          Three advisors (Exec/Product Designer/Barista Lead) plus a Growth Product Strategist.
          Invoke any for a lens-specific review without re-priming context.
        </HarnessFeature>
        <HarnessFeature name="Plan mode">
          For anything non-trivial. This very page was planned, reviewed, revised before a line of
          code was written. Plan mode forces alignment before commitment.
        </HarnessFeature>
        <HarnessFeature name="CLAUDE.md at the repo root">
          Durable working context — scenario, brand voice, stakeholders, what&apos;s been done, what&apos;s
          next. Claude reads it on every turn.
        </HarnessFeature>
        <HarnessFeature name="Skills and hooks">
          Recurring stuff: deploy, status, quick iterations. Less context switching, less re-explaining.
        </HarnessFeature>
        <HarnessFeature name="The human in the loop">
          Claude wrote the code and drafted the prose. I set direction, wrote the spec, caught the
          &ldquo;almost right&rdquo; calls, and owned the decisions. None of this works without that
          part.
        </HarnessFeature>
      </HarnessGrid>

      <Body>
        <p className="mt-8">
          These aren&apos;t novel tools on their own. The workflow is:{' '}
          <Emph>treat Claude like a smart junior</Emph>. Give it durable context, lens
          specialization, and structured decision points. Then iterate fast, review everything, own
          the direction.
        </p>
        <p>
          Recursive detail: this case study was planned in plan mode, revised after my first draft
          missed the meta-frame entirely, written in ~500 lines of TSX with Claude doing the heavy
          typing, and shipped via a push to <Code>main</Code>. A full business day of work to build
          a functioning prototype and detailed case study.
        </p>
      </Body>
    </Beat>
  );
}

// ─────────────────────────────────────────────────────────────
// Page-specific data + components below. Reusable primitives
// (Beat, Body, Emph, Code, Stat, EvidenceCard, MetricsTable, …)
// are imported from @/components/case-study/primitives.
// ─────────────────────────────────────────────────────────────

const FACETS: { name: string; values: string[] }[] = [
  { name: 'Style', values: ['espresso-based', 'brewed', 'cold-brewed', 'tea-based'] },
  { name: 'Temperature', values: ['hot', 'iced'] },
  { name: 'Strength', values: ['light', 'medium', 'bold', 'extra-bold'] },
  { name: 'Milk', values: ['black', 'whole', '2%', 'oat', 'almond', 'soy'] },
  { name: 'Sweetness', values: ['none', 'touch', 'sweet', 'indulgent'] },
  { name: 'Flavor', values: ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'spicy', 'earthy'] },
  { name: 'Roast', values: ['light', 'medium', 'dark'] },
];

function FacetMatrix() {
  return (
    <div className="my-8 md:my-10 rounded-xl border border-[var(--border-default)] overflow-hidden">
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-[var(--border-default)] bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)] flex items-baseline justify-between gap-4">
        <p
          className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
          style={{ fontFamily: 'var(--font-mono), monospace' }}
        >
          Facet Mapping
        </p>
        <p className="m-0 text-[11px] md:text-[12px] text-[var(--text-disabled)]">
          7 dimensions · 16 drinks · 16 archetypes
        </p>
      </div>
      <dl className="m-0">
        {FACETS.map((facet) => (
          <div
            key={facet.name}
            className="grid grid-cols-[96px_1fr] md:grid-cols-[160px_1fr] gap-3 md:gap-6 px-4 py-3 md:px-6 md:py-3.5 border-b border-[var(--border-default)] last:border-b-0"
          >
            <dt
              className="m-0 text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-[var(--text-disabled)] pt-[3px]"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              {facet.name}
            </dt>
            <dd className="m-0 text-[14px] md:text-[15px] leading-[1.5] text-[var(--text-caption)]">
              {facet.values.map((v, i) => (
                <span key={v}>
                  <span className="text-[var(--text-heading)] whitespace-nowrap">{v}</span>
                  {i < facet.values.length - 1 && (
                    <span className="text-[var(--text-disabled)]">{' · '}</span>
                  )}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="px-4 py-3 md:px-6 md:py-3.5 bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)]">
        <p className="m-0 text-[12px] md:text-[13px] leading-[1.5] text-[var(--text-disabled)]">
          Size is deliberately excluded—it&apos;s a volume choice, not a taste signal. Six quiz
          questions capture these seven dimensions; the recommender scores every drink in the menu
          against the resulting facet state.
        </p>
      </div>
    </div>
  );
}

const FAMILY_LABELS: Record<Drink['family'], string> = {
  'espresso-based': 'Espresso-based',
  brewed: 'Brewed',
  'cold-brewed': 'Cold-brewed',
  'tea-based': 'Tea-based',
};

const FAMILY_ORDER: Drink['family'][] = ['espresso-based', 'brewed', 'cold-brewed', 'tea-based'];

function fmtStrength(s: Strength[]): string {
  return s.length === 1 ? s[0] : `${s[0]} – ${s[s.length - 1]}`;
}

function fmtMilk(m: MilkMode): string {
  if (m === 'black') return 'black';
  if (m === 'milk-optional') return 'milk optional';
  return 'dairy required';
}

function fmtTemp(t: Temperature[]): string {
  return t.join(' · ');
}

function DrinkMatrix() {
  const grouped = FAMILY_ORDER.map((family) => ({
    family,
    label: FAMILY_LABELS[family],
    drinks: menu.filter((d) => d.family === family),
  }));

  return (
    <div className="my-8 md:my-10 rounded-xl border border-[var(--border-default)] overflow-hidden">
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-[var(--border-default)] bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)] flex items-baseline justify-between gap-4">
        <p
          className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]"
          style={{ fontFamily: 'var(--font-mono), monospace' }}
        >
          Drinks, Archetypes, Facets, and Coverage
        </p>
        <p className="m-0 text-[11px] md:text-[12px] text-[var(--text-disabled)]">
          {menu.length} drinks · 16 archetypes · {COVERAGE.totalPaths.toLocaleString()} quiz paths
        </p>
      </div>

      {grouped.map((group, gi) => (
        <div
          key={group.family}
          className={gi < grouped.length - 1 ? 'border-b border-[var(--border-default)]' : ''}
        >
          <div className="px-4 py-2 md:px-6 md:py-2.5 bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)] border-b border-[var(--border-default)]">
            <p
              className="m-0 text-[10px] uppercase tracking-[0.22em] text-[var(--text-disabled)]"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              {group.label} · {group.drinks.length}
            </p>
          </div>
          {group.drinks.map((drink, di) => {
            const share = SHARE_BY_DRINK_ID.get(drink.id) ?? 0;
            const archetype = archetypeById(drink.id);
            return (
              <div
                key={drink.id}
                className={`px-4 py-3 md:px-6 md:py-3.5 ${
                  di < group.drinks.length - 1 ? 'border-b border-[var(--border-default)]' : ''
                }`}
              >
                <div className="grid grid-cols-[1fr_auto] md:grid-cols-[240px_1fr_auto] gap-x-3 md:gap-x-6 items-baseline">
                  <p className="m-0 text-[15px] md:text-[16px] text-[var(--text-heading)]">
                    {drink.name}
                    {archetype && (
                      <>
                        <span className="mx-[0.45em] text-[var(--text-disabled)]">·</span>
                        <span
                          className="text-[14px] md:text-[15px] text-[var(--text-caption)]"
                          style={{ fontFamily: 'var(--font-primary), serif', fontStyle: 'italic' }}
                        >
                          {archetype.name}
                        </span>
                      </>
                    )}
                  </p>
                  <p
                    className="col-start-2 row-start-1 md:col-start-3 md:row-start-1 m-0 text-[11px] md:text-[12px] tracking-[0.04em] tabular-nums whitespace-nowrap text-right text-[var(--text-heading)]"
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                    title={`${Math.round(share * COVERAGE.totalPaths).toLocaleString()} of ${COVERAGE.totalPaths.toLocaleString()} quiz paths`}
                  >
                    {(share * 100).toFixed(1)}%
                  </p>
                  <p className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1 m-0 text-[13px] md:text-[14px] leading-[1.5] text-[var(--text-caption)]">
                    <FacetChip>{fmtStrength(drink.typicalStrength)}</FacetChip>
                    <Dot />
                    <FacetChip>{fmtMilk(drink.milkMode)}</FacetChip>
                    <Dot />
                    <FacetChip>{fmtTemp(drink.temperatures)}</FacetChip>
                    <Dot />
                    <span className="text-[var(--text-disabled)]">
                      {drink.compatibleFlavors.join(', ')}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="px-4 py-3 md:px-6 md:py-3.5 bg-[color-mix(in_oklab,var(--text-body)_6%,transparent)] border-t border-[var(--border-default)]">
        <p className="m-0 text-[12px] md:text-[13px] leading-[1.5] text-[var(--text-disabled)]">
          Each drink&apos;s facet profile is the thing the recommender scores against. A user&apos;s
          facet state from the quiz returns the closest match on strength, milk, temperature, and
          flavor—filtered first by style family. Every drink maps 1-to-1 to an archetype (shown in italic
          next to each drink), so the recommender returns an identity and an order at the same time. The
          percentage shows each drink&apos;s share of the {COVERAGE.totalPaths.toLocaleString()}{' '}
          distinct quiz answer paths—a coverage audit, not a forecast (real users don&apos;t pick
          answers uniformly at random).
        </p>
      </div>
    </div>
  );
}

function FacetChip({ children }: { children: ReactNode }) {
  return <span className="text-[var(--text-heading)] whitespace-nowrap">{children}</span>;
}

function Dot() {
  return <span className="text-[var(--text-disabled)]">{' · '}</span>;
}

