// /case-studies/people-inc — work-experience case-study page.
// Authored 2026-05-23. Driving narrative: reshaping a newsletter-
// migration mandate at a 40+ brand publisher into a multi-year
// roadmap for identity, registration, and onboarding — co-shipping
// surfaces, capabilities, and growth programs on a pilot-to-network
// rollout cadence.
//
// Editorial posture mirrors the Muck Rack study: first-person past-
// tense, peer-to-peer, candid about org dynamics but neutral on
// tone (no swipes). NDA-conservative on internals — defensible
// numbers only, measurement windows omitted per the case-study
// measurement-window rule. Brand names within People Inc. (Travel +
// Leisure, Food & Wine, Entertainment Weekly, People) are public and
// named plainly; commercial vendors (Digioh, Iterable, Hightouch,
// Looker) follow the Muck Rack precedent for naming.

import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import {
  CONTACT,
  rolesReferencingCaseStudy,
  slugifyRoleAnchor,
} from "@/app/resume/resume-data";
import type { TocItem } from "@/components/chrome/TableOfContents";
import { CaseStudyTocRail } from "@/components/case-study/CaseStudyTocRail";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import { CaseStudyHero } from "@/components/case-study/Hero";
import { CaseStudyNav } from "@/components/case-study/CaseStudyNav";
import {
  Beat,
  BeatSeparator,
  Body,
  CaseStudyKicker,
  ClaudeNote,
  Code,
  Emph,
  EvidenceCard,
  EvidenceGrid,
  IterationCard,
  IterationGrid,
  Stat,
  StatRow,
} from "@/components/case-study/primitives";
import { TierColumn } from "./tier-column";

// SLUG must match the layout's SLUG and the CASE_STUDIES entry in
// app/resume/resume-data.tsx (also referenced via the People Inc.
// role's relatedCaseStudies). The slug-integrity assertion in
// resume-data throws at module-load if any of those drift.

const SLUG = "people-inc";
const EMPLOYER = "People Inc.";

// Resolve the resume-side role this case study attributes to. If the
// matching ResumeRole has `relatedCaseStudies` including SLUG, the
// hero kicker deep-links to that role's anchor on /resume; otherwise
// it falls back to the resume's work-experience section.
const RELATED_ROLE = rolesReferencingCaseStudy(SLUG)[0];
const ROLE_BACKLINK_HREF = RELATED_ROLE
  ? `/resume#${slugifyRoleAnchor(RELATED_ROLE)}`
  : "/resume#work-experience";
const ROLE_BACKLINK_LABEL = RELATED_ROLE
  ? `From my time at ${EMPLOYER} · ${RELATED_ROLE.title}`
  : `From my time at ${EMPLOYER}`;

// ─── TOC ──────────────────────────────────────────────────────────
// Beat ids match the `id` prop on each <Beat> below. "↑ Top" anchors
// to #intro (CaseStudyHero's default section id), matching the
// convention used by the other case studies on the site.

