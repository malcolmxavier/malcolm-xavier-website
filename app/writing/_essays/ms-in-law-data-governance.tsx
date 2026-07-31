// ─────────────────────────────────────────────────────────────────
// Essay: "What an MS in Law taught me about data governance…"
//
// On-site mirror of the LinkedIn article (p13, first shared
// 2026-05-27). Copy is verbatim from the published post — only the
// styling is enriched for the owned surface. The LinkedIn-only tail
// (companion post + hashtags) is intentionally omitted; the closing
// job-CTA paragraph is part of the article and stays.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/writing/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body, Emph } from "@/components/case-study/primitives";
import { EssaySection } from "@/components/writing/EssaySection";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "ms-in-law-data-governance",
  pillar: "craft",
  title:
    "What an MS in Law taught me about data governance that no PM course ever did",
  metaTitle: "What an MS in Law taught me about data governance",
  description:
    "Three lessons from a privacy-compliance rebuild at People Inc.—where compliant and trustworthy weren’t the same decision, and the legal vocabulary changed the product.",
  postDate: "2026-05-27",
  cta: "job",
  ogTitleLines: ["What an MS in Law", "taught me about", "data governance"],
  ogTitleSize: 92,
  ogSubtitle:
    "Three lessons from a privacy-compliance rebuild at People Inc.—where compliant and trustworthy weren’t the same thing.",
};

