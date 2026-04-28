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
// Story arc (7 beats, mirroring the Basecamp shape):
//   01 · The Brief        — three jobs, seven-day timebox
//   02 · The Workflow     — where I drove, where Claude drove
//   03 · The Architecture — the design-system + IA decisions
//   04 · The Spotify Story — incident #1: rate-limit and reshape
//   05 · The Button Bug   — incident #2: silent var() resolution
//   06 · The Recursion    — same bug class, week later, no excuse
//   07 · What's Live      — current state, cuts, and what next
//
// Voice and copy track the markdown source. When that file is
// revised, this page follows.
// ─────────────────────────────────────────────────────────────────

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

// External anchors referenced multiple times in the narrative.
// Centralized so a destination change is one line, not a scavenger
// hunt through the article body.
const SITE_REPO_HREF = "https://github.com/malcolmxavier/malcolm-xavier-website";
const CLAUDE_CODE_HREF = "https://claude.com/claude-code";

// TOC schema matches the chrome/TableOfContents primitive used by
// every other case study. First entry is a return-to-top action;
// remaining entries mirror the seven-beat structure below.
const TOC_ITEMS: TocItem[] = [
  { href: "#intro", label: "↑ Top" },
  { href: "#brief", prefix: "01", label: "The Brief" },
  { href: "#workflow", prefix: "02", label: "The Workflow" },
  { href: "#architecture", prefix: "03", label: "The Architecture" },
  { href: "#spotify", prefix: "04", label: "The Spotify Story" },
  { href: "#button", prefix: "05", label: "The Button Bug" },
  { href: "#recursion", prefix: "06", label: "The Recursion" },
  { href: "#review", prefix: "07", label: "The Review" },
  { href: "#live", prefix: "08", label: "What's Live" },
];