const TOC_ITEMS: TocItem[] = [
  // Labels are value claims, not method nouns — see
  // pi-c-toc-method-nouns in the 2026-05-30 /full-review tracker.
  // Section anchors (#context, #opportunity, etc.) unchanged so deep
  // links still resolve.
  { href: "#intro", label: "↑ Top" },
  { href: "#context", prefix: "01", label: "Post-merger personalization" },
  { href: "#opportunity", prefix: "02", label: "Missing identity" },
  { href: "#discovery", prefix: "03", label: "Modelling the gap" },
  { href: "#strategy", prefix: "04", label: "Three-tier bet" },
  { href: "#zero-to-one", prefix: "05", label: "Foundations" },
  { href: "#one-to-n", prefix: "06", label: "Follow This Topic" },
  { href: "#outcomes", prefix: "07", label: "33% YoY and playbook" },
  { href: "#reflection", prefix: "08", label: "Infrastructure thesis" },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function PeopleIncCaseStudy() {
  return (
    <>
      <ScrollProgress />

      {/* `relative` establishes the positioning context the xl+ TOC
          rail uses to bound its sticky child to the article's vertical
          extent. Without it the rail would anchor higher up and slip
          past the article's bottom into the footer. */}
      <div className="relative lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:block">
        {/* Dual-mode TOC rail. xl+ uses position: sticky inside an
            absolutely-positioned column; lg-but-not-xl uses sticky
            inside the grid column. Both clamp naturally to the
            article's bottom. */}
        <CaseStudyTocRail items={TOC_ITEMS} ariaLabel="Article sections" />
        <article>
          <Hero />
          <BeatSeparator />
          <BeatContext />
          <BeatSeparator />
          <BeatOpportunity />
          <BeatSeparator />
          <BeatDiscovery />
          <BeatSeparator />
          <BeatStrategy />
          <BeatSeparator />
          <BeatZeroToOne />
          <BeatSeparator />
          <BeatOneToN />
          <BeatSeparator />
          <BeatOutcomes />
          <BeatSeparator />
          <BeatReflection />
          <CaseStudyNav currentSlug={SLUG} />
        </article>
      </div>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────
// Four-sentence lede frames the bet: the institutional strategy, the
// structural gap underneath it, the work that closed the gap, and a
// punchy closer that returns as Reflection's headline. Two role-level
// stats (network scale + headline YoY) land in the lede; program-level
// numbers stay in Outcomes. See
// feedback_hero_stats_scale_with_seniority for the rule.

function Hero() {
  return (
    <CaseStudyHero
      title="Infrastructure enables personalization"
      subtitle="Driving a multi-year roadmap for identity, registration, and onboarding"
      readMin={9}
      updatedDate="May 23, 2026"
    >
      {/* Resume backlink kicker. Subtle, reads as editorial chrome,
          closes the loop with the per-role footer link on /resume.
          Rendered as a <span style={{display:'block'}}> because
          CaseStudyHero wraps its children in a <p> and nested <p> is
          invalid HTML — the browser silently closes the outer
          paragraph, severing the kicker from the lede. Wrapped in
          TrackOnClick so the cross-link loop (case study → resume
          role anchor) is instrumented; the paired direction (resume
          role → case study) is wrapped on the resume side. */}
      <span style={{ display: "block", marginBottom: "var(--scale-300)", fontSize: "var(--p-xs-font-size)", color: "var(--text-caption)", fontFamily: "var(--font-mono)" }}>
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: "case-study-people-inc-hero-kicker", destination: "resume" }}
        >
          <Link href={ROLE_BACKLINK_HREF} quiet>{ROLE_BACKLINK_LABEL}</Link>
        </TrackOnClick>
      </span>
      Personalization was the strategy. Identity was the missing
      layer. People Inc.’s core hypothesis was that directly-owned user
      relationships would beat reliance on search and social referrals.
      However, there was a structural gap that prevented testing of that hypothesis:
      the network of 40+ brands and 22M+ users had no standard user-account experience and was running
      per-newsletter acquisition against a Customer Data Platform whose
      signals never reached the product. My nearly two years at People Inc.
      as senior PM for audience relationships meant{" "}
      <Emph roman>translating that gap into infrastructural bets leadership would buy
      into</Emph>—surfaces, capabilities, and growth programs built in lockstep on a
      pilot-to-network rollout cadence, with a multi-year identity, registration, and onboarding
      roadmap stewarded behind them. Across that arc, the
      network grew email revenue 33% year-over-year.
    </CaseStudyHero>
  );
}

// ─── Beat 01 — Context ────────────────────────────────────────────
// Sets the room: the post-merger publisher, the role I was hired
// into, and the team shape I operated against. The reshape moment
// (the mid-tenure restructuring that accelerated the role's shift
// from execution to influence) is named factually because the case
// study's narrative arc depends on it; the framing stays neutral
// and the craft — driving the same outcomes with less resource — is
// what carries forward into the beats that follow.

function BeatContext() {
  return (
    <Beat
      id="context"
      number="01"
      title="Context"
      headline="A 40+ brand publisher with a directly-owned-audience thesis and no identity layer."
    >
      <Body>
        <p>
          People Inc. is “America’s largest publisher”—the
          consolidated entity formed when Dotdash and Meredith merged under IAC,
          since renamed from Dotdash Meredith. During my tenure from early 2024 to late 2025, the network spanned
          40+ brands and 22M+ users, with editorial properties ranging
          from People and Entertainment Weekly to Travel + Leisure,
          Food & Wine, Allrecipes, and Investopedia, to name a few.
          I was hired into the product organization as senior PM for
          audience relationships. The written mandate was newsletter
          migration work: moving the network’s newsletter and
          sweepstakes experiences onto a shared MarTech stack as part
          of the post-merger consolidation. The implicit mandate was that
          I was being trusted to develop and drive the broader growth
          vision—and the early days of the role were spent
          pitching that vision consistently until it became the actual
          shape of the work.
        </p>
        <p>
          The platform I walked into shaped the work that followed.
          The Overlay was the foundational onsite marketing surface
          across the network—an engagement-triggered modal that
          served a generic newsletter signup offer—and it ran on{" "}
          <Code>Digioh</Code>, the marketing tool that read the rendered
          DOM for targeting. Acquisition was per-newsletter, with no
          concept of a user account underneath; the CDP existed
          alongside it, surfacing behavioral patterns into analytics.
          The marketing organization owned a roadmap of
          newsletter launches queued against the migration, and that
          roadmap was the explicit deliverable I was hired against. Executing
          the vision, however, required a broader product roadmap.
        </p>
        <p>
          I co-owned growth programs with marketing and product leadership; that was my primary team.
          I worked daily with my VP, a VP of audience development, and several marketing directors who
          each owned a part of the lifecycle: conversion, retention,
          operations, and platform. My product team included a tech lead, manual and automated QA,
          and three engineers, plus access to a platform designer
          on a project-by-project basis (I mostly delegated user research to
          her and mentored her as she refined her skills in this area).
          Every other partner—data
          science, data operations, design operations, brand product teams, editorial leadership,
          privacy, and legal (again, to name a few)—sat fully on another team and
          contributed to my team’s work as a result of my influence. Roughly halfway through
          my tenure, a restructuring shifted my reporting
          line, reset the team’s resourcing, and reinforced the
          commitment to my vision for audience and engagement growth. Between Q4 2024 and Q1
          2025 the role moved from executing a backlog of marketing
          projects to driving a multi-year roadmap for identity,
          registration, and onboarding.
        </p>
      </Body>

      {/* Team-relationship table. Stacked-band layout with three
          labeled tiers — primary team (marketing + VPs), product
          team (the day-to-day product collaborators), and scope of
          influence (cross-team partners). Built as a semantic <dl>
          so screen-reader navigation hits each tier as a labeled
          definition pair; div-wrapping each dt/dd pair is HTML5-
          valid and lets the flex layout work without breaking the
          list semantics. */}
      <section aria-labelledby="teams-visual-heading" className="my-10 md:my-12">
        <CaseStudyKicker as="h3" id="teams-visual-heading" className="mb-4">
          The teams I worked with
        </CaseStudyKicker>
        <dl className="case-glass m-0 rounded-[22px] border border-[var(--border-default)] overflow-hidden">
          {/* Tier 01 — primary team (marketing + VPs) */}
          <div className="p-5 md:p-6 border-b border-[var(--border-default)] flex flex-col md:flex-row md:items-baseline md:gap-6">
            <dt className="md:w-48 shrink-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
                01 &middot; Primary team
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-caption)]">
                Co-owned growth programs
              </div>
            </dt>
            <dd className="m-0 mt-3 md:mt-0 text-[15px] md:text-[16px] leading-[1.55] text-[var(--text-body)]">
              VP, product
              {" · "}VP, audience development
              {" · "}Director, conversion
              {" · "}Director, retention
              {" · "}Director, operations
              {" · "}Director, platform
            </dd>
          </div>

          {/* Tier 02 — product team (day-to-day collaborators) */}
          <div className="p-5 md:p-6 border-b border-[var(--border-default)] flex flex-col md:flex-row md:items-baseline md:gap-6">
            <dt className="md:w-48 shrink-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
                02 &middot; Product team
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-caption)]">
                Enabled growth surfaces and capabilities
              </div>
            </dt>
            <dd className="m-0 mt-3 md:mt-0 text-[15px] md:text-[16px] leading-[1.55] text-[var(--text-body)]">
              Tech lead
              {" · "}3 engineers
              {" · "}QA (manual + automated)
              {" · "}Platform designer (project basis)
            </dd>
          </div>

          {/* Tier 03 — scope of influence (cross-team partners) */}
          <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-baseline md:gap-6">
            <dt className="md:w-48 shrink-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
                03 &middot; Scope of influence
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-caption)]">
                Sat on other teams, contributed to my team’s work
              </div>
            </dt>
            <dd className="m-0 mt-3 md:mt-0 text-[15px] md:text-[16px] leading-[1.55] text-[var(--text-body)]">
              Data operations
              {" · "}Data science
              {" · "}Brand product teams
              {" · "}Editorial leadership
              {" · "}Design operations
              {" · "}CMS
              {" · "}SEO
              {" · "}Privacy product team
              {" · "}Legal
            </dd>
          </div>
        </dl>
      </section>
    </Beat>
  );
}

