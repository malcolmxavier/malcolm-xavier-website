// /case-studies/muck-rack — work-experience case-study page.
// Authored 2026-05-18. Driving narrative: decomposing a single
// ingestion ETL monolith into a fleet of microservices, supporting
// GTM/growth in a sales-led org where leadership measured volume but
// the actual lever was the quality dimensions underneath it. Maps
// onto the six-category framing in Malcolm's recent LinkedIn article
// "Data platforms: quality over quantity" — the article codifies what
// Muck Rack taught him.
//
// Editorial posture mirrors the user-interviews study: first-person
// past-tense, peer-to-peer, candid about org dynamics but neutral on
// tone (no swipes). NDA-conservative on internals — defensible
// numbers only, with framing for measurement caveats (e.g. the
// parsing-error stat is measured via user complaints because unknown
// errors aren’t countable).

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
import {
  PipelineBeforeFigure,
  PipelineAfterFigure,
} from "./pipeline-figures";

// SLUG must match the layout's SLUG and the CASE_STUDIES entry in
// app/resume/resume-data.tsx (also referenced via the Muck Rack
// role's relatedCaseStudies). The slug-integrity assertion in
// resume-data throws at module-load if any of those drift.

const SLUG = "muck-rack";
const EMPLOYER = "Muck Rack";

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