export default function Essay() {
  return (
    <>
      <Body>
        <p className="essay-dropcap">
          When I started my MS in Law program at Northwestern in 2021, I
          remember having a clarity of vision: all PMs are going to need to know
          multiple “sides” of data; if you work in consumer products,
          understanding the legal side of data helps you build stable products
          that don’t collapse under every data policy change.
        </p>
        <p>
          I didn’t foresee exactly this moment we’re in now, but I have to say
          the idea wasn’t far off from reality—an organization’s fragility in
          2026 can be measured by the lack of strategy behind its AI and data
          policies.
        </p>
        <p>
          My studies focused on the intersection between data, privacy, and
          intellectual property law and regulation. At work, I translate this
          expertise into advisement on data, trust, and identity. I leave the
          legal signoff to the lawyers, but I know enough to cut through the
          noise and spot refined opportunities that others cannot, balancing
          business risk, user delight, and overall impact.
        </p>
        <p>
          The best way to illustrate how this works in practice is through a
          real project. At People Inc., I led the late-stage technical
          refinement and implementation of a privacy compliance initiative on
          the Parents brand: re-enabling collection of child due date (and the
          automated transformation to birthdate once the date had passed) after
          Washington’s My Health My Data Act and Nevada’s SB 370 came into
          effect in late Q1 2024. Collection had been turned off in
          anticipation of those laws, and the business had lost
          personalization-grade signal on one of its highest-value
          segments—expectant and new parents. The entire pregnancy-date-based
          newsletter program was dark.
        </p>
        <p>
          By the time the work reached my team, legal had cleared a path forward
          and a working group spanning privacy product, the brand product team
          for Parents, and brand Editorial had built an initial design. Below
          are three lessons, backed by my MS in Law, that shaped how I led a
          rebuild before we shipped.
        </p>
      </Body>

      <EssaySection title="Compliance is a constraint. Interpretation of that constraint determines your impact.">
        <Body>
          <p>
            The initial design collected contact information and child due date
            first, then asked the user which newsletters they wanted to
            subscribe to and provided a disclosure on data usage. That’s a
            technically compliant flow on paper—consent language was in place,
            the disclosures were attached. It’s also a flow that would routinely
            collect privacy-protected data from users who weren’t going to sign
            up for the pregnancy-date-based newsletter at all. We’d be
            processing and holding sensitive data we had no product use for. And
            that’s assuming they don’t just abandon signup altogether because of
            this.
          </p>
          <p>
            That distinction—<Emph>compliant</Emph> versus{" "}
            <Emph>trustworthy</Emph>—is one PM training doesn’t teach you to
            make. Understanding privacy law enables me to be more opinionated
            where it counts. The right move was structural: ask which
            newsletters the user wanted first, and only collect due date when
            the user’s selection actually required it. Same data schema;
            protected relationship with the user; and decreased business costs.
          </p>
          <p>
            Our onsite marketing vendor had never served a multi-page modal flow
            before, so we partnered with them to build the design pattern. That
            same multi-page pattern later powered Follow This Topic and the
            inline and toaster marketing units that became the platform’s most
            flexible surfaces (more on this next week). The Parents compliance
            work funded infrastructure the rest of the network would inherit.
          </p>
        </Body>
      </EssaySection>

      <EssaySection title="The more intentional you are about handling data, the more positive everyone’s experience with it is.">
        <Body>
          <p>And that includes users and staff.</p>
          <p>
            Logical argument that the flow needed reordering wasn’t enough (and
            rarely is in PM); I had to prove it was the right decision before the
            team would refactor a design they’d already approved. I leveraged
            pre-existing relationships with the privacy and legal teams to
            co-prioritize an unmoderated user research study on prototypes. I
            drove through delegation, and the platform designer I worked with
            built the prototypes and ran the study. We partnered on synthesis and
            had regular check-ins throughout the process with the Health team’s
            designers and the VP overseeing both the privacy and Health product
            teams. The study timed users through both flow orderings and captured
            friction qualitatively through participant video self-recording.
          </p>
          <p>
            The newsletter-first ordering won decisively. We presented the
            read-out to the same group, and the Health team’s designers carried
            the findings to Editorial because they had the longer-standing
            relationship there—political mechanics matter as much as the
            research. Editorial signed off. Legal then co-authored the new
            help-text language inside the UI alongside the existing privacy
            policy disclosures, because regulatory copy that lives in a footer
            reads differently from the same disclosure inline at the moment of
            collection.
          </p>
          <p>
            That’s the data-minimization argument in operational terms.
            Collecting less isn’t just a smaller exposure to a future enforcement
            action. It’s a more trustworthy experience for consumers, and a
            cheaper system to maintain across the inevitable changes in what
            users expect from us about their data.
          </p>
        </Body>
      </EssaySection>

      <EssaySection title="Not every compliance requirement needs to affect the data architecture. Trust is by design.">
        <Body>
          <p>
            We also interpreted the regulations to apply based on where the user
            was signing up <Emph>from</Emph>, not just whether they were a
            resident of that state. The design started to inflate around handling
            four cases (resident-and-in-state, resident-out-of-state,
            non-resident-in-state, non-resident-out-of-state). I pushed back on
            architecting data collection against this complexity: we had no
            product use for that signal beyond the moment-of-consent decision, so
            it belonged in the presentation layer (the help text and disclosure),
            not the data layer. All we needed to capture was which state we
            collected consent for, if any, and as of what date.
          </p>
          <p>
            That call is the kind of thing that’s easy to over-engineer if you
            don’t have the legal vocabulary to know exactly what a regulation is
            prescribing. We mapped data with infrastructure that anticipated
            future states adding diverging language—the language could fan out
            cleanly while the schema stayed normalized.
          </p>
          <p>
            We also re-shipped the newsletter program itself. Pregnancy is a
            uniquely sensitive experience—the program had to acknowledge
            potential loss and route accordingly, confirm birthdate
            post-due-date, and offer clean opt-outs at every life-stage
            transition. Those aren’t compliance features. They’re features that
            make the program a tool a user can trust to handle hard moments. This
            was an important user experience to deliver on from the beginning
            because the newsletter sought to expand into post-pregnancy content
            delivery.
          </p>
        </Body>
      </EssaySection>

      <EssaySection title="How my legal expertise shapes my product practice">
        <Body>
          <p>
            I’m not a privacy lawyer—I’d rather have a real one in the room. What
            the MS in Law gave me is the ability to be useful in the same room
            with legal and other stakeholders, playing facilitator, translator,
            and negotiator all at the same time. To spot when a design that
            passed legal still has a trust problem in the user flow. To know when
            an architectural change can solve a compliance question more durably
            than a consent disclosure on its own. To recognize that data subjects
            need management tools for the data we hold about them—which, on this
            project, became another argument for the user-registration and
            onboarding roadmap I was stewarding underneath the network’s growth
            programs.
          </p>
          <p>
            That, more than anything, is the case for PMs going through this kind
            of training. Not to replace specialist counsel. To minimize the risk
            to users whose trust the system depends on and the business which
            depends on its relationships with its users.
          </p>
        </Body>
      </EssaySection>

      {/* Short coda rule before the closing note — sets the job CTA off
          from the argument the way the article's rule did. Decorative. */}
      <hr
        className="w-16 h-px border-0"
        style={{ background: "var(--border-default)" }}
        aria-hidden
      />

      <Body>
        <p>
          I’m currently exploring Senior PM roles in media and
          streaming—specifically teams building data platforms, audience
          development, or personalization at scale where privacy and governance
          are first-class constraints. If your team treats data governance as a
          product surface rather than a compliance afterthought, I’d love to
          talk.
        </p>
      </Body>
    </>
  );
}
