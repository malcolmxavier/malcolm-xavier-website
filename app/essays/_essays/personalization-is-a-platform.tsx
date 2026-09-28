// ─────────────────────────────────────────────────────────────────
// Essay: "Personalization isn't a feature, it's a platform"
//
// On-site mirror of the LinkedIn Article first published 2026-06-30.
// Copy is verbatim from the published post — only the styling is
// enriched for the owned surface. Source of truth for the text:
// editorial-workspace/drafts/linkedin/2026-06/week-2026-06-29/
//   2026-06-30-personalization-isnt-feature-platform/final.md
//
// Unlike the pre-campaign articles, this one came out of the campaign
// drafting corpus, so its source is real Markdown: the five `##`
// headings below are the author's own section breaks, carried straight
// onto <EssaySection>. Nothing was merged, split, or retitled.
//
// THREE THINGS WERE CUT, all LinkedIn-native:
//   1. The YAML front matter (post_date, pillar, format, cta, id,
//      drafting notes). That is planning metadata about the post, not
//      part of it; the parts that matter to this page are carried in
//      `meta` below, including the `cta: none` the source declared.
//   2. The "### Companion post" block. On LinkedIn that is the short
//      text update that points at the article; on the article's own
//      page it would be a summary of the thing the reader is already
//      reading, ending in a pitch to go read it.
//   3. The trailing hashtag block.
// Nothing else. There is no closing engagement question to remove —
// the piece already ends on its argument — and no job CTA paragraph,
// so none was kept.
//
// NO CALLOUT, PULLQUOTE, OR LIST, and that is the source rather than an
// omission. The Markdown has no `>` blocks, no `-`/`1.` lists, and no
// italics, so there is no line the author set apart and nothing
// enumerated. The closest candidate is the run of questions in the
// first section ("How is The Bear like other content we serve? Who is
// this viewer, really? …"), which is deliberately a sentence-run inside
// a paragraph: breaking it into a <List> would turn a rhetorical
// cascade into a checklist and change how it reads.
//
// The dropcap applies. The first word is "Open" — longer than one
// letter, and its "O" is separable from the rest, which is the test the
// primer essay's comment spells out.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/essays/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body } from "@/components/case-study/primitives";
import { EssaySection } from "@/components/writing/EssaySection";
import { Divider } from "@/components/reading/Divider";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "personalization-is-a-platform",
  pillar: "media",
  title:
    "Personalization isn’t a feature, it’s a platform—and most streaming services get it backwards",
  metaTitle: "Personalization is a platform, not a feature",
  description:
    "Most streaming services ship a “Because you watched” row and call it personalization. The real thing is four layers, and the row is the last one.",
  postDate: "2026-06-30",
  // The source front matter declares `cta: none`. The piece closes on
  // its argument rather than on an ask.
  cta: "none",
  ogTitleLines: ["Personalization", "isn’t a feature,", "it’s a platform"],
  ogTitleSize: 76,
  ogSubtitle:
    "Content likeness, identity, behavioral context, and governance, built as one surface.",
};

