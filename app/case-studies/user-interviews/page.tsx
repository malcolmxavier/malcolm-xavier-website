// /case-studies/user-interviews — work-experience case-study page.
// Local preview from the work-case-study template. See
// app/case-studies/_templates/work-case-study/page.tsx.template for
// editorial posture (voice, privacy framing, when to keep or drop
// each primitive block).

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
  Code,
  Emph,
  EvidenceCard,
  EvidenceGrid,
  IterationCard,
  IterationGrid,
  Stat,
  StatRow,
} from "@/components/case-study/primitives";

// SLUG ties this file together with the layout's SLUG and the
// CASE_STUDIES entry in app/resume/resume-data.tsx (which is also
// referenced via the User Interviews role's relatedCaseStudies).
// A slug-integrity assertion at module-load throws if they drift.

const SLUG = "user-interviews";
const EMPLOYER = "User Interviews";

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
// Beat ids match the `id` prop on each <Beat> below.

const TOC_ITEMS: TocItem[] = [
  // "↑ Top" anchors to #intro (CaseStudyHero's default section id),
  // matching the convention used by basecamp-coffee and
  // building-this-site. The earlier #top anchor on the <article>
  // wrapper landed scroll-spy on the article container rather than
  // the hero section itself.
  // Labels are value claims, not method nouns — see
  // pi-c-toc-method-nouns in the 2026-05-30 /full-review tracker.
  // Section anchors unchanged so deep links still resolve.
  { href: "#intro", label: "↑ Top" },
  { href: "#context", prefix: "01", label: "Early marketplace" },
  { href: "#opportunity", prefix: "02", label: "EQR as the lever" },
  { href: "#discovery", prefix: "03", label: "Two-sided demand" },
  { href: "#strategy", prefix: "04", label: "Pre-qualify the funnel" },
  { href: "#execution", prefix: "05", label: "Shipping cadence" },
  { href: "#outcomes", prefix: "06", label: "+15% / +135%" },
  { href: "#reflection", prefix: "07", label: "Engineer the indicator" },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function UserInterviewsCaseStudy() {
  return (
    <>
      {/* ScrollProgress MUST remain a DOM descendant of the
          [data-cs-accent] wrapper declared in this route's layout.tsx.
          See the matching comment in muck-rack/page.tsx for the var-
          resolution rationale (same pattern, same invariant). */}
      <ScrollProgress />

      {/* `relative` establishes the positioning context the xl+ TOC rail
          uses to bound its sticky child to the article's vertical extent.
          Without it the rail would anchor higher up and slip past the
          article's bottom into the footer. */}
      <div className="relative lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:block">
        {/* Dual-mode TOC rail. xl+ uses position: sticky inside an
            absolutely-positioned column; lg-but-not-xl uses sticky inside
            the grid column. Both clamp naturally to the article's bottom. */}
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
          <BeatExecution />
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
// The lede frames the bet in three sentences: the metric the org
// chose, the hypothesis we ran against it, and the two outcomes
// (one expected, one accidental). Numbers are deltas only — absolute
// baselines are NDA-conservative.

function Hero() {
  return (
    <CaseStudyHero
      title="Steering leading indicators"
      subtitle="Targeting, retention, and marketplace mechanics"
      readMin={7}
      updatedDate="May 14, 2026"
    >
      {/* Resume backlink kicker. Subtle, reads as editorial chrome,
          closes the loop with the per-role footer link on /resume.
          Rendered as a <span style={{display:'block'}}> instead of a
          <p> because CaseStudyHero already wraps its children in a <p>
          and nested <p> is invalid HTML — the browser silently closes
          the outer paragraph, severing the kicker from the lede.
          Wrapped in TrackOnClick so the cross-link loop (case study →
          resume role anchor) is instrumented; the paired direction
          (resume role → case study) is wrapped on the resume side. */}
      <span style={{ display: "block", marginBottom: "var(--scale-300)", fontSize: "var(--p-xs-font-size)", color: "var(--text-caption)", fontFamily: "var(--font-mono)" }}>
        <TrackOnClick
          event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
          eventData={{ surface: "case-study-user-interviews-hero-kicker", destination: "resume" }}
        >
          <Link href={ROLE_BACKLINK_HREF} quiet>{ROLE_BACKLINK_LABEL}</Link>
        </TrackOnClick>
      </span>
      Two quarters of targeting enablement work at User Interviews
      lifted Early Qualification Rate (the share of new participants
      who qualified for their first study within two weeks of signup)
      by 15%. The org had picked EQR as the leading indicator for
      both researcher-side completion and participant-side
      retention&mdash;a single upstream signal that predicted health
      on both sides of the marketplace. The bet was that occupational
      targeting would lift it.
    </CaseStudyHero>
  );
}

// ─── Beat 01 — Context ────────────────────────────────────────────
// Sets the room: org stage, team shape, shipping cadence, and the
// pod move that put me on the surface where the targeting work
// actually lived.

function BeatContext() {
  return (
    <Beat
      id="context"
      number="01"
      title="Context"
      headline="An early-stage marketplace with serious analytics muscle."
    >
      <Body>
        <p>
          User Interviews was a roughly thirty-person product-led-growth
          company when I joined as a PM in late 2020. The product was a
          two-sided SaaS marketplace for user research. Researchers
          recruited participants, participants got paid for completed
          sessions, and the unit of value was a successfully-run study.
          For the company&apos;s size, the analytics program was
          unusually mature: data scientists were embedded in product
          pods rather than centralized, and most meaningful product
          decisions were scoped as experiments, launched first to
          roughly 50% of users, and held or shipped based on the data.
        </p>
        <p>
          I joined the Core pod (researcher-side flows&mdash;email
          theming, multi-team org accounts, etc.) and later moved over
          to Matching, the platform pod that owned the core marketplace.
          My data background unlocked the move. Matching owned two pieces
          that mattered for everything that follows: the targeting
          capabilities researchers used to define their audience, and the
          email-batching algorithm that fed participants into
          studies on a cadence to fill them.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 02 — Opportunity ──────────────────────────────────────────
// Names the metric, justifies the metric, and frames the diagnostic
// the team converged on before any feature work started.

function BeatOpportunity() {
  return (
    <Beat
      id="opportunity"
      number="02"
      title="Opportunity"
      headline="EQR predicted both sides, so EQR was the metric to move."
    >
      <Body>
        <p>
          The instinctive metrics for a research marketplace
          (study completion, time-to-fill) are lagging&mdash;by the
          time they move, the participant or researcher is already
          either delighted or gone. The data science team had
          identified an upstream signal that predicted both:{" "}
          <Emph>Early Qualification Rate</Emph>, or EQR&mdash;the
          percentage of new participants who qualified for their
          first study within two weeks of signup. Higher EQR meant
          participants were materially more likely to complete a session,
          which meant researchers were materially more likely to
          complete an entire study on their timeline, and both parties
          were materially more likely to stick around for future studies.
        </p>
        <p>
          One metric, both sides of the marketplace, leading rather
          than lagging. EQR was the metric to move.
        </p>
        <p>
          The diagnostic was straightforward and uncomfortable. Too
          many new participants were entering screener funnels for
          studies they weren&apos;t a fit for, being screened out,
          and disengaging. Researchers had only basic demographic
          targeting available&mdash;location, age, gender&mdash;but
          their actual use cases (often B2B research) needed to filter
          on occupation and skills. So researchers had been doing it
          indirectly: writing screener questions like{" "}
          <Emph>&ldquo;Are you a product manager?&rdquo;</Emph> and
          relying on the post-invitation screener to filter. The
          problem is that screener filtering happens{" "}
          <Emph>after</Emph>{" "}the invitation lands. By the time a
          participant is told they don&apos;t qualify, they&apos;re
          already hopeful if not expectant that they do.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 03 — Discovery ───────────────────────────────────────────
// Two sources of evidence converged from opposite sides of the
// marketplace. EvidenceGrid is the natural shape — one card per
// side. StatRow dropped here; the quantitative claims belong in
// Outcomes, not Discovery.

function BeatDiscovery() {
  return (
    <Beat
      id="discovery"
      number="03"
      title="Discovery"
      headline="Researchers wanted to filter on it. Participants wanted to be seen for it."
    >
      <Body>
        <p>
          User Interviews ran continuous discovery as a
          standing practice, and the same gap surfaced
          from both sides of the marketplace at once.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Researcher signal" title="Occupation and skills targeting would unblock B2B research.">
          Researchers consistently told us that occupational
          targeting&mdash;and skills targeting, separately&mdash;would
          let them reach participants for their studies more
          efficiently. The screener-question workaround was a
          known tax, not an invisible one.
        </EvidenceCard>
        <EvidenceCard eyebrow="Participant signal" title="Participants wanted attributes that explained why they should be picked.">
          Participants reported feeling overlooked because the
          platform only knew them by demographic basics. Adding
          occupation and skills was, to them, less about
          targeting than about being seen by the right researchers.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          On the quant side, my embedded data scientist had already
          done the work to establish EQR as the leading indicator;
          we worked together to scope the experiments that followed,
          and I built my own SQL dashboards in Mode to watch what
          we shipped. The picture from the data became clearer with
          each successive experiment: qualification was concentrated
          among participants whose profiles contained occupational data;
          researcher and participant retention were increasing.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 04 — Strategy ───────────────────────────────────────────
// The bet, named plainly. No SuccessGate — the project had internal
// targets but they aren't publishable, and inventing thresholds for
// the surface would undermine the disclosure posture established
// in Outcomes.

function BeatStrategy() {
  return (
    <Beat
      id="strategy"
      number="04"
      title="Strategy"
      headline="Pre-qualify participants entering the funnel."
    >
      <Body>
        <p>
          The bet was that moving qualification{" "}
          <Emph>upstream</Emph> of the invitation would compound
          through the funnel. If researchers could target on
          occupation and skills, and participants could surface those
          attributes on their profiles, two things should follow.
          First, invitations would land on participants who were
          more likely to qualify, which would lift EQR directly.
          Second, participants would feel selected{" "}
          <Emph>for</Emph> rather than filtered{" "}
          <Emph>out</Emph>&mdash;improving retention even in the
          cases where they didn&apos;t ultimately fit a specific
          study.
        </p>
        <p>
          That second mechanism is the part that most marketplace
          PMs underrate. A screener rejection is a big piece of
          bad news delivered after a small piece of good news. A
          targeting attribute mismatch, by contrast, is more or less
          invisible to the participant entirely. The first costs you
          retention almost immediately. The second costs you retention
          over time if you don&apos;t implement other solutions (which
          is why we tended to iterative changes to batch size, cadence,
          and composition).
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 05 — Execution ──────────────────────────────────────────
// Three phases. The phasing IS the method here — we deliberately
// tested participant-side adoption before building anything
// researchers could see, because stated preference isn't behavior.

function BeatExecution() {
  return (
    <Beat
      id="execution"
      number="05"
      title="Execution"
      headline="Two quarters, three phases per new data attribute, and two-to-three-week experiments."
    >
      <Body>
        <p>
          The pods&apos; shipping cadence shaped the project as much
          as the data did. We scoped each effort to a two-to-three
          week build and a two-to-three week live experiment. Experiments
          launched to roughly 50% of users, and we decided go or no-go from
          the data. We then full-shipped the previous experiment while
          the next one was going live. That rhythm is what let
          a build that involved two third-party integrations and an
          algorithm rewrite land in two quarters, from ideation to full scale.
          Each new data attribute went through three phases.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="Phase 01" title="Participant-side data first to ensure we can provide meaningful targeting.">
          Before building anything researchers could see, we
          tested whether participants would actually fill in
          occupation and skills attributes on their profiles.
          Stated preference is famously generous; we needed
          confidence the data would be there before the
          researcher-side filters depended on it. That phase
          shipped the participant-side surfaces first and gated
          everything downstream on its adoption numbers. We enabled
          occupation and skills data collection in onboarding
          and profile editing, and ran a product marketing
          campaign to encourage existing participants to
          update their profiles.
        </IterationCard>
        <IterationCard lens="Phase 02" title="Researcher-side filters, built on standardized taxonomies.">
          Job title went live first, anchored on a{" "}
          <Emph>Lightcast</Emph> integration of Bureau of Labor
          Statistics data. Skills went live second, anchored
          on a LinkedIn dataset. Both leveraged <Code>ElasticSearch</Code>{" "}
          in the UI, rather than using free text inputs.
          Build-vs-buy on the data sources was the single hardest
          decision of the project; even after choosing to buy,
          both integrations required manual internal cleaning and enrichment
          before build could start. Buying also allowed us to
          ensure data taxonomy was standardized on industry data
          rather than data we generated ourselves.
        </IterationCard>
        <IterationCard lens="Phase 03" title="Tuning the batching algorithm to honor the broader EQR hypothesis.">
          With the new attributes live, the algorithm that batched
          and sent invitations to participants needed to be adjusted.
          The pre-qualification on new attributes could only be
          fully proven out by adjustments to batch size and cadence.
          The more confident we were in the matching, the smaller
          and less frequent the batches needed to be. But we couldn&apos;t
          do this and ignore which participants were still inside
          their first two-week window. In this phase, the work shifted
          from feature releases to continuous iteration on the email
          invitation algorithm, including batch size, cadence, and composition.
        </IterationCard>
      </IterationGrid>
    </Beat>
  );
}

// ─── Beat 06 — Outcomes ───────────────────────────────────────────
// Deltas only — absolute baselines for EQR and re-recruitment are
// NDA-conservative even though I'm under no formal NDA. StatRow
// is the right primitive when there's no defensible "was" to put
// in a MetricsTable.

function BeatOutcomes() {
  return (
    <Beat
      id="outcomes"
      number="06"
      title="Outcomes"
      headline="EQR +15%. Re-recruitment +135% from a one-month side quest."
    >
      <Body>
        <p>
          The primary outcome was on the metric we set out to
          move: EQR rose 15%, with downstream lifts on the
          lagging indicators (study completion and participant
          retention).
        </p>
        <p>
          An unrelated solution was also contributing to the rise in EQR 
          during this time. While I was still on Core, we had a
          fragile hypothesis: if we could increase usage of the{" "}
          <Emph>&ldquo;invite past participants&rdquo;</Emph>{" "}
          feature, researchers would see better study outcomes. The
          data showed that researchers who used it had measurably
          better study outcomes; usage was surprisingly low.
          We had to figure out why and fix it.
        </p>
        <p>
          I performed a heuristic analysis that suggested comprehension
          was the issue, rather than discoverability. A few discovery
          sessions confirmed it over a couple of weeks. We clarified the
          help text language for the feature, explaining what it was
          and how it worked, and tweaked the icon and its color as a
          secondary fix. The whole thing&mdash;diagnosis, discovery,
          build, ship&mdash;took about a month (fast for the
          pre-Claude-Code era). Re-recruitment usage rose 135%. When
          we began working on occupation and skills targeting, re-recruitment
          was already influencing EQR in a positive direction; the new releases
          compounded the effect of that prior work.
        </p>
      </Body>

      <StatRow cols={3}>
        <Stat
          big="2 qtrs"
          eyebrow="Time to scale"
          caption="Ideation to full rollout of the targeting build, across two third-party data integrations and a matching-algorithm rewrite."
        />
        <Stat
          big="+15%"
          eyebrow="EQR"
          caption="Early Qualification Rate—the share of new participants who qualified for their first study within two weeks of signup. Lift driven by the targeting build."
        />
        <Stat
          big="+135%"
          eyebrow="Re-recruitment"
          caption="Researcher usage of the &lsquo;invite past participants&rsquo; feature after a separate, one-month UX writing fix to an existing, but underused surface."
        />
      </StatRow>
    </Beat>
  );
}

// ─── Beat 07 — Reflection ─────────────────────────────────────────
// Two paragraphs, no card clutter. The first is the
// marketplace-fulfillment lesson; the second is the
// metric-selection lesson, with the re-recruitment vignette as
// the kicker. Beat closes with a recruiter-funnel exit ramp
// (resume + Calendly), reframed from the basecamp-coffee /
// building-this-site close to address the work-case-study
// audience directly ("PM work you're hiring for") rather than
// the generic "if this resonated" framing the project studies use.

function BeatReflection() {
  return (
    <Beat
      id="reflection"
      number="07"
      title="Reflection"
      headline="Pick the leading indicator, then engineer against it."
    >
      <Body>
        <p>
          The biggest leverage move at User Interviews wasn&apos;t
          a feature in the traditional sense&mdash;it was changing{" "}
          <Emph>where</Emph> general qualification happened in the supply-side funnel.
          This holds true across all early-stage marketplaces.
        </p>
        <p>
          In the case of user research marketplaces, it is about moving general
          qualification out of screeners and upstream of study invitations.
          Screener-based filtering should be niche and project-specific.
          If general qualification is done via the screener,
          the marketplace pays its cost in churn, because every
          screener rejection is a participant who had unrealistic expectations
          set and is now disappointed in the entire platform, not just the single
          outcome.
        </p>
        <p>
          Pre-qualifying via attribute targeting costs more
          upfront&mdash;data sourcing, integration work,
          participant-side adoption&mdash;but the benefit compounds in
          the marketplace&apos;s favor over time. Every marketplace has its
          own version of this tradeoff. The lesson generalizes:
          be skeptical of downstream supply-side qualification, especially
          when the price is paid by your users.
        </p>
        <p>
          The other lesson is about metric selection. The reason
          this project worked is that the org had picked the right
          thing to measure before anyone wrote a line of feature
          code. EQR predicted both sides of the marketplace and was
          upstream of every product decision I made for two
          quarters. A weaker org would have anchored on whichever
          side was loudest in a given week. Picking the right metric
          is product work, not analytics work, and an embedded
          data-science function is the easiest way to make that
          judgment accurately. At{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-user-interviews-body", destination: "case-study:people-inc" }}
          >
            <Link href="/case-studies/people-inc">People Inc.</Link>
          </TrackOnClick>
          , the same instinct meant stewarding a multi-year identity
          roadmap one program launch at a time, each launch a proof
          point for the bet and a vehicle for the next increment of
          executive buy-in. The re-recruitment side story is the
          same lesson at smaller scale&mdash;a fragile hypothesis,
          a few discovery sessions, and a month of work outperformed
          several quarters of people not prioritizing investigation
          of a solution on the assumption that it would be complex.
        </p>
        {/* Case-study close — exit ramp for the highest-intent reader.
            Resume primary, Calendly secondary (caption register).
            Work-case-study reframe ("PM work you're hiring for")
            instead of basecamp/building-this-site's generic "if
            this resonated" — the audience here is recruiters
            evaluating fit, not readers evaluating a piece of
            writing. A recruiter reading just this case study
            doesn't yet have enough context to commit to a call; the
            resume is the next logical step in the funnel. */}
        <p>
          Two next steps, if this is the kind of PM work
          you&apos;re hiring for:{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-user-interviews-close", destination: "resume" }}
          >
            <Link href="/resume">review my resume <span aria-hidden="true">&rarr;</span></Link>
          </TrackOnClick>
          .
        </p>
        <p className="text-[15px] text-[var(--text-caption)]">
          Or, if you&apos;re ready to talk,{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CALENDLY_CLICK}
            eventData={{ kind: "outbound", surface: "case-study-user-interviews-close" }}
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
