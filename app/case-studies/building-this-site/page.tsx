// ─────────────────────────────────────────────────────────────────
// /case-studies/building-this-site — meta case study on shipping
// malxavi.com itself.
//
// Initial pass adapted from `case-studies/building-this-site.md`
// (the in-repo source of truth for the narrative). The page uses
// the case-study primitives extracted alongside the Basecamp build
// (CaseStudyHero, Beat, Body, ClaudeNote, EvidenceGrid, Pullquote,
// IterationGrid, HarnessGrid, StatRow), so visual language and
// scroll-anchor behavior match the rest of the case-study cluster.
//
// Story arc (8 beats, mirroring the Basecamp shape):
//   01 · The Brief         — three jobs, seven-day timebox
//   02 · The Workflow      — where I drove, where Claude drove
//   03 · The Architecture  — the design-system + IA decisions
//   04 · The Spotify Story — vendor incident: rate-limit and reshape
//   05 · Button Mashing    — three recursion loops, escalating blast
//                            radius (button → progress-bar → reinstall)
//   06 · Three Resumes     — triple-output craft, web + ATS + PDF
//   07 · QA                — three reviewers, one punch list, 49% reveal
//   08 · What's Live       — current state, cuts, and what next
//
// Beats 5/6/7 of the original 10-beat arc were consolidated into the
// single "Button Mashing" beat on 2026-04-29. The reader had absorbed
// the loop pattern by the second beat and the third was paying
// compounding density cost; the blast-radius escalation makes for a
// tighter single arc than three rhyming incidents. Title preserved as
// "Button Mashing" (rather than "The Recursion") to gesture at future
// Games sub-brand work — fighting-game button-mashing as the visual
// metaphor for refined-variations-of-the-same-input.
//
// Voice and copy track the markdown source. When that file is
// revised, this page follows.
// ─────────────────────────────────────────────────────────────────

import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { CONTACT } from "@/app/resume/resume-data";
import type { TocItem } from "@/components/chrome/TableOfContents";
import { CaseStudyTocRail } from "@/components/case-study/CaseStudyTocRail";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import { CaseStudyHero } from "@/components/case-study/Hero";
import { CaseStudyNav } from "@/components/case-study/CaseStudyNav";
import {
  Beat,
  BeatSeparator,
  Body,
  ClaudeNote,
  Code,
  Emph,
  EvidenceCard,
  EvidenceGrid,
  HarnessFeature,
  HarnessGrid,
  IterationCard,
  IterationGrid,
  Pullquote,
  Stat,
  StatRow,
} from "@/components/case-study/primitives";
// formatLastUpdated reads the latest git committer date — generic
// utility that happens to live alongside the Basecamp study. Reused
// here so both case studies report the same "Updated …" date on
// every deploy without duplicating the git-log shell-out.
import { formatLastUpdated } from "@/lib/case-studies/basecamp-coffee/last-updated";

// External anchor referenced multiple times in the narrative.
// Centralized so a destination change is one line, not a scavenger
// hunt through the article body.
const CLAUDE_CODE_HREF = "https://claude.com/claude-code";

// TOC schema matches the chrome/TableOfContents primitive used by
// every other case study. First entry is a return-to-top action;
// remaining entries mirror the seven-beat structure below.
const TOC_ITEMS: TocItem[] = [
  { href: "#intro", label: "↑ Top" },
  { href: "#brief", prefix: "01", label: "The Brief" },
  { href: "#workflow", prefix: "02", label: "The Workflow" },
  { href: "#architecture", prefix: "03", label: "The Architecture" },
  { href: "#spotify", prefix: "04", label: "Integrating Spotify" },
  { href: "#button", prefix: "05", label: "Button Mashing" },
  { href: "#resumes", prefix: "06", label: "Three Resumes" },
  { href: "#review", prefix: "07", label: "QA" },
  { href: "#live", prefix: "08", label: "What’s Live" },
];

export default function BuildingThisSiteCaseStudy() {
  return (
    <>
      <ScrollProgress />

      {/* `relative` establishes the positioning context the xl+ TOC rail
          uses to bound its sticky child to the article's vertical extent. */}
      <div className="relative lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:block">
        {/* Dual-mode TOC rail. xl+ uses position: sticky inside an
            absolutely-positioned column; lg-but-not-xl uses sticky inside
            the grid column. Both clamp naturally to the article's bottom. */}
        <CaseStudyTocRail items={TOC_ITEMS} ariaLabel="Article sections" />
        <article>
          <Hero />
          <BeatSeparator />
          <BeatBrief />
          <BeatSeparator />
          <BeatWorkflow />
          <BeatSeparator />
          <BeatArchitecture />
          <BeatSeparator />
          <BeatSpotify />
          <BeatSeparator />
          <BeatButton />
          <BeatSeparator />
          <BeatResumes />
          <BeatSeparator />
          <BeatReview />
          <BeatSeparator />
          <BeatLive />
          <CaseStudyNav currentSlug="building-this-site" />
        </article>
      </div>
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────
// CaseStudyHero owns the layout, dateline row, display H1 / H2,
// and italic-serif lede; this wrapper just supplies the meta
// case study's specific copy. The recursive framing — "this is
// a case study about the site you're already on" — is the lede.
function Hero() {
  return (
    <CaseStudyHero
      title="An AI‑Native Portfolio"
      subtitle="Built brick by brick, just like my FYP"
      readMin={20}
      updatedDate={formatLastUpdated()}
    >
      A recursive artifact: a case study about building the site that hosts
      it, with{" "}
      <Link href={CLAUDE_CODE_HREF}>
        Claude Code
        {/* Surrounding lede is Instrument Serif italic, which renders
            the unicode arrow slanted and light. Force the arrow back
            to upright sans so it reads as a clean external-link
            affordance — same trick the Basecamp Hero uses. */}
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-secondary)",
            fontStyle: "normal",
          }}
        >
          {" "}↗
        </span>
      </Link>{" "}
      as build partner.
      Multiple production incidents, several architecture bets, and a
      deliberate division of labor between human direction and agent
      execution. What follows is the case study version, not the
      changelog. Twenty minutes now, hours saved later. Probably not
      for the recruiter, ironically (sorry). For the next person
      pair-programming with an agent.
    </CaseStudyHero>
  );
}

