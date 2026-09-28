// ─────────────────────────────────────────────────────────────────
// Essay: "Growth, Personalization, AI, and Data (A Primer)"
//
// On-site mirror of the LinkedIn Article first published 2026-04-15.
// Copy is verbatim from the published article — only the styling is
// enriched for the owned surface. Source of truth for the text:
// editorial-workspace/drafts/articles/2026-04-15-growth-personalization-ai-data-primer/
//
// This is the longest piece in the set (~2,400 words) and the one that
// exercises the reading components rather than merely sitting on them:
// eight sections, three lists, a lifted pull quote, and four
// section-scoped notes (*, *, *, †).
//
// THREE THINGS WERE CUT, all LinkedIn-native:
//   1. The trailing hashtag block.
//   2. The closing engagement question ("How are you feeling about data
//      practice within your work?"). On LinkedIn that opens a comment
//      thread; here there is nothing to answer into, so it is a prompt
//      pointing at a door that does not exist. The Conclusion ends the
//      argument on its own.
//   3. Nothing else. The serial-publication scaffold ("Each weekday, I
//      will update this article…") was already removed by Malcolm at
//      the source on 2026-09-28, so it never reached this file.
//
// NOTES ARE SECTION-SCOPED, NOT ENDNOTES. The markers are `*` and `†`
// and they RESET per section — Completeness has a `*`, Accuracy has its
// own `*`, Legibility has both. That is why this uses <Note> rather
// than the <Fn>/<Footnotes> endnote system the MSL papers use: those
// are numbered once across a whole document and collected at the foot
// of the article, which would renumber Malcolm's own markers and move
// each note thousands of words from the sentence it qualifies.
//
// `meta` is consumed by lib/writing/essays.ts (the registry); the
// default export is the article body, rendered inside ArticleContainer
// by app/writing/[pillar]/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

// TWO KINDS OF ITALIC, and they are different elements on purpose.
// <Var> is a variable — x, y, and the expression "<x" — which is a
// named quantity, so it uses <var> and inherits the body face. <Emph>
// is editorial stress ("cohesively"), which is Instrument Serif wrapped
// in <em> and is announced by a screen reader with contrastive
// intonation. Reaching for Emph on a variable would give the wrong
// announcement and put a display serif on a single letter.
import { Body, Emph, Pullquote } from "@/components/case-study/primitives";
import { EssaySection } from "@/components/writing/EssaySection";
import { Link } from "@/components/primitives/Link";
import { Blockquote } from "@/components/reading/Blockquote";
import { List } from "@/components/reading/List";
import { Divider } from "@/components/reading/Divider";
import { Note } from "@/components/reading/Note";
import { Var } from "@/components/reading/Var";
import type { EssayMeta } from "@/lib/writing/types";

export const meta: EssayMeta = {
  slug: "growth-personalization-ai-data-primer",
  pillar: "growth",
  title: "Growth, Personalization, AI, and Data (A Primer)",
  metaTitle: "Growth, Personalization, AI, and Data",
  description:
    "Six data trade-offs teams make when scaling AI—completeness, accuracy, relevance, connectivity, legibility, and privacy—and what each one costs.",
  postDate: "2026-04-15",
  // No job CTA in this one. The article closes on its argument rather
  // than on an ask, unlike the MS-in-Law essay.
  cta: "none",
  ogTitleLines: ["Growth, Personalization,", "AI, and Data"],
  ogTitleSize: 86,
  ogSubtitle:
    "Six data trade-offs teams make when scaling AI, and what each one costs.",
};

