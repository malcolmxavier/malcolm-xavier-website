// ─────────────────────────────────────────────────────────────────
// Essay: "Context Rules Everything"
//
// On-site mirror of the LinkedIn Article first published 2026-04-13.
// Copy is verbatim from the published article — only the styling is
// enriched for the owned surface. Source of truth for the text:
// editorial-workspace/drafts/articles/2026-04-13-context-rules-everything/
//
// The first piece on the AI pillar, and at ~800 words the second
// shortest of the imported set. Like "Technically Speaking…" it carries
// no HEADINGS, so the turns are marked with rules instead: the opening
// anecdote, the case built out of Malcolm's own career, and the pivot
// to AI that gives the old lesson a new audience. Three parts, two
// rules, and a heading over any of them would over-declare a piece that
// runs as one continuous argument.
//
// The source was pasted as Markdown with straight quotes and straight
// apostrophes throughout. Those are curled here, per the sitewide
// glyph convention — a typography normalization, not an edit. Every
// em-dash, en-dash, and ellipsis is reproduced at the source's own
// spacing.
//
// NO DROP CAP, deliberately. The rule is `.essay-dropcap::first-letter`,
// which takes the first CHARACTER of the paragraph — and this essay
// opens on an opening quotation mark, so the cap would land on the
// punctuation and set a display-size “ beside a body-size "Malcolm".
// The test before applying the class to a new essay: is the first WORD
// longer than one letter, and is its first letter separable? A leading
// quote mark fails before the test is even reached.
//
// THE PASCAL LINE IS A BLOCKQUOTE, and it is the only thing in the set
// that qualifies. <blockquote> tells assistive tech the words came from
// another source, which is exactly true here: it is Blaise Pascal's
// sentence, and the published article already sets it off with his name
// under it. Every other passage anyone might want lifted in this essay
// is Malcolm's own prose, so it would be a Callout (own words, once) or
// a Pullquote (own words, repeated) instead — and none of them are set
// off in the source, so none are set off here. Note that Pascal's line
// ALSO appears in quotation marks inside the paragraph above the
// blockquote. Both are kept; that is how the article reads.
//
// TWO THINGS WERE CUT, both LinkedIn-native:
//   1. The trailing hashtag block (#AI #LLMs #Context …).
//   2. The closing engagement question ("How are you approaching
//      context as you boost your AI skills? What are you learning about
//      communication and stakeholder management as a result?"). On
//      LinkedIn that opens a comment thread; here it points at nothing.
//      The final paragraph lands the argument on its own.
//
// ONE THING DELIBERATELY LEFT ALONE: "As I wrote last week, information
// architecture is a critical skill…" refers to a LinkedIn piece that is
// not on this site, so there is nothing to link it to. It reads as an
// aside either way, and rewriting it would be an edit to the copy.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/writing/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body } from "@/components/case-study/primitives";
import { Blockquote } from "@/components/reading/Blockquote";
import { Divider } from "@/components/reading/Divider";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "context-rules-everything",
  pillar: "ai",
  title: "Context Rules Everything",
  // The on-page title is the thesis and says nothing about AI, which is
  // the pillar it sits on and the reason a reader lands here from
  // search. The SERP title names it.
  metaTitle: "Context management is the real AI skill",
  description:
    "Context has always ruled everything. AI just made it easier to see—and gave it a through-line to the P&L.",
  postDate: "2026-04-13",
  // No ask at the end. The article closes on its argument, and the
  // LinkedIn engagement question that used to follow it was cut.
  cta: "none",
  ogTitleLines: ["Context Rules", "Everything"],
  ogTitleSize: 104,
  ogSubtitle:
    "Context has always ruled everything. AI just made it easier to see.",
};

