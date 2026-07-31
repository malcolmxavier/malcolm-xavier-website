// ─────────────────────────────────────────────────────────────────
// Project: "When You Hear Some Feedback, Keep Going Take It Higher" —
// Malcolm's first-year Master-of-Science-in-Law symposium paper (2022).
//
// Unlike the DS4A capstone (a data report we curated down to its
// argument), this is Malcolm's own authored prose and ships verbatim:
// the full essay as semantic HTML, with its 23 legal/journalistic
// citations rendered as on-page endnotes and the complete paper offered
// as a PDF download. The companion recording and slides are stubbed as
// a pending slot. Cross-linked to the Year-2 paper, which cites it.
//
// `meta` is consumed by lib/projects/projects.ts (the registry); the
// default export is the article body, rendered inside ProjectContainer
// by app/projects/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body, Emph } from "@/components/case-study/primitives";
import { Link } from "@/components/primitives/Link";
import { Blockquote } from "@/components/projects/Blockquote";
import { Fn, Footnotes, FnItem, Cite } from "@/components/projects/Footnotes";
import { EDUCATION, slugifyEducationAnchor } from "@/app/resume/resume-data";
import type { ProjectMeta } from "@/lib/projects/types";

// Resolve the résumé education entry both MSL papers came out of, so
// the dateline's "Northwestern MSL" chip jump-links to it and stays in
// sync if that entry's dates change. Matched on the institution name.
const MSL_EDU = EDUCATION.find((e) => e.institution.includes("Northwestern"));

export const meta: ProjectMeta = {
  slug: "ethics-video-sharing-apps",
  kind: "Law, ethics, and product",
  title: "When You Hear Some Feedback, Keep Going Take It Higher",
  metaTitle: "Ethics and the Future of Video-Sharing Apps",
  subtitle:
    "Legal, Technical, and Ethical Notes for the Future of Video-Sharing Apps",
  description:
    "A Master of Science in Law symposium paper on ethics in the product management of video-sharing apps—how copyright law, the DMCA, parent companies, and recommendation algorithms shape what creators make, and who gets erased when a trend goes viral.",
  authors: [{ name: "Malcolm Xavier", self: true }],
  // Only the year is shown; the machine date is the spring-2022 first-year
  // MSL symposium submission (citations were last visited December 2021).
  dateDisplay: "2022",
  datePublished: "2022-05-18",
  readMin: 12,
  credential: MSL_EDU
    ? { label: "Northwestern MSL", href: `/resume#${slugifyEducationAnchor(MSL_EDU)}` }
    : undefined,
  // The full paper is on this page, so the download box offers a
  // portable copy rather than "the full work" (which lives here).
  downloadsHeading: "Take it with you",
  downloads: [
    {
      label: "Download the paper",
      href: "/projects/ethics-video-sharing-apps/paper.pdf",
      meta: "PDF · 108 KB",
    },
  ],
  companion: {
    label: "The presentation",
    note: "A recorded walkthrough and the symposium slides are on the way—they’ll live here alongside the paper once they clear Northwestern.",
  },
  related: ["privacy-law-social-media-era"],
  noindex: true,
};