export default function Essay() {
  return (
    <>
      <Body>
        {/* NO essay-dropcap here, deliberately. The rule is
            `.essay-dropcap::first-letter`, which can only ever take ONE
            character — and this essay opens on "AI". Rendered, that set
            a display-size serif "A" beside "I isn't making the
            problems…", so the acronym split and the first line scanned
            as a different word. The MS-in-Law essay opens on "When", so
            a cap on "W" leaves "hen" and reads correctly.

            The test before applying this class to a new essay: is the
            first WORD longer than one letter, and is its first letter
            separable from the rest? An acronym fails the second. */}
        <p>
          AI isn’t making the problems within corporate data systems impossible
          to ignore yet. But it will soon. As AI fluency spreads and AI-native
          systems become commonplace, the primary differentiator will be data,
          both internally/operationally (including in the AI-native system
          itself) and in the product.
        </p>
        <p>Yes, data is, has been, and always will be imperfect.</p>
        <p>
          No, the currently acceptable level of imperfection will not continue
          to see success in today’s market.
        </p>
        <p>Let’s break this down.</p>
        <p>
          In this article, I outline common data trade-offs made when scaling AI
          and the risks and opportunities associated with them. These trade-offs
          fall into 6 categories: Completeness, Accuracy, Relevance,
          Connectivity, Legibility, and Privacy.
        </p>
      </Body>

      {/* A rule before every section, including this one, which hands
          the opening lede off to the sectioned argument. An earlier cut
          used exactly one, on the reasoning that an <h2> already marks a
          boundary and a rule on top of it says the same thing twice.
          Malcolm's call is that the rule belongs at every section start,
          which is also what the published article does. */}
      <Divider />

      <EssaySection title="Introduction">
        <Body>
          <p>First, let’s establish three key, related assumptions:</p>
          <List ordered>
            <li>
              Broadly, personalization is a core lever for growth and
              engagement.
            </li>
            <li>
              Users’ baseline expectations for products require out-of-the-box
              personalization; and
            </li>
            <li>
              This could manifest as any number of solutions, but the most
              valuable ones are AI-driven (given broad strokes efficiency gains
              from AI).
            </li>
          </List>
          <p>
            There’s more to say on these assumptions. I’ll save that detail for
            another post.
          </p>
          <p>
            Bearing these assumptions in mind, business and innovation advances
            tend to prioritize speed over fidelity. With AI, the trade-offs,
            risks, and opportunities with this approach usually come back to
            data (and, in a way, back to my thoughts on context).
            Personalization-driven growth and engagement experiences will only
            be as good as their data practice. Many will have an overabundance
            of opportunity.
          </p>
          <p>
            Note: I won’t explicitly discuss how to use AI-native systems to
            address these risks and opportunities operationally, but it should
            be assumed that such approaches are available to some degree, making
            these activities more efficient to pursue where they previously were
            not.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Completeness">
        <Body>
          <p>Do all records have the same data points (as appropriate)?</p>
          <List ordered>
            <li>
              In a basic case, does every user record have a first name and a
              last name?
            </li>
            <li>
              In a more advanced case, does every user record have associated
              topics of interest?
            </li>
            <li>
              In an even more advanced case, does every user who subscribes to
              our pregnancy journey newsletter have at least one associated
              child record?*
            </li>
          </List>
          <p>
            Customer data platforms (CDPs) are constantly updated with new user
            data points that can be used as facets in personalization models. If
            a feature development results in new data capture, it’s common to
            prioritize capturing data from users who create accounts after the
            feature is released. Data capture might be included later in
            onboarding or implemented to be collected in the background only for
            new users (sometimes intentionally, sometimes as an oversight).
          </p>
          <p>
            But what about returning users or less engaged users that you’re
            trying to win back? If your build-out doesn’t include these users,
            you’re leaving money on the table. Automated backfills and
            backfill/backfill verification campaigns are known solutions to this
            issue. Size these sub-opportunities against the same time horizon
            and see if you still think it’s best to leave them out.
          </p>
          <p>
            Overall, this risk/opportunity isn’t new/unique to AI, but AI will
            create the expectation that this gap be addressed (read: closed)
            sooner than has been the norm.
          </p>
          <Note marker="*">
            This is a real example from my time at People, launching a pregnancy
            journey newsletter program on{" "}
            <Link href="https://www.parents.com">parents.com</Link>.
          </Note>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Accuracy">
        <Body>
          <p>
            Is this data accurate? If you start digging, you’ll find it’s often
            unclear. That could be because no one knows how the data is
            processed and/or defined (more thoughts on this below in
            Connectivity), because it’s not audited regularly, or because it’s
            not fresh. In turn, the solutions to this are documentation, regular
            auditing, and features/campaigns that prompt users to confirm
            accuracy and keep data updated.
          </p>
          <p>
            A lack of accuracy is particularly damaging when features are built
            to deploy with high precision (see below on Relevance). Have a
            personalized campaign for Bushwick residents above 35? Birthdays
            tend to stay accurate, but too bad half your qualifying users moved
            to Bed Stuy and just didn’t report it to you. User data collection
            and management must be developed as twin strategies that work
            together. If there’s no plan for data refreshment, there’s a plan
            for silent accuracy drift that will show up in behavioral and
            revenue metrics, but not in model evals.
          </p>
        </Body>

        {/* Lifted from the paragraph directly above, exactly as the
            article sets it off. No attribution: it is his own sentence
            pulled out for weight, not a quotation from anywhere, so it
            takes no quote marks and no caption. */}
        <Pullquote>
          If there’s no plan for data refreshment, there’s a plan for silent
          accuracy drift that will show up in behavioral and revenue metrics,
          but not in model evals.
        </Pullquote>

        <Body>
          <p>
            A note here on data processing: when organizations look to cut
            costs, they might perform mass deletions of entire records or
            specific data points across records. The heuristic often used for
            this is: Is this data being used now? We need to start asking a
            different question: Will anyone’s line of business require this data
            in the next <Var>x</Var> years? Determining a directional half-life for the
            data* is a good proxy for <Var>x</Var>; <Var>&lt;x</Var> is a good
            proxy threshold for considering a validation/refresh campaign.
            Senior ICs and above
            should all have an opinion on this, per their domain/scope. Think of
            this as an informed first “gate” on the decision. If there’s even a
            single yes, compare the cost of running a validation/refresh
            campaign (before executing the mass deletion) against the cost of
            completely re-acquiring that data, bearing in mind the half-life
            calculation. Usually, the former wins out.
          </p>
          <p>
            A similar approach can be taken when considering deletion of entire
            records. This is usually a question of whether a cohort of users is
            planned to be reactivated and whether a user in that cohort has a
            complete enough record to be reactivated, followed by cost
            comparison analysis if necessary. An entire user record’s half-life
            can serve as the proxy threshold for considering a reactivation
            campaign.
          </p>
          <Note marker="*">
            This is a great opportunity to partner with data science on
            quantitative research. If you don’t have the time or resources to do
            this for individual data points, a great starting point is to align
            stakeholders on straw-man half-lives for groups of data points. I
            say groups because different data behave differently, and even
            creating a basic heuristic around this goes a long way. For example,
            data such as name, email address, phone number, and birthday
            typically don’t change. Their evergreen nature makes them among the
            most valuable to keep and most costly to replace.
          </Note>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Relevance">
        <Body>
          <p>
            Do we have the data we need to achieve the level of precision we’re
            hoping for in our personalization?
          </p>
          {/* Set off rather than run in. It is an aside answering the
              question above it, not a step in the argument, and the
              published article gives it its own block. Blockquote rather
              than Pullquote: this is a full passage at body size, where
              a pull quote lifts one line to display size. */}
          <Blockquote>
            <p>
              Hint: the more precise you want your personalization to be, the
              more precise your data must be. You can’t create personalized
              experiences for ophthalmologists effectively if user records
              don’t have a job title facet.
            </p>
          </Blockquote>
          <p>
            This falls into the same data processing trap I covered above. It
            might sound obvious, but more precise data is more valuable because
            users generally engage more deeply with more precise
            personalization. This is an assumption that won’t hold true in every
            case, but it’s the one I see teams miss more frequently. Compare the
            savings of a mass deletion against the cost of re-acquisition to
            determine your approach on this one.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Connectivity">
        <Body>
          <p>
            Is the data in all the right places for the user experience to be
            delivered? Data processing, the data lifecycle, and data
            transmission to operational systems form a complex web. This is
            where data risks begin to become more advanced. You’re capturing
            data and processing it into storage, but you’re not transmitting it
            to reporting tooling efficiently. Usually that looks like:
          </p>
          <List ordered>
            <li>you’re not transmitting enough data, or</li>
            <li>you’re running into latency issues, or</li>
            <li>data’s under-transformed, or</li>
            <li>data’s over-transformed.</li>
          </List>
          <p>
            In my humble opinion, this is an interesting technical area for
            growth experimentation. Similar challenges are seen with
            transmission back into production and into operational tooling
            (I’ve even seen operational tooling only have access to the DOM);
            this is the more common opportunity space for growth teams. Further,
            similar challenges are seen with observability for more technical
            products.
          </p>
          <p>
            Sophisticated data programs recognize that these challenges are
            intertwined, not isolated; they all affect personalization
            experiences and amplify the risks and opportunities in the other
            categories this article covers.
          </p>
          <p>
            Stakeholder alignment is the key to moving through this opportunity
            space. ETL, reverse ETL, storage, and deletion rules need to be
            determined, documented, and regularly audited <Emph>cohesively</Emph>. This
            includes data summarization and the timeliness of its availability
            in downstream systems. Aligning on these rules is even more critical
            when dealing with high volumes of data. It’s another one that sounds
            obvious, but I’ve seen teams commonly skip it or do it on the fly
            for certain one-off data.
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Legibility">
        <Body>
          <p>
            Can a non-technical expert leverage/interact with data in their
            workflows with confidence in data meaning? In other words, is <Var>x</Var>
            defined the same way across the system, and are <Var>x</Var>,{" "}
            <Var>y</Var>, and <Var>z</Var> available consistently across the
            system? Even further, is
            consistently transformed data available across the system (to
            account for the disparity between transformation functionality
            within specific tools)?* On the simpler end, is data actually
            labelled across the system? If you’re primarily answering “no” to
            these questions, you’re not in a position to effectively evaluate
            your growth, let alone the effects of personalization on that
            growth. Extrapolating further, the major opportunity being missed
            here is attribution of growth to AI-driven product development.†
          </p>
          <p>
            The most often ignored solutions to this are data labelling and
            standardized naming conventions (enforced across the system,
            including in the codebase, with agreed-upon deviations on an
            as-needed basis). Database management, operational tooling
            management, and technical integration management are additional key
            tactics to deploy for more effective success. The data labelling and
            standard naming conventions are artifact outputs of the same
            stakeholder management from Connectivity (above). Without this
            consistency in data legibility, AI-driven features become modern
            GIGO machines.
          </p>
          <Note marker="*">
            “Consistently,” here means relative to each tool, not the same for
            each tool. One tool may need partial transformation while another
            needs full transformation, in order for non-technical staff to
            effectively use it while handling data. In this same vein, another
            tool may have full transformation functionality, which allows it to
            handle data closer to a raw state. And not for nothing, going back
            to Connectivity (above), there are financial implications of all of
            this decisioning.
          </Note>
          <Note marker="†">
            “AI-driven” might mean in the product or in the actual product
            operations. A deeper dive on attribution as regards CapEx is for
            another time, but I want to call out that attribution of growth to
            AI is more complex than it is simple.
          </Note>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Privacy">
        <Body>
          <p>
            Data is a team sport, and that’s most apparent in governance, risk,
            and compliance (GRC). However, it’s not apparent here because people
            are collaborative, but rather because they often share a frustration
            with friction in this area and resist meaningful collaboration. Most
            teams I’ve met would rather take on the risk of being fined (US law,
            at least, is set up to encourage this; yet another post for another
            day) than build GRC in from the beginning. This is generally
            something I try to advise against because the real risk is
            reputational. If a preventable GRC issue occurs, consumer trust will
            drop, and they’ll be less likely to provide you with the data you
            need for effective personalization. Of course, this will negatively
            impact ROI.
          </p>
          <p>
            GRC operations are their own separate beast that I won’t tackle
            here, but I will say that I’ve seen countless poor decisions come
            from poor translation between product and GRC (here, privacy,
            security, and legal) teams. Product teams don’t understand how to
            properly interpret policies and regulatory guidance to assess risk
            in product workflows and vice versa. The primary role of translation
            will continue to fall to PMs. Many will be tempted to default to
            advisement from PMs leading privacy product teams, but I’ve seen
            many of those such teams where the PM doesn’t inherently need or
            regularly use GRC knowledge to execute their roles. It’s incumbent
            upon PMs to develop their own foundational understanding of GRC (and
            then push deeper) to drive better outcomes, particularly when it
            comes to AI-driven solutions where regulation feels like the wild,
            wild west. This aligns with{" "}
            <Link href="/writing/craft/technically-speaking">
              my thoughts on PMs becoming technical
            </Link>
            .
          </p>
        </Body>
      </EssaySection>

      <Divider />

      <EssaySection title="Conclusion">
        <Body>
          <p>
            Completeness, Accuracy, Relevance, Connectivity, Legibility, and
            Privacy work together to shape data practice within an organization
            and inform the success (and failure) of AI-driven personalization,
            which is tantamount to growth. While data is a team sport, I
            encourage PMs to explore this as a typically underdeveloped area of
            ownership that they can leverage to drive outsized outcomes.
          </p>
          <p>
            Again, data will never be perfect, but regularly considering these
            categories will help teams better estimate risk, size opportunities,
            and steer outcomes. It’s also worth noting that this applies to most
            product categories and not exclusively consumer products.
            Personalization expectations carry over to B2B/SaaS products,
            perhaps with a slightly different shape. The starting assumptions
            apply just the same, but the underlying strategy to approach these
            opportunities will look different.
          </p>
        </Body>
      </EssaySection>
    </>
  );
}