export default function BuildingThisSiteCaseStudy() {
  return (
    <>
      <ScrollProgress />
      {/* Fixed-position TOC rail in the left margin on xl+. Hidden
          on smaller viewports where there isn't room beside the
          centered article column. Same treatment as the Basecamp
          case study so the chrome reads consistently across the
          /case-studies cluster. */}
      <aside
        aria-label="Article sections"
        className="hidden xl:block fixed top-32 left-4 w-[180px] 2xl:left-8 2xl:w-[220px] z-30"
      >
        <TableOfContents items={TOC_ITEMS} ariaLabel="Article sections" />
      </aside>
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
        <BeatRecursion />
        <BeatSeparator />
        <BeatReview />
        <BeatSeparator />
        <BeatLive />
      </article>
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
      title="Claude x AI-Native PM"
      subtitle="Building this site, one rate-limit at a time"
      readMin={12}
      updatedDate={formatLastUpdated()}
    >
      A recursive artifact: a case study about building the site that hosts
      it. Shipped in seven days with{" "}
      <Link href={CLAUDE_CODE_HREF}>
        Claude Code
        {/* Surrounding lede is Instrument Serif italic, which renders
            the unicode arrow slanted and light. Force the arrow back
            to upright sans so it reads as a clean external-link
            affordance — same trick the Basecamp Hero uses. */}
        <span
          style={{
            fontFamily: "var(--font-secondary)",
            fontStyle: "normal",
          }}
        >
          {" "}↗
        </span>
      </Link>{" "}
      as build partner, while actively interviewing for senior PM roles.
      Two production incidents, several architecture bets, and a
      deliberate division of labor between human direction and agent
      execution. What follows is the case study version, not the
      changelog.
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
        <EvidenceCard eyebrow="Job 02" title="Show, don't tell">
          A live, well-built site signals shipping ability more than any
          deck. The chrome <Emph>is</Emph> the proof.
        </EvidenceCard>
        <EvidenceCard eyebrow="Job 03" title="An artist, quietly">
          Theater background, hospitality at USHG, MS in Law focused on
          privacy and IP. Visible only after the recruiter has decided I
          can do the job.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          The non-constraint was scope. I had ~12 pages of ideas (newsletter,
          film, TV, music, books, games, podcast, plus the recruiter and
          personal pages) and deliberately scoped MVP down to five —{" "}
          <Emph>Landing, Resume, About, Contact, Music</Emph> — with
          everything else gated behind a no-public-placeholders rule. Day 4
          held the hard cutline (&ldquo;shippable MVP&rdquo;); Days 5 through
          7 were stretch.
        </p>
      </Body>

      <ClaudeNote>
        Plan mode at session start, every session. The cutline held even
        when Music slid a day on the Spotify incident — buffer days exist
        for exactly that, and a clear cutline made the slip feel like a
        plan rather than a crisis.
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
          Most of the code is the agent&apos;s. Most of the decisions are
          mine. The interesting part — and the part recruiters keep asking
          about — is what that division of labor actually looks like in
          practice.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="The human in the loop" title="Where I drove">
          Information architecture and brand voice. Decision-quality reviews
          when the agent picked a fork I&apos;d have picked differently.
          Editorial taste on anything published-facing. Constraint discipline
          (no placeholders, platform links never show handles, the Creative
          CV stays quiet in About).
        </EvidenceCard>
        <EvidenceCard eyebrow="The agent" title="Where Claude drove">
          Implementation: React, Tailwind, the typography primitives, the
          layout system, the Spotify client, the Calendly embed, the
          token-pipeline build script. Defensive engineering once instructed.
          Inline comments dense enough that a non-technical reader can
          navigate the code.
        </EvidenceCard>
        <EvidenceCard eyebrow="The blind spot" title="Where neither of us was great">
          Visual design judgment. Iconography, layout proportions, the felt
          rightness of a UI choice — anywhere taste matters more than logic.
          Four rounds of phone-icon variants, none landing, before the call
          was to pick a stock Heroicons handset and move on. The agent
          can&apos;t develop taste; the PM can&apos;t always articulate it.
          The honest move is to provide a precise reference or step in by
          hand — specifying visual judgment in the abstract is a category
          error.
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
          I&apos;d review, redirect, and redline. The total wall time was a
          fraction of what solo-coding would have taken; the cognitive load
          was almost entirely on direction and judgment, which is the part
          of the work I&apos;m hired to do anyway.
        </p>
      </Body>

      <ClaudeNote>
        The pattern is durable because of context, not magic. CLAUDE.md at
        the repo root carries the working scenario, brand voice, and
        stakeholders. Project memory persists decisions and voice rules
        across sessions. Custom sub-agents (Growth Product Strategist,
        a11y reviewer, SEO reviewer) bring lens-specific review without
        re-priming context. Without that scaffolding, the agent drifts
        toward generic.
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
          it together are quieter, and they&apos;re the part worth
          flagging for anyone reading the source.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard
          lens="Design system"
          title="One codebase, many sub-brands, zero JS flips"
        >
          Each sub-brand (Music, eventually Film, TV, Books) gets its own
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
          the Figma file and made the JSON in <Code>/_design/tokens/</Code>{" "}
          canonical. A small parser (<Code>scripts/build-tokens.mjs</Code>)
          walks the multi-tier files (Brand → Alias → Mapped → Responsive)
          and emits CSS custom properties grouped by tier into{" "}
          <Code>globals.css</Code>. When &ldquo;design system&rdquo; means
          &ldquo;spreadsheet of values,&rdquo; the spreadsheet should live
          where the values are read.
        </IterationCard>
        <IterationCard
          lens="Information architecture"
          title="No public placeholders, ever"
        >
          Routes don&apos;t ship until they&apos;re real. Nav only shows
          live pages. The landing matrix renders only tiles for sub-brand
          pages that actually exist. There are no &ldquo;coming soon&rdquo;
          pages, no skeleton routes, no nav entries pointing at unbuilt
          work. The discipline keeps the site small, the chrome honest,
          and the surface area genuinely shippable on any given day.
        </IterationCard>
        <IterationCard
          lens="Information architecture"
          title="Recruiter-first, creative-CV-quiet"
        >
          Landing elevates exactly one CTA — &ldquo;See my resume →&rdquo;.
          Below that, a conditional sub-brand matrix lets cultural-curious
          visitors explore. The Creative CV (the artist-side artifact)
          lives quietly inline in the About teaser, not elevated alongside
          Resume. Three audiences served, each with the surface area they
          actually need, without diluting the primary call to action.
        </IterationCard>
      </IterationGrid>

      <ClaudeNote>
        None of these were the agent&apos;s instinct. Generic-Next.js
        decisions are the agent&apos;s gravity well; the PM job was naming
        the constraint (&ldquo;no placeholders,&rdquo;{" "}
        &ldquo;sub-brand flip via data attribute, not JS,&rdquo;{" "}
        &ldquo;tokens are code now&rdquo;) and then letting the agent
        execute against it. That&apos;s the part of the workflow that
        scales.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 4 — The Spotify Story ───────────────────────────────
function BeatSpotify() {
  return (
    <Beat
      id="spotify"
      number="04"
      title="The Spotify Story"
      claudeTag="defensive engineering"
      headline="How I lost a day to a 429."
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
          November 2024 — including the user-playlists endpoint that
          historically mapped 1:1 to &ldquo;public playlists on this
          profile.&rdquo; Apps registered after that cutoff get 403,
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
          became <Code>item.item</Code> because Spotify unified tracks and
          podcast episodes under one model). The docs hadn&apos;t fully
          caught up. Cost: another hour of empirical shape-discovery via
          logged responses.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Plot point 03"
          title="The rate-limit incident"
        >
          The fetch logic, in a moment of &ldquo;this works for now&rdquo;
          optimism, used <Code>Promise.all</Code> to fetch track lists for
          all 57 playlists in parallel. Multiple back-to-back bursts
          during dev triggered the rate limiter, then an escalated
          cool-down. At one point Spotify&apos;s <Code>Retry-After</Code>{" "}
          returned <Emph>77,368 seconds</Emph> — about 21 hours.
        </EvidenceCard>
      </EvidenceGrid>

      <StatRow>
        <Stat
          big="77,368s"
          eyebrow="Retry-After value"
          caption="Spotify's escalated cool-down after multiple bursts. About 21 hours."
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
          production systems, and &ldquo;I&apos;ll add throttling
          later&rdquo; is a sentence that buys you a 21-hour penalty box.
          Should have throttled from the first request.
        </p>
        <p>
          There&apos;s a quieter PM lesson in here too. The original ROI
          estimate on the Music page assumed the API would behave the way
          the docs described. That assumption broke twice (deprecation,
          reshape) and the rate-limit was the third hit. Multi-day vendor
          incidents on a one-week MVP are exactly the kind of thing that
          should slip into the buffer, not push out the cutline. Music
          slid one day; the rest of the week absorbed it.
        </p>
      </Body>

      <ClaudeNote>
        Claude wrote both the original optimistic <Code>Promise.all</Code>{" "}
        and, after the incident, the throttled client with retry logic.
        Both were correct against the spec I gave at the moment I gave it.
        The constraint &ldquo;rate-limit every third-party integration on
        day one&rdquo; now lives in project memory so the next integration
        doesn&apos;t earn its lesson the same way.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 5 — The Button Bug ──────────────────────────────────
function BeatButton() {
  return (
    <Beat
      id="button"
      number="05"
      title="The Button Bug"
      claudeTag="debug partner"
      headline="When the agent loops."
    >
      <Body>
        <p>
          The hero CTA on landing was supposed to be a filled black pill in
          light mode and a filled white pill in dark mode — the
          recruiter&apos;s eye anchor. It rendered as an outlined
          transparent pill in both modes. Text labels correct. Click
          targets correct. Layout fine. Just no fill.
        </p>
        <p>
          What followed was a four-round debugging session. The agent
          generated plausible hypotheses about CSS specificity, layer
          ordering, and shorthand-vs-longhand parsing quirks. Each round
          produced a different syntactic fix for what was effectively the
          same code path — inline styles, then Tailwind utilities, then
          unlayered CSS with <Code>!important</Code> and elaborate{" "}
          <Code>{`[data-variant="primary"]`}</Code> selectors. None of it
          worked.
        </p>
        <p>
          The actual bug was that <Code>var(--text-heading)</Code> was
          silently resolving to nothing at the button element specifically,
          despite cascading correctly to body, paragraphs, and other
          elements on the same page. When <Code>var()</Code> fails to
          resolve, the browser doesn&apos;t error — the property silently
          falls back to its initial value (<Code>transparent</Code> for{" "}
          <Code>background-color</Code>). The Styles panel showed the rule
          as applied with no override. The Computed tab would have shown{" "}
          <Code>background-color: rgba(0, 0, 0, 0)</Code>. One property
          failed loudly, one failed quietly, and the difference masked the
          diagnosis for three rounds.
        </p>
      </Body>

      <Pullquote attribution="the diagnostic that ended it">
        Stop changing the syntax. Replace the value with red. Tell me if
        the button is red.
      </Pullquote>

      <Body>
        <p>
          The fix that worked: replace <Code>var(--text-heading)</Code>{" "}
          with hardcoded hex (<Code>#000</Code> / <Code>#fff</Code>) and
          use <Code>{`[data-theme="dark"]`}</Code> descendant selectors for
          theme awareness. Bypass the variable cascade entirely.
        </p>
      </Body>

      <ClaudeNote>
        Pair-debugging with an AI agent looks deceptively like
        pair-debugging with a person. The failure mode is different. A
        human collaborator who&apos;s been wrong twice will usually
        abandon their hypothesis class and try something fundamentally
        different. The agent will keep generating refined variations of
        the same hypothesis as long as you let it.
        <span className="block mt-3 text-[var(--text-heading)] font-medium">
          The PM skill is to recognize when an iterative loop is producing
          diminishing returns and force a fundamentally different test.
        </span>
        <span className="block mt-3">
          Binary outcome, 30-second test. The agent eventually arrived at
          this diagnostic on its own, but four rounds late. Catching the
          agent in that loop is the work I&apos;d be paying a PM to do
          anyway.
        </span>
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 6 — The Recursion ───────────────────────────────────
function BeatRecursion() {
  return (
    <Beat
      id="recursion"
      number="06"
      title="The Recursion"
      claudeTag="memory operationalized"
      headline="The bug came back. So did the lesson."
    >
      <Body>
        <p>
          A week later, building the chrome on{" "}
          <Code>/case-studies/basecamp-coffee</Code>: a 1px scroll-progress
          bar anchored to the bottom of the Nav. Conceptually a 50-line
          CSS change. Took <Emph>15 commits and an evening</Emph> of
          escalating frustration with the agent to land the right state.
        </p>
        <p>
          Eventually traced: <Code>--surface-page</Code> resolves to{" "}
          <Emph>empty</Emph> on recruiter-cluster pages because{" "}
          <Code>--neutral-white</Code> and <Code>--neutral-black</Code> are
          only defined inside <Code>{`[data-subbrand]`}</Code> blocks at{" "}
          <Code>:root</Code> — not at the recruiter cluster&apos;s root.
          Every <Code>color-mix(... var(--surface-page))</Code> was
          silently invalidating. The page still <Emph>looked</Emph> right
          because Chrome&apos;s canvas defaults paint the page bg. Same
          class of bug as the button. Same silent fallback masking the
          diagnosis.
        </p>
      </Body>

      <Pullquote attribution="the more interesting PM artifact">
        Memory ≠ discipline.
      </Pullquote>

      <Body>
        <p>
          Here&apos;s the part worth sitting with: I had a written memory
          note from the button bug describing exactly this pattern.{" "}
          <Emph>The memory existed. It wasn&apos;t operationalized.</Emph>{" "}
          The 15-commit saga happened anyway. Written documentation of a
          lesson is not the same as operational discipline around it.
          Writing the postmortem feels like resolution. Carrying it into
          the next session <Emph>is</Emph> the resolution. Almost every
          product org I&apos;ve worked in conflates the two.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard
          eyebrow="Technical takeaway"
          title="Verify variable resolution at the call site"
        >
          When a CSS variable chain depends on tokens defined conditionally
          (inside <Code>{`[data-subbrand]`}</Code>,{" "}
          <Code>{`[data-theme]`}</Code>, etc.), confirm those tokens
          actually resolve where they&apos;re consumed.{" "}
          <Code>getComputedStyle(el).getPropertyValue(&apos;--foo&apos;)</Code>{" "}
          is the 30-second binary test. Same lesson as the button bug,
          escaped containment.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="Process takeaway"
          title="Two failed fixes means the diagnosis is wrong"
        >
          Same symptom returning across patches means the diagnosis is
          wrong, not the patch. The iteration cost of &ldquo;one more
          guess&rdquo; exceeds the cost of a 5-minute root-cause sweep,
          every single time. Memory rule now lives in{" "}
          <Code>~/.claude/</Code>: after two failed attempts, root-cause
          before iterating again.
        </EvidenceCard>
      </EvidenceGrid>

      <ClaudeNote>
        Senior PM craft includes naming the pattern when it costs you, not
        just when it doesn&apos;t. The recursion is the more honest case
        study than the original incident.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 7 — The Review ──────────────────────────────────────
function BeatReview() {
  return (
    <Beat
      id="review"
      number="07"
      title="The Review"
      claudeTag="multi-agent orchestration"
      headline="Three reviewers, one punch list."
    >
      <Body>
        <p>
          Pre-launch, a single accessibility pass wasn&apos;t going to
          catch everything that mattered. Accessibility is one lane;
          design cohesion is another; code maintainability is a third.
          Each requires a different lens and a different set of
          conventions to spot. So I built two more sub-agents — <Code>design-reviewer</Code> and{' '}
          <Code>code-reviewer</Code> — to sit alongside the a11y
          reviewer already in the agent harness, then wired the three
          up to run as a single orchestrated command.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="design-reviewer" title="Sensibility + cohesion">
          Reviews typography rhythm, spacing, color usage, sub-brand
          cohesion, iconography consistency, hierarchy, motion,
          responsive treatment, and editorial voice in UI copy.
          Operates against rendered surfaces when a dev server is
          available; falls back to code-and-token review when not.
          Stays out of a11y and code-refactor lanes by design.
        </IterationCard>
        <IterationCard lens="code-reviewer" title="Efficiency + structure">
          Reviews type safety, separation of concerns, naming, dead
          code and duplication, performance footguns, error handling
          at boundaries, React and Next.js patterns, async correctness,
          and bundle hygiene. Reads context around the diff, not just
          the touched lines. Stays out of a11y and visual-design lanes.
        </IterationCard>
        <IterationCard lens="a11y-reviewer" title="WCAG 2.2 AA">
          Already in the harness. Reviews semantic HTML, keyboard
          navigability, focus states, contrast in light + dark, alt
          text, ARIA usage, prefers-reduced-motion, form labeling,
          and target-size minimums. The veteran of the three.
        </IterationCard>
      </IterationGrid>

      <Body>
        <p>
          Each agent has a role spec at <Code>~/.claude/agents/{`<name>.md`}</Code>:
          checklist, output format, severity definitions, and an
          explicit <Emph>what NOT to do</Emph> section so the agents
          don&apos;t drift into each other&apos;s lanes. All three were
          standardized on a shared severity vocabulary — Critical,
          High, Medium, Low, plus a Couldn&apos;t-verify bucket — so a
          downstream orchestrator can merge their reports cleanly.
        </p>
      </Body>

      <ClaudeNote>
        The pattern that matters: each agent&apos;s role spec isn&apos;t
        just <Emph>what to do</Emph> — it&apos;s <Emph>what NOT to do</Emph>.
        The design reviewer explicitly defers a11y issues with a
        one-line mention and lets the a11y reviewer handle the detail.
        The code reviewer explicitly defers visual-design and a11y.
        That discipline keeps each report focused, and it&apos;s what
        makes the synthesis step possible — three overlapping reviews
        would be a mush, not a signal.
      </ClaudeNote>

      <Body>
        <p>
          The <Code>/full-review</Code> command ties them together. It
          establishes scope (current diff, or whatever the user named
          in the previous message), spawns all three reviewers in
          parallel, then synthesizes their reports into a single
          structured punch list. Two sections come first: <Emph>Conflicts</Emph> (where
          reviewers disagree on the same element — the user
          adjudicates), and <Emph>Aligned</Emph> (where two or more
          reviewers independently flag the same issue — high-confidence
          calls). After that, the standard severity buckets,
          exhaustive — no findings cap, since the user explicitly
          wanted everything reviewable surfaced rather than a curated
          top-N list.
        </p>
        <p>
          The first run, against the entire site in light + dark, came
          back with ninety-nine findings. One of them — a token-chain
          bug that silently invalidates the recruiter cluster&apos;s
          text colors — was independently flagged by both the design
          reviewer and the a11y reviewer at Critical severity. That&apos;s
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
          <Code>{`_design/reviews/full-review-<date>.html`}</Code>,
          with each finding as a card carrying severity, reviewer
          tags, file:line citation, description, and fix
          recommendation. Status dropdowns (Open / Done / Won&apos;t
          do) and severity dropdowns are wired to{' '}
          <Code>localStorage</Code>, so working through the list
          survives reloads. Filters on Status, Severity, and Reviewer
          cut the list to whatever slice you want to work in.
        </p>
        <p>
          The point isn&apos;t the dashboard. The point is that the
          review becomes load-bearing data — something to triage,
          manage, and check off — instead of a markdown file that
          gets read once and buried. Per the recursion lesson above,
          written notes don&apos;t drive behavior. A working surface
          does.
        </p>
      </Body>

      <ClaudeNote>
        Sub-agents and slash commands are loaded at session start in
        Claude Code. The first run of <Code>/full-review</Code> in
        the same session that birthed it had to bootstrap the new
        reviewers through the generic <Code>general-purpose</Code>{' '}
        agent reading their role files at runtime — same persona,
        just not native yet. After a session restart, they load
        directly. Worth knowing if you&apos;re authoring agents and
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
      title="What's Live"
      headline="What shipped, what got cut, what next."
    >
      <Body>
        <p>As of writing, the MVP is in the world.</p>
      </Body>

      <HarnessGrid>
        <HarnessFeature name="Landing">
          One CTA above the fold (&ldquo;See my resume →&rdquo;), with a
          conditional sub-brand matrix below for cultural-curious visitors.
        </HarnessFeature>
        <HarnessFeature name="Resume">
          Web-native recruiter resume with editorial typography, sticky
          TOC, company links in their actual brand colors, and a case-study
          card grid (this card included).
        </HarnessFeature>
        <HarnessFeature name="About">
          Senior PM positioning up top; the Creative CV (theater, studio
          art, hospitality, MS in Law) lives quietly inline below.
        </HarnessFeature>
        <HarnessFeature name="Contact">
          Inline Calendly widget for the recruiter booking flow, plus
          mailto and LinkedIn fallbacks.
        </HarnessFeature>
        <HarnessFeature name="Music">
          57 public Spotify playlists, sorted by most-recent track{" "}
          <Code>added_at</Code> as a proxy for last-edited (Spotify
          doesn&apos;t expose <Code>modified_at</Code>), with manual-pin
          override.
        </HarnessFeature>
        <HarnessFeature name="Case studies">
          Two articles in the cluster: the Basecamp Coffee turnaround and
          this meta study. Shared chrome, shared primitives, shared
          scroll-progress bar.
        </HarnessFeature>
      </HarnessGrid>

      <Body>
        <p>
          PM judgment is mostly about what <Emph>not</Emph> to ship. A
          short list of the cuts, with the reason next to each:
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Cut" title="shadcn/ui">
          Wrong vibe. The site&apos;s design language is editorial-retro
          (late-&apos;90s magazine × Beyoncé.com), not the clean SaaS
          shadcn aesthetic.
        </EvidenceCard>
        <EvidenceCard eyebrow="Cut" title="Headless CMS">
          Overkill at one author. MDX in repo with <Code>zod</Code>{" "}
          frontmatter validation is enough.
        </EvidenceCard>
        <EvidenceCard eyebrow="Cut" title="GSAP">
          Overkill for the small motion footprint. <Code>motion</Code> is
          enough, guarded by <Code>prefers-reduced-motion</Code>.
        </EvidenceCard>
        <EvidenceCard eyebrow="Cut" title="Newsletter / Film / TV / etc.">
          No content yet. Per the no-placeholder rule, they appear in nav
          and on landing the day they ship — not before.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>What I&apos;d do differently next time:</p>
        <ul className="m-0 pl-5 text-[17px] md:text-[19px] leading-[1.55] text-[var(--text-caption)] list-disc marker:text-[var(--text-caption)]">
          <li>
            <Emph>Start with rate-limiting on every third-party
            integration.</Emph> Not later. Day one.
          </li>
          <li>
            <Emph>Build a local fixture cache for dev.</Emph> Caching API
            responses to disk during dev would have prevented the
            rate-limit cascade entirely.
          </li>
          <li>
            <Emph>For critical UI primitives, hardcode the visual
            baseline.</Emph> Theme-aware components shouldn&apos;t depend
            on <Code>var()</Code> references that can fail silently.
          </li>
          <li>
            <Emph>Validate visual fixes against the deployed render
            before declaring done.</Emph> Computed-style or screenshot,
            not &ldquo;the code looks right.&rdquo;
          </li>
          <li>
            <Emph>Treat written postmortems as documentation, not as
            discipline.</Emph> Documentation and operational discipline
            are different artifacts; product teams need to invest in both.
          </li>
        </ul>
      </Body>

      <ClaudeNote>
        Source is on{" "}
        <Link href={SITE_REPO_HREF}>GitHub ↗</Link>. The Basecamp Coffee
        case study, the prototype it documents, and this meta study are
        all in the same repo, alongside the design tokens, the build
        scripts, and the writing-style guides Claude reads on every turn.
        If you&apos;re a recruiter who wants to see how the sausage is
        made, that&apos;s the address.
      </ClaudeNote>

      <Body>
        <p>
          And if you&apos;re hiring for a senior PM in media, publishing,
          or streaming, the resume is one click away — top-left of any
          page, or back to{" "}
          <Link href="/resume">Resume →</Link>. The case study is, as
          promised, the recursive artifact: documentation of the build,
          hosted on the build it documents.
        </p>
      </Body>
    </Beat>
  );
}
