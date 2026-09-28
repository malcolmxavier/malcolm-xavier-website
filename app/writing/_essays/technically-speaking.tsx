// ─────────────────────────────────────────────────────────────────
// Essay: "Technically Speaking…"
//
// On-site mirror of the LinkedIn Article first published 2025-12-28.
// Copy is verbatim from the published article. Source of truth:
// editorial-workspace/drafts/articles/2025-12-28-technically-speaking/
//
// The shortest of the four pre-campaign articles at ~650 words, and
// deliberately UNSECTIONED. The MS-in-Law essay carries four sections
// over 1,400 words; at this length the argument is one continuous move
// — shallow heuristic, then the capital-T/lowercase-t split, then what
// it means for a PM's next few years — and cutting it into headed
// sections would impose a structure the piece does not have.
//
// This is the essay Craft's blurb was widened for. It is about PM
// practice rather than the law/theatre/non-linear-career reading the
// pillar used to describe, which is what prompted the rewrite on
// 2026-09-28.
//
// TWO LINKEDIN-ISMS REMOVED:
//   1. The inline "#productManagement" hashtag in the opening sentence,
//      which reads as a tag on LinkedIn and as a typo anywhere else. It
//      is plain "product management" here.
//   2. Nothing else. The 🤓 stays — that is his voice, not a platform
//      artifact.
//
// The P.S. is kept AS WRITTEN and it carries an open question: its
// first clause refers to "the article image", which this page does not
// have. See the note above it.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/writing/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body } from "@/components/case-study/primitives";
import { Divider } from "@/components/reading/Divider";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "technically-speaking",
  pillar: "craft",
  title: "Technically Speaking…",
  metaTitle: "What “technical” actually means for a PM",
  description:
    "Technical with a capital T is the kind of product you support. Technical with a lowercase t is a skill every PM now needs—and the line keeps moving.",
  postDate: "2025-12-28",
  cta: "none",
  ogTitleLines: ["Technically", "Speaking…"],
  ogTitleSize: 104,
  ogSubtitle:
    "Capital-T Technical is the product you support. Lowercase-t technical is the skill every PM now needs.",
};

export default function Essay() {
  return (
    <>
      <Body>
        <p className="essay-dropcap">
          Many have written that being technical in product management is not
          about knowing how to write code, but about enabling more effective
          collaboration between engineering and other stakeholder teams. This is
          true, but it’s a shallow heuristic. Mostly because it’s often
          communicated with a lesson for PMs to just get out of the way. But
          it’s not about getting out of the way; it’s about having discernment
          about when to get out of the way, and perhaps, when to get in the way
          — trust but verify.
        </p>
        <p>
          When talking about product leaders, Marty Cagan puts forth that
          product leaders are specifically people managers. Of course,
          leadership is a key skill for any product manager, but this
          delineation provides helpful guidance on what we usually mean when we
          say someone is a “product leader.”
        </p>
        <p>We can take a similar approach when discussing PMs being technical:</p>
        <p>
          On the one hand, we have PMs supporting the development of technical
          products. These are usually products leveraged by internal users or by
          technical external users, such as developers. Think APIs, technical
          platforms, databases, DevOps, etc. PMs leading product teams that
          develop such products are Technical Product Managers (TPMs). At the
          end of the day, though, titles are about career positioning more than
          the brass tacks of doing the job.
        </p>
        <p>
          Separately, any PM may have technical skills that equip them to enable
          more efficient collaboration throughout the product development
          lifecycle. Here, “technical” indicates a specific branch of knowledge
          that is best demonstrated through a PM’s communication skills. For
          example, a technical PM may know the difference between HTML
          attributes, HTML properties, and CSS classes; targeting each of these
          in a technical implementation involves different tradeoffs, and a
          technical PM can drive discussions of these tradeoffs more efficiently
          than a non-technical PM.
        </p>
        <p>
          A TPM is not necessarily technical and vice versa. In other words,
          technical with a capital “T” should indicate the types of products a
          PM supports, not their level of technical skill. And technical, with a
          lowercase “t,” is something all PMs could benefit from becoming.
        </p>
        <p>
          When I was breaking into PM, I was bullish on becoming technical
          because I could see then, as I do now, where technology is headed:
          products increasingly require complex technical builds that often
          leverage both user and business data. AI expectations (though not
          necessarily AI itself) are driving us toward this complexity even more
          rapidly. To remain competitive and stay in-market, PMs without
          technical skills need to develop them yesterday. If you’ve already got
          some, it’s time to deepen them. The line is only going to keep moving.
        </p>
        <p>
          Today, there are few technical decisions that are truly separate from
          product decisions. PMs that understand this (and can convince
          engineers of this) will be the most successful at driving outcomes,
          impact, and value. In other words, we need to use our technical skills
          to build trust with engineers and bring them more into the PM space,
          not to go deeper into the engineering space (even if you’re like me
          and love it in there 🤓).
        </p>
      </Body>

      {/* The coda rule, the same move the MS-in-Law essay makes before
          its closing note: it sets the P.S. off from the argument
          without pretending to be a section boundary. */}
      <Divider />

      <Body>
        {/* OPEN: this P.S. opens by pointing at "the article image",
            which existed on LinkedIn and does not exist here. Kept as
            written rather than trimmed, because it is Malcolm's copy
            and the recommendation in its second half stands on its own.
            Three ways out, his call: carry the still as a Figure (it is
            evidence rather than decoration — the whole point is that it
            demonstrates the argument), rewrite the opening clause so
            the recommendation leads, or cut the P.S. entirely.

            Flagging the first one properly: the still is a frame from a
            documentary its owner has deliberately never released
            digitally, reproduced on a site that functions as
            professional marketing. That is a weaker fair-use posture
            than a review or commentary context would be, and it is
            worth a deliberate decision rather than a default. */}
        <p>
          P.S. — The article image is from a scene in Beyoncé’s “Renaissance”
          documentary where she demonstrates “trust but verify” while working
          with her lighting team on the tour. I can’t find the clip because she
          famously has not released the film on digital, but I highly recommend
          it if you can find it because it gets to the core of what I’ve said
          here in seconds.
        </p>
      </Body>
    </>
  );
}
