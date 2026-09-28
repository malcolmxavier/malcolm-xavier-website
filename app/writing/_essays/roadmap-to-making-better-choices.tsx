// ─────────────────────────────────────────────────────────────────
// Essay: "A Roadmap to Making Better Choices"
//
// On-site mirror of the LinkedIn Article first published 2024-06-04 —
// the oldest piece in the set. Copy is verbatim from the published
// article. Source of truth:
// editorial-workspace/drafts/articles/2024-06-04-roadmap-to-making-better-choices/
//
// ~1,600 words with NO HEADINGS, and adding them would be an edit
// rather than a port: the piece is one conversation walked end to end,
// and a heading on each stage would announce a structure Malcolm
// deliberately left implicit. So the rules carry it. They fall on the
// four turns the prose itself marks — the two halves of the
// conversation (curiosity, then discernment), the negotiation the
// questions were preparing for, the argument about agency that the
// conversation opens onto, and the coda — plus the one after the
// opening paragraph, which hands the career framing off to the
// conversation itself.
//
// Both question lists are NUMBERED rather than bulleted. The published
// article bullets them, but they are ordered in fact: each one is a
// sequence he works through, and the second list is explicitly gated
// ("Only after these questions have been answered can I ask…").
// Numbered is also what the data primer's lists use, which is the
// house precedent for a list of this shape.
//
// The mutual-agency paragraph is a Callout. It is the sentence the
// whole agency-law digression is built to earn — employees as
// principals of their careers, employers as the agents — and
// everything after it follows from it. Callout and not Blockquote
// because the words are Malcolm's own and are not quoted from
// anywhere; Callout and not Pullquote because they appear once. There
// is no Pullquote in this file at all: the article never repeats a
// line, and lifting one that was not lifted at the source would be a
// device this piece does not use.
//
// ONE THING CUT: the closing "If you've read this and think it might be
// time for you to have a conversation like this with someone, please
// reach out. I'm just a message away." That is an invitation to DM him
// on LinkedIn, and on this page there is no inbox behind it. The
// "Nothing ventured, nothing gained" line ends the argument by itself.
//
// Left alone deliberately: the "?;" punctuation inside both lists, the
// spaced en-dashes in the discernment paragraph, and "where I help can
// get them unstuck" — his published text, not typos to be tidied on
// the way through.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/writing/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body } from "@/components/case-study/primitives";
import { Link } from "@/components/primitives/Link";
import { Callout } from "@/components/reading/Callout";
import { Divider } from "@/components/reading/Divider";
import { List } from "@/components/reading/List";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "roadmap-to-making-better-choices",
  pillar: "craft",
  title:
    "A Roadmap to Making Better Choices: Developing Curiosity, Discernment, and Agency",
  metaTitle: "Curiosity, discernment, and agency",
  description:
    "Mentorship conversations tend to resolve to three skills: curiosity, discernment, and agency—and to remembering you are the principal of your own career.",
  postDate: "2024-06-04",
  cta: "none",
  ogTitleLines: ["A Roadmap to", "Making Better Choices"],
  ogTitleSize: 90,
  ogSubtitle:
    "The three skills every mentorship conversation comes back to: curiosity, discernment, and agency.",
};

