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
// Story arc (10 beats, mirroring the Basecamp shape):
//   01 · The Brief        — three jobs, seven-day timebox
//   02 · The Workflow     — where I drove, where Claude drove
//   03 · The Architecture — the design-system + IA decisions
//   04 · The Spotify Story — incident #1: rate-limit and reshape
//   05 · The Button Bug    — incident #2: silent var() resolution
//   06 · The Recursion     — same bug class, week later, no excuse
//   07 · The Reinstall     — third recursion, different failure mode
//   08 · Two Resumes       — dual-output craft, ATS + web
//   09 · The Review        — three reviewers, one punch list, 49% reveal
//   10 · What's Live       — current state, cuts, and what next
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
  { href: "#reinstall", prefix: "07", label: "The Reinstall" },
  { href: "#resumes", prefix: "08", label: "Two Resumes" },
  { href: "#review", prefix: "09", label: "The Review" },
  { href: "#live", prefix: "10", label: "What's Live" },
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
        <BeatReinstall />
        <BeatSeparator />
        <BeatResumes />
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
      title="An AI-Native Portfolio"
      subtitle="Built brick by brick, just like my FYP"
      readMin={16}
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
          deck. What you're viewing <Emph>is</Emph> the proof.
        </EvidenceCard>
        <EvidenceCard eyebrow="Job 03" title="Re-introduce my creative side">
          A centralized home for my playlists, reviews, and other creative work.
          Some may come to my site just for this, but it operates in concert with
          my professional work.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          This site has a wide scope, and more is coming soon. I deliberately scoped MVP down to five pages—{" "}
          <Emph>Landing, Resume, About, Contact, Music</Emph>—with
          everything else I'm working on gated behind a no-public-placeholders rule. Day 4
          was my deadline for a shippable MVP; Days 5 through
          7 were for polish and stretch goals.
        </p>
      </Body>

      <ClaudeNote>
        Plan mode at session start, every session. The deadline held even
        when Music slid a day on the Spotify incident—buffer days exist
        for exactly that, and a clear deadline forced scope decisionining rather than a crisis.
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
          mine. The interesting part—and the part recruiters keep asking
          about—is what that division of labor actually looks like in
          practice.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="The human in the loop" title="Where I drove">
          Information architecture and brand voice. Decision-quality reviews
          when the agent picked a fork I&apos;d have picked differently.
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
          can&apos;t develop taste; a PM can&apos;t always articulate it.
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
          I&apos;d review, redirect, and redline. The total build time was a
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
          an AI "second brain" for all my work.
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
          it together are quieter, and they&apos;re the part worth
          flagging for anyone reading the source.
        </p>
      </Body>

      <IterationGrid>
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
          title="Recruiter-first, exploration-second"
        >
          Landing elevates exactly one CTA—&ldquo;See my resume →&rdquo;.
          Below that, a conditional sub-brand matrix lets cultural-curious
          visitors explore (today, just Music; the rest of the matrix
          unlocks the day each sub-brand ships, per the no-placeholders
          rule above). Two audiences served, each with the surface area
          they actually need, without diluting the primary call to action.
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
          November 2024—including the user-playlists endpoint that
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
          57 playlists in parallel as I was working with Claude
          to understand how to curate that list for the site. Multiple back-to-back bursts
          during dev triggered the rate limiter, then an escalated
          cool-down. At one point Spotify&apos;s <Code>Retry-After</Code>{" "}
          returned <Emph>77,368 seconds</Emph>—about 21 hours.
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
          should slip into the buffer, not push out the deadline. Music
          slid one day; the rest of the week absorbed it.
        </p>
        <p>
          A subtler discovery after the fact: Spotify rate-limits per
          endpoint family, not per app. A clear <Code>/me</Code> bucket
          doesn&apos;t mean a clear <Code>/me/playlists</Code> bucket. I
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
          light mode and a filled white pill in dark mode—the
          recruiter&apos;s eye anchor. It rendered as an outlined
          transparent pill in both modes. Text labels correct. Click
          targets correct. Layout fine. Just no fill.
        </p>
        <p>
          What followed was a four-round debugging session. The agent
          generated plausible hypotheses about CSS specificity, layer
          ordering, and shorthand-vs-longhand parsing quirks. Each round
          produced a different syntactic fix for what was effectively the
          same code path—inline styles, then Tailwind utilities, then
          unlayered CSS with <Code>!important</Code> and elaborate{" "}
          <Code>{`[data-variant="primary"]`}</Code> selectors. None of it
          worked.
        </p>
        <p>
          The actual bug was that <Code>var(--text-heading)</Code> was
          silently resolving to nothing at the button element specifically,
          despite cascading correctly to body, paragraphs, and other
          elements on the same page. When <Code>var()</Code> fails to
          resolve, the browser doesn&apos;t error—the property silently
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
          agent in that loop is a critical PM skill that I would argue
          requires some level of{" "}
          <Link href="https://www.linkedin.com/pulse/technically-speaking-malcolm-xavier-nsf3c">
            technical expertise ↗
          </Link>
          .
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
          A week later, re-building the{" "}
          <Link href="/case-studies/basecamp-coffee">
            Basecamp Coffee case study
          </Link>{" "}
          chrome on <Code>/case-studies/basecamp-coffee</Code>: a 1px
          scroll-progress bar anchored to the bottom of the Nav.
          Conceptually a 50-line CSS change. Took{" "}
          <Emph>15 commits and an evening</Emph> of escalating frustration
          with the agent to land the right state.
        </p>
        <p>
          Eventually traced: <Code>--surface-page</Code> resolves to{" "}
          <Emph>empty</Emph> on recruiter-cluster pages because{" "}
          <Code>--neutral-white</Code> and <Code>--neutral-black</Code> are
          only defined inside <Code>{`[data-subbrand]`}</Code> blocks at{" "}
          <Code>:root</Code>—not at the recruiter cluster&apos;s root.
          Every <Code>color-mix(... var(--surface-page))</Code> was
          silently invalidating. The page still <Emph>looked</Emph>{" "}
          right because Chrome&apos;s canvas defaults paint the page bg. Same
          class of bug as the button. Same silent fallback masking the
          diagnosis.
        </p>
      </Body>

      <Pullquote attribution="the more interesting PM artifact">
        Memory <span className="math-op">≠</span> discipline.
      </Pullquote>

      <Body>
        <p>
          Here&apos;s the part worth sitting with: I had a written memory
          note from the button bug describing exactly this pattern.{" "}
          <Emph>The memory existed. It wasn&apos;t operationalized.</Emph>{" "}
          The 15-commit saga happened anyway. Written documentation of a
          lesson is not the same as operational discipline around it.
          Writing the postmortem feels like resolution. Carrying it into
          the next session <Emph>is</Emph>{" "}the resolution. Almost every
          product org I&apos;ve worked in conflates the two. That's a human
          behavior that an AI-native system will pick up if you're not careful.
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