// ─── Beat 02 — Opportunity ────────────────────────────────────────
// Names the prevailing thesis ("jumping the wall") and the
// under-the-symptom gap (no identity layer means no real
// personalization). The user-experience reality (20+ emails/day,
// signup offers ignorant of existing subscriptions) makes the
// reframe concrete. The second-order observation — that marketing
// under-resourcing became visible once product delivery became
// predictable — is the case study's secondary diagnostic and is
// surfaced here as the dual lens leadership couldn't yet see.

function BeatOpportunity() {
  return (
    <Beat
      id="opportunity"
      number="02"
      title="Opportunity"
      headline="Leadership wanted personalization. The network had no identity layer underneath it."
    >
      <Body>
        <p>
          The institutional rallying cry was{" "}
          <Emph>“jumping the wall”</Emph>—the bet
          that the brands’ sites should become destinations on
          their own terms, with directly-owned relationships that
          didn’t depend on Google referrals or social platforms
          surfacing the content. SEO and the emerging GEO (generative
          engine optimization) layer still mattered, but newsletters
          carried a different kind of weight in this thesis: the inbox
          was framed as a rarefied, sacred space—a directly-owned
          channel to the user that the platforms in between couldn’t
          intermediate. Niche, topical content and personalization were
          the long-arc vision; the organization was bullish on both.
        </p>
        <p>
          What leadership couldn’t see was the infrastructure that
          vision required. The CDP’s behavioral signals lived in
          analytics; they never reached the product or the newsletter
          experience in a way that could shape what a given user saw
          next. The theory of change—personalize the site
          experience, drive time on site, lift ad revenue—was
          correct. The gap was that modern personalization runs on
          user-account infrastructure and user-controlled account
          management, and the network’s platform had neither. The vision was
          right; the infrastructure shape underneath it didn’t exist.
        </p>
        <p>
          The reality on the user side made the gap concrete. A
          subscriber to the People News newsletter received 20+
          editorialized emails a day, with no underlying capability
          to personalize what arrived when. On site, the newsletter
          signup units that popped up never acknowledged whether the
          user was already subscribed; you could be offered a
          newsletter you’d signed up for the week before, and the
          signup flow itself wouldn’t confirm what you already had.
          The qualitative truth was widely known across the
          organization. What was missing was a clear, quant-driven roadmap
          of solutions that leadership could buy into.
        </p>
        <p>
          An additional gap sat underneath, almost undetected: marketing capacity. I surfaced
          it continuously, and together with the identity
          infrastructure gap it became the opportunity space I delivered
          within. My work was not only about delivering surfaces, capabilities, and programs,
          but also about doing so in a way that alleviated marketing capacity for higher-leverage
          activities.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 03 — Discovery ──────────────────────────────────────────
// Two strands of evidence. Qual is the inbox reality plus
// competitive benchmarking — used to convert known qualitative
// truths into quantifiable executive arguments. Quant is the
// DOM-vs-source taxonomy gap — a technically credible piece of
// detective work that converted the qualitative truth into a
// fundable revenue model. Qual lands first because it's the
// recognized organizational truth; Quant lands second because it's
// what made the truth fundable. The third paragraph names the
// org-legibility move (documentation + RACI + cycle time) without
// it reading as a swipe at marketing — supportive framing matters
// here.

function BeatDiscovery() {
  return (
    <Beat
      id="discovery"
      number="03"
      title="Discovery"
      headline="The diagnostic was qualitative; the roadmap had to be quant-backed."
    >
      <Body>
        <p>
          Two strands of evidence converged on the diagnostic. One I
          translated; one I built.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Qualitative" title="The inbox reality was known. What it needed was quantification.">
          The 20+ emails-per-day experience and generic signup units were widely
          discussed across the organization. What the business
          couldn’t justify was a change that risked the existing
          revenue stream. User research on broad newsletter expectations
          (delegated to the platform designer, evaluative and
          unmoderated by default given our scope of work) reinforced
          the finding without surprising anyone. The harder lever was
          competitive: when three or four competitors had shipped a
          capability that read as modern table stakes, that became
          quantifiable pressure—market benchmarking translated
          into something a leadership room could weigh against the
          status-quo revenue.
        </EvidenceCard>
        <EvidenceCard eyebrow="Quantitative" title="The DOM was missing classification data that the source HTML carried.">
          The network ran five content-classification systems, each represented
          in our database and source HTML—document
          type (core, list, commerce), page layout, revenue
          attribution, sitemap taxonomy, and a network-wide
          what-is-this-about taxonomy. Revenue modelling for every new marketing
          unit typically ran against the first three, but the primary onsite
          marketing tool (Digioh) only read the
          rendered DOM, not the source HTML. A separate integration
          duplicated classification data from source into DOM—and
          on inspection, that duplication wasn’t happening on
          all documents. I modelled the gap against the source data
          and the deficit was visible: marketing was under-serving
          a meaningful share of users, with revenue left on the
          table. That model secured buy-in for the next layer of the
          roadmap—targeting capability—and the trust it
          brokered paved the way for the longer-arc identity and
          onboarding work.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          The third piece of discovery wasn’t about the user
          experience or the platform—it was about how the
          organization itself shipped. Across every initiative, I
          documented intake, handoff, and delivery acceptance criteria,
          with PRDs nested under larger initiative milestones and a
          RACI chart agreed upon at kickoff for each initiative. As points of failure
          accumulated, the documentation made bottlenecks legible.
          Systems thinking and information architecture are superpowers of mine
          that showed up frequently in how I executed my role: organized product documentation,
          a modular roadmap with clear dependencies, and project plans
          with clear roles and timelines. This rigor around artifact creation and maintenance
          is also the foundation of AI-native operations.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 04 — Strategy ───────────────────────────────────────────
// The bet, plainly stated. Co-shipping (not stewardship) is the
// load-bearing distinction. The three-tier override architecture
// is the strategic-engineering bet that made network-scale rollout
// feasible. Sequencing logic is multi-layered: capability-surface-
// program dependency on the technical side, brand-roadmap awareness
// on the rollout side, and proxy experiments harvested from other
// teams for free intel. ClaudeNote callout surfaces the long-arc
// registration stewardship as the strategic bet underneath.

function BeatStrategy() {
  return (
    <Beat
      id="strategy"
      number="04"
      title="Strategy"
      headline="Co-ship surfaces, capabilities, and programs. Steward the identity roadmap behind them."
    >
      <Body>
        <p>
          The bet was{" "}
          <Emph>co-shipping</Emph>. My team
          wasn’t plugging marketing programs into existing
          capabilities and pre-built surfaces; it was building the
          surfaces and capabilities at the same time as the growth
          programs that proved them out. Each program landed when its
          capability landed, on the same release cadence, in a tight but
          modular sequence: this program needs this surface and this
          capability, so build them in lockstep. I stewarded the longer-arc bet
          underneath that loop—the identity, registration, and onboarding
          infrastructure underpinning every program—in
          the background of the marketing organization’s
          newsletter-program-launch roadmap, advanced one increment of
          buy-in at a time as each program proved the next part of
          the thesis.
        </p>
        <p>
          The architectural shape that made network-scale rollout
          feasible was a three-tier enablement pattern. The first tier
          decided which pages the{" "}<Code>Digioh</Code>{" "}script loaded
          on. The second tier decided which pages the empty{" "}<Code>div</Code>{" "}placements
          were added to—each unit type had its
          own implementation, but every one of them spoke the same
          empty-div-then-unit-injection contract so that the marketing team
          could iterate and ship new program creative for any units without
          requiring engineering resources. The third tier was the per-campaign
          targeting tracked in a visible campaign tracker, with
          marketing controlling targeting and creative inside{" "}
          <Code>Digioh</Code>{" "}and email content inside{" "}<Code>Iterable</Code>.
          Brand teams had the option to inherit the network defaults at each tier and
          could override them where their own roadmap or audience
          shape demanded it. That core-inheritance-with-brand-override
          pattern was a lesson learned the hard way
          (more on that below); once we adopted it, every subsequent
          unit shipped faster and survived handoff to the brands.
        </p>
        <p>
          Day-to-day, sequencing the work involved three factors: team capacity,
          roadmap dependencies, and revenue modeling. Technically,
          capability and surface dependencies governed which program
          could ship when. A brand wanting to prioritize a program that
          relied on the new capability and surface had to prioritize
          enabling that capability and surface first. To that end, per-brand rollout was
          governed by each brand team’s own roadmap and capacity
          as much as by the implementation’s revenue impact on each brand. I
          collaborated with marketing to develop the revenue models for each program,
          then built and pitched each program’s rollout plan, taking into account the
          model projections and the constraints of each brand’s roadmap. I gauged stakeholder
          interest and buy-in early, usually off of a basic revenue model
          that we’d iterate on as we got data from brand launches. Throughout the
          process, we also had to meet brand expectations regarding impacts on site performance,
          both as a dimension in its own right and as a downstream lever on revenue. As we got closer
          to release, I ran regular demos, office hours, and similar touchpoints to build alignment,
          gather any additional feedback, and secure buy-in on the rollout plan.
          My team’s capacity, including marketing, was the third sequencing factor.
        </p>
        <p>
          For longer-term planning, I also mined other teams’ experiments; I was looking out for two things: free intel and possible work
          that could serve as a proxy for work my team wanted to do. In the latter case, we could leverage their data
          to build early models that would help us sequence certain work sooner (or even bypass it entirely). For example, when the People team announced
          they’d be testing login in the header for comments, I regularly checked in on their work and data to
          move site registration up in my team’s sequence with increased confidence and lower predicted effort.
        </p>
      </Body>

      {/* Three-tier enablement diagram. Three TierColumn components
          in tier order, left-to-right (Tier 01 → 02 → 03), so the
          reading sequence matches the numbered prose above. Tier
          01: the Digioh script — engineering decides where it
          loads; the script itself is just the enabler. Tier 02: the
          site page — empty <div> placements per surface per unit
          type, with classes Digioh targets for injection (a
          separate engineering config from the script loader). Tier
          03: the Digioh tool — marketing's campaigns, where
          targeting, matching, and creative live. Reflows top-to-
          bottom on narrow viewports; the visually hidden
          <figcaption> carries the screen-reader narrative. */}
      <section
        aria-labelledby="enablement-diagram-heading"
        className="my-10 md:my-12"
      >
        <CaseStudyKicker as="h3" id="enablement-diagram-heading" className="mb-4">
          The three-tier enablement pattern
        </CaseStudyKicker>
        <figure className="case-glass m-0 rounded-[22px] border border-[var(--border-default)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <TierColumn
              label="Digioh script"
              tier={<>Tier&nbsp;01</>}
              subtitle="Engineering chooses where it loads"
              caption={
                <>
                  Only loads where configuration allows. The script
                  bootstraps Digioh—it doesn’t target users
                  or pick creative itself.
                </>
              }
            >
              <pre
                className="code-chip m-0 mt-4 p-3 rounded-[10px] border border-[var(--border-default)] text-[11px] md:text-[12px] leading-[1.7] overflow-x-auto text-[var(--text-body)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
{`load digioh.js
──────────────
on:  configured pages
off: everywhere else`}
              </pre>
            </TierColumn>

            <TierColumn
              label="Site page"
              tier={<>Tier&nbsp;02</>}
              subtitle="Engineering places the surfaces"
              caption={
                <>
                  Per surface, per page—page&nbsp;X gets
                  overlay&nbsp;+ toaster, page&nbsp;Y gets
                  overlay&nbsp;+ inline. Digioh targets these
                  placements to know where to inject.
                </>
              }
            >
              <pre
                className="code-chip m-0 mt-4 p-3 rounded-[10px] border border-[var(--border-default)] text-[11px] md:text-[12px] leading-[1.7] overflow-x-auto text-[var(--text-body)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
{`<body>
  ...
  <div class="overlay"></div>
  <div class="inline-unit"></div>
  <div class="toaster"></div>
</body>`}
              </pre>
            </TierColumn>

            <TierColumn
              label="Digioh tool"
              tier={<>Tier&nbsp;03</>}
              subtitle="Marketing owns the campaigns"
              caption="Targeting and creative iterate here without engineering involvement."
              isLast
            >
              <ul className="m-0 mt-4 p-0 list-none space-y-3 text-[12px] md:text-[13px] leading-[1.5] text-[var(--text-body)]">
                <li className="p-3 rounded-[10px] border border-[var(--border-default)]">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
                    Campaign &middot; Follow This Topic
                  </div>
                  <div className="mt-1">
                    <span className="text-[var(--text-caption)]">surface:</span>{" "}
                    <Code>overlay</Code>
                  </div>
                  <div>
                    <span className="text-[var(--text-caption)]">targeting:</span>{" "}
                    user on page 45 seconds &middot; topic = cruises
                  </div>
                </li>
                <li className="p-3 rounded-[10px] border border-[var(--border-default)]">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-caption)]">
                    Campaign &middot; Commerce newsletter signup
                  </div>
                  <div className="mt-1">
                    <span className="text-[var(--text-caption)]">surface:</span>{" "}
                    <Code>inline-unit</Code>
                  </div>
                  <div>
                    <span className="text-[var(--text-caption)]">targeting:</span>{" "}
                    anonymous user on commerce page &middot; first session
                  </div>
                </li>
              </ul>
            </TierColumn>
          </div>

          <figcaption className="sr-only">
            A three-column diagram of the enablement pattern, in
            tier order. Tier 01, on the left, is the Digioh script:
            engineering configures which pages load it, and once
            loaded the script enables Digioh on the page. Tier 02,
            in the middle, is the site page: a separate engineering
            config places empty div surfaces per page and per
            surface type, with classes and ids Digioh targets for
            injection. Tier 03, on the right, is the Digioh tool:
            marketing-controlled campaigns that bind each surface
            to its targeting rules and creative, iterating without
            engineering involvement.
          </figcaption>
        </figure>
      </section>

      {/* Aside on the registration/onboarding stewardship. It earns a
          mention here because it's the strategic bet underneath — every
          program above was simultaneously a proof point for the
          identity work and a vehicle for buying its political capital.
          ClaudeNote with variant="callout" elevates this to a card
          surface with body-color body type, so the meta-commentary
          reads as the beat's thesis rather than as a parenthetical
          aside. The kicker prop overrides the default "How I used
          Claude" label. This is the only callout-variant ClaudeNote
          sitewide; the routine ones on every other case study stay
          in the default left-rule treatment. */}
      <ClaudeNote kicker="The strategic bet underneath" variant="callout">
        Every program in the foreground was also moving the long-arc
        roadmap forward. Each launch carried a second purpose:
        targeting capability bought trust in the revenue math; a
        topical-affinity launch proved the personalization vision;
        a comments product earned a header navigation placement for account management.
        The identity, registration, and onboarding roadmap was multi-year by
        design—it couldn’t be sold as a single pitch—
        so I sold it one program at a time, with each launch buying
        the next increment of executive buy-in for the work
        underneath.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 05 — 0 to 1 ─────────────────────────────────────────────
// First of two execution beats. The 0-to-1 foundation in four
// IterationCards laid out as a 2×2 matrix: capability prerequisites,
// the inline-units misstep that hardened the brand-override pattern,
// the toaster + slide-in pivot that surfaced the unit-design
// discipline, and Comments — the program that predated the systemic
// work but proved the identity bet had legs and seeded the email-
// journey design Follow This Topic would lean on. All four are
// framed as foundation pieces (not three vignettes plus one outlier);
// Follow This Topic in the next beat compounds across what they
// collectively set up. The inline-units misstep is the IterationCard
// the case study needs — real friction, real lesson, no whitewash.

function BeatZeroToOne() {
  return (
    <Beat
      id="zero-to-one"
      number="05"
      title="0 to 1"
      headline="Capabilities, surfaces, and brand control."
    >
      <Body>
        {/* Italic meta-arc tee-up. Names the two-level pattern (a
            surface-level 0-to-1/1-to-n inside each program AND a
            role-level meta-0-to-1 across the portfolio) before
            the reader hits the recursion in Beat 06's closer.
            Without this, the meta read lands cold on a fast scroll.
            Em-dash carries no spaces per voice rules; hyphenated
            compounds stay on one source line to dodge the JSX
            wrap-strips-trailing-space trap. */}
        <p>
          <Emph>
            What follows is a 0-to-1 across surfaces and capabilities, then a 1-to-<var>n</var> inside a single compounding program—together, the meta-0-to-1 the role was sized against.
          </Emph>
        </p>
        <p>
          Every capability, surface, and program followed the same
          shape: 0 to 1 at a pilot brand, then 1 to <var>n</var>{" "}
          across the network. The 0-to-1 half was capability
          invention—surfaces, data plumbing, governance
          patterns—done once. The 1-to-<var>n</var>{" "}half was
          sequencing—brand roadmaps, capacity, revenue models,
          demo cadence, override patterns—repeated per brand.
          Both halves had to land for a launch to count, and the
          work that survived handoff was the work that treated the
          second half as first-class from day one rather than as a
          rollout afterthought. I’d internalized the discipline at{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-people-inc-body", destination: "case-study:user-interviews" }}
          >
            <Link href="/case-studies/user-interviews">User Interviews</Link>
          </TrackOnClick>
          , where shipping into a two-sided marketplace meant every
          supply-side change had to land against demand-side
          recruitment running in parallel.
        </p>
        <p>
          What follows is the 0-to-1 foundation in four pieces:
          capability prerequisites, the inline-units misstep that
          hardened the brand-override pattern, the toaster +
          slide-in pivot that surfaced the unit-design discipline,
          and Comments—the program that proved the identity
          bet had legs and seeded the email-journey work Follow
          This Topic (below) would lean on.
        </p>
      </Body>

      <IterationGrid cols={2}>
        <IterationCard lens="01" title="Capability prerequisites.">
          The earliest work was platform: migrating newsletter and
          sweepstakes experiences onto the shared MarTech stack,
          expanding Digioh from a test percentage of
          the network to the majority of sites, and standing up the
          first new onsite marketing surface—a banner variant
          that extended the CMS team’s Sitewide Banner to trigger
          the Overlay on click. The Sitewide Banner shared the
          editorial calendar with Editorial’s planned campaigns,
          so part of the work was a marketing-editorial coordination
          process for which page-by-page placements ran which day.
        </IterationCard>
        <IterationCard lens="02" title="Inline units misstep.">
          The next planned unit was inline. Page-placement logic had
          come from a prior manual test in the CMS, and I assumed the
          per-brand approval was settled. We built against it. At demo
          and rollout, brands rejected the placement logic—the
          per-brand need was disparate enough that the network default
          didn’t hold. The misstep landed exactly as a resourcing
          realignment hit, and we recalibrated the roadmap to delay
          the rebuild. The lesson stayed:{" "}
          <Emph>pre-pitch placement logic brand-by-brand before
          building</Emph>, and design the architecture so brand
          override is a first-class affordance rather than a refactor.
          That lesson became the three-tier override pattern noted above.
        </IterationCard>
        <IterationCard lens="03" title="Toaster and slide-in pivot.">
          With the inline rebuild deferred, we picked up a toaster
          unit (injected into another team’s bottom-sheet
          technology after they offered to build the integration for
          us to accelerate post-resource-restructuring) and a slide-in unit for
          event marketing. We tested the toaster for commerce-page
          signups—driving newsletter enrollment that triggered
          purchase-reminder notifications for items a user was
          researching. The slide-in tested against the Food & Wine
          Classic and surfaced a previously-invisible variable: unit
          design itself, especially size, affected site speed
          independently of script load and DOM injection. That
          insight led to a sustained partnership with the speed team
          to standardize how marketing-unit performance was evaluated.
        </IterationCard>
        <IterationCard lens="04" title="Comments and the identity unlock.">
          The first program to put a sustained user-account element
          in the site header shipped scrappily on People (later
          Entertainment Weekly) before the systemic 0-to-1 work began. My product team built newsletter signup
          directly into the registration flow; I translated
          programmatic marketing needs into the notification
          newsletter architecture (the recurring email that brought
          commenters back to active threads). The returning-users
          hypothesis held: time-in-comments lift re-modelled the
          channel at $2.2M annually before any onsite or email
          iteration.
        </IterationCard>
      </IterationGrid>
    </Beat>
  );
}

// ─── Beat 06 — 1 to n ─────────────────────────────────────────────
// Second of two execution beats. The single program — Follow This
// Topic — that was built to leverage the entire 0-to-1 platform:
// surfaces, the brand-override pattern, the data plumbing, the
// revenue model. It's where the platform proved it could compound
// from pilot to network rollout. The DOM/Hightouch data-flow
// re-architecture inside Follow This Topic is the second
// technically credible piece of detective work in the case study;
// it's load-bearing for the thesis.

function BeatOneToN() {
  return (
    <Beat
      id="one-to-n"
      number="06"
      title="1 to n"
      headline="Follow This Topic, the platform compounding underneath."
    >
      {/* Follow This Topic. The single 1-to-n program of the role.
          Structured into: (1) a short framing paragraph naming
          what this program tested at the platform level; (2) the
          setup paragraph (hypothesis + MVP + placements); (3) the
          page-selection model with a bulleted factor list; (4) the
          risk-mitigation/partnership prose; (5) a two-sided data-
          flow story (page side / email side) split into clear sub-
          paragraphs; (6) a coda that zooms out to the meta-0-to-1
          → roadmap 1-to-n framing — the foundation laid in the
          previous section plus Follow This Topic together were a
          0-to-1 at the tenure level; the corresponding 1-to-n was
          the longer-running personalization roadmap the role was
          sized against. The DOM/Hightouch data-flow re-architecture
          inside this launch is the second technically credible
          piece of detective work in the case study; load-bearing
          for the thesis. Single <Body> wrapper so every paragraph
          shares the same flex gap-4 spacing — splitting across two
          Bodies dropped a visible margin between the intro and the
          first FTT paragraph. */}
      <Body>
        <p>
          Follow This Topic was the program built to leverage the
          0-to-1 work for personalization. The surfaces, the data
          plumbing, the brand-override pattern, and the revenue models
          were tests of whether the platform could carry a set of
          relatively simple programs from pilot to network rollout.
          This was the test of whether it could handle a program
          with far more complexity than the others.
        </p>
        <p>
          <Emph>Follow This Topic</Emph>{" "}was the topical-affinity
          bet—the “personalized” newsletter
          program and the launch the rest of the platform was built
          for. The hypothesis from our user research was that
          readers wanted topical newsletter subscriptions surfaced
          at two moments in the article: at the top of the page
          before they read, then partway through the article body
          as a reminder once they’d engaged meaningfully with
          the content. We built the MVP on Travel + Leisure. The{" "}
          <Code>Digioh</Code>{" "}script was already on the majority
          of the site from the platform expansion; we placed a
          feature-specific empty button{" "}<Code>div</Code>{" "}at the
          top of a subset of pages and shipped Follow This Topic
          with a future plan to test into the inline unit addition,
          both placements triggering the Overlay with the topical
          signup offer.
        </p>

        <p>
          Page selection was modelled off four factors:
        </p>
        <ul className="m-0 pl-6 list-disc space-y-2 text-[var(--text-body)] marker:text-[var(--text-caption)]">
          <li>Traffic to pages by taxonomy</li>
          <li>Publication rate of new content per taxonomy</li>
          <li>A simplified brand newsletter signup conversion rate</li>
          <li>A simplified brand RPM</li>
        </ul>
        <p>
          The model clarified which topics would drive enough
          impact to justify the placement. However, it required a
          load-bearing risk-mitigation move—every topical
          signup also enrolled the user in the brand’s
          flagship newsletter, so the program protected the
          existing revenue base while we tested whether a topical
          channel could pay for itself. I led the partnership
          between brand marketing and editorial leadership to set
          the final taxonomy list, the offer and creative
          combinations, and the email journey that
          followed—subject lines, sequence, content
          selection. The retention-side care put us ahead of where
          we thought we’d be on proving out personalization,
          and those outcomes became part of our headline in our
          pitches to brands for post-MVP adoption.
        </p>

        <p>
          The data-flow work underneath Follow This Topic was just
          as critical to nail as the user experience.
        </p>
        <p>
          <Emph>On the page side</Emph>: the taxonomy data{" "}
          <Code>Digioh</Code>{" "}needed lived in the source HTML but
          only sometimes made it to the DOM, per the discovery
          noted above. We partnered with the SEO team to extract
          the classification cleanly into the DOM as numeric IDs
          (the SEO team’s concern was that inserting
          human-readable taxonomy strings would degrade SERP performance
          through unintended keyword stuffing; numeric IDs solved
          that without losing the targeting signal). This had a
          ride-along effect on top-of-funnel volume for all the
          other programs that had been running starved of clean
          targeting data since I joined.
        </p>
        <p>
          <Emph>On the email side</Emph>:{" "}<Code>Iterable</Code>{" "}
          received content classification via{" "}
          <Code>Hightouch</Code>’s reverse ETL, and a
          transformation in that step was producing content
          mismatches between what should have qualified for a send
          and what actually did. A sub-initiative inside Follow
          This Topic re-shaped the{" "}<Code>Hightouch</Code>{" "}
          transformation so the two systems agreed on which content
          should be associated with which topic. This also had a
          ride-along effect on the newsletter content relevance,
          driving greater engagement and return traffic for all the
          other programs.
        </p>
        <p>
          The same data work fed two different parts of the
          marketing lifecycle; the Follow This Topic launch allowed
          us to broker investment in foundational improvements.
        </p>

        <p>
          Stepping up a level: this program and the 0-to-1 foundation before
          it were a meta-0-to-1—proof that the personalization
          bet could be successfully executed. At this meta level, 1-to-<var>n</var>{" "}
          was the longer-running personalization roadmap the
          platform had been built to enable, sequenced behind the
          identity infrastructure stewarded underneath the whole
          arc.
        </p>
      </Body>

    </Beat>
  );
}

// ─── Beat 07 — Outcomes ───────────────────────────────────────────
// Numbers up front with baseline-aware attribution: 33% YoY is
// network-wide blended (against a ~12% YoY baseline the year prior
// — the portfolio roughly tripled the growth rate); $2.2M is the
// comments channel as the standout single-program number; Follow
// This Topic's 3x opens / 2x LTV gets its own StatRow as the most-
// defensible program-level lifts (Malcolm owned the program end-
// to-end). Each StatRow is followed by an italicized Emph pull-
// quote line sized for LinkedIn copy-paste. The second-order
// outcome — the pilot-to-network rollout playbook — is the meta-
// story, so it gets dedicated prose alongside the numbers.

function BeatOutcomes() {
  return (
    <Beat
      id="outcomes"
      number="07"
      title="Outcomes"
      headline="Driving 33% YoY email revenue and a pilot-to-network rollout playbook."
    >
      <Body>
        <p>
          The network grew email revenue 33% year-over-year during my tenure—against
          a ~12% YoY baseline the year prior. The growth-program portfolio I
          owned roughly tripled the network’s email-revenue growth rate
          above baseline. That portfolio spanned capability and surface development,
          marketing-campaign work, and newsletter-content development across
          program launches.
        </p>
      </Body>

      {/* Network-level stats — the headline 33% lift the portfolio
          drove above baseline, plus $2.2M as the standout single-
          program number from the comments product. Italicized Emph
          pull-quote line below is sized for LinkedIn copy-paste. */}
      <StatRow cols={2}>
        <Stat
          big="33%"
          eyebrow="Email revenue"
          caption="Network-wide year-over-year lift in email revenue across People Inc.’s 40+ brands, blending ad revenue from site traffic and in-newsletter placements. A whole-marketing-organization outcome—the figure the role’s growth-program work was sized against."
          bigClassName="text-[44px] md:text-[56px] lg:text-[68px]"
        />
        <Stat
          big="$2.2M"
          eyebrow="Comments channel"
          caption="New annual revenue channel attributed to the comments experience on People, measured by examining user time in the comments experience and ads in the user viewport. The notification newsletter I architected inside the registration flow drove the returning-user share of the lift."
          bigClassName="text-[44px] md:text-[56px] lg:text-[68px]"
        />
      </StatRow>

      <Body>
        <p>
          <Emph>
            The growth-program portfolio I owned roughly tripled the
            network’s email-revenue growth rate during my tenure—33% YoY
            against a ~12% baseline the year prior. Inside that portfolio, the
            comments product I architected on People opened a new $2.2M annual
            revenue channel.
          </Emph>
        </p>
      </Body>

      {/* Follow This Topic — the program-level numbers Malcolm
          owned end-to-end on Travel + Leisure. Captions name the
          cohort comparison explicitly so the lifts are defensible
          without back-references to Beat 06's framing. Italicized
          Emph pull-quote line below is sized for LinkedIn copy-
          paste. */}
      <StatRow cols={2}>
        <Stat
          big="3x"
          eyebrow="Topical-open rate"
          caption="Follow This Topic signups vs the Travel + Leisure flagship-newsletter average, same cohort window."
          bigClassName="text-[44px] md:text-[56px] lg:text-[68px]"
        />
        <Stat
          big="2x"
          eyebrow="Customer LTV"
          caption="Follow This Topic cohort LTV vs the flagship-newsletter average."
          bigClassName="text-[44px] md:text-[56px] lg:text-[68px]"
        />
      </StatRow>

      <Body>
        <p>
          <Emph>
            Follow This Topic—the topical-affinity newsletter program I built
            end-to-end on Travel + Leisure—drove a 3x topical-open rate among
            signups and 2x customer LTV against the flagship-newsletter average.
          </Emph>
        </p>
        <p>
          The second-order outcome is the rollout playbook itself.
          Every program in this case study moved through the same
          loop: build the MVP on one brand, prove it on revenue
          and site performance, then steward adoption brand-by-brand
          against each brand’s own roadmap and capacity.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 08 — Reflection ─────────────────────────────────────────
// Two threads, ordered sharpest-first: (1) the thesis itself —
// infrastructure enables personalization, and what that means as a
// generalizable claim about media platforms; (2) the transferable
// craft — operationalizing vision into shape, and why that's the
// posture the role rewarded most. Close matches the recruiter-
// funnel exit ramp from the Muck Rack and User Interviews studies.

function BeatReflection() {
  return (
    <Beat
      id="reflection"
      number="08"
      title="Reflection"
      headline="Infrastructure enables personalization."
    >
      <Body>
        <p>
          People Inc.’s thesis was right—directly-owned user
          relationships, deeper engagement, ad revenue lift through
          time on site—but leadership couldn’t
          see that the strategy required a technical foundation that didn’t exist.
          You cannot personalize effectively without identity. You cannot
          run topical-affinity programs effectively without a data
          platform that appropriately aligns content classification
          across each tool that operationalizes the experience.
          The vision was sound; the infrastructural shape underneath it
          was the gap; closing that gap was the work. I’d run the
          pattern before at{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-people-inc-body", destination: "case-study:muck-rack" }}
          >
            <Link href="/case-studies/muck-rack">Muck Rack</Link>
          </TrackOnClick>
          , where standardizing the content schema was the precondition for
          everything the platform’s search and discovery features
          built on top of it.
        </p>
        <p>
          The skills I honed in this role were all about{" "}
          <Emph>operationalizing vision into strategy and strategy into execution</Emph>.
          The first part looked like collaborating with cross-functional teams and leadership to continuously
          refine the strategy—translating it into the modular sequence of capabilities,
          surfaces, and programs that drove impact across the line of business.
          The second part looked like developing artifacts, processes, and systems that supported the execution of the strategy.
          All of this shaped me into a more strategic product leader who isn’t afraid to roll up his sleeves
          and get his hands dirty. That’s the posture I bring to any media company driving personalization bets through platform development.
        </p>
        {/* Case-study close — exit ramp for the highest-intent
            reader. Same recruiter-funnel handoff across all 5 work-
            and project-case studies: resume primary, Calendly
            secondary (caption register). A recruiter reading just a
            case study doesn't yet have enough context to commit to a
            call; the resume is the next logical step in the funnel.
            Calendly is here for the already-ready reader. */}
        <p>
          Two next steps, if this is the kind of PM work
          you’re hiring for:{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-people-inc-close", destination: "resume" }}
          >
            <Link href="/resume">review my resume <span aria-hidden="true">→</span></Link>
          </TrackOnClick>
          .
        </p>
        <p className="text-[15px] text-[var(--text-caption)]">
          Or, if you’re ready to talk,{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CALENDLY_CLICK}
            eventData={{ kind: "outbound", surface: "case-study-people-inc-close" }}
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