// External link to the LinkedIn article whose six-category framing
// (completeness, accuracy, relevance, connectivity, legibility,
// privacy) Reflection maps the Muck Rack work onto. The article is
// the theory; this case study is the practice.
const DATA_QUALITY_ARTICLE_URL =
  "https://www.linkedin.com/pulse/growth-personalization-ai-data-primer-malcolm-xavier-eawbc/";

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
  { href: "#context", prefix: "01", label: "Quantity Over Quality" },
  { href: "#opportunity", prefix: "02", label: "Timeliness vs volume" },
  { href: "#discovery", prefix: "03", label: "Observability" },
  { href: "#strategy", prefix: "04", label: "Decompose by type" },
  { href: "#execution", prefix: "05", label: "Three workstreams" },
  { href: "#outcomes", prefix: "06", label: "Quality lifts volume" },
  { href: "#reflection", prefix: "07", label: "Quality, not quantity" },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function MuckRackCaseStudy() {
  return (
    <>
      {/* ScrollProgress MUST remain a DOM descendant of the
          [data-cs-accent] wrapper declared in this route's layout.tsx
          — the fill gradient resolves --cs-accent-strong at the
          .progress-bar-fill element, so a lift outside the scope
          (e.g. into a shared chrome above the layout) would silently
          retint the bar to the recruiter-green :root default. */}
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
// Four-sentence lede frames the bet: the scope of the work, the
// diagnostic that hardened during it, the translation craft that got
// the technical investment funded, and a punchy thesis closer that
// returns as Reflection's headline. Numbers stay in Outcomes; the
// lede stays plain-spoken.

function Hero() {
  return (
    <CaseStudyHero
      title="Content and data platforms: quality over quantity"
      subtitle="Translating data quality work into the volume metric a sales-led org trusted"
      readMin={8}
      updatedDate="May 18, 2026"
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
          eventData={{ surface: "case-study-muck-rack-hero-kicker", destination: "resume" }}
        >
          <Link href={ROLE_BACKLINK_HREF} quiet>{ROLE_BACKLINK_LABEL}</Link>
        </TrackOnClick>
      </span>
      Quality was the lever; quantity was the language. Behind the
      “missing mentions” framing sat two simpler problems:
      we were capturing mentions late and labelling them wrong. A year
      and a half at Muck Rack as the technical PM for content and data
      ingestion meant <Emph>translating</Emph>{" "}accuracy, relevance,
      and connectivity into the volume metric leadership trusted. The
      path there was decomposing a single ETL pipeline into a fleet of
      microservices—first by content type, then by
      source—even as leadership sold the product on parity with
      legacy competitors.
    </CaseStudyHero>
  );
}

// ─── Beat 01 — Context ────────────────────────────────────────────
// Sets the room: company stage, three product teams, where I carved
// out the data-ingestion scope, and the team shape I delivered
// against. Mentions the absence of embedded design or data science
// explicitly because the entire project depended on observability I
// built in-house with my engineering team. Downstream-team
// dependencies surface where they matter (Beat 06's outcome
// accounting); Beat 01 stays tight on the room itself so the reader
// reaches the diagnostic in Beat 02 sooner.

function BeatContext() {
  return (
    <Beat
      id="context"
      number="01"
      title="Context"
      headline="Sales-led PR SaaS with a volume-parity narrative."
    >
      <Body>
        <p>
          Muck Rack was a roughly 150-person SaaS reporting tool for
          PR professionals when I joined in late 2022. Product was
          organized into three teams: Content (search and monitoring
          plus the journalist and outlet database), PRM (the
          reporting features customers used to track their coverage),
          and Platform (the shared infrastructure underneath). I was
          hired into Content and carved out the data-ingestion scope
          inside it: the pipeline that turned a fragmented set of
          upstream sources into the content objects every other team
          composed against and the platform that would scale that
          pipeline’s operations. Leadership was hands-on; outside
          the product team, I worked day-to-day with the CEO, chief of
          staff, chief partnerships officer, and head of legal.
        </p>
        <p>
          I worked with an engineering manager and four to five
          engineers. There was no embedded designer (we rarely touched
          the frontend) and no embedded data scientist—the
          data-science function had been operationalized as data
          engineering, and I had to influence their development
          priorities project-by-project. We built out observability in
          Grafana because the organization did not prioritize data
          connectivity across sales, operations, and product data; our
          success was measured against these data individually, but
          not against a blended data point we could use as a leading
          indicator of our success or north star metric.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 02 — Opportunity ────────────────────────────────────────
// Names the problem as the org saw it ("never miss a mention") and
// then unpacks the diagnostic the team converged on. The crucial
// move is reframing the user-reported symptom — "missing mentions" —
// from a quantity problem to a perception problem driven by
// timeliness and accuracy. That reframe is the case study's
// load-bearing product-thinking insight.

function BeatOpportunity() {
  return (
    <Beat
      id="opportunity"
      number="02"
      title="Opportunity"
      headline="Leadership measured volume. The actual opportunity was timeliness and accuracy."
    >
      <Body>
        <p>
          The institutional rallying cry was{" "}
          <Emph>“never miss a mention.”</Emph>{" "}
          GTM sold on content-volume parity with legacy competitors;
          customers and prospects reported missed mentions as the
          most visible quality failure of the product. The instinct
          across the leadership team was that the answer was more
          sources—more partnerships, more integrations, more
          scraping. We did pursue those in parallel. But the
          diagnostic that emerged from the data told a different
          story.
        </p>
        <p>
          We weren’t missing mentions. We were capturing them{" "}
          <Emph>late</Emph>. Every source funnelled into the same
          ETL pipeline and stalled mid-stage during peak ingestion
          windows. From a user’s perspective, a mention that
          arrived four hours late was indistinguishable from one
          that never arrived. A second failure mode lived alongside
          it: parsing errors and content-type misclassification
          dropped <Emph>perceived</Emph>{" "}volume because users
          experienced misclassified content as missing content. The
          system saw it. The system just didn’t surface it
          where the user expected.
        </p>
        <p>
          Two failure modes—one structural (the monolith) and
          one qualitative (parsing and classification accuracy)—read
          to users and leadership as a single symptom:
          low volume. But the symptom is not the disease. The primary
          opportunity wasn’t to source more content. It was to
          move what we already had through the pipeline more efficiently,
          and to label it more accurately when it arrived.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 03 — Discovery ──────────────────────────────────────────
// Two evidence cards from opposite sides of the diagnostic.
// Quantitative is the in-house observability dashboards that turned
// stage-by-stage health into a single legible chart. Qualitative is
// the Productboard-aggregated customer signal, validated with data
// engineering — the perceived-vs-actual-mention insight that
// reframed the problem.

function BeatDiscovery() {
  return (
    <Beat
      id="discovery"
      number="03"
      title="Discovery"
      headline="Observability turned ‘low volume’ into ‘stalled stages.’"
    >
      <Body>
        <p>
          Two strands of evidence converged on the diagnostic. One
          we built; one we listened to.
        </p>
      </Body>

      <EvidenceGrid>
        <EvidenceCard eyebrow="Quantitative" title="Stage-by-stage Grafana dashboards made the bottleneck visible.">
          We instrumented every stage of the pipeline—detected,
          core processing, enrichment, downloaded, supplemental
          enrichment—and counted content objects sitting in
          each stage at any given moment, with alerting on
          thresholds that historically preceded incidents. The
          dashboards reframed the conversation from{" "}
          <Emph>we need more sources</Emph> to{" "}
          <Emph>we need to move what we already have through
          faster</Emph>. The metric I translated for leadership was
          the simplest one available: content objects hitting{" "}
          <Code>downloaded</Code> per day. It was also the metric
          marketing and sales were already using.
        </EvidenceCard>
        <EvidenceCard eyebrow="Qualitative" title="Missed-mention complaints weren’t always about content we never saw.">
          Feature requests aggregated through Productboard, sales
          escalations, and customer-success triage all pointed at
          the same surface symptom: users reported missing
          mentions. Working with data engineering, we matched a
          sample of these complaints against the actual ingestion
          record. A meaningful share of them were about content
          the system had seen and processed, but had labelled in a
          way that pushed it out of the user’s expected
          retrieval path. That insight is what shifted the second
          workstream from a pure quality-improvement effort to a
          volume-perception effort.
        </EvidenceCard>
      </EvidenceGrid>

      <Body>
        <p>
          Both strands pointed at the same conclusion: the
          monolith’s shape was the constraint, and accuracy
          was a quieter half of the same problem. The technical
          investment that followed was justified to leadership on
          the volume math; the team itself understood it as quality
          work.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 04 — Strategy ───────────────────────────────────────────
// Names the bet plainly. Two decomposition axes (content type,
// source) plus a third move that's easy to miss in retrospective
// retellings: standardizing the pipeline stages themselves as
// per-source nanoservices so each stage could iterate independently.
// The dedup-at-detection example is the case study's most concrete
// architectural moment and earns the paragraph it gets.

function BeatStrategy() {
  return (
    <Beat
      id="strategy"
      number="04"
      title="Strategy"
      headline="Decompose along content-type and source boundaries."
    >
      <Body>
        <p>
          The bet was a two-axis decomposition. We split the
          monolith first by{" "}<Emph>content type</Emph>—article,
          broadcast, and so on—so each type ran its own pipeline;
          then by{" "}<Emph>source</Emph> within each pipeline, so our
          proprietary scraping technology, a LexisNexis
          integration, and a TVEyes broadcast content feed each became
          its own microservice. Each microservice had its own detection,
          extraction, and initial transformation setup. The third move was
          standardizing the processing stages of each pipeline
          post-core-processing as composable nanoservices (enrichment,
          download, and supplemental enrichment) so we could iterate per stage
          without rebuilding the surrounding pipeline.
        </p>
      </Body>

      {/* Before/after pipeline figures. Two independent <figure>
          elements (component definitions below the beat) so they
          can be repositioned individually if the editorial spine
          shifts. Each figure renders as a Miro-style schematic in
          SVG and horizontal-scrolls within its own scroll container
          on narrow viewports — the full scope of the architecture
          is part of the story, not something to collapse for layout
          convenience. */}
      {/* Framing line. The figures are credibility-positive for the
          technical PM reader and potentially intimidating for the
          generalist reader. The italic editorial caption above them
          names the audience without protesting too much, and signals
          that the prose carries the same claim. */}
      <p
        className="italic-kern mt-8 mb-2 max-w-[720px] text-[14px] md:text-[15px] leading-[1.45] text-[var(--text-caption)]"
        style={{ fontFamily: "var(--font-primary)", fontStyle: "italic" }}
      >
        Two figures follow: the architecture, before and after. The
        thread continues in prose below.
      </p>
      <PipelineBeforeFigure />
      <PipelineAfterFigure />

      <Body>
        <p>
          The architecture earned its keep on the second-order
          effects. With sources decomposed, we could clearly identify duplicates
          and use them to enrich previously ingested content objects; if
          an article was already downloaded via the LexisNexis microservice
          and was then detected by the scraping microservice, we enriched the
          former with new data from the latter and presented the duplicate mention
          to users in their reporting (a sellable feature).
          Cross-content enrichment was one of two inputs to the
          enrichment nanoservices; separate audience and viewership
          data feeds drove the same stages from outside the content
          pipelines, though their mechanics sit outside this case
          study. With processing stages decomposed, we caught
          processing errors earlier in the pipeline, before storage
          and re-processing piled up with under-processed content.
          Per-source observability let us pinpoint which integration
          was responsible when volume on a given content type
          dipped.
        </p>
        <p>
          Sequencing came down to two forcing functions. Articles
          were the majority of total volume, so peeling article
          processing off first generated the largest legible
          improvement to the metric users and leadership cared about.
          LexisNexis was the critical partnership integration on
          the source side, so isolating it as its own service was
          both architecturally clean and politically necessary—it
          let us iterate stage-by-stage on the most
          contractually sensitive source without coupling that work
          to the rest of the pipeline. The sell-in to leadership
          was the volume math, not the architecture; every
          technical investment had to map back to{" "}
          <Code>downloaded</Code>-per-day before it earned
          engineering cycles.
        </p>
      </Body>

      {/* Aside on long-term positioning. The vendor-leverage point
          earns a mention because it's the architectural payoff that
          extended past the volume math, but it's a degree removed
          from the strategy beat's spine — better as a side note
          than as a fourth body paragraph that competes with the
          three above. ClaudeNote is the existing left-rule aside
          primitive on the site; the `kicker` prop overrides the
          default "How I used Claude" label. */}
      <ClaudeNote kicker="Long view: Negotiating leverage">
        I’m of the opinion that the standardized content schema positioned the platform,
        over time, to exert more negotiating leverage on vendors: the
        more it proved its value to users, the more we could demand a
        richer content schema and appropriate maintenance terms from
        any single vendor (or a cheaper rate if a vendor could not
        meet these demands). This was an underexploited moat, when paired
        with advanced reporting features that relied upon the uniqueness of the platform’s
        enriched data.
      </ClaudeNote>
    </Beat>
  );
}

// ─── Beat 05 — Execution ──────────────────────────────────────────
// Three phases plus a partnerships-track callout. Phase 01 is the
// observability layer that earned us the technical investment.
// Phase 02 is the decomposition itself. Phase 03 is the parallel
// quality-models track with data engineering (parsing accuracy,
// evergreen detection). The closing body paragraph names the
// partnerships-evaluation track — roughly half the role — without
// padding it into its own card.

function BeatExecution() {
  return (
    <Beat
      id="execution"
      number="05"
      title="Execution"
      headline="Three workstreams in parallel, defended against constant injection."
    >
      <Body>
        <p>
          The theory of roadmapping is always cleaner than the practice.
          Some roadmaps are more modular than others and responsive
          to real-time influence from the market and stakeholders.
          Ours was defended quarter-by-quarter against pet projects
          and incoming requests with sales-cycle deadlines
          attached—requests that didn’t map to our stated
          team goal of driving database volume growth. We absorbed
          some of them anyway, and implemented a few outright. My
          EM and I worked closely to shield the
          engineering team from whiplash as much as possible—cushioning
          timeline estimates, partnering on stakeholder management, and
          relying on him to present the technical roadmap because
          leadership respected his title’s authority on
          architecture. Inside that collaboration, we moved work forward on
          three workstreams in parallel.
        </p>
      </Body>

      <IterationGrid>
        <IterationCard lens="Phase 01" title="Observability first, to earn the technical investment.">
          Before any decomposition shipped, we built the
          stage-by-stage Grafana dashboards and the alerting
          thresholds that made pipeline health legible. This is
          what bought us leadership’s patience for structural
          work—not the architectural argument, but the
          single chart that tied every technical investment back
          to <Code>downloaded</Code>-per-day. The dashboards
          stayed live through the rest of the project as both a
          measurement instrument and a communication artifact.
        </IterationCard>
        <IterationCard lens="Phase 02" title="Content-type decomposition first, then per-source microservices.">
          Articles came off first, since they carried the majority
          of total volume. LexisNexis followed as the critical
          source-side peel, then TVEyes for broadcast. We
          brought in an additional engineer roughly halfway
          through this phase, dedicated to the decomposition
          itself, while the rest of the team absorbed day-to-day
          fires and new integrations. Within each pipeline, we
          iterated stage-by-stage on the nanoservices so a fix to
          enrichment didn’t require a rebuild of detection.
        </IterationCard>
        <IterationCard lens="Phase 03" title="Quality models in parallel with the structural work.">
          Article parsing and content-type detection (new vs.
          evergreen) ran as a parallel track with the data
          engineering team, prioritized through internal
          influence rather than formal roadmapping. The accuracy
          gains landed in Q4 2023. Evergreen detection tightened
          what counted as a substantive update, which made
          current monitoring notifications and reporting
          counts more accurate.
        </IterationCard>
      </IterationGrid>

      <Body>
        <p>
          Running alongside all of this, roughly half of my week
          was the partnerships track. Vendor evaluation, integration
          scoping, contract construction, and content-compliance
          work with the head of legal. A broadcast vendor contract-expiration
          deadline led to evaluation of multiple replacements and
          reprioritization of the broadcast pipeline work. A social
          monitoring vendor evaluation became a partnership that later
          became a working integration and outright acquisition
          after my tenure. This work was consistently framed as separate
          from the platform decomposition; in practice it was the same
          job—control over the data, expressed contractually
          on one side and architecturally on the other.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 06 — Outcomes ───────────────────────────────────────────
// Three stats with explicit measurement caveats in the captions.
// The honest framing follows: zero new user-surface features
// shipped, and the "never miss a mention" goal cooled but never
// fully resolved — because it isn't a defensible target without a
// denominator. StatRow over MetricsTable because there's no clean
// "was" baseline to publish for any of the three numbers; the
// deltas are the defensible claim.

function BeatOutcomes() {
  return (
    <Beat
      id="outcomes"
      number="06"
      title="Outcomes"
      headline="Volume rose. The quality dimensions underneath it rose more."
    >
      <Body>
        <p>
          The headline outcome was on the metric the org sold and
          marketed on: average daily content-object volume rose
          350% year-over-year, with parsing-error complaints down
          45% YoY and historical coverage of the database
          expanded fivefold via a backfill that landed in Q1
          2024. Each number is real and each carries a measurement
          caveat worth naming.
        </p>
      </Body>

      {/* bigClassName overrides the default 56/68/80 scale with a
          tighter 44/48/56. The 5-character values ("+350%", "−45%",
          "+500%") set in Instrument Serif have a wide "%" glyph plus
          a leading sign, and at the default lg size they overflowed
          the third-width card. The smaller scale leaves breathing
          room on both sides of the glyph run at every breakpoint
          while keeping the big number visually dominant against the
          eyebrow and caption. */}
      <StatRow cols={3}>
        <Stat
          big="+350%"
          eyebrow="Ingestion"
          caption="Average daily content objects processed, year-over-year. The single metric leadership marketed and sold on, and the one every technical investment had to translate into. This includes article and broadcast content."
          bigClassName="text-[44px] md:text-[48px] lg:text-[56px]"
        />
        <Stat
          big="−45%"
          eyebrow="Parsing errors"
          caption="Year-over-year reduction in user-reported parsing errors. Measured via complaint volume because unknown errors aren’t countable; once we identified a parsing failure, we fixed it."
          bigClassName="text-[44px] md:text-[48px] lg:text-[56px]"
        />
        <Stat
          big="+500%"
          eyebrow="Historical coverage"
          caption="Database expansion via historical backfill from 2 to 5 years of content in Q1 2024. Closed the volume-parity gap against legacy competitors and cooled missed mention pressure. The steady decrease in published content meant these prior years had more valuable data for users."
          bigClassName="text-[44px] md:text-[48px] lg:text-[56px]"
        />
      </StatRow>

      <Body>
        <p>
          The decomposition enabled three downstream products
          —search and discovery, monitoring, and reporting—built
          across two teams: search and monitoring within Content, and
          reporting within PRM. The teams behind them now had faster,
          more accurate, and cleaner data to build against.
          This work improved <Emph>reliability and accuracy</Emph>{" "}beneath
          features that already existed, but it did not generally
          result in net new user features. This is most of what
          senior platform PM work actually is—invisible to a
          screenshot, visible in the metric the org sold and
          marketed on.
        </p>
        <p>
          The “never miss a mention” pressure cooled as we
          progressed towards the Q1 2024 backfill but never fully
          resolved. It couldn’t—“more volume”
          without a numerator or denominator isn’t a target you
          can satisfy. The social monitoring vendor evaluation surfaced this
          tension explicitly: choosing among candidates required a
          definition of “a mention” that the org
          hadn’t committed to. Did we mean a hashtag? Keyword?
          Tag? The PR industry (our users) wasn’t terribly clear
          on the need, but we, as the platform org, needed to have
          a sharper one.
        </p>
      </Body>
    </Beat>
  );
}

// ─── Beat 07 — Reflection ─────────────────────────────────────────
// Three threads, woven as prose. Ordered sharpest-first per the
// recruiter-funnel logic: (1) Unbounded "more X" without a
// numerator/denominator isn't a target; the social-vendor evaluation
// surfaced the gap — this is the lesson with the most pointed
// finding and the most specific surfacing event. (2) Platform PMs
// in sales-led orgs win cycles by translation, not education — and
// in high-conviction leadership rooms the translation craft is
// inseparable from stakeholder management. The stakeholder
// dimension is woven into this lesson (not its own thread) because
// the two skills collapse into one in this kind of org. (3) The
// mapping onto the six quality dimensions in the recent article:
// completeness (backfill), accuracy (parsing models), relevance
// (perceived-volume insight), connectivity (decomposed ETL),
// legibility (stage observability), privacy (compliance work). The
// article is linked inline in prose; mapping is paragraph form, not
// table, per the editorial decision before drafting. Close ends
// with the same recruiter-funnel exit ramp the User Interviews
// study uses.

function BeatReflection() {
  return (
    <Beat
      id="reflection"
      number="07"
      title="Reflection"
      headline="Quality was the lever; quantity was the language."
    >
      <Body>
        <p>
          The sharpest thing I learned at Muck Rack is about the
          metric itself.{" "}
          <Emph>More volume</Emph>, without a numerator or
          denominator, isn’t a target—it’s a
          strategy gap. There’s no defensible answer to
          “are we done” because the goal isn’t
          grounded in the universe of content actually published,
          nor in what users consider a mention in the first place.
          The social vendor evaluation made this visible: choosing
          a partner required defining the moat, and the org
          didn’t have one. Platform work can solve a lot of
          things, but it can’t replace strategy clarity. PMs
          working under unbounded growth targets should be alert to
          this—you can ship excellent work and still be
          chasing a ghost.
        </p>
        <p>
          The companion lesson is about how platform work moves in a
          sales-led organization: by translation, not education. In
          a high-conviction leadership room, translation{" "}
          <Emph>is</Emph>{" "}stakeholder management—the two
          collapse into one craft. The leadership room never flipped
          on the diagnosis—it accepted, gradually, that I was
          driving results in the metric it already marketed and sold
          on. Every structural improvement I shipped had to prove
          itself by estimated impact on the{" "}
          <Code>downloaded</Code>-per-day metric before it earned the
          cycles to develop. Even the qualitative
          wins—parsing accuracy, evergreen detection—were
          largely marketed to users as part of the volume narrative
          rather than as their own stories. Translation went all the
          way down—and so did the work of absorbing shifting
          priorities into structured technical investment, a
          discipline my EM and I built together—and one I’d
          carry into a network-scale role at{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-muck-rack-body", destination: "case-study:people-inc" }}
          >
            <Link href="/case-studies/people-inc">People Inc.</Link>
          </TrackOnClick>
          , where translation across 40+ brands and their stakeholders
          was critical to success.
        </p>
        <p>
          The third thread is the connection to the framework I
          published recently on data quality. In a{" "}
          <Link href={DATA_QUALITY_ARTICLE_URL}>
            LinkedIn article on data practice for growth and
            personalization <span aria-hidden="true">&#8599;</span>
          </Link>
          , I argued that data programs can be evaluated across six
          dimensions: completeness, accuracy, relevance,
          connectivity, legibility, and privacy. The Muck Rack work
          is where those dimensions came from. The historical
          backfill was a completeness move. The parsing and
          content-type models were accuracy work. The
          perceived-mention insight was a relevance reframing.
          The ETL decomposition itself was connectivity. The
          stage-by-stage dashboards were legibility—a system
          state any non-technical stakeholder could read. And the
          ongoing partnership and content-compliance work with
          legal was the privacy column doing its quiet job. The
          article codified what Muck Rack taught me; the case
          study is the practice underneath the theory.
        </p>
        {/* Case-study close — exit ramp for the highest-intent
            reader. Same recruiter-funnel handoff across all 5 work-
            and project-case studies: resume primary, Calendly
            secondary (caption register). A recruiter reading just a
            case study doesn't yet have enough context to commit to a
            call; the resume is the next logical step in the funnel. */}
        <p>
          Two next steps, if this is the kind of PM work
          you’re hiring for:{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CASE_STUDY_CTA_CLICK}
            eventData={{ surface: "case-study-muck-rack-close", destination: "resume" }}
          >
            <Link href="/resume">review my resume <span aria-hidden="true">→</span></Link>
          </TrackOnClick>
          .
        </p>
        <p className="text-[15px] text-[var(--text-caption)]">
          Or, if you’re ready to talk,{" "}
          <TrackOnClick
            event={ANALYTICS_EVENTS.CALENDLY_CLICK}
            eventData={{ kind: "outbound", surface: "case-study-muck-rack-close" }}
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