export default function Essay() {
  return (
    <>
      <Body>
        {/* Dropcap is safe here: the first word is "Over", so the rule's
            single-character ::first-letter leaves "ver" reading
            correctly. */}
        <p className="essay-dropcap">
          Over the last couple of years, I’ve been playing more of a mentorship
          role in my professional life as I transition into my mid-career. It’s
          been an exciting time and I’m grateful to those that have trusted me
          to advise them. I’ve gotten to mentor and peer mentor early-stage
          professionals in product, yes, but also across many other functions.
          I’ve also been able to use my negotiation skills to support these
          professionals. I typically deploy these skills to support
          organizational partnership contract formation or management, but I’ve
          found I also enjoy supporting negotiated offers, promotions, and exits
          for employees across these other functions.
        </p>
      </Body>

      <Divider />

      <Body>
        <p>
          Even though I don’t have expertise across these functions, I find my
          conversations look quite similar. My role in the conversations is to
          act as a honing blade for the other person, pointing them in the right
          direction by asking questions, clearly expressing my thinking and
          reasoning (whether I agree with them or not). I also aim to give them
          permission to come to their own conclusions (not that they need that
          permission from me). Recently, my mentorship conversations have
          increasingly required that I also play the role of whetstone, helping
          the other person to sharpen skills that are atrophying in response to
          the poor leadership that riddles today’s markets.
        </p>
        <p>
          While there are many skills, both soft and hard, that a professional
          needs to thrive in today’s workforce, I am only qualified to teach
          people so many. Luckily, just about every one of these particular
          conversations boils down to the need to sharpen at least one of three
          specific skills that I’m familiar with: curiosity, discernment, and
          agency.
        </p>
        <p>
          I find the best way to encourage these skills is to demonstrate them
          while in conversation. I start with my own curiosity. Before making
          any statements, I prefer to ask a ton of questions. Of course, to be
          effective in this I need to know what questions to ask and how to ask
          my questions in a way that drives toward the necessary answers.
        </p>
        <p>
          Though her book is about product discovery, Teresa Torres’s{" "}
          <Link href="https://www.producttalk.org/continuous-discovery-habits/">
            Continuous Discovery Habits
          </Link>
          , particularly the “Continuous Interviewing” chapter, is a great
          resource for skilling up here for those interested. In this early part
          of the conversation, I’m trying to understand:
        </p>
        <List ordered>
          <li>What is the challenge the person I’m talking with is facing?;</li>
          <li>
            What important events in their story have happened and what part of
            the story are they currently in?; and
          </li>
          <li>What are their motivations?</li>
        </List>
        <p>
          The hope is that by the mid-point of the conversation, I have a firm
          enough grasp on the support the person needs that I understand how I
          can best help them, including understanding where I cannot.
        </p>
      </Body>

      <Divider />

      <Body>
        <p>
          As the conversation begins shifting towards its back half, it starts
          feeling more strategic and I begin layering in statements. This helps
          to model the discernment that the person will need to accomplish their
          goals. The questions never stop, but by this point, they are more
          specific and I am expressing more of my opinions on the matter at
          hand.
        </p>
        <p>
          I make a point of leading with where I am unable to offer the
          advisement they need – hopefully, I can point them in the right
          direction of resources, whether that’s another person, a book, or
          something else – so that the remainder of our conversation is
          laser-focused on areas where I help can get them unstuck more
          immediately. In trying to understand where I can offer support, I
          typically ask some variation of the following:
        </p>
        <List ordered>
          <li>What are all the possible outcomes?</li>
          <li>What is your ideal outcome?;</li>
          <li>What is the worst possible outcome?;</li>
          <li>What is the most likely outcome?;</li>
          <li>What is the worst possible outcome you will accept?;</li>
          <li>Who has the decision-making power in the situation?; and</li>
          <li>What action will you take for each possible outcome?</li>
        </List>
        <p>
          Only after these questions have been answered can I ask: Where,
          specifically, can I offer my skills to assist you? For some, this is
          legal research to better inform the likelihood of certain outcomes;
          for others, this is contract review and redlining. And there are
          plenty of other requests for assistance between the two. I’m also sure
          to directly offer things I think I could do to help. Some people don’t
          want any further help, but at the very least they walk away from the
          conversation knowing they have my support.
        </p>
      </Body>

      <Divider />

      <Body>
        <p>
          All of this is the heart of the conversation, where I attempt to use
          my negotiation skills and experiences to prime the person I’m talking
          with for the future negotiations that will surely come as they
          proceed. The critical piece of this, though, is that they understand
          that the first and last person they must negotiate with is themselves.
          As such, they need to be absolutely clear on their negotiating power.
        </p>
        <p>
          Ultimately, I am trying to partner with the person to identify their
          BATNA (best alternative to a negotiated agreement). This identification
          process itself is a call to action for them to tap into and leverage
          their agency. The conversation serves as preparation that helps ready
          them and put them in an optimal mindset to effectively negotiate the
          best possible outcome for themselves.
        </p>
        <p>
          As the conversation wraps up, I start asking the other person
          questions that boil down to: what are you going to do next? I use my
          position in the conversation to create a sense of urgency that serves
          as a call to action. At this stage of the conversation, I want the
          other person to begin identifying their agency in the situation at
          hand.
        </p>
      </Body>

      <Divider />

      <Body>
        <p>
          Agency has become a more common word in corporate vernacular over the
          years. Most of us want it; few of us seem to have it. It’s that
          feeling that one has control over oneself and their actions,
          particularly within the scope of their role as an employee. A product
          executive recently told me that she didn’t have decision rights over
          an in-app navigation bar. Her CEO micromanages decisions across their
          small startup. His overbearing nature creates incredibly low agency
          for employees throughout the organization, often resulting in missed
          opportunities for growth and, eventually, less than amicable exits.
          This is the type of situation most of us want to avoid.
        </p>
        <p>
          Although it’s fallen out of vogue, it used to be said more frequently
          that product managers are the CEO of their products. I’m not sure that
          that’s ever true, but there are certainly degrees of how false it is.
          An entry-level employee doesn’t expect to drive the entire corporate
          strategy, but they probably expect to be trusted to respond to an
          email (or at least to draft one and pass it to a manager for review
          and approval). In theory, we’ve all taken the time to demonstrate our
          skills through a series of interviews. The least we deserve is the
          trust to perform the core functions of our roles.
        </p>
        <p>
          In agency law, a principal delegates duties to an agent, creating
          fiduciary duty, duty of care, and duty of loyalty responsibilities for
          the agent. In other words, the relationship is one that requires the
          agent to act in the best interest of the principal. However, the
          principal does not have the same duties to the agent; in fact, the
          principal pretty much just has the duty to make agreed-upon payments
          to the agent and legally protect them from certain claims.
        </p>
        <p>
          Employees are agents of their employers. And no employee is going to
          intentionally disregard their duties when payments and legal
          protection are on the line. This isn’t an easy job market. As such,
          employees need to understand what responsibilities are and are not
          theirs. This is the bounds of their agency as an employee. As
          principals, employers typically owe employees very little. But this is
          merely a contractual limitation.
        </p>
        {/* The claim the agency-law passage exists to set up, and the
            hinge the rest of the essay turns on. His own prose,
            appearing once — so it is a Callout, not a Blockquote and not
            a Pullquote. */}
        <Callout>
          <p>
            In the spirit of modern employment, especially regarding knowledge
            work in tech, employees must remember they are principals of their
            careers and employers are the agents. Rather than a unidirectional,
            contractual relationship, the relationship between an employer and
            employee is one of mutual agency. Employees should recall that they
            drive the strategy of their careers. Knowing what to say “yes” to
            and, more importantly, what to say “no” to is critical to executing
            this strategy and should inform the ongoing negotiations an employee
            has with their employer, throughout their relationship.
          </p>
        </Callout>
        <p>
          When I talk with people about having agency, they tend to be fixated
          on crafting this sense within the scope of their role. This fixation
          causes them to forget to zoom out and harness it in the scope of their
          careers. In my conversations with people, what I am trying to do is
          awaken or re-awaken their sense of agency over their careers.
        </p>
        <p>
          This requires that they are honest enough with themselves to have
          discernment about their current situation, what they want their
          situation to be, the delta between the two, and their ability to close
          that gap. Invariably, their assessment skills are indexed on their
          privilege. Quite simply, a less privileged person (be that because of
          race, gender, or other lived experiences) tends to have less of an
          ability to assess these details.
        </p>
        <p>
          My hope is that my conversations with these people engender a stronger
          curiosity that enables them to further develop their discernment and
          agency. Ultimately, the goal is to encourage people to take back
          ownership of their lives, something that more of us lose every day as
          capitalism advances.
        </p>
      </Body>

      <Divider />

      <Body>
        <p>
          The bottom line is this: as people, we always have choices, even when
          the choices are suboptimal. Sometimes it just takes a conversation (or
          a few) with a trusted colleague to get clarity on what those choices
          are that we need to make and to remember that we are the ones with the
          power to make them. The darker reality is that we are often in
          positions where the best choice is to walk away, whatever action that
          requires and whatever risks come with it. Nothing ventured, nothing
          gained.
        </p>
      </Body>
    </>
  );
}