export default function Essay() {
  return (
    <>
      <Body>
        <p>
          “Malcolm often says in 7 words what could be said in 1.” — a piece of
          feedback I received earlier in my product career. I was more
          frustrated with this when I received it, but now I laugh
          because…it’s wrong.
        </p>
        <p>
          And to clarify, the person who gave me this feedback feels this way,
          and his feelings were valid. However, my takeaway wasn’t so much that
          I needed to be concise as it was that he didn’t have the right
          information to understand the value of the additional 6 words. In
          other words, he was lacking context.
        </p>
      </Body>

      {/* The first rule falls after the clarification, not after the
          opening quote. The quote and the paragraph that qualifies it are
          one move — the feedback, and why he now thinks it was wrong — and
          the examples start after them.

          It was after paragraph one, from the same invented rule that
          misplaced Roadmap's: the porting brief said "always a rule after
          the opening paragraph", generalised from one instruction about one
          other essay. Malcolm's call, 2026-09-28. */}
      <Divider />

      <Body>
        <p>
          At another point in my career, I was working with a particularly
          challenging executive, and they wanted an update on some of my work. I
          shared the update (about 7 bullets…something about that number) with
          my leadership in advance, and pretty immediately she said, “Oh. Let’s
          get this shorter. He’s not going to read all of this.” But I also knew
          this executive preferred context to be shared up front. So I didn’t
          respond right away. After a few minutes had passed (the time needed to
          actually read it), she came back, “Wait. He needs all this
          information. Let’s just send this.” Could I have trimmed the 7 bullets
          to 1? For sure. But the context of the last 6 would’ve been missing,
          which would’ve only resulted in more back-and-forth, wasting time and
          money for everyone involved.
        </p>
        <p>
          In my time at People, I experienced “3x3s” for the first time:
          employees email 3 points of progress and 3 opportunities to a broad
          set of stakeholders weekly. Everyone has their own list, and the more
          senior you are, the more you are summarizing across a wider portfolio
          of work, which is perhaps obvious. The challenge each week was to be
          as succinct as possible while also providing enough relevant context
          so the information presented could be properly interpreted. (“I would
          have written a shorter letter, but I did not have the time.” was often
          quoted—and misquoted.) The challenge was heightened by the fact that
          each email is sent to tens (sometimes hundreds) of people, and each
          individual receives tens of them… each week.
        </p>
        {/* Someone else's sentence, which is the whole test for this
            component. The attribution is its own line inside the
            quotation, matching the source's "– Blaise Pascal" — an
            en-dash, not an em-dash, as he wrote it. */}
        <Blockquote>
          <p>
            I would have written a shorter letter, but I did not have the time.
          </p>
          <p>– Blaise Pascal</p>
        </Blockquote>
        <p>
          Most of the emails I received in this fashion had little value because
          most people considered them a frustrating, tick-the-box task each
          week. And, unfortunately, that is a vicious cycle, a self-fulfilling
          prophecy. The primary function of these emails was to effectively
          communicate strategy and vision out to organization members who are
          not as close to your work, but most used them to provide status
          updates that would only be meaningful to someone closer to the work.
          Again, there was a dearth of context.
        </p>
      </Body>

      {/* The turn. Everything above is Malcolm's own career; everything
          below is the present tense, where AI has made the same lesson
          legible to people who would not have sat still for it. */}
      <Divider />

      <Body>
        <p>
          And now, it seems many have woken up to the value of context (and its
          management), because it’s easier to perceive when working with AI. It
          shows up in LLM outputs to the point that compact and clear commands
          are critical for day-to-day workflows. Context management also has a
          clear impact on token usage, meaning there is a stronger through-line
          to P&L, which has made people more willing to face the concept of
          context head-on.
        </p>
        <p>
          As AI tooling becomes more ubiquitous, we’re circling back to what
          I’ve known all along: context rules everything. Without it, we work
          less efficiently, make less impactful decisions, and are more prone to
          mistakes. As I wrote last week, information architecture is a critical
          skill for today’s PMs (and anyone scaling LLM usage at their
          organization). This is due, in large part, to the fact that this
          understanding will lead to better context management, which, in turn,
          will yield a positive, attributable impact on P&L. Because it’s never
          been just about providing context in a vacuum. It’s about providing
          the right amount of context, at the right time.
        </p>
      </Body>
    </>
  );
}