// ─── Beat 7 — The Reinstall ───────────────────────────────────
// Third instance of the recursion class — but a different failure
// mode than 05/06. Button bug + progress bar were both "agent
// iterates on syntactic refinements"; this one is "agent's
// internally-consistent narrative drives a real-world action that
// touches global state." Earned its own beat for that reason.
//
// Source: commit 05137a6 ("Pin Node 24, document the dev-server-
// hang diagnosis recursion") + sketch notes in case-studies/
// building-this-site.md ("the dev server that wouldn't compile").
function BeatReinstall() {
  return (
    <Beat
      id="reinstall"
      number="07"
      title="The Reinstall"
      claudeTag="diagnosis hygiene"
      headline="The agent's hypothesis was a perfectly coherent novel."
    >
      <Body>
        <p>
          A week deeper into the build, mid-audit, the local dev server
          stopped compiling pages. Boot was instant. Static assets
          served fine in milliseconds. Every dynamic-route request
          stalled forever on <Code>Compiling /</Code>—no progress, no
          error, no exception in the log. Production at malxavi.com
          rendered cleanly. Local-only.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard
          eyebrow="The wrong diagnosis"
          title="A perfectly coherent novel"
        >
          A <Code>sample</Code> profile showed the Node main thread
          parked in <Code>kevent</Code>, Tailwind oxide rayon workers
          idle, zero CPU, zero outbound network. Read like an ABI
          deadlock between Node 25 (non-LTS) and a Rust-backed native
          module in the compile pipeline. Specific. Coherent. Rhymed
          with prior knowledge. Wrong.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="The high-cost action"
          title="Brew, link, rebuild—still hung"
        >
          On the strength of that diagnosis: brew-install Node 24 LTS,{" "}
          <Code>brew link --force --overwrite</Code> the global default,{" "}
          <Code>npm rebuild</Code> to relink native binaries against
          ABI 137. A real change to global state on the user&apos;s
          machine. Restarted dev. Still hung, identically.
        </EvidenceCard>
        <EvidenceCard
          eyebrow="The cheap test"
          title="A 90-second falsification"
        >
          Bootstrapped a bare-metal Next.js 16 app in{" "}
          <Code>/tmp/next-min-test/</Code>: ten lines of code, ninety
          seconds to set up. Compiled <Code>/</Code> in three seconds
          on the same Node 24.{" "}
          <Emph>Project-specific, not Node-specific.</Emph> The actual
          fix:{" "}
          <Code>{`rm -rf node_modules package-lock.json && npm install`}</Code>.
          Two minutes.
        </EvidenceCard>
      </EvidenceGrid>

      <Pullquote attribution="the failure mode that travels">
        The agent constructs internally-consistent narratives faster
        than it falsifies them.
      </Pullquote>

      <Body>
        <p>
          The button bug was four rounds of syntactic refinement. The
          progress-bar saga was fifteen commits of selector tweaks.
          Both were the same failure mode at different magnification.
          This was a different failure mode entirely:{" "}
          <Emph>
            executing a real-world action against a wrong hypothesis.
          </Emph>{" "}
          Installing software, swapping the default Node, modifying
          global state on the user&apos;s machine. Mildly disruptive
          to roll back. Easy to skip the falsification step because
          the narrative was so coherent—the clues fit a perfectly
          ordered detective novel that just wasn&apos;t the actual
          one.
        </p>
      </Body>

      <ClaudeNote>
        The operational rule that came out of it now sits in{" "}
        <Code>~/.claude/</Code>: before approving any agent-proposed
        fix that touches global state—installing software, swapping
        the default runtime, editing <Code>~/.zshrc</Code>—the gate
        is the cheapest test that would falsify the diagnosis. For
        infra-flavored bugs, that&apos;s almost always &ldquo;bootstrap a
        minimal repro and see if it reproduces.&rdquo; Same gate I&apos;d
        apply to a junior PM proposing a vendor escalation. AI agents
        will keep generating internally-consistent hypotheses; the PM
        job is to demand the binary test before the destructive
        commit.
      </ClaudeNote>

      <Body>
        <p>
          What got committed off the back of it:{" "}
          <Code>engines.node</Code> pinned to{" "}
          <Code>{`">=22 <26"`}</Code> in <Code>package.json</Code> so
          a future Node major bump trips a clear warning before it
          corrupts local state, and a <Code>.nvmrc</Code> pinned to{" "}
          <Code>24</Code> so anyone with <Code>nvm</Code> or{" "}
          <Code>fnm</Code> auto-switches into a supported version when
          they <Code>cd</Code> into the project. Two lines of
          guardrail. Retroactive but durable.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 8 — Two Resumes ─────────────────────────────────────
// PM-craft showcase that counterweights the incident-cluster.
// Sourced from the "Two resumes, one source of truth (almost)"
// section of case-studies/building-this-site.md, which had been
// drafted but not yet ported to the rendered page.
function BeatResumes() {
  return (
    <Beat
      id="resumes"
      number="08"
      title="Two Resumes"
      claudeTag="dual-output craft"
      headline="One source of truth (almost)."
    >
      <Body>
        <p>
          The <Code>/resume</Code> page on this site is built for
          recruiters: scannable, web-native, theme-aware, and lives
          inside the same design system as everything else. It&apos;s
          not, however, what gets emailed to a hiring manager or
          uploaded to a Workday portal. That artifact has to survive
          ATS extraction—single column, no tables, no fancy
          typography, ideally tailored to the specific posting before
          submission. Two reading contexts, two editorial decisions,
          one person.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="Web resume" title="Editorial, browseable">
          Rendered in Instrument Serif and DM Sans, with company links
          in their actual brand colors, a sticky TOC for desktop, and
          a case-study card grid. Trinity College stays. Independent
          Consulting keeps three sub-bullets. The audience is browsing,
          not scanning. Source lives in{" "}
          <Code>app/resume/resume-data.tsx</Code>—a <Code>.tsx</Code>{" "}
          file because some bullets embed inline JSX links.
        </IterationCard>
        <IterationCard lens=".docx template" title="ATS-shaped, tailorable">
          Generated from a Node script (
          <Code>scripts/build-resume-docx.mjs</Code>, using the{" "}
          <Code>docx</Code> package). Intended workflow: upload to
          Drive → open as Doc → make a copy → tailor for the
          application → download → PDF. Trinity drops. Independent
          Consulting collapses to a one-liner with inline links. Same
          person, scanning context, tighter editorial.
        </IterationCard>
      </IterationGrid>

      <Body>
        <p>
          The dual-output isn&apos;t a shared source of truth. The web
          copy is JSX; the script runs in Node and hardcodes its own
          copy. Bridging them would mean a TS compiler step plus a
          React-element walker for an artifact regenerated maybe once
          a month. I accepted dual source of truth here, with a
          comment at the top of each file pointing at the other.
          Pragmatism beats purity when the cost of the abstraction
          exceeds the cost of the duplication.
        </p>
      </Body>

      <Pullquote attribution="the small-detail rule">
        Brand-craft is mostly the details no one&apos;s supposed to
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
            <Emph>Friendly link labels.</Emph>{" "}
            &ldquo;LinkedIn · GitHub · Personal Website&rdquo; instead
            of bare URLs in the contact strip. Easier to scan, less
            visual noise, the underlying hyperlink still resolves.
          </li>
          <li>
            <Emph>
              Company URLs match each company&apos;s actual canonical hostname.
            </Emph>{" "}
            People Inc., Muck Rack, GitHub, and Calendly canonicalize
            to apex (no <Code>www.</Code>); LinkedIn, User Interviews,
            Fullstack Academy, Fractured Atlas, Artist Growth, and
            NEFA canonicalize to <Code>www.</Code>. Matching each
            site&apos;s canonical avoids a 301 redirect hop when the
            link is clicked. Approximately zero recruiter value, and
            a non-zero number of senior engineers will notice.
          </li>
        </ul>
      </Body>

      <ClaudeNote>
        The dual-artifact structure is also a small ship-and-flag
        bet: the web resume is the primary recruiter surface today
        because the link is pre-tailored. The <Code>.docx</Code> is
        the path of least resistance the moment an application asks
        for a file. If recruiter feedback ever says the web resume
        isn&apos;t getting clicked, the <Code>.docx</Code> becomes
        the lead artifact and the web version becomes the deeper-cut
        companion. Same source material, different distribution.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 9 — The Review ──────────────────────────────────────
function BeatReview() {
  return (
    <Beat
      id="review"
      number="09"
      title="The Review"
      claudeTag="multi-agent orchestration"
      headline="Three reviewers, one punch list, one humbling number."
    >
      <Body>
        <p>
          Pre-launch, a single accessibility pass wasn&apos;t going to
          catch everything that mattered. Accessibility is one lane;
          design cohesion is another; code maintainability is a third.
          Each requires a different lens and a different set of
          conventions to spot. So I built two more sub-agents—<Code>design-reviewer</Code> and{' '}
          <Code>code-reviewer</Code>—to sit alongside the a11y
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
          explicit <Emph>what NOT to do</Emph>{" "}section so the agents
          don&apos;t drift into each other&apos;s lanes. All three were
          standardized on a shared severity vocabulary—Critical,
          High, Medium, Low, plus a Couldn&apos;t-verify bucket—so a
          downstream orchestrator can merge their reports cleanly.
        </p>
      </Body>

      <ClaudeNote>
        The pattern that matters: each agent&apos;s role spec isn&apos;t
        just <Emph>what to do</Emph>—it&apos;s <Emph>what NOT to do</Emph>.
        The design reviewer explicitly defers a11y issues with a
        one-line mention and lets the a11y reviewer handle the detail.
        The code reviewer explicitly defers visual-design and a11y.
        That discipline keeps each report focused, and it&apos;s what
        makes the synthesis step possible—three overlapping reviews
        would be a mush, not a signal.
      </ClaudeNote>

      <Body>
        <p>
          The <Code>/full-review</Code> command ties them together. It
          establishes scope (current diff, or whatever the user named
          in the previous message), spawns all three reviewers in
          parallel, then synthesizes their reports into a single
          structured punch list. Two sections come first: <Emph>Conflicts</Emph> (where
          reviewers disagree on the same element—the user
          adjudicates), and <Emph>Aligned</Emph> (where two or more
          reviewers independently flag the same issue—high-confidence
          calls). After that, the standard severity buckets,
          exhaustive—no findings cap, since the user explicitly
          wanted everything reviewable surfaced rather than a curated
          top-N list.
        </p>
        <p>
          The first run, against the entire site in light + dark, came
          back with ninety-nine findings. One of them—a token-chain
          bug that silently invalidates the recruiter cluster&apos;s
          text colors—was independently flagged by both the design
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
          review becomes load-bearing data—something to triage,
          manage, and check off—instead of a markdown file that
          gets read once and buried. Per the recursion lesson above,
          written notes don&apos;t drive behavior. A working surface
          does.
        </p>
      </Body>

      <Body>
        <p>
          A day after the first run, with the audit-closeout commits
          landed, I ran <Code>/full-review</Code> a second time on
          the closeout work itself. It surfaced 35 substantive new
          findings—six items the first pass had missed, twelve
          tradeoff costs of choices I&apos;d made knowingly, and{" "}
          <Emph>seventeen regressions in code we&apos;d just written</Emph>.
          Forty-nine percent of the new findings were brand-new bugs
          introduced while fixing other bugs.
        </p>
        <p>
          The reflection on the missed-six was the more humbling
          number. Five of the six were variations on a single failure
          mode: we&apos;d audited the trigger of a fix, not the family
          the bug belonged to. The original{" "}
          <Code>--text-action</Code> contrast fix landed for the
          components we&apos;d noticed but missed PaginationButton
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
          caption="Of 35 new findings on the audit-closeout commits, 17 were regressions in code we'd just written."
        />
        <Stat
          big="5 of 6"
          eyebrow="Sibling-bug discoveries"
          caption="Of the pre-existing items the first pass missed, 5 were variations on a single failure family the original fix didn't sweep for."
        />
      </StatRow>

      <Body>
        <p>
          Both lessons now sit in <Code>AGENTS.md</Code> at the repo
          root, where any agent working in the codebase reads them
          before writing the next fix:{" "}
          <Emph>catch regressions during the change, not in the next audit</Emph>{" "}
          (three failure-mode checks before declaring done—error
          paths for new scripts, breakpoint pass for UI, consumer
          grep for shared logic), and{" "}
          <Emph>when fixing a class of bug, audit the whole class</Emph>{" "}
          (name the abstraction, grep every consumer, verify each
          under the same conditions). Per the recursion lesson three
          beats up: written documentation isn&apos;t operational
          discipline. The repo-level rule is the discipline; the
          markdown is the documentation. Both, not one.
        </p>
      </Body>

      <ClaudeNote>
        Sub-agents and slash commands are loaded at session start in
        Claude Code. The first run of <Code>/full-review</Code> in
        the same session that birthed it had to bootstrap the new
        reviewers through the generic <Code>general-purpose</Code>{' '}
        agent reading their role files at runtime—same persona,
        just not native yet. After a session restart, they load
        directly. Worth knowing if you&apos;re authoring agents and
        trying them in the same conversation.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 10 — What's Live ────────────────────────────────────
function BeatLive() {
  return (
    <Beat
      id="live"
      number="10"
      title="What's Live"
      headline="What shipped, what got cut, what next."
    >
      <Body>
        <p>
          As of writing, the MVP is live at{" "}
          <Link href="https://malxavi.com">malxavi.com ↗</Link>, gated
          behind a Basic Auth proxy while the site is in
          building-in-public mode. Two audit cycles deep, with the
          regressions and class-audit lessons captured as repo-level
          rules so the next agent doesn&apos;t earn the same ones.
        </p>
      </Body>

      <HarnessGrid>
        <HarnessFeature name="Landing">
          One CTA above the fold (&ldquo;See my resume →&rdquo;), with a
          conditional sub-brand matrix below for cultural-curious visitors.
        </HarnessFeature>
        <HarnessFeature name="Resume">
          Web-native recruiter resume with editorial typography, sticky
          TOC, company links in their actual brand colors, and a case-study
          card grid (this card included). Plus a <Code>.docx</Code>{" "}
          template for ATS submissions, generated from the same
          editorial decisions.
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
          override and an{" "}
          <Code>/api/spotify/health</Code> probe for per-bucket
          rate-limit diagnostics.
        </HarnessFeature>
        <HarnessFeature name="Case studies">
          Two articles in the cluster: the Basecamp Coffee turnaround and
          this meta study. Shared chrome, shared primitives, shared
          scroll-progress bar.
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
          dashboard at <Code>{`_design/reviews/`}</Code> that triages,
          filters, and tracks each finding to closure.
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
          and on landing the day they ship—not before.
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
            baseline.</Emph>{" "}Theme-aware components shouldn&apos;t depend
            on <Code>var()</Code> references that can fail silently.
          </li>
          <li>
            <Emph>Validate visual fixes against the deployed render
            before declaring done.</Emph>{" "}Computed-style or screenshot,
            not &ldquo;the code looks right.&rdquo;
          </li>
          <li>
            <Emph>Audit the family, not the trigger.</Emph> Bugs
            rarely live alone. A 60-second class-audit before
            declaring the fix done catches sibling bugs before the
            next reviewer does—and avoids the 49% regression rate I
            paid for skipping it.
          </li>
          <li>
            <Emph>Gate high-cost agent-proposed actions on
            cheap-binary tests first.</Emph>{" "}Anything touching global
            state needs a 90-second falsification before the
            destructive commit. Same gate I&apos;d apply to a junior
            PM proposing a vendor escalation.
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
          or streaming, the resume is one click away—top-left of any
          page, or back to{" "}
          <Link href="/resume">Resume →</Link>. The case study is, as
          promised, the recursive artifact: documentation of the build,
          hosted on the build it documents.
        </p>
      </Body>
    </Beat>
  );
}