export default function WhenYouHearSomeFeedback() {
  return (
    <>
      <Body>
        <p>
          There would be no “viral video,” as we know it today, without Janet
          Jackson. Without her “wardrobe malfunction,” at the hands of that{" "}
          <Emph>[White] Man of the Woods</Emph>
          <Fn n={1} />, the founders of YouTube may never have thought to pivot
          their online dating service into the first major video sharing
          platform
          <Fn n={2} />, in their simultaneous roles as Product Managers (PMs) of
          the technology. It is, perhaps, worth discussing the number of
          technologies we are familiar with today that are the result of failed
          dating services
          <Fn n={3} /> built, presumably, by men that could not get dates with
          women without a technological assist; the focus of this paper,
          however, is ethics in the product management of digital products
          (digital product management) that sit at the intersection of the arts
          and technology. Particular attention will be given to video-based
          products, asking the following questions: what is the influence
          federal and local law, parent companies, and product teams have on the
          content users create? In particular, what is the impact of “shadow
          banning” and the strategic defense of the Digital Millennium Copyright
          Act (DMCA)
          <Fn n={4} /> on Black creators?
        </p>
        <p>
          A first question to address, though, is: what is product management?
          The long answer: if one were to ask five different PMs, one would get
          five different answers; product management as a function is less than
          one hundred years old, having been started at Procter &amp; Gamble and
          which was once considered a Marketing function, responsible for the
          marketing and positioning of products, particularly physical ones, as
          well as responsible for their delivery to the market, until the early
          aughts. At this time, products began to become increasingly digital
          and, in response, product management began spinning into its own set
          of functions, under the guise of the Agile methodology (a response to
          the ’70s Waterfall methodology) of software development, which largely
          required PMs to act as Project Managers, responsible solely for the
          delivery of the product to the market, by way of managing deadlines
          for each other function’s delivery.
          <Fn n={5} /> Today, PMs function fairly similarly, the primary
          difference being that they are now also responsible for having
          decision-making expertise, not only helping other functions in
          completing delivery on time, but also assisting them in knowing what
          needs to, can be, and should be delivered. How this practically occurs
          is dependent on each specific organization. The short answer:
          practicing product management requires PMs to take in business needs
          and user needs, while relying upon the specialized expertise of their
          colleagues in other functions, to make informed decisions about what
          products and product features need to, can be, and should be
          delivered.
        </p>
        <p>
          As our world and products become increasingly digital, so are PMs. So,
          what exactly should be considered a digital product? From an Internet
          of Things (IoT) perspective, the most inclusive definition would
          include all products that interact in the digital space, which means
          everything from Amazon’s Alexa to Epic Games’s Fortnite (the metaverse
          being conceptually related, but yet another topic for another day).
          <Fn n={6} /> For the purposes of this paper, digital products are
          software applications (apps), particularly mobile apps, rather than
          web apps (regardless of whether the app creating entity supports
          mobile and desktop versions of the same app). This explicit area is of
          import because, in an era of Internet ubiquity, access to the Internet
          is not nearly as ubiquitous, with low socio-economic status (low SES)
          individuals, especially Black people, being significantly more likely
          to access the Internet via smartphone than desktop or at-home
          broadband, compared to their white counterparts who see relative
          parity across all three types of access / behaviors.
          <Fn n={7} /> Refining the scope of discussion further, this paper will
          address video-sharing apps focused on video-based content creation and
          their parent companies to examine the relationship between ethics,
          law, and digital product management of arts-centered apps. With all
          respect to 2007-era YouTube and though much of the same content lands
          on each of the apps that still exists, YouTube inclusive, the
          discussion will focus on the following apps as more apparently
          contemporary than YouTube: Vine (Twitter); Triller; Musical.ly /
          TikTok (ByteDance); and Reels (Instagram).
        </p>
        <p>
          Vine, may it rest in peace, was founded in 2012, acquired by Twitter
          before its early 2013 launch and shut down in late 2016; the hook of
          Vine was that videos could be no more than six seconds and played on a
          loop and, somewhat ironically, one of the factors leading to its
          closing was that marketing professionals were moving to longer
          short-form video platforms, back to YouTube and forth to Instagram and
          Snapchat. (You may be saying to yourself, “Yeah. What about Snapchat? I
          love Ghostface Chillah!” Similarly to YouTube, though, its initial
          intent was video-sharing alone, not content creation, which can be
          seen even more explicitly in the fact that its videos were not meant to
          be shared broadly or even stored; for that reason, this paper will
          elide over its place in the market.) All the same, Vine’s great
          artistic constraint birthed its own era of influencers that were both
          content creators and editors; it should be noted that Black male
          content creator Andrew Bachelor (KingBach) was the most followed on the
          app.
        </p>
        <p>
          Per Ryan Murphy, “When a new Supreme rises, the old one fades away.”
          Apps are not an exception to the rule, so it’s perhaps unsurprising
          that Triller and Musical.ly had already been around over a year when
          Vine closed down its operations. TikTok had also entered the market
          just before Vine left it and was a more direct competitor to it and,
          even more to the point, continues to be one to Triller (though,
          notably, not Musical.ly, which TikTok acquired in 2017, and merged into
          TikTok in early 2018). The intent of these apps was to allow users to
          upload short videos of themselves lip syncing to popular songs. For the
          sake of simplification I will focus this discussion on TikTok as a
          singular app, but I cannot stress enough that it is but one app in a
          sea of apps that perform similarly and this family of apps has its
          roots in YouTube, which was built in response to a pop culture moment
          centered on the body of and image of a Black woman that was
          proliferated through the media without her consent (nor ownership,
          which is important insofar as we might address the commercialization
          and commodification of Black bodies, both literal and of content,
          without the subjects and creators of that content receiving
          compensation).
        </p>
        <p>
          One such feature, belonging to an app in the above-mentioned sea and
          that is worth mentioning briefly, is Reels, which was built to try to
          directly compete with TikTok, around the time the former 45th
          President of the United States was threatening to ban TikTok
          <Fn n={8} /> in the country, seemingly for being a Chinese-built app
          that was gaining popularity during the COVID-19 pandemic, which
          originated in China. The racist overtone here should not be ignored
          because it is to the point that the parent company of Reels is
          Instagram, an app known for allowing the spread of misinformation
          <Fn n={9} /> and for suppressing the content of Black creators via
          “shadow banning.”
          <Fn n={10} /> While many tech organizations would say that shadow
          banning does not exist or is the wrong term,
          <Fn n={11} /> it is colloquially correct and used to mean the
          intentional filtering out of certain content from users’ content feeds
          via various Artificial Intelligence (AI) implementations.
        </p>
        <p>
          It’s been remarked by several technologists that implementations of
          AI, algorithms for the purposes of this paper, cannot themselves be
          biased, but rather take on the biases of the team(s) that build them.
          <Fn n={12} /> Rather than re-hash this argument, the following will
          attempt to address the question that falls out from this truth: Again,
          what is the influence federal and local law, parent companies, and
          product teams have on the content users create?
        </p>
        <p>
          Turning to the law, the green field for ethical digital product
          management of video-sharing apps focused on video-based content
          creation can begin to be found. The arts as intellectual property (IP)
          are largely covered by federal copyright and design patent law; the
          DMCA, as mentioned earlier, is an Act of particular consideration for
          those building and / or using such technologies, as it prohibits the
          use of technologies as a way to circumvent the country’s base
          copyright laws.
          <Fn n={13} /> Those base copyright laws, in addition to their
          protections for the IP itself, also provide guidance on fair use:
        </p>
        <Blockquote>
          <p>
            the fair use of a copyrighted work…for purposes such as criticism,
            comment, news reporting, teaching (including multiple copies for
            classroom use), scholarship, or research, is not an infringement of
            copyright. In determining whether the use made of a work in any
            particular case is a fair use the factors to be considered shall
            include—
          </p>
          <p>
            (1) the purpose and character of the use, including whether such use
            is of a commercial nature or is for nonprofit educational purposes;
          </p>
          <p>(2) the nature of the copyrighted work;</p>
          <p>
            (3) the amount and substantiality of the portion used in relation to
            the copyrighted work as a whole; and
          </p>
          <p>
            (4) the effect of the use upon the potential market for or value of
            the copyrighted work.
          </p>
          <p>
            The fact that a work is unpublished shall not itself bar a finding of
            fair use if such finding is made upon consideration of all the above
            factors.”
            <Fn n={14} />
          </p>
        </Blockquote>
        <p>
          While there are myriad other laws that regulate both tech and data,
          DMCA is the most integral to understanding the rising ethical
          challenges digital PMs are facing and what their opportunity is to have
          positive social impact. Currently, DMCA could be interpreted to be
          relatively restricting, compared to how social media and its users
          operate. TikTok, in its Community Guidelines, states:
        </p>
        <Blockquote>
          <p>
            We encourage everyone to create and share original content. Content
            that infringes someone else’s intellectual property rights is
            prohibited on our platform and will be removed if we become aware of
            it.”
            <Fn n={15} />
          </p>
        </Blockquote>
        <p>
          But isn’t TikTok in the business of profiting off of content built by
          users? Yes, and that content is required to be owned by the creator or
          made under fair use, but also becomes TikTok’s as part of their Terms
          of Service (ToS).
          <Fn n={16} /> Complicating things further, to scale the enforcement of
          their ToS, TikTok, like many companies, uses a violation detection
          algorithm to remove content that violates the ToS, including
          violations based on IP infringement.
          <Fn n={17} /> Surely there is a product team that monitors this
          algorithm and adjusts it, but it is still biased in favor of non-Black
          creators, like many apps’ algorithms, which becomes even more of a
          vicious cycle when this algorithm is tied to the product’s core value
          proposition. For TikTok this is its video recommendation algorithm.
        </p>
        <p>
          Unlike other platforms which were built on the idea of following
          accounts of people you know (even if that’s following Jay Z’s Twitter,
          knowing he follows no one, not even Beyoncé), TikTok’s product is
          seeded on user data and uses that to curate a “For You Page” for its
          users and of which accounts followed by and accounts following are
          smaller factors in the algorithm.
          <Fn n={18} /> Because the app is also built around remixing of other
          users’ content, including both audio and video, what this means in the
          worst case scenario is that a trend deploying fair use of copyrighted
          media can rapidly come into the zeitgeist via memetic function (and
          just as quickly leave it) and the original content that produced the
          trend can be taken down for an alleged DMCA violation, while subsequent
          videos referencing it can gain more popularity, leading to the
          attribution of trends to the wrong individual(s). If the erasure of the
          original creator’s identity weren’t bad enough, they can be flagged and
          suppressed in the recommendation algorithm over time, shadow-banned,
          the more such “violations” occur.
        </p>
        <p>
          Given that TikTok also profits off of relationships with content
          creators, insofar as taking them on as “sponsored” creators, paying
          them to make content that will help attract and retain users that drive
          their valuation, the above-mentioned side effects become even more
          pronounced, in that original creators of trends that deploy fair use of
          copyrighted media have reduced ability to financially compete in the
          “influencer” market and those to whom credit is wrongly attributed have
          an unfair advantage in that same market. Demographically, the original
          creators also tend to be Black, compared to their counterparts who tend
          to be non-Black. An example of this is the story of Jalaiah Harmon,
          creator of the “Renegade” dance trend on TikTok that catapulted Charli
          D’Amelio to fame.
          <Fn n={19} />
        </p>
        <p>
          One ethical path forward for similar companies is to build out
          corporate governance policies that require products to be built within
          an ethical framework appropriate to the business, including regular
          ethical audits, and that lay out response plans to discoveries of
          unethical behaviors or operations that avoid common response mistakes.
          However, such policies are often not implemented at the point of an
          organization’s founding and are more costly and difficult to implement
          later on
          <Fn n={20} />; building out separate programs (and appropriately
          managing any conflicts of interest) that educate legal professionals on
          how the built technology functions and that lobby for legal amendments
          to outdated laws that pose ethical risks to the users of that
          technology are worthwhile endeavors, which are maybe more achievable,
          as the law’s understanding of technology catches up to the present.
        </p>
        <p>
          Education of legal professionals could look like easy-to-read product
          documentation
          <Fn n={21} />, published glossaries of technical terms relevant to the
          organization’s technology, or, borrowing from the legal profession,
          technical clinics where technology professionals advise lawyers on the
          details of technologies relevant to particular cases as consulting
          experts. Of course, there are any number of solutions that could work,
          but the goal should be for legal professionals to have an accurate
          understanding of the complexities of technologies relevant to their
          practice, even if the language of that understanding is abstracted away
          from the technical terms. Legal professionals, necessarily, should also
          include legislators; their dearth of understanding of technology is the
          reason why the law itself is behind,
          <Fn n={22} /> particularly in its understanding of how fair use is
          regulated internally to apps. To be clear, it is tech regulatory law
          that is more behind than copyright law, although certainly there is an
          argument for expanding the definition of fair use to consider more
          modern technologies.
        </p>
        <p>
          A pessimist reading this is aware, as I am, that many companies will
          not engage in this work because it lacks financial incentive in a
          capitalist market. So, one might then turn to find hope in the people
          internal to a company that builds the product to operate in ways that
          are more ethical and considered. In her book,{" "}
          <Emph>Continuous Discovery Habits</Emph>, Teresa Torres says, “One area
          that product teams often overlook is ethical assumptions.”
          <Fn n={23} /> This needs to stop; ethical assumptions should be the
          first thing addressed in product development, so as to make a green
          field for users, rather than for the business to profit. A proposed
          framework is to look at inclusion, diversity, equity, and
          accessibility as building blocks for product development. One model for
          understanding this is concentric circles, with accessibility as the
          outer circle and inclusion as the innermost circle; this framework
          recognizes that while there is a desire for the inner circle to be as
          big as possible, it is almost always the smallest.
        </p>
        <p>
          The marriage of the Internet and the arts has created endless
          opportunity for discovery of both the self and others, but while the
          law continues to fail to make the Internet a safe and equitable space
          and companies continue to respond to monetary incentives, it is up to
          PMs (and product teams, broadly) to build ethically to create more
          ethical apps and a more ethical future.
        </p>
      </Body>

      <Footnotes>
        <FnItem n={1}>
          Rachel Abrams,{" "}
          <Cite>
            <Link
              href="https://www.nytimes.com/2021/11/19/insider/janet-jackson-documentary.html"
              quiet
            >
              The Inspiration for ‘Malfunction: The Dressing Down of Janet
              Jackson,’
            </Link>
          </Cite>{" "}
          The New York Times (2021).
        </FnItem>
        <FnItem n={2}>
          Stuart Dredge,{" "}
          <Cite>
            <Link
              href="https://www.theguardian.com/technology/2016/mar/16/youtube-past-video-dating-website"
              quiet
            >
              YouTube was meant to be a video-dating website,
            </Link>
          </Cite>{" "}
          The Guardian (2016).
        </FnItem>
        <FnItem n={3}>
          Nicholas Carolson,{" "}
          <Cite>
            <Link
              href="https://www.businessinsider.com/how-facebook-was-founded-2010-3#the-65-million-question-5"
              quiet
            >
              At last — the full story of how Facebook was founded,
            </Link>
          </Cite>{" "}
          Business Insider (2010).
        </FnItem>
        <FnItem n={4}>
          Digital Millennium Copyright Act, Pub. L. 105-304 (1998).
        </FnItem>
        <FnItem n={5}>
          Martin Eriksson,{" "}
          <Cite>
            <Link
              href="https://www.mindtheproduct.com/history-evolution-product-management/"
              quiet
            >
              The History and Evolution of Product Management
            </Link>
          </Cite>
          , Mind the Product (2015).
        </FnItem>
        <FnItem n={6}>
          Matthew Ball covers this extensively in his{" "}
          <Link href="https://www.matthewball.vc/" quiet>
            blog
          </Link>
          .
        </FnItem>
        <FnItem n={7}>
          Sara Atske and Andrew Perrin,{" "}
          <Cite>
            <Link
              href="https://www.pewresearch.org/fact-tank/2021/07/16/home-broadband-adoption-computer-ownership-vary-by-race-ethnicity-in-the-u-s/"
              quiet
            >
              Home broadband adoption, computer ownership vary by race,
              ethnicity in the U.S.,
            </Link>
          </Cite>{" "}
          Pew Research Center (2021).
        </FnItem>
        <FnItem n={8}>
          Russell Brandom,{" "}
          <Cite>
            <Link
              href="https://www.theverge.com/2020/8/11/21363405/trumps-tiktok-ban-legal-corruption-free-speech-china"
              quiet
            >
              Trump’s TikTok ban is a gross abuse of power,
            </Link>
          </Cite>{" "}
          The Verge (2020).
        </FnItem>
        <FnItem n={9}>
          Vera Bergengruen,{" "}
          <Cite>
            <Link href="https://time.com/5906854/facebook-twitter-election-day/" quiet>
              Under Scrutiny, Facebook and Twitter Face Their Biggest Test on
              Election Day,
            </Link>
          </Cite>{" "}
          TIME (2020).
        </FnItem>
        <FnItem n={10}>
          Megan McCluskey,{" "}
          <Cite>
            <Link href="https://time.com/5863350/tiktok-black-creators/" quiet>
              These TikTok Creators Say They’re Still Being Suppressed for
              Posting Black Lives Matter Content,
            </Link>
          </Cite>{" "}
          TIME (2020).
        </FnItem>
        <FnItem n={11}>
          Jesselyn Cook,{" "}
          <Cite>
            <Link
              href="https://www.huffpost.com/entry/instagram-shadow-banning-is-real_n_5e555175c5b63b9c9ce434b0"
              quiet
            >
              Instagram’s CEO Says Shadow Banning ‘Is Not A Thing.’ That’s Not
              True.,
            </Link>
          </Cite>{" "}
          HuffPost (2020).
        </FnItem>
        <FnItem n={12}>
          Rahul Bhargava,{" "}
          <Cite>
            <Link
              href="https://www.kdnuggets.com/2019/01/algorithms-arent-biased-we-are.html"
              quiet
            >
              The Algorithms Aren’t Biased, We Are,
            </Link>
          </Cite>{" "}
          KDnuggets (2019).
        </FnItem>
        <FnItem n={13}>
          Digital Millennium Copyright Act, Pub. L. 105-304 (1998), § 1201.
        </FnItem>
        <FnItem n={14}>Pub. L. 94–553, title I, § 101.</FnItem>
        <FnItem n={15}>
          <Link href="https://www.tiktok.com/community-guidelines?lang=en" quiet>
            Community Guidelines
          </Link>
          , TikTok (last visited Dec. 10, 2021).
        </FnItem>
        <FnItem n={16}>
          <Link href="https://www.tiktok.com/legal/terms-of-service?lang=en" quiet>
            Terms of Service
          </Link>
          , TikTok (last visited Dec. 10, 2021).
        </FnItem>
        <FnItem n={17}>
          <Link href="https://www.tiktok.com/legal/copyright-policy?lang=en" quiet>
            Intellectual Property Policy
          </Link>
          , TikTok (last visited Dec. 10, 2021).
        </FnItem>
        <FnItem n={18}>
          Wall Street Journal,{" "}
          <Cite>
            <Link
              href="https://www.wsj.com/video/series/inside-tiktoks-highly-secretive-algorithm/investigation-how-tiktok-algorithm-figures-out-your-deepest-desires/6C0C2040-FF25-4827-8528-2BD6612E3796?mod=hp_lead_pos5"
              quiet
            >
              Investigation: How TikTok’s Algorithm Figures Out Your Deepest
              Desires,
            </Link>
          </Cite>{" "}
          Wall Street Journal (2021).
        </FnItem>
        <FnItem n={19}>
          Taylor Lorenz,{" "}
          <Cite>
            <Link
              href="https://www.nytimes.com/2020/02/13/style/the-original-renegade.html"
              quiet
            >
              The Original Renegade
            </Link>
          </Cite>
          , The New York Times (2020).
        </FnItem>
        <FnItem n={20}>
          Curt Finch,{" "}
          <Cite>
            <Link
              href="https://www.inc.com/tech-blog/2009/09/the_cost_of_business_ethics.html"
              quiet
            >
              The Cost of Business Ethics,
            </Link>
          </Cite>{" "}
          Inc. (2009).
        </FnItem>
        <FnItem n={21}>
          Katrina Morales,{" "}
          <Cite>
            <Link
              href="https://www.atlassian.com/blog/add-ons/5-real-life-examples-beautiful-technical-documentation"
              quiet
            >
              5 real-life examples of beautiful technical documentation,
            </Link>
          </Cite>{" "}
          Atlassian (2017).
        </FnItem>
        <FnItem n={22}>
          Alana Wise,{" "}
          <Cite>
            <Link
              href="https://www.npr.org/2021/10/04/1043150167/sen-blumenthals-finsta-flub-renews-questions-about-congress-grasp-of-big-tech"
              quiet
            >
              What Sen. Blumenthal’s ‘finsta’ flub says about Congress’ grasp of
              Big Tech,
            </Link>
          </Cite>{" "}
          NPR (2021).
        </FnItem>
        <FnItem n={23}>
          Teresa Torres, <Cite>Continuous Discovery Habits</Cite> (2021).
        </FnItem>
      </Footnotes>
    </>
  );
}