// ─── Beat 1 — The Brief ───────────────────────────────────────
function BeatBrief() {
  return (
    <Beat
      id="brief"
      number="01"
      title="The Brief"
      headline="Three jobs, seven days."
    >
      <Body>
        <p>
          A recruiter-facing portfolio surface that did three things at once,
          shipped in a hard timebox while interviewing several days a week.
          The constraint was time, not scope.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Job 01" title="Resume in 30 seconds">
          Tech PM hiring is a scanning game. The resume is the primary
          artifact, and nothing should compete with it for attention above
          the fold on the landing page.
        </EvidenceCard>
        <EvidenceCard eyebrow="Job 02" title="Show, don’t tell">
          A live, well-built site signals shipping ability more than any
          deck. What you’re viewing <Emph>is</Emph> the proof.
        </EvidenceCard>
        <EvidenceCard eyebrow="Job 03" title="Re-introduce my creative side">
          A centralized home for my playlists, reviews, and other creative work.
          Some may come to my site just for this, but it operates in concert with
          my professional work.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          This site has a wide scope, and more is coming soon. I deliberately scoped MVP
          down to five pages—<Emph>Landing, Resume, About, Contact, Music</Emph>—with
          everything else I’m working on gated behind a no-public-placeholders rule. Day 4
          was my deadline for a shippable MVP; Days 5 through
          7 were for polish and stretch goals.
        </p>
      </Body>

      <ClaudeNote>
        Plan mode at session start, every session. The deadline held even
        when Music slid a day on the Spotify incident—buffer days exist
        for exactly that, and a clear deadline forced scope decisioning rather than a crisis.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 2 — The Workflow ────────────────────────────────────
function BeatWorkflow() {
  return (
    <Beat
      id="workflow"
      number="02"
      title="The Workflow"
      claudeTag="claude code · build partner"
      claudeTagLiteral
      headline="Where I drove, where Claude drove."
    >
      <Body>
        <p>
          Most of the code is the agent’s. Most of the decisions are
          mine. The interesting part—and the part recruiters keep asking
          about—is what that division of labor actually looks like in
          practice.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="The human in the loop" title="Where I drove">
          Information architecture and brand voice. Decision-quality reviews
          when the agent picked a fork I’d have picked differently.
          Editorial taste on the user-facing product. Constraint discipline
          (e.g. no placeholders, platform links never show handles, etc.).
        </EvidenceCard>
        <EvidenceCard eyebrow="The agent" title="Where Claude drove">
          Implementation: React, Tailwind, the typography primitives, the
          layout system, the Spotify client, the Calendly embed, the
          token-pipeline build script. Defensive engineering once instructed.
          Inline comments dense enough that a non-technical reader can
          navigate the code.
        </EvidenceCard>
        <EvidenceCard eyebrow="The blind spot" title="Where neither of us was great">
          Visual design creation. Iconography, layout proportions, the feel of a UI choice—anywhere taste matters more than logic.
          We went through four rounds of phone-icon variants, none landing, before the call
          was to pick a stock Heroicons handset and move on. The agent
          can’t develop taste; a PM can’t always articulate it.
          Even when provided design references, the agent struggled to create a visually pleasing icon.
        </EvidenceCard>
      </EvidenceGrid>

      <Pullquote attribution="the working pattern">
        Plan in conversation, build in code.
      </Pullquote>

      <Body>
        <p>
          Most sessions started with me writing or referencing the plan
          (<Code>PLAN.md</Code>), the agent and I aligning on what to build,
          then the agent shipping a working iteration in 15 to 45 minutes.
          I’d review, redirect, and redline. The total build time was a
          fraction of what solo-coding would have taken; the cognitive load
          was almost entirely on direction and judgment, which is the part
          of the work that I specialize in (and that adds value to AI-native product teams).
        </p>
      </Body>

      <ClaudeNote>
        <p className="m-0">
          The pattern is durable because of context, not magic.
          CLAUDE.md at the repo root carries the working scenario,
          brand voice, and stakeholders. Project memory persists
          decisions and voice rules across sessions. Five custom
          sub-agents bring lens-specific critique without re-priming
          context:
        </p>
        <ul className="m-0 mt-3 pl-5 list-disc marker:text-[var(--text-caption)] flex flex-col gap-1.5">
          <li>
            <Code>growth-product-strategist</Code>—activation,
            engagement, and lifecycle-loop critique on product
            decisions
          </li>
          <li>
            <Code>design-reviewer</Code>—typography rhythm, spacing,
            color, and sub-brand cohesion against rendered surfaces
          </li>
          <li>
            <Code>code-reviewer</Code>—type safety, naming, dead code,
            async correctness, and maintainability footguns
          </li>
          <li>
            <Code>a11y-reviewer</Code>—WCAG 2.2 AA across semantic
            HTML, keyboard navigation, contrast, and reduced-motion
          </li>
          <li>
            <Code>seo-expert</Code>—technical SEO, structured data,
            and AI-search readiness (llms.txt, JSON-LD, OG)
          </li>
        </ul>
        <p className="m-0 mt-3">
          All five live in <Code>~/.claude/agents/</Code> rather than
          inside the project—global and portable across
          whatever I build next. The PM cost of standing them up is
          paid once; the lens travels. They form the foundation of
          an AI “second brain” for all my work.
        </p>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 3 — The Architecture ────────────────────────────────
function BeatArchitecture() {
  return (
    <Beat
      id="architecture"
      number="03"
      title="The Architecture"
      claudeTag="implementation"
      headline="A few bets that distinguish this from generic Next.js."
    >
      <Body>
        <p>
          The site looks deceptively simple: a recruiter cluster, a few
          sub-brand pages, a case-study cluster. The decisions that hold
          it together are quieter, and they’re the part worth
          flagging for anyone reading the source.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard
          lens="Information architecture"
          title="Recruiter-first, exploration-second"
        >
          Landing elevates exactly one CTA—“See my resume →”.
          Below that, a conditional sub-brand matrix lets cultural-curious
          visitors explore (today, just Music; the rest of the matrix
          unlocks the day each sub-brand ships, per the no-placeholders
          rule). Two audiences served, each with the surface area they
          actually need, without diluting the primary call to action.
        </IterationCard>
        <IterationCard
          lens="Information architecture"
          title="No public placeholders, ever"
        >
          Routes don’t ship until they’re real. Nav only shows
          live pages. The landing matrix renders only tiles for sub-brand
          pages that actually exist. There are no “coming soon”
          pages, no skeleton routes, no nav entries pointing at unbuilt
          work. The discipline keeps the site small, the chrome honest,
          and the surface area genuinely shippable on any given day.
        </IterationCard>
        <IterationCard
          lens="Information architecture"
          title="One destination, many entry points"
        >
          The films and television clusters have a dozen surfaces—landing
          pages, stats, collections, lists, favorites, faceted
          routes—and exactly one destination. Every surface is sculpted to
          drive into a single canonical reviews grid; the individual review
          is the payoff. I rejected a hub-and-spoke where collections and
          lists sat as peers of the landing page, because peers compete and
          a funnel converges. Naming the destination first let the rest of
          the architecture fall out of it, instead of accreting one page at
          a time.
        </IterationCard>
        <IterationCard
          lens="Information architecture"
          title="Lists as a labeled 2×2, not a pile"
        >
          The lists could have been a flat stack of near-identical titles.
          Instead they’re a deliberate three-axis matrix—year, New Releases
          vs. Backlog, Editor’s Cut vs. Ratings Cut—rendered as a labeled
          grid. Four same-year lists that share most of their entries stay
          legible because the axes, not the names, do the work. An
          editorial decision, surfaced as an information-architecture one.
        </IterationCard>
        <IterationCard
          lens="Design system"
          title="One codebase, many sub-brands, zero JS flips"
        >
          Each sub-brand (Music, eventually Film, TV, and some others) gets its own
          primary color and display font via data-attribute-scoped CSS
          variables: <Code>{`<div data-subbrand="music">`}</Code> flips{" "}
          <Code>--font-primary</Code>, <Code>--font-secondary</Code>, and
          the entire <Code>--primary-*</Code> ramp via cascade. SSR
          rendered, no flash, no JS. The Card primitive can carry a
          sub-brand accent independently of its surrounding page.
        </IterationCard>
        <IterationCard
          lens="Design system"
          title="Tokens-as-source-of-truth, in code"
        >
          Started in Figma with Tokens Studio. Three days in, I deprecated
          the Figma file and made the JSON in <Code>tokens/</Code>{" "}
          canonical. A small parser (<Code>scripts/build-tokens.mjs</Code>)
          walks the multi-tier files (Brand → Alias → Mapped → Responsive)
          and emits CSS custom properties grouped by tier into{" "}
          <Code>globals.css</Code>. When “design system” means
          “spreadsheet of values,” the spreadsheet should live
          where the values are read.
        </IterationCard>
      </IterationGrid>

      <ClaudeNote>
        None of these were the agent’s instinct. Generic-Next.js
        decisions are the agent’s gravity well; the PM job was naming
        the constraint (“reviews is the one destination,”{" "}
        “no placeholders,”{" "}
        “sub-brand flip via data attribute, not JS,”{" "}
        “tokens are code now”) and then letting the agent
        execute against it. That’s the part of the workflow that
        scales.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 4 — Integrating Spotify ───────────────────────────────
function BeatSpotify() {
  return (
    <Beat
      id="spotify"
      number="04"
      title="Integrating Spotify"
      claudeTag="defensive engineering"
      headline="From play to pause and back again."
    >
      <Body>
        <p>
          The <Code>/music</Code> page was supposed to be the easiest of
          the sub-brand pages. The brief was straightforward: pull the
          public playlists from my Spotify account, render them in a grid,
          link to detail pages. Three plot points later, it took three
          times longer than estimated.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard
          eyebrow="Plot point 01"
          title="Half the API I planned to use no longer exists"
        >
          Spotify quietly deprecated a swath of Web API endpoints in
          November 2024—including the user-playlists endpoint that
          historically mapped 1:1 to “public playlists on this
          profile.” Apps registered after that cutoff get 403,
          regardless of auth method. We refactored from Client Credentials
          to Authorization Code with refresh-token persistence. Cost: ~1
          hour.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Plot point 02"
          title="The API itself reshuffled"
        >
          Endpoints renamed (<Code>/tracks</Code> → <Code>/items</Code>),
          response shapes flattened, field names changed (<Code>item.track</Code>{" "}
          became <Code>item.item</Code>{" "}because Spotify unified tracks and
          podcast episodes under one model). The docs hadn’t fully
          caught up. Cost: another hour of empirical shape-discovery via
          logged responses.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Plot point 03"
          title="The rate-limit incident"
        >
          The fetch logic, in a moment of “this works for now”
          optimism, used <Code>Promise.all</Code>{" "}to fetch track lists for
          57 playlists in parallel as I was working with Claude
          to understand how to curate that list for the site. Multiple back-to-back bursts
          during dev triggered the rate limiter, then an escalated
          cool-down. At one point Spotify’s <Code>Retry-After</Code>{" "}
          returned <Emph>77,368 seconds</Emph>—about 21 hours.
        </EvidenceCard>
      </EvidenceGrid>

      <StatRow>
        <Stat
          big="77,368s"
          eyebrow="Retry-After value"
          caption="Spotify’s escalated cool-down after multiple bursts. About 21 hours."
        />
        <Stat
          big="3"
          eyebrow="Concurrent fetches"
          caption="In-flight cap after the fix. With retry-on-429 honoring Retry-After and a graceful fallback page when the API is unreachable."
        />
      </StatRow>

      <Body>
        <p>
          The cure was straightforward: concurrency limiter (3 in-flight
          max), retry-on-429 honoring <Code>Retry-After</Code>, and a
          graceful fallback page when Spotify is unreachable. The lesson
          is the part that travels: rate limits are a property of
          production systems, and “I’ll add throttling
          later” is a sentence that buys you a 21-hour penalty box.
          Should have throttled from the first request.
        </p>
        <p>
          There’s a quieter PM lesson in here too. The original ROI
          estimate on the Music page assumed the API would behave the way
          the docs described. That assumption broke twice (deprecation,
          reshape) and the rate-limit was the third hit. Multi-day vendor
          incidents on a one-week MVP are exactly the kind of thing that
          should slip into the buffer, not push out the deadline. Music
          slid one day; the rest of the week absorbed it.
        </p>
        <p>
          A subtler discovery after the fact: Spotify rate-limits per
          endpoint family, not per app. A clear <Code>/me</Code>{" "}bucket
          doesn’t mean a clear <Code>/me/playlists</Code>{" "}bucket. I
          built a small probe (<Code>npm run spotify:health</Code>, also
          exposed at <Code>/api/spotify/health</Code> in dev) that hits
          both and returns the time-to-clear. When <Code>/music</Code>{" "}
          misbehaves now, the diagnostic is one command away—instead
          of a 21-hour mystery box.
        </p>
      </Body>

      <ClaudeNote>
        Claude wrote both the original optimistic <Code>Promise.all</Code>{" "}
        and, after the incident, the throttled client with retry logic.
        Both were correct against the spec I gave at the moment I gave it.
        The constraint “rate-limit every third-party integration on
        day one” now lives in project memory so the next integration
        doesn’t earn its lesson the same way.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 5 — Button Mashing ──────────────────────────────────
// Beat structure:
//   - opener: framing for three loops with escalating blast radius
//   - first two bugs (button + progress-bar saga): two compressed
//     paragraphs sharing the in-code-iteration shape, ending on the
//     "memory ≠ discipline" pullquote that carries both
//   - Movement 3 ("Doubling Down"): dev-server reinstall, full
//     treatment because it's a different magnification — destructive
//     real-world action against a wrong narrative
//   - close: three rules in an EvidenceGrid, one ClaudeNote
//
// Originally three discrete beats (05/06/07 in the earlier 10-beat
// arc); consolidated 2026-04-29. The first-two-bugs paragraphs were
// further compressed 2026-04-29 (later same day) — the reader had
// the loop pattern by the second paragraph; padding it across three
// Body blocks plus two pullquotes was paying compounding density.
function BeatButton() {
  return (
    <Beat
      id="button"
      number="05"
      title="Button Mashing"
      claudeTag="the recursion"
      headline="If all you have is a hammer…"
    >
      {/* Opener and the first-two-bugs paragraphs share one Body
          so the three paragraphs use Body's gap-4 rhythm. Splitting
          them across separate Bodies left adjacent paragraphs flush,
          since Body has no outer margin of its own — same pattern
          applied to the Movement-3 + synthesis Body below. */}
      <Body>
        <p>
          Pair-programming with an agent looks deceptively like
          pair-programming with a person—until the agent has been wrong
          twice. A human collaborator who’s been wrong twice will
          usually abandon the hypothesis class and try something
          fundamentally different. The agent generates refined variations
          of the same hypothesis as long as you let it. This build earned
          three of those loops, each with a bigger blast radius than the
          last.
        </p>
        <p>
          The first two were small. The landing-page CTA was supposed
          to be a solid black or white pill; it kept rendering as
          outlined transparent. Four rounds of debugging followed—the
          agent generating plausible hypotheses about CSS rules, each
          round a different surface-level fix that didn’t change
          the outcome. The actual bug: a color value silently failed
          to resolve at the button. The browser didn’t throw an
          error—it fell back to a default that happened to be
          transparent. The diagnostic that ended it:{" "}
          <Emph>
            stop changing the syntax, replace the value with red, tell
            me if the button is red.
          </Emph>{" "}
          Binary outcome, 30-second test. Catching the agent in that
          loop is a critical PM skill that I would argue requires some
          level of{" "}
          <Link href="https://www.linkedin.com/pulse/technically-speaking-malcolm-xavier-nsf3c">
            technical expertise <span aria-hidden="true">↗</span>
          </Link>
          .
        </p>
        <p>
          As I duplicated{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-building-this-site-body", destination: "case-study:basecamp-coffee" }}
          >
            <Link href="/case-studies/basecamp-coffee">
              the Basecamp Coffee case study
            </Link>
          </TrackOnClick>
          {" "}onto this site, the same class of bug returned. A
          scroll-progress
          bar—conceptually a 50-line change—took{" "}
          <Emph>15 commits and an evening</Emph>. Same shape: a value
          failing silently, the browser falling back without complaint.
          The part worth sitting with: I had a written memory note
          from the button bug describing exactly this pattern.{" "}
          <Emph>
            The memory existed. It wasn’t operationalized.
          </Emph>{" "}
          The 15-commit saga happened anyway. Documentation of a
          lesson isn’t the same as discipline around
          it—writing the postmortem feels like resolution; carrying
          it into the next session <Emph>is</Emph>{" "}the resolution.
          Almost every product org I’ve worked in conflates the
          two, and an AI-native system will pick up the same
          conflation if you’re not careful.
        </p>
      </Body>

      <Pullquote attribution="the more interesting PM artifact">
        Memory <span className="math-op">≠</span> discipline.
      </Pullquote>

      {/* Movement 3 + synthesis paragraph share one Body for the
          same reason as the opener Body above — adjacent Bodies have
          no inter-element spacing, so prose that should flow
          continuously needs to live in a single Body block. */}
      <Body>
        <p>
          The third loop earned a different magnification. Mid-audit,
          the local dev server stopped compiling—no error, no
          progress, just silence. The agent diagnosed it confidently
          as a Node version mismatch: specific, coherent, rhymed
          with prior knowledge. On the strength of that diagnosis it
          walked me through swapping the global default Node version
          on my machine. Still hung. A 90-second sanity check—does
          the bug reproduce in a fresh project of the same
          framework?—would have falsified the diagnosis before any
          of those changes. Same recursion shape as the first two
          bugs, but with a bigger blast radius: instead of iterating
          in code, this loop drove{" "}
          <Emph>a real-world action against a wrong narrative</Emph>.
          The agent constructs internally-consistent narratives
          faster than it falsifies them.
        </p>
        <p>
          Three loops, three rules. They now load on every Claude session
          because they live in <Code>~/.claude/</Code>{" "}memory—not because
          I’ve reread the postmortem. The difference, again, is the
          difference between memory and discipline. The class hasn’t
          stopped showing up; the rules make each recurrence cheaper than
          the last.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard
          eyebrow="Movement 01"
          title="Force the binary test"
        >
          When the agent’s been wrong twice on the same code path,
          stop refining its syntax and force a fundamentally different
          test. Replace the value with red. Toggle the rule off. The
          30-second binary outcome ends loops that another round of
          refinement won’t.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Movement 02"
          title="Write the rule, not the note"
        >
          Postmortems documented in markdown rot the moment the next
          session starts. Project-level rules in <Code>AGENTS.md</Code>{" "}
          and operator-level rules in <Code>~/.claude/</Code>{" "}load on
          every turn—that’s the surface that drives behavior. Two
          failed fixes means the diagnosis is wrong; root-cause it before
          iterating again.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Movement 03"
          title="Cheap test before destructive commit"
        >
          Any agent-proposed fix that touches global state—installing
          software, swapping the default runtime, editing dotfiles—gets
          gated on the cheapest test that would falsify the diagnosis.
          For infra-flavored bugs, that’s almost always “bootstrap
          a minimal repro and see if it reproduces.”
        </EvidenceCard>
      </EvidenceGrid>

      <ClaudeNote>
        <p className="m-0">
          Senior PM craft includes naming the pattern when it costs you,
          not just when it doesn’t. The recursion is the more honest
          case study than any single incident—and it’s the part that
          travels. Every team pair-programming with an agent will earn
          its own version of these three loops; what matters is whether
          the rules end up in operating memory before the next loop
          costs more than this one did.
        </p>
        <p className="m-0 mt-3">
          What got committed off the back of all three:{" "}
          <Code>engines.node</Code> pinned to{" "}
          <Code>{`">=22 <26"`}</Code> in <Code>package.json</Code> so a
          future Node major bump trips a clear warning before it corrupts
          local state, plus a <Code>.nvmrc</Code> pinned to{" "}
          <Code>24</Code> so anyone with <Code>nvm</Code> or{" "}
          <Code>fnm</Code> auto-switches into a supported version on{" "}
          <Code>cd</Code>. Two lines of guardrail. Retroactive but
          durable.
        </p>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 6 — Three Resumes ─────────────────────────────────────
// PM-craft showcase that counterweights the incident-cluster.
// Sourced from the "Three resumes, browser, tailor, grab."
// section of case-studies/building-this-site.md, which had been
// drafted but not yet ported to the rendered page.
function BeatResumes() {
  return (
    <Beat
      id="resumes"
      number="06"
      title="Three Resumes"
      claudeTag="triple-output craft"
      headline="Browse, tailor, grab."
    >
      <Body>
        <p>
          One person, three reading contexts. The{" "}
          <Code>/resume</Code>{" "}page is built for browsing—a
          recruiter following a link from LinkedIn or an emailed
          intro. The <Code>.docx</Code>{" "}template is what I download
          and tailor per application, export to PDF, then submit
          through the company’s portal—ATS-shaped, single
          column, no fancy typography, edited to the specific posting.
          And the standard PDF is a static fallback for anyone who
          just wants a file in their inbox without asking—no
          tailoring, perpetually current as the source evolves. Three
          jobs, three editorial decisions, one underlying record.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="Web resume" title="Browse">
          Lives at <Code>/resume</Code>. Rendered in Instrument Serif
          and DM Sans, with company links in their actual brand
          colors, a sticky TOC for desktop, and a case-study card
          grid. Education and experience are presented in full (of course,
          still editorialized). The audience is browsing, not scanning.
          Source:{" "}
          <Code>app/resume/resume-data.tsx</Code>—a{" "}
          <Code>.tsx</Code>{" "}file because some bullets embed inline
          JSX links.
        </IterationCard>
        <IterationCard lens=".docx template" title="Tailor">
          My working file. Download → tailor for the application →
          export to PDF → submit. Single column, no tables, no
          fancy typography. Some education is dropped, some roles are trimmed. Same person,
          scanning context, tighter editorial. Generated by{" "}
          <Code>scripts/build-resume-docx.mjs</Code>{" "}(using the{" "}
          <Code>docx</Code>{" "}package), pinned at{" "}
          <Code>/resume/malcolm-xavier-resume-template.docx</Code>.
        </IterationCard>
        <IterationCard lens="Standard PDF" title="Grab">
          The friction-free fallback. A generic, non-tailored
          rendering of the <Code>.docx</Code>{" "}template, pinned at{" "}
          <Code>/resume/malcolm-xavier-resume.pdf</Code>. Built by{" "}
          <Code>scripts/build-resume-pdf.mjs</Code>, which chains
          off the docx build and converts—so the file stays in
          lockstep with the template every time the source changes.
          For the recruiter who just wants a quick file to share
          with a hiring team.
        </IterationCard>
      </IterationGrid>

      <Body>
        <p>
          Three artifacts, two pipelines. The web resume sources
          from <Code>app/resume/resume-data.tsx</Code>{" "}(JSX-aware,
          since some bullets embed inline links). The{" "}
          <Code>.docx</Code>{" "}and the PDF both come from a single
          Node script chain—<Code>build-resume-docx.mjs</Code>{" "}makes
          the Word file;{" "}
          <Code>build-resume-pdf.mjs</Code>{" "}runs that and converts.
          So the <Code>.docx</Code>{" "}and PDF stay in lockstep
          automatically; the web version is the parallel maintenance
          burden. Bridging the JSX and the Node side would mean a
          TS compiler step plus a React-element walker for an
          artifact regenerated maybe once a month. I accepted the
          parallel maintenance, with a comment at the top of each
          file pointing at the other, since there is value to use case
          matching.
        </p>
      </Body>

      <Pullquote attribution="the small-detail rule">
        Brand-craft is mostly the details no one’s supposed to
        consciously notice.
      </Pullquote>

      <Body>
        <p>
          A handful of details worth flagging for anyone building
          something similar—most of them about respecting the actual
          reading mechanics of a Word doc that may be parsed by ATS,
          opened in Google Docs, exported to PDF, and printed before
          it gets read:
        </p>
        <ul className="m-0 pl-5 text-[17px] md:text-[19px] leading-[1.55] text-[var(--text-caption)] list-disc marker:text-[var(--text-caption)]">
          <li>
            <Emph>
              <Code>keepNext: true</Code> on every paragraph in an
              entry except the last.
            </Emph>{" "}
            Prevents Word from breaking a single role across pages—the
            rule any recruiter would tell you about a resume but no
            template enforces by default.
          </li>
          <li>
            <Emph>
              <Code>titlePage: true</Code> to suppress the page header
              on page 1.
            </Emph>{" "}
            Page 1 carries the full hero (name, headline, contact,
            summary) in the body. Pages 2+ get a minimal header so a
            printed-and-stapled resume still identifies itself if the
            pages get separated.
          </li>
          <li>
            <Emph>
              Hyperlinks preserved through the .docx → Doc → PDF
              pipeline.
            </Emph>{" "}
            Every company name, every contact item, every case-study
            title carries a real <Code>href</Code>. ATS that strip
            formatting still get the URL as text; humans clicking
            through the PDF in Gmail get a working link.
          </li>
          <li>
            <Emph>Friendly link labels</Emph>.{" "}
            “LinkedIn · GitHub · Personal Website” instead
            of bare URLs in the contact strip. Easier to scan, less
            visual noise, the underlying hyperlink still resolves.
          </li>
          <li>
            <Emph>
              Company URLs match each company’s actual canonical hostname.
            </Emph>{" "}
            People Inc., Muck Rack, GitHub, and Calendly canonicalize
            to apex (no <Code>www.</Code>); LinkedIn, User Interviews,
            Fullstack Academy, Fractured Atlas, Artist Growth, and
            NEFA canonicalize to <Code>www.</Code>. Matching each
            site’s canonical avoids a 301 redirect hop when the
            link is clicked. Approximately zero recruiter value, and
            a non-zero number of senior engineers will notice.
          </li>
        </ul>
      </Body>

      <ClaudeNote>
        The triple-artifact structure is also a small ship-and-flag
        bet. The web resume is the primary recruiter surface today
        because the link is pre-tailored. The <Code>.docx</Code>{" "}is
        the path of least resistance the moment an application asks
        for a working file. The standard PDF is the polite drop-in. No
        friction, standard resume on demand. If data
        ever suggests the web resume isn’t getting reviewed,
        the file artifacts become the lead surface and the web
        version becomes the deep cut companion. Same source
        material, three distributions. A recruiter who prefers a
        file can get it; a recruiter who prefers a web resume can get
        that; and a recruiter who prefers a PDF can get that.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 7 — QA ──────────────────────────────────────
function BeatReview() {
  return (
    <Beat
      id="review"
      number="07"
      title="QA"
      claudeTag="multi-agent orchestration"
      headline="Three reviewers, one punch list, one humbling number."
    >
      <Body>
        <p>
          Pre-launch QA at solo-PM scale needs three lanes that
          don’t overlap—one for accessibility, one for design
          cohesion, one for code maintainability—and a way to merge
          them into a single punch list. Of the five sub-agents I
          built, three sit on the QA loop:{" "}
          <Code>a11y-reviewer</Code>, <Code>design-reviewer</Code>,
          and <Code>code-reviewer</Code>. Growth and SEO sit outside
          it; they operate on different surfaces and a different
          cadence. The three on the loop run as a single orchestrated
          command.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="a11y-reviewer" title="WCAG 2.2 AA">
          Reviews semantic HTML, keyboard navigability, focus states,
          contrast in light + dark, alt text, ARIA usage,
          prefers-reduced-motion, form labeling, and target-size
          minimums. The original lane on the harness; the other two
          were built around it.
        </IterationCard>
        <IterationCard lens="design-reviewer" title="Sensibility + cohesion">
          Reviews typography rhythm, spacing, color usage, sub-brand
          cohesion, iconography consistency, hierarchy, motion,
          responsive treatment, and editorial voice in UI copy.
          Operates against rendered surfaces when a dev server is
          available; falls back to code-and-token review when not.
        </IterationCard>
        <IterationCard lens="code-reviewer" title="Efficiency + structure">
          Reviews type safety, separation of concerns, naming, dead
          code and duplication, performance footguns, error handling
          at boundaries, React and Next.js patterns, async
          correctness, and bundle hygiene. Reads context around the
          diff, not just the touched lines.
        </IterationCard>
      </IterationGrid>

      <Body>
        <p>
          Each role spec lives at{" "}
          <Code>~/.claude/agents/{`<name>.md`}</Code>: checklist,
          output format, severity definitions, and an explicit{" "}
          <Emph>what NOT to do</Emph>{" "}section so the agents don’t
          drift into each other’s lanes. All three were
          standardized on a shared severity vocabulary—Critical,
          High, Medium, Low, plus a Couldn’t-verify bucket—so a
          downstream orchestrator can merge their reports cleanly.
        </p>
      </Body>

      <ClaudeNote>
        The pattern that matters: each role spec isn’t just{" "}
        <Emph>what to do</Emph>—it’s <Emph>what NOT to do</Emph>.
        The design reviewer explicitly defers a11y issues with a
        one-line mention and lets the a11y reviewer handle the
        detail. The code reviewer explicitly defers visual-design and
        a11y. That discipline keeps each report focused, and it’s
        what makes the synthesis step possible—three overlapping
        reviews would be mush, not signal.
      </ClaudeNote>

      <Body>
        <p>
          I built a custom command, <Code>/full-review</Code>, that ties them together. It
          establishes scope (current diff, or whatever the user named
          in the previous message), spawns all three reviewers in
          parallel, then synthesizes their reports into a single
          structured punch list. Two sections come first: <Emph>Conflicts</Emph> (where
          reviewers disagree on the same element—the user
          adjudicates), and <Emph>Aligned</Emph> (where two or more
          reviewers independently flag the same issue—high-confidence
          calls). After that, the standard severity buckets,
          exhaustive—no findings cap, to explicitly
          surface everything reviewable rather than a curated
          top-N list.
        </p>
        <p>
          The first run, against the entire site in light and dark modes, came
          back with ninety-nine findings. One of them—a token-chain
          bug that silently invalidates the recruiter cluster’s
          text colors—was independently flagged by both the design
          reviewer and the a11y reviewer at Critical severity. That’s
          the kind of cross-confirmed signal a single reviewer would
          have either missed entirely or underweighted. Aligned items
          are the highest-leverage fixes; conflicts are the ones the
          user actually has to think about.
        </p>
      </Body>

      <Pullquote attribution="the orchestration rule">
        Three overlapping reviews would be mush. Three lanes with
        explicit handoffs is signal.
      </Pullquote>

      <Body>
        <p>
          Ninety-nine findings is a lot to triage from a markdown
          report. So the synthesis output also renders as a self-
          contained interactive HTML dashboard at{' '}
          <Code>{`_private/_reviews/full-review-<date>.html`}</Code>,
          with each finding as a card carrying severity, reviewer
          tags, file:line citation, description, and fix
          recommendation. Status dropdowns (Open / Done / Won’t
          do) and severity dropdowns are wired to{' '}
          <Code>localStorage</Code>, so working through the list
          survives reloads. Filters on Status, Severity, and Reviewer
          cut the list to whatever slice you want to work in.
        </p>
        <p>
          The point isn’t the dashboard. The point is that the
          review becomes load-bearing data—something to triage,
          manage, and check off—instead of a markdown file that
          gets read once and buried. Per the recursion lesson above,
          written notes don’t drive behavior. A working surface
          does.
        </p>
      </Body>

      <Body>
        <p>
          A day after the first run, with the audit-closeout commits
          landed, I ran <Code>/full-review</Code>{" "}a second time on
          the closeout work itself. It surfaced 35 substantive new
          findings—six items the first pass had missed, twelve
          tradeoff costs of choices I’d made knowingly, and{" "}
          <Emph>seventeen regressions in code we’d just written</Emph>.
          Forty-nine percent of the new findings were brand-new bugs
          introduced while fixing other bugs.
        </p>
        <p>
          The reflection on the missed-six was the more humbling
          number. Five of the six were variations on a single failure
          mode: we’d audited the trigger of a fix, not the family
          the bug belonged to. The original{" "}
          <Code>--text-action</Code>{" "}contrast fix landed for the
          components we’d noticed but missed PaginationButton
          (which used <Code>--primary-default</Code> directly) and{" "}
          <Code>--border-focus</Code> (which chained through{" "}
          <Code>--primary-700</Code>)—sibling bugs in the same
          family. A 60-second class-audit would have caught them.
        </p>
      </Body>

      <StatRow>
        <Stat
          big="49%"
          eyebrow="Regression rate"
          caption="Of 35 new findings on the audit-closeout commits, 17 were regressions in code we’d just written."
        />
        <Stat
          big="5 of 6"
          eyebrow="Sibling-bug discoveries"
          caption="Of the pre-existing items the first pass missed, 5 were variations on a single failure family the original fix didn’t sweep for."
        />
      </StatRow>

      <Body>
        <p>
          Both lessons now sit in <Code>AGENTS.md</Code>{" "}at the repo
          root, where any agent working in the codebase reads them
          before writing the next fix:{" "}
          <Emph>catch regressions during the change, not in the next audit</Emph>{" "}
          (three failure-mode checks before declaring done—error
          paths for new scripts, breakpoint pass for UI, consumer
          grep for shared logic), and{" "}
          <Emph>when fixing a class of bug, audit the whole class</Emph>{" "}
          (name the abstraction, grep every consumer, verify each
          under the same conditions). Per the recursion lesson in
          Button Mashing above: written documentation isn’t operational
          discipline. The repo-level rule is the discipline; the
          markdown is the documentation. Both, not one.
        </p>
        <p>
          A new instance landed mid-redline on this very article. One
          visible JSX-whitespace bug in Section 6 (Three Resumes)
          surfaced eleven siblings—ten on this page, one on the
          Basecamp study—once the trigger was audited rather than
          patched. The rule paid for itself in a single sweep.
        </p>
      </Body>

      <ClaudeNote>
        Sub-agents and slash commands are loaded at session start in
        Claude Code. The first run of <Code>/full-review</Code> in
        the same session that birthed it had to bootstrap the new
        reviewers through the generic <Code>general-purpose</Code>{' '}
        agent reading their role files at runtime—same persona,
        just not native yet. After a session restart, they load
        directly. Worth knowing if you’re authoring agents and
        trying them in the same conversation.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 8 — What's Live ─────────────────────────────────────
function BeatLive() {
  return (
    <Beat
      id="live"
      number="08"
      title="What’s Live"
      headline="What shipped, what got cut, what’s next."
    >
      <Body>
        <p>
          As of writing, the MVP is live, gated
          behind a Basic Auth proxy while the site is being battle
          tested by close friends and colleagues. Two audit cycles deep, with the
          regressions and class-audit lessons captured as repo-level
          rules so the next agent doesn’t earn the same ones.
        </p>
      </Body>

      <HarnessGrid>
        <HarnessFeature name="Landing">
          One CTA above the fold (“See my resume →”), with a
          conditional sub-brand matrix below for cultural-curious visitors.
        </HarnessFeature>
        <HarnessFeature name="Resume">
          Web-native recruiter resume with editorial typography, sticky
          TOC, company links in their actual brand colors, and a case-study
          card grid (this case study included). Plus a <Code>.docx</Code>{" "}
          template for ATS submissions, generated from the same
          editorial decisions.
        </HarnessFeature>
        <HarnessFeature name="About">
          Senior PM positioning up top, followed by a more personal bio and
          creative socials.
        </HarnessFeature>
        <HarnessFeature name="Contact">
          Inline Calendly widget for the recruiter booking flow, plus
          mailto and LinkedIn fallbacks.
        </HarnessFeature>
        <HarnessFeature name="Music">
          37 Spotify playlists, sorted by most-recent track{" "}
          <Code>added_at</Code>{" "}as a proxy for last-edited (Spotify
          doesn’t expose <Code>modified_at</Code>), with manual-pin
          override and an{" "}
          <Code>/api/spotify/health</Code> probe for per-bucket
          rate-limit diagnostics.
        </HarnessFeature>
        <HarnessFeature name="Case studies">
          Three articles in the cluster: the Basecamp Coffee turnaround,
          this meta study, and the sequel on the integration architecture
          behind /music, /films, and /television. Shared chrome, shared
          primitives, shared scroll-progress bar.
        </HarnessFeature>
        <HarnessFeature name="Test coverage">
          Vitest suite covering the brittle paths the audit flagged—rate-limit
          hardening, mosaic helpers, snapshot fallback. 21
          tests today; the commitment is that brittle correctness paths
          ship with tests, not as a follow-up.
        </HarnessFeature>
        <HarnessFeature name="Review tooling">
          The three-reviewer harness above, wired up as a single{" "}
          <Code>/full-review</Code> command, generating an interactive
          dashboard at <Code>{`_private/_reviews/`}</Code> that triages,
          filters, and tracks each finding to closure.
        </HarnessFeature>
      </HarnessGrid>

      <Body>
        <p>
          PM judgment is mostly about what <Emph>not</Emph> to ship.
          The biggest scope cut from the MVP: forthcoming sub-brand pages. No content for them yet—per
          the no-placeholders rule from Section 3, they appear in
          nav and on landing the day they ship, not before. Stay tuned…
        </p>
        <p>What I’d do differently next time:</p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard
          eyebrow="Lesson 01"
          title="Rate-limit on day one, not later"
        >
          Every third-party integration, throttled from the first
          request. The original{" "}
          <Code>Promise.all</Code>{" "}across 57 playlists (associated with my
          profile, not all coming over to this site) bought a
          21-hour Spotify penalty box; rate-limiting on day one
          would have bought zero.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 02"
          title="Cache fixtures locally for dev"
        >
          API responses on disk during dev would have prevented the
          rate-limit cascade entirely and made iteration faster.
          Production code shouldn’t pay the cost of dev
          iteration loops.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 03"
          title="Hardcode the visual baseline"
        >
          Theme-aware UI primitives shouldn’t depend on{" "}
          <Code>var()</Code>{" "}references that can fail silently.
          Hex literals via <Code>{`[data-theme="dark"]`}</Code>{" "}
          selectors are more brittle to read but more bulletproof to
          render.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 04"
          title="Validate against the deployed render"
        >
          Computed-style or screenshot before declaring a visual fix
          done. Not “the code looks right.” The two
          aren’t the same thing, as the button bug spent four
          rounds proving.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 05"
          title="Audit the family, not the trigger"
        >
          Bugs rarely live alone. A 60-second class-audit before
          declaring the fix done catches sibling bugs before the
          next reviewer does, and avoids the 49% regression rate I
          paid for skipping it.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 06"
          title="Cheap test before high-cost action"
        >
          Anything touching global state needs a 90-second
          falsification before the destructive commit. Same gate
          I’d apply to a junior PM proposing a vendor
          escalation.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Lesson 07"
          title="Documentation isn’t discipline"
        >
          Written postmortems are documentation. Operational
          discipline is the ongoing thing. Product teams need to
          invest in both, not one.
        </EvidenceCard>
      </EvidenceGrid>

      {/* Case-study close — exit ramp for the highest-intent reader.
          Surfaces the sequel study, then the recruiter funnel (resume
          + Calendly). The earlier Basecamp Coffee cross-link and
          GitHub-source ClaudeNote were dropped to de-clutter the
          close; Basecamp is still linked from /case-studies. */}
      <Body>
        <p>
          If you want the follow-up—same rendering contract, three
          completely different upstreams:{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{
              surface: "building-this-site",
              destination: "case-study:architecture-under-contract",
            }}
          >
            <Link href="/case-studies/architecture-under-contract">
              Architecture under contract →
            </Link>
          </TrackOnClick>
          .
        </p>
        {/* Resume primary, Calendly secondary (caption register).
            A reader of just this case study doesn't yet have enough
            context to commit to a call; resume is the next logical
            step in the funnel. Same shape across all 5 work- and
            project-case-study closes. */}
        <p>
          Two next steps, if this resonated:{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-meta-close", destination: "resume" }}
          >
            <Link href="/resume">review my resume <span aria-hidden="true">→</span></Link>
          </TrackOnClick>
          .
        </p>
        <p className="text-[15px] text-[var(--text-caption)]">
          Or, if you’re ready to talk,{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CALENDLY_CLICK}
            eventData={{ kind: "outbound", surface: "case-study-meta-close" }}
          >
            <Link href={CONTACT.calendly}>
              book a 30-min product chat <span aria-hidden="true">&#8599;</span>
            </Link>
          </TrackOnClick>
          .
        </p>
      </Body>
    </Beat>
  );
}