export default function Essay() {
  return (
    <>
      <Body>
        <p className="essay-dropcap">
          Open almost any streaming app and you’ll find a row called “Because
          you watched.” That row is what most companies mean when they say
          personalization. It’s also why most personalization quietly
          underdelivers.
        </p>
        <p>
          A recommendation row is a feature. It sits on top of a content
          catalog, and you can ship it in a quarter. Real personalization is a
          platform with several layers that have to work together: content
          likeness (how titles relate to each other), who the user actually is,
          what user behavior across the whole catalog tells you, and what you’re
          allowed to do with that information. Content likeness is the visible
          layer—the row. Most teams build it first and never build the others.
        </p>
        <p>
          I spent two years building the layers underneath at People Inc.,
          across 40+ brands and 22M+ users. Here’s why the order most companies
          choose is backwards, and what it costs them.
        </p>
      </Body>

      {/* A rule before every section, including the first, which hands
          the opening lede off to the sectioned argument. Same
          arrangement as the primer essay: the Divider is a sibling
          between the blocks, outside both <Body> and <EssaySection>. */}
      <Divider />

      <EssaySection title="The recommendation row is the last layer, not the first">
        <Body>
          <p>
            “Because you watched The Bear” is the output of personalization, not
            the system. By the time a row renders, a series of harder questions
            have already been answered—or skipped. How is The Bear like other
            content we serve? Who is this viewer, really? What does their
            behavior across everything they’ve touched tell us? What about the
            behavior of other users? And what does our agreement with them let
            us use?
          </p>
          <p>
            Skip those, and the row is just a content popularity chart addressed
            to the user. A lot of streaming personalization is exactly that:
            catalog-wide trending, lightly filtered by the one show you
            finished.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Identity is the layer everyone skips">
        <Body>
          <p>
            You can’t personalize for a person you can’t recognize. At People
            Inc., personalization didn’t start with a model—it started with
            identity. The mandate I was handed looked like a newsletter
            migration. What it actually needed was a multi-year identity,
            registration, and onboarding layer so we could recognize the same
            human across 40+ brands instead of treating every brand visit as a
            stranger.
          </p>
          <p>
            That layer is unglamorous, and it is the whole game. Once you can
            recognize a person, behavioral context compounds across every
            interaction. Until you can, every interaction starts from zero.
          </p>
          <p>
            Streaming has a sharper version of this problem than publishing did:
            shared accounts, four profiles on one login, a kid’s show and a
            prestige drama an hour apart. Get identity wrong and your
            “personalization” is averaging across people who aren’t actually the
            same person.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Behavioral context lives across the catalog, not inside one title">
        <Body>
          <p>
            The most effective recommendation work I did at People Inc. wasn’t a
            better algorithm. It was a decision about where to draw the training
            boundary. We relaunched MyRecipes on a model trained across reader
            behavior on every food brand in the network, not just the brand a
            reader happened to arrive on MyRecipes from—and it doubled traffic
            against the recipe-of-the-day baseline.
          </p>
          <p>
            The model was ordinary. The cross-property training set was the
            unlock.
          </p>
          <p>
            Streaming has the same boundary problem hiding in plain sight.
            Behavior on one title, one franchise, or one genre is a thin signal.
            Behavior across the full catalog—what someone abandons, what they
            rewatch, whether they browse or binge—is the rich one. Personalize
            within a title and you get more of the same. Personalize across the
            catalog and you start getting the person.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Governance is part of the product surface, not the legal review at the end">
        <Body>
          <p>
            Here’s the layer growth teams treat as someone else’s job: what
            you’re allowed to do with the data. I sharpened my product sense
            through an MS in Law focused on data privacy, so I read consent and
            data rights as product inputs, not compliance overhead. What you can
            collect, what you can join, how long you can keep it, and what a
            user can revoke—those constraints shape the personalization surface
            as directly as any model does.
          </p>
          <p>
            Teams that bolt governance on at the end build systems they later
            have to tear out. Teams that treat it as a design constraint from
            the start build personalization that survives a regulator, a breach
            disclosure, and a user who actually reads the settings page. In
            streaming, where the data is intimate—what you watch alone, late,
            repeatedly—that isn’t a nicety. It’s the license to operate.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="You can tell who made the platform bet">
        <Body>
          <p>
            Personalization as a feature is a row you can ship this quarter.
            Personalization as a platform is content likeness, identity,
            behavioral context, and governance built as one surface—the row you
            see riding on three layers you don’t.
          </p>
          <p>
            And you can tell, as a user, which bet a company made. When a
            service recognizes you across devices, gets sharper the more you use
            it, and never makes you feel surveilled, someone built the platform.
            When it recommends the show you just finished and forgets who you
            are on your phone, someone shipped the row.
          </p>
          <p>
            Most streaming services shipped the row. The opportunity is in the
            layers underneath.
          </p>
        </Body>
      </EssaySection>
    </>
  );
}
