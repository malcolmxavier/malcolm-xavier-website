// ─────────────────────────────────────────────────────────────────
// Project: "The Revolution Will Not Be Live Streamed" — Malcolm's
// second-year Master-of-Science-in-Law independent-study paper (2023).
//
// Like the Year-1 paper, this ships verbatim: the full five-section
// essay as semantic HTML, its 103 legal/scholarly citations rendered as
// on-page endnotes, and the complete paper as a PDF download. Because it
// is long and sectioned (I–V), it also carries a `toc`, which the shell
// turns into a sticky sidebar rail (desktop) and an inline "Contents"
// disclosure (mobile). Several endnotes cite Malcolm's own prior work;
// where that work is the Year-1 paper (notes 39, 58, 62), the citation
// links straight to its /projects page.
//
// `meta` is consumed by lib/projects/projects.ts (the registry); the
// default export is the article body, rendered inside the two-column
// reading layout by app/projects/[slug]/page.tsx.
// ─────────────────────────────────────────────────────────────────

import { Body, Emph } from "@/components/case-study/primitives";
import { Link } from "@/components/primitives/Link";
import { ProjectSection } from "@/components/projects/ProjectSection";
import { Blockquote } from "@/components/projects/Blockquote";
import { Fn, Footnotes, FnItem, Cite } from "@/components/projects/Footnotes";
import { EDUCATION, slugifyEducationAnchor } from "@/app/resume/resume-data";
import type { ProjectMeta } from "@/lib/projects/types";

// The Year-1 paper's route, cited in several endnotes below.
const YEAR_ONE = "/projects/ethics-video-sharing-apps";

// Resolve the résumé education entry both MSL papers came out of, so the
// dateline's "Northwestern MSL" chip jump-links to it and stays in sync
// if that entry's dates change. Matched on the institution name.
const MSL_EDU = EDUCATION.find((e) => e.institution.includes("Northwestern"));

export const meta: ProjectMeta = {
  slug: "privacy-law-social-media-era",
  kind: "Privacy, law, and society",
  title: "The Revolution Will Not Be Live Streamed",
  metaTitle: "Privacy Law in the Social Media Era",
  subtitle: "Privacy Law in the Social Media Era",
  description:
    "A Master of Science in Law independent study arguing that social media trades our privacy for publicity—accelerating a surveillance state through the lens of hyperrealism, with outsized harm to Black people—and what individuals, technologists, corporations, and governments can do to reclaim it.",
  authors: [{ name: "Malcolm Xavier", self: true }],
  dateDisplay: "2023",
  // The citations were last visited May 6, 2023 — the paper's completion.
  datePublished: "2023-05-06",
  readMin: 30,
  credential: MSL_EDU
    ? {
        label: "Northwestern MSL",
        href: `/resume#${slugifyEducationAnchor(MSL_EDU)}`,
      }
    : undefined,
  toc: [
    { id: "introduction", label: "I. Introduction" },
    { id: "hyperrealism", label: "II. Hyperrealism" },
    { id: "social-media", label: "III. Social Media" },
    { id: "privacy-law", label: "IV. Privacy Law" },
    { id: "conclusion", label: "V. Conclusion" },
  ],
  // The full paper is on this page, so the download box offers a
  // portable copy rather than "the full work" (which lives here).
  downloadsHeading: "Take it with you",
  downloads: [
    {
      label: "Download the paper",
      href: "/projects/privacy-law-social-media-era/paper.pdf",
      meta: "PDF · 248 KB",
    },
  ],
  companion: {
    label: "The presentation",
    note: "A recorded walkthrough and the slides are on the way—they’ll live here alongside the paper once they clear Northwestern.",
  },
  related: ["ethics-video-sharing-apps"],
  noindex: true,
};

export default function TheRevolutionWillNotBeLiveStreamed() {
  return (
    <>
      <ProjectSection id="introduction" title="I. Introduction">
        <Body>
          <p>
            Technology, particularly social media, encourages us to commodify
            ourselves to the point that individuals no longer retain any privacy.
            As the law has developed in response to advancing technology, it has
            eroded individual rights of privacy, replacing them with rights of
            publicity. Worse, as a society, we accept this and trade away our
            privacy for celebrity, which has disproportionately negative effects
            on Black people. This is a function of hyperrealism, a theory of
            philosophy that suggests that society is advanced through
            simulations, whereby any real thing is a simulation of its
            immediately preceding ancestor simulation, yet a thing that is
            entirely its own. In this case, social media and privacy law are
            simulations that advance society toward a surveillance / police
            state. While we cannot easily stop the erosion of individual rights
            of privacy, we can take action to divest from social media and
            weaken the pace of the progression until we come to more
            appropriately radical solutions.
          </p>
          <p>
            This seeks to assess the relationship between celebrity, privacy, and
            the law, focusing on incidental and situational harms that are common
            to the digital landscape and encouraged by social media. In
            particular, this essay discusses digital Blackface and the
            memeification of Black suffering and biometrics and artificial
            intelligence (AI) as causal to incidental and situational harms,
            respectively. The primary questions of the exploration are:
          </p>
          <ul className="list-disc space-y-2 pl-6 marker:text-[var(--text-caption)]">
            <li>
              how can privacy be retained and reclaimed in the progressing social
              media era?;
            </li>
            <li>
              how does our relationship to celebrity impact our desire to retain
              and reclaim our privacy?; and
            </li>
            <li>
              how do individual attitudes toward privacy affect the collective
              society?
            </li>
          </ul>
          <p>
            This essay aims to provide individuals the ability to make more
            informed privacy decisions, particularly in the United States, and it
            also aims to identify specific actions individuals, technologists,
            corporations, and governments can take to enable greater retention
            and reclamation of collective and individual privacy.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection
        id="hyperrealism"
        title="II. Hyperrealism: The Advancement of Society, Self Image, and Race"
      >
        <Body>
          <p>
            First, it is appropriate to define the concept of hyperrealism. In
            particular, a formal definition and several examples of hyperrealism
            will be provided, before the essay addresses social media and privacy
            law and their relation to hyperrealism. Hyperrealism concerns the
            process by which a real thing, through systematic abstraction, becomes
            a thing that is beyond real, is hyperreal. Jean Baudrillard talks
            about this as occurring through a series of successive “simulations,”
            each of which takes the new hyperreal thing further from its real
            roots. In this context it is critical to take a literal definition of
            simulations: “imitation[s] of a situation or process.”
            <Fn n={1} /> For example, Marvel movies are simulations of the real
            world that result in a hyperreal version of the world. This specific
            version is known as the Marvel Cinematic Universe. The all-encompassing
            world of the Marvel Cinematic Universe illustrates the all-encompassing
            scope of hyperrealism. Most everything is subject to the progression
            toward the hyperreal state.
          </p>
          <p>
            In <Emph>Simulacra and Simulation</Emph>, Baudrillard notes that the
            operation of the aforementioned models, when they are related to an
            image in particular, create the “successive phases of the image:
          </p>
          <Blockquote>
            <p>it is the reflection of a profound reality;</p>
            <p>it masks and denatures a profound reality;</p>
            <p>it masks the absence of a profound reality;</p>
            <p>
              it has no relation to any reality whatsoever: it is its own pure
              simulacrum.”
              <Fn n={2} />
            </p>
          </Blockquote>
          <p>
            In other words, concepts go from real to hyperreal, something that is
            hyperreal is a simulation, and a simulation is real in its own right.
            The cycle repeats itself more and more quickly as a result of
            advancing society. Later, I will discuss social media and law
            (particularly privacy law) as two models (read: systems) within
            society that contribute to this exponentially rapid advancement. It
            should be noted that the operation of these models is so seamless as
            to make the progression Baudrillard describes seem spontaneous. This
            seamlessness is experienced because simulations simulate simulations,
            causing an exponential abstraction of subjects from their real
            counterparts. Said another way, to be hyperreal is to be a
            simulation; simulations themselves also become more hyperreal over
            time as later simulations simulate an already simulated subject. While
            they are topics for another day, it is worth acknowledging that the
            discussion of this essay is closely related to the studied effects of
            Moore’s Law and technological singularity;
            <Fn n={3} /> as technology advances, novel innovations happen
            exponentially more quickly. Similarly and relatedly, the progression
            of real subjects to hyperreal occurs exponentially more quickly over
            time.
          </p>
          <p>
            Assume for a moment that Jesus was a real historical figure.
            <Fn n={4} /> Insofar as Jesus is recognizable, Jesus is also a great
            example of the transition from real to hyperreal. Once a real singular
            person, many different hyperreal versions of Jesus now exist. Various
            depictions and ritual practices simulate the existence of a real
            Jesus. The fact that multiple depictions and practices can exist
            demonstrates that a singular real Jesus is not necessary for hyperreal
            Jesus to exist in the form of these simulations. A few examples of
            these simulations are found in:
          </p>
          <ol className="list-decimal space-y-2 pl-6 marker:text-[var(--text-caption)]">
            <li>
              the Bible, which notes two particular simulations of Jesus, God and
              the Holy Spirit;
              <Fn n={5} />
            </li>
            <li>
              the popular notion that “God is a woman” as made famous by Ariana
              Grande;
              <Fn n={6} /> and
            </li>
            <li>
              <Emph>Black Jesus</Emph>, a television comedy that aired on Adult
              Swim from 2014–2019.
              <Fn n={7} />
            </li>
          </ol>
          <p>
            Bearing this example in mind, I will turn to some broader, conceptual
            examples.
          </p>
          <p>
            First, we can examine justice as a profound reality, a concept core to
            our being human (regardless of our differing views on it). The justice
            system is as it sounds: a systemized, and as a result less nuanced,
            version of real justice. Here, the justice system is a reflection of
            real justice, in the lexicon of Baudrillard. Individual legal
            structures and governments produce laws, regulations, and rulings that
            mask real justice and even overshadow its reflection, the broader
            justice system, further obfuscating the nuance of real justice. The
            concept of law and order, regardless of what entity or entities
            provide it, masks the disappearance of real justice from society; the
            system is so efficient as to not formally require real justice and is
            able to derive a hyperreal justice without real justice. And finally,
            the surveillance / police state becomes a stand-in for real justice
            that does not require the mask of legal structures and government to
            derive justice and law and order. It is self-operational and is so
            divorced from the initial concept of real justice that “[i]t no longer
            needs to be rational, because it no longer measures itself against
            either an ideal or negative instance. It is no longer anything but
            operational.”
            <Fn n={8} />
          </p>
          <p>
            Said another way, in a surveillance / police state, holding parties
            accountable that are actually guilty no longer matters. What matters
            is holding any parties accountable that lead to a feeling of justice
            in the state. This has the coincidental effect of proving the benefit
            of the surveillance / police state itself. As the surveillance /
            police state itself progresses from real to hyperreal, it becomes a
            self-surveillance state that can look like Karens,
            <Fn n={9} /> Pre-Crime,
            <Fn n={10} /> doxxing,
            <Fn n={11} /> cancel culture,
            <Fn n={12} /> or myriad other concepts. Some of these concepts exist
            in today’s real world, and some only in the fiction of today’s real
            world. Each carries varying degrees of harm, particularly for those
            belonging to at least one historically excluded demographic.
          </p>
          <p>
            Taking another example, we can apply the progression from real to
            hyperreal, as Baudrillard describes it, to the concept of the self.
            The concept of the self (and our awareness of it) is indeed a profound
            reality of our being human. The body is, perhaps, the most essential
            reflection of the real self, given that we perceive our real selves as
            mind rather than body; for those that are more inclined to think of
            the real self as body-inclusive, a reflection as we know it, in a
            mirror, body of water, etc. can, here, also be considered a reflection
            of the real self. A reproduction of the real self via painting,
            photograph, etc. masks the real self it is depicting, its creator able
            to effectively curate the viewer’s perception of that real self, so
            that the perception is primarily based off of the image, rather than
            from knowledge of the depicted real self. A series of reproductions of
            the real self via video, collage, etc. can, here, be considered to
            mask the absence of the real self behind the reproductions; the more
            sophisticated and developed the curation of these reproductions, the
            greater the obfuscation of the real self becomes. We are just now
            seeing the hyperreal self emerge, its exact shape amorphous and
            undefined. This hyperreal self is the primary artifact of Web3, a
            digital representation of the real self, largely unbounded by the
            reality from which it is derived.
            <Fn n={13} />
          </p>
          <p>
            A final example we can refer to is: Blackness. Blackness itself is a
            hyperreal counterpart to the real melanated skin of certain people.
            There are also elements of Blackness that are not tied to skin color.
            Regular discussions about whether or not a given person counts as
            “Black” in certain contexts are commonplace, emphasizing the partially
            artificial nature of the construct. One can observe that the models
            for this progression are, broadly, culture and society. As far as we
            take Blackness as a real starting point, it is reflected in behaviors,
            vernaculars, and cultures of Black people. While there are many
            positive ways to observe these behaviors, vernaculars, and cultures in
            everyday life, it is critical to also observe their harmful
            counterparts. Blackface and minstrelsy,
            <Fn n={14} /> are recognizable, but shallow, imitative performances of
            the real experience and state of being of Blackness. As Blackness is
            abstracted further away from reality, non-Black people are better able
            to adopt it; this donning of Black aesthetics, from clothing to
            vernacular, by non-Black people masks real Blackness. Donning these
            aesthetics digitally, via digital Blackface, distances viewers of
            these aesthetics from the users of the aesthetics to the point that it
            masks and obfuscates those users’ lack of real Blackness. Our societal
            willingness to accept this as alright is an early (if not late)
            harbinger of hyperreal Blackness, the existence of which suggests a
            greatly increased potential harm for Black people, as anyone but them
            is allowed to put Blackness on and take Blackness off, so to speak, to
            their benefit. This example begins to reveal the fact that concepts of
            identity have a way of becoming hyperreal for society, while remaining
            real for those who are naturally of the identity; though Blackness has
            progressed societally toward its hyperreal state, it will always exist
            as real for Black people as an experience and state of being.
          </p>
          <p>
            As will be discussed in the next sections, society is careening toward
            the hyperreal state. As social media advances and the law lags, the
            resultant privacy loss evidences this progression. This progression
            will exacerbate harm for Black people as our world becomes more
            inequitable than it already is. Though the advancement of all
            technology, especially social media, has the potential to bring great
            reward to society, our present inability to properly regulate it
            offers little hope that we will avoid such harm. In particular, these
            harms will cause and be the result of privacy loss, a vicious cycle.
            As such, these harms will be increasingly public: Breonna Taylor’s
            murder
            <Fn n={15} /> is, perhaps, the most obvious example of this in
            recency. Though not all privacy loss is the result of social media,
            social media remains one of the largest challenges to privacy
            retention, regardless of individual interaction (or lack thereof) with
            it.
          </p>
          <p>
            There are several approaches that can be taken by individuals,
            technologists, corporations, and governments to ensure course
            correction and provide a path toward a more equitable society, which I
            will outline in the conclusion of this essay. Rather than seeking to
            advise on what not to do, recommendations for addressing challenges
            will focus on positive activities that preclude the need for
            retributive response to any harms. First, it is critical to examine
            the impact of social media and privacy law on society and interrogate
            the roles of individuals, technologists, corporations, and governments
            in perpetuating harms that cause and result from privacy loss. These
            examinations and interrogations will be only for the purposes of
            assessing the loci of harm, and thus the appropriate loci for
            recommended remedial activities.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection
        id="social-media"
        title="III. Social Media: Incidental and Situational Harms"
      >
        <Body>
          <p>
            With the late aughts’ wave of social media came a wave of new privacy
            vulnerabilities, unique in that their existence is positively
            correlated with the progression toward hyperreality. From doxxing to
            deepfake nonconsensual pornography,
            <Fn n={16} /> individuals are at risk of losing their privacy to
            others every day. However, the greater risk to individual privacy is
            less malicious and more pernicious. Social media encourages us to
            commodify the self by sharing pieces of information that, taken
            individually, are rather innocuous, but in aggregate can quickly pose
            significant risk to our privacy and to the privacy of others. A
            further challenge that exacerbates social media’s erosion of
            individual rights of privacy is that the exchanged for rights of
            publicity are being utilized to advance the hyperreal state in which
            we find ourselves living. This exchange and usage has particularly
            negative effects on Black people whose real Blackness is commodified
            primarily to the benefit of non-Black individuals via adoption of
            Black aesthetics and use of digital Blackface, advancing the hyperreal
            state.
          </p>
          <p>
            Many individuals regularly reduce their privacy simply by engaging
            with social media; for some this is geotagging,
            <Fn n={17} /> for others it’s the vernacular they use in comments, for
            others still it’s the information in their social media bios or even
            the accounts they are connected to, especially mutually (i.e. My
            following Beyoncé on Instagram is a data point, but a more meaningful
            data point would be if Beyoncé and I followed each other, especially
            since she famously follows no one.). For most people, it is a
            combination of the above, in various permutations, including for
            example: being tagged
            <Fn n={18} /> in someone else’s photograph that has geographical data;
            recording and posting a video using particular jargon or slang; or
            actively maintaining “main”
            <Fn n={19} /> and “alt”
            <Fn n={20} /> accounts that are connected via, at minimum, the IP
            address
            <Fn n={21} /> they are accessed from. It’s important to acknowledge
            that sometimes this privacy loss is the result of an active trade for
            publicity (e.g. influencers, the Kardashians, etc.), and at many other
            times this privacy loss is the result of happenstance, digitally or
            otherwise being in the wrong place at the wrong time while another is
            exercising their rights of publicity. Given that justice has given way
            to its hyperreal counterpart, the surveillance / police state, Black
            individuals find themselves in this situation more than non-Black
            individuals, and worse, sometimes the being in the wrong place simply
            means being located within a Black body. One of the most studied
            examples of this phenomenon is overpolicing in neighborhoods where the
            racial demographic of the population is predominantly Black. In
            Dannika Gordon’s words, “predominantly Black neighborhoods are
            simultaneously over-policed when it comes to surveillance and social
            control, and under-policed when it comes to emergency services.”
            <Fn n={22} /> This supports Devon W. Carbado’s point, in{" "}
            <Emph>E(racing) the Fourth Amendment</Emph>: “within America’s racial
            environment, policed [B]lack identity is a natural and national
            resource.”
            <Fn n={23} /> The adoption of Black aesthetics and usage of digital
            Blackface by non-Black individuals does not require digital or
            physical proximity to another, but only to real Blackness, to cause
            harm to Black people.
          </p>
          <p>
            As our language becomes increasingly visual
            <Fn n={24} />, our symbols increasingly both recognize and dissociate
            themselves from their reference point. This progression from real to
            hyperreal runs parallel to the idea Carbado presents: “the Court’s
            racialization of the facts is not merely descriptive; it is
            performative, making race appear and disappear, relevant and
            irrelevant as a matter of text, law, and social reality.”
            <Fn n={25} /> A common pattern, the matter at hand is not the matter
            at hand. The salient point is relegated to the subtext of whatever we
            are observing, somewhere between immediately under its surface and
            completely disaggregated from it. Though not all social media is
            visual, it continues to coalesce around visual communication of ideas,
            as is evident from the increase in popularity and the iterations in
            designs of Instagram,
            <Fn n={26} /> TikTok, Snapchat, Twitter,
            <Fn n={27} /> and even Spotify.
            <Fn n={28} /> This is a lens through which we can view two primary
            groups of people whose privacy rights are being eroded by social
            media: those who trade their own rights of privacy for rights of
            publicity and those whose rights of privacy are sacrificed out of
            happenstance by another as they exercise their rights of publicity.
            While there is much to be said about the former group, this essay
            focuses on the latter group; this group experiences both incidental
            harm and situational harm. In the case of incidental harm, those
            belonging to a demographic, whose aesthetics are being adopted by an
            individual exercising their rights of publicity, observe a broad
            reduction in their rights of privacy as a result of that individual.
            In the case of situational harm, those proximal to an individual
            exercising their rights of publicity lose more rights of privacy the
            closer they are to that individual. In both cases, the scale of impact
            is correlated with one’s demographic, whether or not that demographic
            is the subject of publicity. The below elaborates on these two types
            of harm by way of example.
          </p>
          <p>
            A. Digital Blackface and the memeification of Black suffering are both
            examples of incidental harm. The concepts of digital Blackface and
            memeification of Black suffering are defined below, followed by an
            exploration of how they relate to each other. In particular, formal
            definitions and three examples of digital Blackface and two examples
            of memeification of Black suffering will be provided, before moving on
            to assess their relation to each other and the hyperreal state. First,
            a note on the history of Blackface.
            <Fn n={29} /> Since the 1800s white people have put on pitch black
            makeup to perform as Black people, utilizing negative stereotypes to
            heighten their performance, such as laziness, ignorance, cowardice,
            and hypersexuality.
            <Fn n={30} /> We see still see these stereotypes proliferated through
            media, sometimes blatantly inappropriately
            <Fn n={31} /> and, at other times, in an attempt to offer commentary
            with historical accuracy.
            <Fn n={32} /> Further, we see Blackface persist through fictional
            media into the real world, where celebrities like Julainne Hough put
            on Blackface as part of a Halloween costume
            <Fn n={33} /> and then, nearly a decade later, teens in Utah adopt a
            similar costume.
            <Fn n={34} />
          </p>
          <p>
            Turning to digital Blackface, Lauren Michele Jackson defines it as
            “used to describe various types of minstrel performance that become
            available in cyberspace.”
            <Fn n={35} /> Often this looks like the donning of Black aesthetics
            that are apparent in Blackness’s progression toward the hyperreal
            state. Examples include:
          </p>
          <ol className="list-decimal space-y-2 pl-6 marker:text-[var(--text-caption)]">
            <li>
              the over-usage by non-Black people of reaction GIFs
              <Fn n={36} /> featuring Black people;
            </li>
            <li>the usage without accreditation of Black-created content; and</li>
            <li>
              Blackfishing,
              <Fn n={37} /> which includes Blackvoice
              <Fn n={38} /> for the purposes of this argument.
            </li>
          </ol>
          <p>
            While all forms of Blackface are harmful, digital Blackface is
            especially pernicious because what makes it wrong is, perhaps, less
            obvious or observable. Its relative novelty and nebulous shape make
            defining, spotting, and stopping it a unique challenge to address.
            Further, attempting to do so by way of assigning culpability to a
            specific entity or set of entities allows its pervasiveness. The harm
            itself, by contrast, is clear: Blackface dehumanizes Black people and
            perpetuates harmful stereotypes that lead to the inequitable treatment
            of Black people across various contexts, from housing to employment
            and everywhere in between. This said, it bears repeating that the
            following analyses are simply for the purposes of identifying the loci
            of harm.
          </p>
          <p>
            In the case of non-Black people over-using reaction GIFs featuring
            Black people, the locus of harm is most clearly evident in the
            repeated activity itself. If anything, the question of identifying the
            locus might be: how much use is overuse? While a valid question, this
            essay declines to answer it. Answering it primarily leads to remedies
            that would require significant and inappropriate impingement on rights
            of privacy to execute. Many of these would also be retributive
            solutions that ultimately do little to ameliorate the harm done, while
            also advancing the surveillance / police state toward the
            self-surveillance state. A framing this essay will later utilize for
            providing recommendations is: how can overuse be prevented? Differently
            than the former framing, this can be used without needing to identify
            the locus of harm, and leads to a group of viable recommendations that
            are balanced less in favor of broadly impinging upon rights of
            privacy. If we take over-use as the action that creates the locus of
            harm in this case, then we can say that the locus of harm at least
            derives from use, in general.
          </p>
          <p>
            A counter argument to this analysis might be that the locus of harm
            does not matter as much as the locus of the opportunity for harm,
            which would be found in the availability of the reaction GIFs at hand.
            It is conceivable that few would argue for the removal of reaction GIFs
            from broad usage, so the opportunity for harm being referred to is the
            presence of Black people in reaction GIFs. This is an argument with
            both flaws and merits that will not be discussed in this essay.
          </p>
          <p>
            Another example of digital Blackface, the usage without accreditation
            of Black-created content,
            <Fn n={39} /> follows a similar pattern of arguments. Clearly, the
            locus of harm is the usage without accreditation. Here again, a count
            argument can be made for looking at the locus of the opportunity for
            harm, instead. In short, this is a counter argument for less
            Black-created content, which again is an argument with both flaws and
            merits that will not be discussed in this essay. There is, however, a
            key feature, unique to this example, that provides for unique
            recommendations. In particular, this example does not require the
            actual representation of a Black person or even their content. Rather,
            a non-Black person can utilize a Black person’s choreography,
            gesticulation, vernacular, or any other performative aspect of that
            person’s real Blackness and cause harm without explicitly naming the
            reference.
          </p>
          <p>
            Finally, within the realm of digital Blackface’s incidental harm, is
            Blackfishing. This act has been most (in)famously performed by the
            Kardashians throughout the vast majority of their time as celebrities.
            MJ Corey’s Kardashian Kolloqium accounts
            <Fn n={40} /> are a sufficient resource for further learning in this
            area. A critical portion of the Kardashian’s time as celebrities to
            discuss is Kim Kardashian’s rise to prominence alongside Kanye West.
            Their curation of self, particularly their various series of
            reproductions of their selves, arguably serves as a blueprint for
            advancing the hyperreal state through use of media. Kim’s continued
            strategy to commodify the self in the wake of her separation and
            eventual divorce from Kanye West follows this very same blueprint. Her
            ability to appropriate and discard Black aesthetics, while having
            literally Black children, is evidentiary of the scale of her access to
            a hyperreal Blackness.
            <Fn n={41} /> The locus of harm in cases of Blackfishing should be
            found at the point of the discarding of the Black aesthetics. This is
            because the point of discarding is also a point of revelation, where
            the viewer is able to see the discarded Black aesthetics for what they
            are, not real but hyperreal. However, we rarely witness such a
            discarding and are rarely afforded such a revelation. This is what
            gives incidents like the one with Rachel Dolezal
            <Fn n={42} /> so much weight in history. More often than not, it is a
            “knowing” of the appropriation that is the actual locus of harm.
            Counter arguments follow the same pattern as the prior examples, but
            the key feature of this example is that the unrequired actual
            representation is of a culture, rather than of a specific person.
            Because Blackfishing is an inherently deceptive act, it is the most
            insidious of the forms of digital Blackface.
          </p>
          <p>
            Another type of incidental harm that should be addressed, given its
            relation to social media, is the memeification of Black suffering. The
            memeification of Black suffering can best be defined as the
            proliferation of stories about harm suffered by Black people, often to
            the point of virality where the original narrative of the story can be
            overwritten, sometimes to significant detrimental effect. Examples
            include:
          </p>
          <ol className="list-decimal space-y-2 pl-6 marker:text-[var(--text-caption)]">
            <li>
              Bring Back Our Girls;
              <Fn n={43} /> and
            </li>
            <li>
              Blackout Tuesday.
              <Fn n={44} />
            </li>
          </ol>
          <p>
            Each of these examples began as a digital social movement. A great
            affordance of social media is the ability to proliferate media and
            messages. The downside of this is that the more complex the media or
            messages are, the more likely their original meaning will be lost. In
            the spaces where original meanings used to be, others are free to
            install their own. It is in this installation of these various new
            meanings that the harm is found. Sometimes this harm is intentional
            and other times it is not, though identifying the presence of intent
            is not necessary to address the harm.
          </p>
          <p>
            In the case of Bring Back Our Girls, several hundred Nigerian school
            girls were kidnapped by Boko Haram, an Islamic terrorist group, whose
            name means “Western education is forbidden.”
            <Fn n={45} /> These girls were aged sixteen to eighteen and many were
            sold into sexual slavery. In an effort to bring awareness to the
            global community and to incite action, Nigerians took to Twitter and
            launched a social media activism campaign using the hashtag,
            #BringBackOurGirls. As the campaign took off, several world leaders
            participated in the campaign, notably including Malala Yousafzai and
            Michelle Obama. Michelle Obama’s post, in particular, went on to be
            memed.
            <Fn n={46} /> One of the first people to parody the post was Ann
            Coulter, whose post read: Bring Back Our Country;
            <Fn n={47} /> it shouldn’t be lost on us that a few years later, the
            United States’s forty-fifth President, whom Coulter supported at the
            time, rallied his base (and continues to do so) with the adjacent
            “Make America Great Again.” Coulter’s parody follows the meme format
            that took off, where users would hold up a blank white sheet of paper
            and edit digital text over it, reading: “Bring Back Our [Punchline
            Word].” Regardless of the aim, the infliction of incidental harm upon
            the Nigerian school girls is borne out of the memeification of the
            digital social movement. While it may be argued that this memeification
            is more about lambasting social media activism, it cannot be
            understated that the actions taken to do so have an outsized impact on
            the would-be benefactors of the activism at hand.
          </p>
          <p>
            Over half a decade later, Blackout Tuesday had a significantly greater
            impact in the wake of the murders of George Floyd, Ahmaud Arbery, and
            Breonna Taylor. Originally meant to be a music industry protest,
            <Fn n={48} /> Blackout Tuesday started as a day to reflect on systemic
            racism and turned into a nightmare for protest organizers. Initially,
            the digital social movement even used a different hashtag,
            #TheShowMustBePaused. #TheShowMustBePaused was initiated by two Black
            women, Jamila Thomas and Brianna Agyemang, and aims to be a call to
            action for music industry leaders to address the dearth of growth
            opportunities for Black music industry professionals. As others sought
            to join the movement and align themselves with it, some would argue
            performatively, they adopted the corresponding “black squares” posts on
            Instagram and captioned them with #BlackoutTuesday, #BLM, and
            #BlackLivesMatter. As this happened during a time with active Black
            Lives Matter protests, critical information from organizers about the
            ongoing protests was drowned out. What started as a day calling for
            acknowledgement of systemic inequities in a specific industry turned
            into self-congratulatory posturing by the uninformed. Not only did
            this co-opting of the digital social movement cause incidental harm to
            Black musical artists, who were the original subject of the movement,
            but it also opened the door to situational harm to protesters, Black
            and otherwise. Again, the primary risk to individual rights of privacy
            is the result of situational harms such as this.
          </p>
          <p>
            B. If incidental harms were not bad enough, situational harms are more
            pernicious and pervasive by far because they infringe upon
            individuals’ rights of privacy, while also precluding them from
            accessing their rights of publicity. Take, for example, a
            photojournalist capturing images within a number of locations,
            specific to a community that is their subject, and in which a number of
            human subjects appear without consent. The photojournalist, through
            copyright, has access to benefits from the commodification of these
            subjects that do not infringe upon their rights of publicity. The
            subjects themselves do not have access to those benefits
            <Fn n={49} /> and are also subject to further harms as the result of
            their loss of privacy. These harms are compounded in the social media
            era, due to biometric technology and AI. Following the concept of
            biometrics will be defined, before exploring how it relates to AI. In
            particular, a formal definition and two examples of applied biometrics
            will be provided, before moving on to assess their contribution to
            society’s progression toward the hyperreal state.
          </p>
          <p>
            Biometrics are “unique physical characteristics, such as fingerprints,
            that can be used for automated recognition.”
            <Fn n={50} /> Artificial intelligence is:
          </p>
          <Blockquote>
            <p>
              a field, which combines computer science and robust datasets, to
              enable problem-solving. It also encompasses sub-fields of machine
              learning and deep learning, which are frequently mentioned in
              conjunction with artificial intelligence. These disciplines are
              comprised of AI algorithms which seek to create expert systems which
              make predictions or classifications based on input data.
              <Fn n={51} />
            </p>
          </Blockquote>
          <p>
            Often, when AI is discussed, it is some type of machine learning (ML)
            that is actually the matter at hand. Applied biometrics, then, is
            simply biometrics that are actively being used for automated
            recognition. Social media deploys applied biometrics powered by ML and
            harnesses deep learning to advance the strength of the underlying
            algorithms. Deep learning is a subset of ML and describes ML processes
            that handle unstructured data, where ML is broadly meant to describe
            algorithms that process structured data.
            <Fn n={52} /> Further, these processes can also be supervised or
            unsupervised, meaning they either require a level of human input, by
            way of data labeling, or not. Typically, when applied biometrics are
            discussed, it is when they are powered by unsupervised, deep learning
            algorithms. Examples include:
          </p>
          <ol className="list-decimal space-y-2 pl-6 marker:text-[var(--text-caption)]">
            <li>facial recognition; and</li>
            <li>vocal recognition.</li>
          </ol>
          <p>
            While each of these examples poses problems for the individuals that
            utilize and are the subjects of such technologies, particularly
            psychological harms
            <Fn n={53} /> and broad sociological harms,
            <Fn n={54} /> the focus of the remaining portion of this essay will be
            on the situational harms driven by these technologies and that are
            incurred by bystanders. More accurately, the availability (without
            proper regulation
            <Fn n={55} />) of these technologies to corporations and governments
            drives the potential for such situational harms. Individual usage of
            these technologies does not usually give way to these same harms;
            individual usage of related video and / or audio content-producing
            technologies is more linked to the situational harms at hand. The
            closer a bystander is to an individual actively using video and / or
            audio content-producing technologies, the more likely it is that they
            may incur situational harms associated with facial recognition and /
            or vocal recognition technologies. Similarly, more harm is incurred
            when more of these technologies are being used in combination.
          </p>
          <p>
            As previously mentioned, facial recognition technologies can lead to
            psychological and sociological harms when used by individuals. The
            primary application of facial recognition technologies that leads to
            this is social media filters.
            <Fn n={56} /> In particular, some of these filters extend the harms of
            digital Blackface and Blackfishing. Non-Black individuals can use
            certain filters that deploy facial recognition technologies to adopt
            Black aesthetics, then shed those aesthetics in subsequent posts simply
            by not using such filters. There is certainly also something to be
            said about the psychological and sociological harms done to Black
            people that cannot effectively use filters that deploy facial
            recognition technologies.
            <Fn n={57} /> Ultimately, all of these cases are ones of incidental
            harm; differently than the previously discussed examples, Black
            people’s inability to use technologies that lead to incidental harm
            falls into a sort of subcategory of that harm by which they face
            erasure, rather than loss of rights of privacy. Prior work
            <Fn n={58} /> has discussed this and this essay will not expand on it,
            for sake of clarity in this writing.
          </p>
          <p>
            Within the scope of this writing, it is more important to address the
            situational harm that arises from, for example, unintentionally being
            captured in the background of an individual’s photograph. There is some
            loss of privacy resultant from the capturing of the photograph. There
            is even greater loss of privacy at the point of the photograph being
            shared on social media. All of this advances the surveillance state by
            means of self-surveillance. Given that we live in an increasingly
            digital time, it is an assumption that most photographs posted to
            social media are digital, taken on a smartphone or digital camera and
            then uploaded to a social media app, or taken within the social media
            app itself, harnessing the camera of whichever digital device is
            accessing the app. The individual taking and posting the photograph
            may or may not do so relatively immediately, the most immediate of
            course being taking the photo inside of the app and immediately posting
            it. They also may or may not use geotagging on the actual social media
            post. Regardless, the photograph itself is likely to have metadata
            <Fn n={59} /> that gives away information about the time and space in
            which the photograph was taken. Though this only applies to digital
            photographs, even analog photographs may carry visual evidence that
            give away similar information to a more trained eye.
            <Fn n={60} />
          </p>
          <p>
            Vocal recognition technologies run into similar problems, though it
            should be noted that there are fewer social media applications that are
            also more nascent.
            <Fn n={61} /> Incidental harm from these technologies may arise in the
            form of Blackvoice and in the appropriation of the audio of a Black
            creator.
            <Fn n={62} /> Situational harm, in this case, arises from an
            individual’s voice being captured in the background of a recording, for
            example. As social media apps trend toward encouraging video-based
            content,
            <Fn n={63} /> audio is increasingly paired with posted content,
            compounding the potential for situational harms. Vocal recognition
            technologies are being deployed in criminal justice and law
            enforcement practices globally,
            <Fn n={64} /> made more powerful by samples provided by social media.
            This is, perhaps, the clearest way in which the surveillance / police
            state progresses toward its hyperreal state and becomes
            self-surveillance. It is easy, here, to think of the criminal justice
            and law enforcement usage of vocal recognition technologies as just
            that, but more simply we are telling on ourselves and each other with
            every social media engagement.
          </p>
          <p>
            The situational harms outlined above affect everyone. However, the
            effect on Black people is outsized, especially when considering the
            present ability for corporations and governments to access and act on
            the artifacts of such surveillance like photographs and videos. Taking
            on solutions that address the potential for such harms for the most
            at-risk population benefits everyone. Given that the risk is borne of
            self-surveillance, privacy solutions are the most relevant to consider.
            Further, solutions in the realm of rights of publicity are also not
            relevant to discuss here, since there is no infringement on rights of
            publicity in the cases of greatest harm.
            <Fn n={65} /> Below, the situational harms outlined above will be
            expanded upon through further examples and discussion of the
            associated privacy risks, before moving on to recommended solutions.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection
        id="privacy-law"
        title="IV. Privacy Law: Warning Signs and the Current Landscape"
      >
        <Body>
          <p>
            Rights of privacy, thin as they ever were, continue to be eroded every
            day. Legal scholars have been attempting to prevent this erosion for
            more than a century. In their seminal article from 1890,{" "}
            <Emph>The Right to Privacy</Emph>,
            <Fn n={66} /> Samuel D. Warren and Louis D. Brandeis warn,
            “Instantaneous photographs and newspaper enterprise have invaded the
            sacred precincts of private and domestic life.” They were more right
            than they knew. They argue that privacy is largely the “right to be let
            alone.”
            <Fn n={67} /> Privacy is “not simply an absence of information about
            what is in the minds of others; rather it is the control we have over
            information about ourselves.”
            <Fn n={68} /> As a practical matter, one retains the most rights of
            privacy, the most control over their personal information, when they
            are alone in their own home. The less one is alone and the less one is
            within their own home, the fewer rights of privacy they have. It is
            worth looking at the origins of privacy loss to, at minimum, observe
            the vulnerabilities of present approaches to rights of privacy. Where
            possible, it is also worthwhile to observe potential solutions to these
            vulnerabilities, should they present themselves. In certain cases, one
            might consider trading their rights of privacy for rights of publicity,
            but these cases are limited. Generally speaking, there is no legal
            remedy for broad loss of privacy, and there probably shouldn’t be. Such
            remedies would begin to encroach on freedom of expression. Ultimately,
            privacy loss is the result of regulatory law lagging behind
            technological development.
            <Fn n={69} /> As social media commodifies identity
            <Fn n={70} /> and encourages individuals to commodify themselves,
            everyone suffers privacy loss.
          </p>
          <p>
            As described in the above examples, particularly of social media’s
            situational harms, these issues disproportionately affect Black people.
            As Carbado notes, “there is no reasonable person who is racially
            unsituated…To avoid explicitly invoking race is to invoke it in a
            particular way. Race avoidance conveys the idea that race does not
            matter, and masks the ways in which it actually does.”
            <Fn n={71} /> In other words, race must specifically be addressed as
            material to the problems. Non-Black people do not face the same harms
            as their Black peers, nor the same amount. In fact, it is their choices
            that generate the majority of the harms that Black people face. On
            face, it would seem that desire for rights of privacy, the right to be
            let alone, has waned in the social media era. As Anita L. Allen puts it
            in <Emph>Coercing Privacy</Emph>, “The final decades of the twentieth
            century could be remembered for the rapid erosion of expectations of
            personal privacy and of the taste for personal privacy in the United
            States.”
            <Fn n={72} /> However, erosion of privacy isn’t necessarily due to
            one’s own choices. This trend ignores the relationship outlined above,
            where non-Black people take actions that cause privacy loss for Black
            people. Such a trend also ignores how “race – and more particularly,
            racial stereotypes – can constrain one’s choice, one’s will, and one’s
            capacity for self-determination.” Black people’s attitudes toward
            privacy differ from their non-Black counterparts as a result of
            circumstance. Not only do they have fewer choices, but sometimes those
            are different and sometimes the same choices have different
            consequences. Because of this, it cannot necessarily be said that
            expectations of and taste for privacy have been eroded. Such a trend
            also runs counter to William James Sidis’s sentiments in the late
            1930s.
            <Fn n={73} /> In Sidis’s words, “I want to live the perfect life. The
            only way to live the perfect life is to live it in seclusion.”
            <Fn n={74} />
          </p>
          <p>
            At the time, Sidis was the subject of a biographical article in{" "}
            <Emph>The New Yorker</Emph>. Sidis was a child prodigy with exceptional
            skill as a mathematician who eventually withdrew from public life. The
            magazine had published a “Where Are They Now?” segment, including
            Sidis. Sidis filed a claim against the publisher and, in the above
            quote, was commenting on what he perceived to be a deprivation of
            seclusion, given that this particular publication was not entered into
            willingly by Sidis. While some may agree with Sidis, the Court held a
            different opinion because of Sidis’s past as a child prodigy. At that
            time, Sidis received news coverage and, in doing so, became a public
            figure. Rights of publicity do not apply to public figures, even in
            situations that may cause emotional distress.
            <Fn n={75} /> For those that agree with Sidis, this opinion and
            reasoning feels unsatisfactory. There is no clear definition for what
            constitutes a public figure, nor is there a mechanism by which one can
            renounce such a status. Additionally, this reasoning fails to address
            identity-based constraints, particularly as regards race. Should a
            child prodigy permanently lose their rights of privacy on the basis of
            a status they earned as a child? Perhaps. Perhaps not. Would the answer
            change if race were a factor? Perhaps. Perhaps not.
          </p>
          <p>
            At the present time, though, child prodigies lose their rights of
            privacy, regardless of race. Once someone does something newsworthy,
            most anything else they do (and often, anything they have done) is
            deemed newsworthy
            <Fn n={76} /> and “a matter of public interest.”
            <Fn n={77} /> In these and similar cases, rights of publicity are what
            remain. These rights are also rather limited. Rather than rights that
            provide for broad control of one’s public image, rights of publicity
            are structured in relation to advertisement, particularly “endorsing or
            promoting a product.”
            <Fn n={78} /> For example, appearing in the background of someone’s
            photograph does not give rise to a cause of action, even if the person
            refuses to take the post down upon request. Worse yet, if one feels
            their rights of publicity have been infringed upon, they must “allege
            how the…use of the information deprived [them] of the…economic value.”
            <Fn n={79} /> In other words, if the photograph were part of an
            advertisement, and the person appearing in the background was blocked
            from profiting in the same way, then there would be a rights of
            publicity infringement. Additionally, the Supreme Court has ruled that
            “allegations of possible future injury are not sufficient to establish
            an injury.”
            <Fn n={80} /> In other words, if the photograph could become an
            advertisement, but has not yet become one, that does not give rise to a
            cause of action. Any subjects would need to allege and prove that such
            deprivation occurred and was not theoretical or imminent. Rights of
            publicity remedies are responsive, not proactive, and are targeted at
            resolving unjust enrichment due to the relation between the
            infringement and profits the infringer received in exchange for the
            content that produced the infringement. Once someone is a “public
            figure,” which we all know when we see it, but cannot define, they
            cannot retain most rights to privacy; instead, those are converted to
            rights to publicity, much like a conversion of stock options to shares.
            <Fn n={81} /> In both cases, the primary item predominantly gains value
            at the point of conversion, and that value can only be extracted from
            the second item at the point of trade. The law encourages us to
            commodify ourselves as part of its relation to our capitalist economic
            structure.
          </p>
          <p>
            Returning to Warren’s and Brandeis’s sentiments, they articulate simply
            the problem that our society still faces: “harm wrought by such
            invasions [is not] confined to the suffering of those who may be made
            the subjects of journalistic or other enterprise.”
            <Fn n={82} /> The situational harms discussed above, particularly being
            captured in the background of someone’s photograph, audio recording, or
            video recording, lead to broad societal harms, in addition to the
            initial harms being visited upon a select few. The proliferation of
            such harms across social media make this problem more prevalent than
            the premise of Warren’s and Brandeis’s sentiments would suggest, on
            face, and likely more than they ever anticipated. Someone once said
            something like,
            <Fn n={83} /> “In the future, everyone will be world-famous for fifteen
            minutes.”
            <Fn n={84} /> The prescience of this statement (however it goes and
            whoever said it) is seen in today’s social media landscape, where we
            define each user’s level of celebrity by the size of their following.
            <Fn n={85} /> It simply doesn’t take much for one to achieve those 15
            minutes—and extend them. Insofar as we all might be celebrities without
            privacy, and to Marshall Leaffers’s point in{" "}
            <Emph>The Right of Publicity: A Comparative Perspective</Emph>, “the
            law must balance the celebrity’s interest in controlling their image
            with the public’s interest in using these images as a means of
            communication.” Again, the ability to exercise rights of publicity,
            especially in relation to alleged misappropriation of the self, is
            minimal.
          </p>
          <p>
            Take, for example, a 2016 case where Target used images of Rosa Parks
            on retail merchandise.
            <Fn n={86} /> In{" "}
            <Emph>
              Rosa and Raymond Parks Institute for Self Development v. Target Corp.
            </Emph>
            , the Court held that Target had “qualified privilege to report on
            matters in the public interest[, which] applied to retailer’s sale of
            items adorned with images of and related to figure.” Here, the Court’s
            opinion looked to broader privacy rights to establish the fact that
            public figures are largely not entitled to rights of publicity. A
            confounding factor of this case is that the likeness of the public
            figure was controlled by a nonprofit entity (Rosa Parks was no longer
            alive at this point). That aside, the Court’s opinion is seemingly
            contradictory. If one loses their rights of privacy, when becoming a
            public figure, they shouldn’t also lose their rights of publicity,
            which hinge on advertisement and sale. Yet, the opinion of the Court is
            that selling retail is reporting, which would be addressed by rights of
            privacy. This puts public figures in a paradoxical situation where they
            lose both rights of privacy and rights of publicity.
          </p>
          <p>
            But not all public figures. By contrast, the Court ruled, in{" "}
            <Emph>White v. Samsung Electronics America, Inc.</Emph>, that Vanna
            White brought evidence that provided for a jury ruling in a rights of
            publicity case against Samsung. In particular, the Court did not bring
            up matters of public interest. When held up against the{" "}
            <Emph>
              Rosa and Raymond Parks Institute for Self Development v. Target Corp.
            </Emph>{" "}
            ruling, this indicates that there is some sort of difference between a
            public figure and an historic public figure, at best. In other words,
            Rosa Parks is more important to history than Vanna White, and as such
            her likeness is not entitled to rights of privacy nor rights of
            publicity. At worst, the difference in the holdings illuminate a racial
            disparity in such legal proceedings regarding rights of privacy and
            rights of publicity. In{" "}
            <Emph>White v. Samsung Electronics America, Inc.</Emph>, the Court even
            goes as far as to say that:
          </p>
          <Blockquote>
            <p>
              the common law right of publicity reaches means of appropriation
              other than name or likeness, but…specific means of appropriation are
              relevant only for determining whether the defendant has in fact
              appropriated the plaintiff’s identity. The right of publicity does
              not require that appropriations of identity be accomplished through
              particular means to be actionable…Although the defendants in [other]
              cases avoided the most obvious means of appropriating the plaintiffs’
              identities, each of their actions directly implicated the commercial
              interests which the right of publicity is designed to protect.”
              <Fn n={87} />
            </p>
          </Blockquote>
          <p>
            This opinion was delivered almost a decade and a half prior to the
            opinion in{" "}
            <Emph>
              Rosa and Raymond Parks Institute for Self Development v. Target Corp.
            </Emph>{" "}
            This makes it even more difficult to square the two and view their
            holdings as congruous. Notably, both cases only made their way to the
            Court of Appeals in their respective Circuits, so this incongruity is
            legally permissible. Though each opinion has a different result for the
            parties at hand, the holdings overlap in that they maintain that rights
            of publicity give rise to causes of action when the appropriation of a
            person’s likeness is tied to advertising and selling.
          </p>
          <p>
            One of the current ways in which this appropriation happens is through
            the use of deepfakes. Deepfakes are “videos that use machine-learning
            algorithms to digitally impose one person’s face and voice onto videos
            of other people.”
            <Fn n={88} /> In{" "}
            <Emph>Deepfake Privacy: Attitudes and Regulation</Emph>, Matthew B.
            Kugler and Carly Pace discuss the particular privacy harms associated
            with deepfakes, especially deepfake pornography. Though not the
            explicit focus of this research, they make a salient point about the
            state of privacy in relation to technology:
          </p>
          <Blockquote>
            <p>
              The case of deepfake technology further points to an emerging problem
              in the privacy landscape. Privacy in this context is about dignity,
              autonomy, and identity expression – about people losing control of
              their public identities. To appropriately understand the danger
              associated with deepfakes and the unauthorized use of one’s likeness,
              courts and policymakers must take seriously the kinds of dignitary
              harms associated with these new kinds of privacy invasion.
              <Fn n={89} />
            </p>
          </Blockquote>
          <p>
            To their point, deepfakes are but one example of a kind of privacy
            invasion that is largely made possible by the advent of social media.
            These new kinds of privacy invasions that Kugler and Pace allude to are
            critical to consider in the context of{" "}
            <Emph>White v. Samsung Electronics America, Inc.</Emph>, which again
            states that “means of appropriation other than name or likeness” give
            rise to causes of action under rights of publicity. In the case where
            someone is unable to exercise rights of privacy and rights of publicity
            are limited, it is appropriate to consider an expansive definition of
            appropriation. Early social media served as the harbinger of the
            proliferation and commodification of literal self image.
            <Fn n={90} /> As such, social media continues to play an outsized role
            in creating the space for the new kinds of privacy invasions that
            Kugler and Pace warn about. Recalling that a capitalist governmental
            structure encourages us to commodify ourselves, on social media almost
            anyone with a public account could become a public figure, especially
            given the lack of true definition. Further, this commodification of the
            self, utilizing social media, includes the commodification of personal
            data that can be used to identify individuals. As Paul M. Schwartz put
            it in 1999, “individual self-determination is itself shaped by the
            processing of personal data.”
            <Fn n={91} /> This personal data is more and more commonly the
            appropriated likeness, when viewed through the lens of doctrine
            presented in{" "}
            <Emph>White v. Samsung Electronics America, Inc.</Emph>
          </p>
          <p>
            All together, individuals are being encouraged to forgo their rights of
            privacy to commodify themselves, while also being provided limited
            means by which to access their rights of publicity. This is encouraged
            by social media and advances us toward a surveillance state wherein
            there is no privacy. As Julie E. Cohen wrote in 2000, “the condition of
            no-privacy threatens not only to chill the expression of eccentric
            individuality, but also, gradually, to dampen the force of our
            aspirations to it.”
            <Fn n={92} /> Ultimately, because social media advances us toward the
            surveillance state it also erodes self-expression, rendering us more
            alike in all the ways that do not matter. The likeness of likenesses
            drives down the value found in individuality. This same individuality,
            being the very thing that was commodified, has real and conceptual
            costs. While it is problematic to place value on the likeness of
            individuals, it is a requirement. Present legal doctrine seeks justice
            financially in cases dealing with rights of publicity, given their
            relation to advertisement and sales. In light of the current state of
            privacy, erosion of such a value is more problematic than assessing the
            value in the first place. As Schwartz warns, “If sound rules for the
            use of personal data are not established and enforced, society as a
            whole will suffer because people will decline to engage in a range of
            different social interactions due to concerns about use of personal
            information. A public good – the privacy commons – will be degraded.”
            <Fn n={93} /> Loss of privacy, being harmful unto itself, the
            accompanying sameness is a threat looming just off in the distance.
          </p>
        </Body>
      </ProjectSection>

      <ProjectSection id="conclusion" title="V. Conclusion">
        <Body>
          <p>
            Social media erodes our privacy every day. Even if we, as individuals,
            do not engage with social media, it impacts our ability to maintain any
            privacy. The further cost of this privacy is our self-expression. As
            less privacy is available, people are less likely to express anything
            that deviates from the norm. Cruelly, self-expression is the very thing
            social media demands to perpetuate its harms. Its greatest harms are
            borne out of a self-expression that appropriates Blackness and out of
            less clearly harmful self-expression that simply documents Blackness.
            Generally, self-expression via social media advances the surveillance
            state, which has the potential for disproportionate harms to be
            incurred by Black people. This disproportion is caused by the other
            self-expression that social media encourages, and which leads non-Black
            people to appropriate Blackness.
          </p>
          <p>
            Referencing different cultures is not inherently problematic. Adoption
            of identities that one does not belong to, cultural appropriation,
            <Fn n={94} /> is. In the digital landscape, the line between reference
            and appropriation is unclear. The same behavior becomes problematic at
            a certain, though presently unidentifiable point. Where that point is,
            only time will tell, and we’ll only realize it in retrospect. This is
            because hyperrealism’s systematic abstractions drive the advancement
            from one stage of a concept to the next. A key feature of this process
            is that it seems to happen almost instantaneously.
            <Fn n={95} /> In the context of digital spaces, the difference between
            what is problematic cultural appropriation and what is unproblematic
            cultural reference is just the difference between stages of the same
            behavior.
          </p>
          <p>
            More truly radical thinking and behavior is necessary to affect the
            broader systemic change that is required to most wholly meet this
            moment. At the same time, there are initial solutions that can be found
            within our current system. These solutions are primarily focused on
            restoring privacy, or at least mitigating further privacy loss, by way
            of making privacy more compulsory. That is to say, solutions should
            coerce privacy as means to prevent overuse of technologies and modes of
            communication that cause privacy loss. At minimum, this is paramount to
            restoring health to our current society in the United States. “To speak
            of ‘coercing’ privacy is to call attention to privacy as a foundation,
            a precondition of a liberal egalitarian society.”
            <Fn n={96} /> If the government can be said to be responsible for
            tending to our society, they have the most ability to implement such
            solutions.
          </p>
          <p>
            The primary solution governments can put forth is the adoption of more
            stringent privacy regulations that provide individuals with a greater
            level of management of their privacy. GDPR
            <Fn n={97} /> or CCPA
            <Fn n={98} /> provide sufficient starter models for data privacy that
            can be extended to other, perhaps more specific, forms of privacy.
            Further, governments can regulate the technologies that underpin social
            media. It is important that they specifically regulate the
            technologies, rather than particular industries that use and deploy
            such technologies. For example, regulators might focus on directly
            regulating algorithms, codebases, and databases, rather than regulating
            social media platforms. Regulators could also better regulate the
            purchase and sale of user data. These options all being available, it
            is difficult to conceive of the United States governments taking any of
            these approaches with any immediacy, especially at the federal level.
          </p>
          <p>
            Assuming the government is somewhat responsive to corporate management
            patterns, corporations also have influence in this matter.
            Corporations, at minimum, should have clear, brief, and transparent
            external privacy policies, as well as appropriately clear and
            exhaustive internal privacy policies. Depending on the business of the
            corporate entity, various measures may need to be addressed.
            Corporations should also elect to discontinue the purchase and sale of
            user data. The increased sale of user data over time
            <Fn n={99} /> does not indicate a pattern of value as much as it
            indicates a pattern of what may be necessary to compete in the market,
            particularly for new entrants or corporations facing a downturn. While
            some businesses are modeled entirely on such transactions, the question
            remains: should they be?
          </p>
          <p>
            Corporate policies and stances, though, are only as good as the
            professionals implementing or adhering to them, especially
            technologists. In partnership with corporate leadership or failing such
            leadership, technologists should develop tools, especially social media
            tools, in compliance with the most stringent global privacy laws. A
            product “MVP”
            <Fn n={100} /> should consider the most vulnerable, not just the most
            valuable, as it sets out to determine what is minimally viable. To do
            this, technologists should lean on ethical frameworks as part of their
            development practice. Finally, technologists can set up systems that
            take a “burn after reading” approach with user data. Rather than
            creating systems that store data in perpetuity, systems can be built to
            delete user data after an appropriate time. Deletion protocols could
            also be built to take an approach whereby only user-identifying data is
            deleted, which would have the effect of retaining greater value for the
            organization. Of course, this gives rise to complications around what
            user-identifying data is, in a world where data is disaggregated and
            re-aggregated so commonly.
            <Fn n={101} />
          </p>
          <p>
            The challenge of productizing solutions or socializing them via
            corporations or governments is not insignificant. So, while individuals
            should not be tasked with protecting society, it should be acknowledged
            that individuals do have power to protect themselves, especially when
            mobilized as a collective. For starters, more individuals should
            educate themselves on privacy and media literacy, and encourage their
            networks to do the same. With that, they should regularly assess their
            own relationship to privacy and publicity. As more and more people
            leave social media platforms,
            <Fn n={102} /> it is a strong suggestion that every individual at least
            engage less with social media. Ultimately, Sidis was right to note that
            “The only way to live the perfect life is to live it in seclusion.”
            <Fn n={103} /> More individuals should elect to spend more time alone,
            particularly as a last ditch effort to retain privacy in an
            increasingly public world.
          </p>
          <p>
            Privacy is important to society, and yet humans are social creatures.
            The challenge is not to eliminate public life, but to recalibrate it so
            that more individuals can retain a private life if they wish. The
            premium placed on publicity must be reconsidered and significantly
            reduced. Human obsession with celebrity, of others and ourselves, must
            be curbed if society is to be more full of diverse self-expression and
            free from surveillance. In viewing the problem we face through the lens
            of hyperrealism, it would seem that society’s downfall is inevitable. To
            take that view is defeatist. It is an assumption that it is much
            preferable for us all to live lives of hopefulness. And just because
            something seems hopeless is not a sufficient reason to not try to make
            it better. So, be social. Engage with digital media, get outside, touch
            some grass—maybe just leave your phone at home every once in a while,
            and don’t post about it.
          </p>
        </Body>
      </ProjectSection>

      <Footnotes>
        <FnItem n={1}>Oxford English Dictionary.</FnItem>
        <FnItem n={2}>
          Jean Baudrillard, <Cite>Simulacra and Simulation</Cite> 6 (1994).
        </FnItem>
        <FnItem n={3}>
          Carla Tardi,{" "}
          <Cite>
            <Link href="https://www.investopedia.com/terms/m/mooreslaw.asp" quiet>
              What Is Moore’s Law and Is It Still True?
            </Link>
          </Cite>
          , Investopedia (2023).
        </FnItem>
        <FnItem n={4}>
          Dr. Simon Gathercole,{" "}
          <Cite>
            <Link
              href="https://www.theguardian.com/world/2017/apr/14/what-is-the-historical-evidence-that-jesus-christ-lived-and-died"
              quiet
            >
              What is the historical evidence that Jesus Christ lived and died?
            </Link>
          </Cite>
          , The Guardian (2017).
        </FnItem>
        <FnItem n={5}>
          <Cite>The New Oxford Annotated Bible</Cite> (Michael D. Coogan, Marc Z.
          Brettler, Carol A. Newsom, &amp; Pheme Perkins eds. 2007).
        </FnItem>
        <FnItem n={6}>
          Ariana Grande, <Cite>God is a woman</Cite>, <Cite>on</Cite> Sweetener
          (Republic Records 2018).
        </FnItem>
        <FnItem n={7}>
          <Cite>Black Jesus</Cite> (Adult Swim television broadcast 2014–2019).
        </FnItem>
        <FnItem n={8}>
          Jean Baudrillard, <Cite>Simulacra and Simulation</Cite> 2 (1994).
        </FnItem>
        <FnItem n={9}>
          <Cite>Ziwe</Cite>, 55% (Showtime television broadcast May 9, 2021).
        </FnItem>
        <FnItem n={10}>
          Minority Report (20th Century Fox, DreamWorks Pictures, Amblin
          Entertainment, Blue Tulip Productions 2002).
        </FnItem>
        <FnItem n={11}>
          Sen Nguyen,{" "}
          <Cite>
            <Link
              href="https://www.cnn.com/2023/02/07/world/what-is-doxxing-explainer-as-equals-intl-cmd/index.html"
              quiet
            >
              What is doxxing and what can you do if you are doxxed?
            </Link>
          </Cite>
          , CNN (2023).
        </FnItem>
        <FnItem n={12}>
          Emily A. Vogels, Monica Andrson, Margaret Porteus, Chris Baronavski,
          Sara Atske, Colleen McClain, Brooke Auxier, Andrew Perrin, &amp; Meera
          Ramshankar,{" "}
          <Cite>
            <Link
              href="https://www.pewresearch.org/internet/2021/05/19/americans-and-cancel-culture-where-some-see-calls-for-accountability-others-see-censorship-punishment/"
              quiet
            >
              Americans and ‘Cancel Culture’: Where Some See Calls for
              Accountability, Others See Censorship, Punishment
            </Link>
          </Cite>
          , Pew Research Center (2021).
        </FnItem>
        <FnItem n={13}>
          Nichanan Kesonpat,{" "}
          <Cite>
            <Link
              href="https://medium.com/1kxnetwork/towards-digital-self-sovereignty-the-web3-identity-stack-874d5e015bae"
              quiet
            >
              Towards Digital Self-Sovereignty: The Web3 Identity Stack
            </Link>
          </Cite>{" "}
          (2022).
        </FnItem>
        <FnItem n={14}>
          <Cite>
            <Link
              href="https://nmaahc.si.edu/explore/stories/blackface-birth-american-stereotype"
              quiet
            >
              Blackface: The Birth of An American Stereotype
            </Link>
          </Cite>
          , National Museum of African American History &amp; Culture (last visited
          May 6, 2023).
        </FnItem>
        <FnItem n={15}>
          Richard A. Oppel Jr., Derrick Bryson Taylor, &amp; Nicholas
          Bogel-Burroughs,{" "}
          <Cite>
            <Link
              href="https://www.nytimes.com/article/breonna-taylor-police.html"
              quiet
            >
              What to Know About Breonna Taylor’s Death
            </Link>
          </Cite>
          , The New York Times (2023).
        </FnItem>
        <FnItem n={16}>
          Matthew B. Kugler &amp; Carly Pace,{" "}
          <Cite>Deepfake Privacy: Attitudes and Regulation</Cite>, 116 NULR 611,
          (2021).
        </FnItem>
        <FnItem n={17}>
          <Cite>Geotagging</Cite>, Techopedia (Margaret Rouse ed. 2021).
        </FnItem>
        <FnItem n={18}>
          <Cite>
            <Link
              href="https://www.bigcommerce.com/ecommerce-answers/what-is-a-tag/"
              quiet
            >
              What is a tag on social media?
            </Link>
          </Cite>
          , BigCommerce (last visited May 6, 2023).
        </FnItem>
        <FnItem n={19}>
          <Link
            href="https://www.cyberdefinitions.com/definitions/ALT.html"
            quiet
          >
            ALT
          </Link>
          , Cyber Definitions (last visited May 6, 2023).
        </FnItem>
        <FnItem n={20}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={21}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={22}>
          Robin Smyton,{" "}
          <Cite>
            <Link
              href="https://now.tufts.edu/2020/06/17/how-racial-segregation-and-policing-intersect-america"
              quiet
            >
              How Racial Segregation and Policing Intersect in America
            </Link>
          </Cite>
          , Tufts Now (2020).
        </FnItem>
        <FnItem n={23}>
          Devon W. Carbado, <Cite>E(racing) the Fourth Amendment</Cite>, 100 Mich.
          L. Rev. 946, 964 (2002).
        </FnItem>
        <FnItem n={24}>
          Ben Bajarin,{" "}
          <Cite>
            <Link
              href="https://www.vox.com/2015/6/16/11563610/the-new-era-of-visual-communication"
              quiet
            >
              The New Era of Visual Communication
            </Link>
          </Cite>
          , Vox (2015).
        </FnItem>
        <FnItem n={25}>
          Carbado, <Cite>supra</Cite> note 23 at 1,033.
        </FnItem>
        <FnItem n={26}>
          <Cite>
            <Link
              href="https://about.instagram.com/blog/announcements/introducing-instagram-reels-announcement"
              quiet
            >
              Introducing Instagram Reels
            </Link>
          </Cite>
          , Instagram (2020).
        </FnItem>
        <FnItem n={27}>
          Aja Romano,{" "}
          <Cite>
            <Link
              href="https://www.vox.com/22430344/what-is-twitter-crop-new-image-ratio-memes"
              quiet
            >
              Open for a surprise: The endearing results of Twitter’s new image
              crop
            </Link>
          </Cite>
          , Vox (2021).
        </FnItem>
        <FnItem n={28}>
          <Cite>
            <Link href="https://support.spotify.com/us/article/videos/" quiet>
              Videos
            </Link>
          </Cite>
          , Spotify (last visited May 6, 2023).
        </FnItem>
        <FnItem n={29}>
          National Museum of African American History &amp; Culture, <Cite>supra</Cite>{" "}
          note 14.
        </FnItem>
        <FnItem n={30}>
          Harmeet Kaur,{" "}
          <Cite>
            <Link
              href="https://www.cnn.com/2019/02/02/us/racist-origins-of-blackface/index.html"
              quiet
            >
              This is why blackface is offensive
            </Link>
          </Cite>
          , CNN (2019).
        </FnItem>
        <FnItem n={31}>
          Reid Nakamura,{" "}
          <Cite>
            <Link
              href="https://www.thewrap.com/stars-blackface-blunders-ted-danson-kylie-jenner-jimmy-fallon/"
              quiet
            >
              15 Stars Whose Blackface Blunders Backfired, From Ted Danson to
              Jimmy Kimmel (Photos)
            </Link>
          </Cite>
          , The Wrap (2020).
        </FnItem>
        <FnItem n={32}>Babylon (Paramount Pictures 2022).</FnItem>
        <FnItem n={33}>
          Jordana Ossad,{" "}
          <Cite>
            <Link
              href="https://www.eonline.com/news/474574/julianne-hough-goes-blackface-as-orange-is-the-new-black-character-for-halloween-costume"
              quiet
            >
              Julianne Hough Goes Blackface as “Orange Is the New Black” Character
              for Halloween Costume
            </Link>
          </Cite>
          , E! News (2013).
        </FnItem>
        <FnItem n={34}>
          The Damage Report,{" "}
          <Cite>
            <Link
              href="https://www.youtube.com/watch?v=DtkXjTwVKsA&t=16s"
              quiet
            >
              Teenagers In Blackface EXPOSED In Heinous Walmart TikTok
            </Link>
          </Cite>
          , YouTube (Nov. 2, 2022).
        </FnItem>
        <FnItem n={35}>
          Lauren Michele Jackson,{" "}
          <Cite>
            <Link
              href="https://www.teenvogue.com/story/digital-blackface-reaction-gifs"
              quiet
            >
              We Need to Talk About Digital Blackface in Reaction GIFs
            </Link>
          </Cite>
          , Teen Vogue (2017).
        </FnItem>
        <FnItem n={36}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={37}>
          Habiba Katsha,{" "}
          <Cite>
            <Link
              href="https://www.huffingtonpost.co.uk/entry/what-is-blackfishing-why-problematic_uk_6166ba94e4b0fcd00f97fa5c"
              quiet
            >
              What is Blackfishing And Why Is It Problematic For Black Women?
            </Link>
          </Cite>
          , HuffPost (2021).
        </FnItem>
        <FnItem n={38}>
          <Cite>Chaline v. KCOH, Inc.</Cite>, 693 F.2d 477 (5th Cir. 1982).
        </FnItem>
        <FnItem n={39}>
          Malcolm Xavier,{" "}
          <Link href={YEAR_ONE} quiet>
            “When You Hear Some Feedback, Keep Going Take It Higher:” Legal,
            Technical, and Ethical Notes for the Future of Video-Sharing Apps
          </Link>{" "}
          (2022).
        </FnItem>
        <FnItem n={40}>
          <Link href="https://www.mjcorey.com/" quiet>
            MJ Corey
          </Link>{" "}
          (last visited May 6, 2023).
        </FnItem>
        <FnItem n={41}>
          Hannah Kerns,{" "}
          <Cite>
            <Link
              href="https://people.com/parents/all-about-kim-kardashian-kanye-west-children/"
              quiet
            >
              All About Kim Kardashian and Kanye West’s 4 Kids
            </Link>
          </Cite>
          , People (2023).
        </FnItem>
        <FnItem n={42}>
          Denene Millner,{" "}
          <Cite>
            <Link
              href="https://www.npr.org/sections/codeswitch/2017/03/03/518184030/why-rachel-dolezal-can-never-be-black"
              quiet
            >
              Why Rachel Dolezal Can Never Be Black
            </Link>
          </Cite>
          , NPR (2017).
        </FnItem>
        <FnItem n={43}>
          <Cite>
            <Link
              href="https://knowyourmeme.com/memes/events/bringbackourgirls"
              quiet
            >
              #BringBackOurGirls
            </Link>
          </Cite>
          , Know Your Meme (last visited May 6, 2023).
        </FnItem>
        <FnItem n={44}>
          Joe Cascarelli,{" "}
          <Cite>
            <Link
              href="https://www.nytimes.com/2020/06/02/arts/music/what-blackout-tuesday.html?auth=login-google"
              quiet
            >
              #BlackoutTuesday: A Music Industry Protest Becomes a Social Media
              Moment
            </Link>
          </Cite>
          , The New York Times (2020).
        </FnItem>
        <FnItem n={45}>
          <Cite>
            <Link href="https://www.bbc.com/news/world-africa-13809501" quiet>
              Who are Nigeria’s Boko Haram Islamist group?
            </Link>
          </Cite>
          , BBC (2016).
        </FnItem>
        <FnItem n={46}>
          <Cite>
            <Link href="https://www.bbc.com/news/world-us-canada-35948362" quiet>
              Michelle Obama’s hashtag quest to rescue Nigerian girls
            </Link>
          </Cite>
          , BBC (2016).
        </FnItem>
        <FnItem n={47}>
          Jennifer Deutschmann,{" "}
          <Cite>
            <Link
              href="https://www.inquisitr.com/1249669/ann-coulters-plan-to-mock-bring-back-our-girls-backfires"
              quiet
            >
              Ann Coulter’s Plan To Mock ‘Bring Back Our Girls’ Backfires
            </Link>
          </Cite>
          , Inquisitr (2014).
        </FnItem>
        <FnItem n={48}>
          <Link href="https://www.theshowmustbepaused.com/about" quiet>
            #TheShowMustBePaused
          </Link>{" "}
          (last visited May 6, 2023).
        </FnItem>
        <FnItem n={49}>
          Unless the photojournalist allows use of these photographs for
          advertisement, in which case the subjects could pursue a rights of
          publicity claim. Usually, though, this would require costly litigation
          that subjects belonging to historically excluded demographics may not
          have access to.
        </FnItem>
        <FnItem n={50}>
          <Cite>
            <Link href="https://www.dhs.gov/biometrics" quiet>
              Biometrics
            </Link>
          </Cite>
          , Department of Homeland Security (last visited May 6, 2023).
        </FnItem>
        <FnItem n={51}>
          <Cite>
            <Link href="https://www.ibm.com/topics/artificial-intelligence" quiet>
              What is artificial intelligence?
            </Link>
          </Cite>
          , IBM (last visited May 6, 2023).
        </FnItem>
        <FnItem n={52}>
          <Cite>
            <Link href="https://www.ibm.com/topics/deep-learning" quiet>
              What is deep learning?
            </Link>
          </Cite>
          , IBM (last visited May 6, 2023).
        </FnItem>
        <FnItem n={53}>
          <Cite>
            <Link
              href="https://www.mcleanhospital.org/essential/it-or-not-social-medias-affecting-your-mental-health"
              quiet
            >
              The Social Dilemma: Social Media and Your Mental Health
            </Link>
          </Cite>
          , McLean Hospital (last visited May 6, 2023).
        </FnItem>
        <FnItem n={54}>
          Gideon Lewis-Kraus,{" "}
          <Cite>
            <Link
              href="https://www.newyorker.com/culture/annals-of-inquiry/we-know-less-about-social-media-than-we-think"
              quiet
            >
              How Harmful Is Social Media?
            </Link>
          </Cite>
          , The New Yorker (2022).
        </FnItem>
        <FnItem n={55}>
          Malcolm Xavier, New Problems Require New Solutions: Nonpartisan Agencies
          as a Pathway to Regulating Emerging Technologies (2023).
        </FnItem>
        <FnItem n={56}>
          Mitchell Krieger,{" "}
          <Cite>
            <Link
              href="https://towardsdatascience.com/how-to-make-your-own-instagram-filter-with-facial-recognition-from-scratch-using-python-d3a42029e65b"
              quiet
            >
              How to make your own Instagram filter with facial recognition using
              python
            </Link>
          </Cite>{" "}
          (2020).
        </FnItem>
        <FnItem n={57}>
          Tate Ryan-Mosley,{" "}
          <Cite>
            <Link
              href="https://www.technologyreview.com/2021/08/15/1031804/digital-beauty-filters-photoshop-photo-editing-colorism-racism/"
              quiet
            >
              How digital beauty filters perpetuate colorism
            </Link>
          </Cite>
          , MIT Technology Review (2021).
        </FnItem>
        <FnItem n={58}>
          Xavier, <Cite>supra</Cite> note 39.
        </FnItem>
        <FnItem n={59}>
          <Cite>
            <Link href="https://csrc.nist.gov/glossary/term/metadata" quiet>
              metadata
            </Link>
          </Cite>
          , National Institute of Standards and Technology (last visited May 6,
          2023).
        </FnItem>
        <FnItem n={60}>
          Andrew Lloyd,{" "}
          <Cite>
            <Link
              href="https://www.insider.com/trevor-rainbolt-geoguessr-tiktoker-location-tracking-interview-2022-11"
              quiet
            >
              A Google Maps expert tracks down long-lost locations for his
              followers and posts the results on TikTok. Millions love his videos,
              but there are risks.
            </Link>
          </Cite>
          , Insider (2022).
        </FnItem>
        <FnItem n={61}>
          Chris Doty,{" "}
          <Cite>
            <Link
              href="https://blog.deepgram.com/top-six-use-cases-for-asr-social-media/"
              quiet
            >
              Top Six Use Cases for Automatic Speech Recognition (ASR) in Social
              Media
            </Link>
          </Cite>
          , Deepgram (2022).
        </FnItem>
        <FnItem n={62}>
          Xavier, <Cite>supra</Cite> note 39.
        </FnItem>
        <FnItem n={63}>
          Jillian Warren,{" "}
          <Cite>
            <Link href="https://later.com/blog/video-on-social-media/" quiet>
              Why Video is Hottest Growth Hack Right Now
            </Link>
          </Cite>
          , Later (2021).
        </FnItem>
        <FnItem n={64}>
          Nicol Turner Lee &amp; Caitlin Chin,{" "}
          <Cite>
            <Link
              href="https://www.brookings.edu/research/police-surveillance-and-facial-recognition-why-data-privacy-is-an-imperative-for-communities-of-color/"
              quiet
            >
              Police surveillance and facial recognition: Why data privacy is
              imperative for communities of color
            </Link>
          </Cite>
          , Brookings Instituion (2022).
        </FnItem>
        <FnItem n={65}>
          It is maybe the case that economists should focus inquiry in this area
          as rights of publicity are largely economic rights. It is conceivable
          that the harm of this is larger than estimated, here. Generally, though,
          this essay takes the opinion that privacy is worth more than publicity,
          if not priceless. As such, privacy loss is more important to provide
          solutions for.
        </FnItem>
        <FnItem n={66}>
          Samuel D. Warren &amp; Louis D. Brandeis, <Cite>The Right to Privacy</Cite>,
          4 Harvard L.R. 193 (1890).
        </FnItem>
        <FnItem n={67}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={68}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={69}>
          Malcolm Xavier,{" "}
          <Cite>
            New Problems Require New Solutions: The Need for Deep Learning in
            Humans
          </Cite>{" "}
          (2023).
        </FnItem>
        <FnItem n={70}>
          Samphe Ballamingie,{" "}
          <Cite>
            <Link href="https://doi.org/10.22215/stkt/bs11v" quiet>
              Instagram’s Commodification of Identity
            </Link>
          </Cite>{" "}
          (2022) (last visited May 6, 2023).
        </FnItem>
        <FnItem n={71}>
          Carbado, <Cite>supra</Cite> note 23 at 1,002.
        </FnItem>
        <FnItem n={72}>
          Anita L. Allen, <Cite>Coercing Privacy</Cite>, 40 Wm. &amp; Mary L. Rev.
          723 (1999).
        </FnItem>
        <FnItem n={73}>
          <Cite>Sidis v. F-R Pub. Corp.</Cite>, 113 F.2d 806 (2d Cir. 1940).
        </FnItem>
        <FnItem n={74}>
          <Cite>Id.</Cite>
        </FnItem>
        <FnItem n={75}>
          <Cite>Hustler Magazine, Inc. v. Falwell</Cite>, 485 U.S. 46 (1988).
        </FnItem>
        <FnItem n={76}>U.S. Const. amend. I.</FnItem>
        <FnItem n={77}>
          <Cite>Dallesandro v. Henry Holt &amp; Co.</Cite>, 4 A.D.2d 470, 166
          N.Y.S.2d 805 (1957).
        </FnItem>
        <FnItem n={78}>
          <Cite>Lane v. MRA Holdings, LLC</Cite>, 242 F. Supp. 2d 1205 (M.D. Fla.
          2002).
        </FnItem>
        <FnItem n={79}>
          <Cite>In re Google, Inc. Priv. Pol’y Litig.</Cite>, No.
          C-12-01382-PSG, 2013 WL 6248499 (N.D. Cal. Dec. 3, 2013).
        </FnItem>
        <FnItem n={80}>
          Daniel J. Solove &amp; Paul M. Schwartz, <Cite>Information Privacy Law</Cite>{" "}
          818–819 (6th ed. 2018).
        </FnItem>
        <FnItem n={81}>
          James Chen,{" "}
          <Cite>
            <Link href="https://www.investopedia.com/terms/s/stockoption.asp" quiet>
              What Are Stock Options? Parameters and Trading, With Examples
            </Link>
          </Cite>
          , Investopedia (2023).
        </FnItem>
        <FnItem n={82}>
          Solove &amp; Schwartz, <Cite>supra</Cite> note 79 at 14–15.
        </FnItem>
        <FnItem n={83}>
          This is most often attributed to Andy Warhol, though that fact and the
          exact phrasing have been debated.
        </FnItem>
        <FnItem n={84}>
          Rachel Nuwer,{" "}
          <Cite>
            <Link
              href="https://www.smithsonianmag.com/smart-news/andy-warhol-probably-never-said-his-celebrated-fame-line-180950456/"
              quiet
            >
              Andy Warhol Probably Never Said His Celebrated “Fifteen Minutes of
              Fame” Line
            </Link>
          </Cite>
          , Smithsonian Magazine (2014).
        </FnItem>
        <FnItem n={85}>
          Rob Sanders,{" "}
          <Cite>
            <Link
              href="https://www.simplilearn.com/types-of-influencers-article"
              quiet
            >
              The 5 Types of Influencers You Need to Know
            </Link>
          </Cite>
          , Simplilearn (2023).
        </FnItem>
        <FnItem n={86}>
          <Cite>
            Rosa &amp; Raymond Parks Inst. for Self Dev. v. Target Corp.
          </Cite>
          , 812 F.3d 824 (11th Cir. 2016).
        </FnItem>
        <FnItem n={87}>
          <Cite>White v. Samsung Elecs. Am., Inc.</Cite>, 971 F.2d 1395 (9th Cir.
          1992), as amended (Aug. 19, 1992).
        </FnItem>
        <FnItem n={88}>
          Kugler &amp; Pace, <Cite>supra</Cite> note 16 at 613.
        </FnItem>
        <FnItem n={89}>
          Kugler &amp; Pace, <Cite>supra</Cite> note 16 at 673.
        </FnItem>
        <FnItem n={90}>
          Ballamingie, <Cite>supra</Cite> note 70.
        </FnItem>
        <FnItem n={91}>
          Paul M. Schwartz, <Cite>Privacy and Democracy in Cyberspace</Cite>, 52
          Vand. L. Rev. 1609 (1999).
        </FnItem>
        <FnItem n={92}>
          Julie E. Cohen,{" "}
          <Cite>Examined Lives: Informational Privacy and The Subject as Object</Cite>
          , 52 Stan. L. Rev. 1373 (2000).
        </FnItem>
        <FnItem n={93}>
          Paul M. Schwartz, <Cite>Property. Privacy, and Personal Data</Cite>, 117
          Harv. L. Rev. 2055 (2004).
        </FnItem>
        <FnItem n={94}>
          Ashley Wells,{" "}
          <Cite>
            <Link
              href="https://www.edi.nih.gov/blog/communities/appropriation-and-appreciation-whats-difference"
              quiet
            >
              Appropriation and Appreciation: What’s the Difference?
            </Link>
          </Cite>
          , National Institutes of Health Office of Equity, Diversity, and
          Inclusion (2021).
        </FnItem>
        <FnItem n={95}>
          Baudrillard, <Cite>supra</Cite> note 2.
        </FnItem>
        <FnItem n={96}>
          Allen, <Cite>supra</Cite> note 72.
        </FnItem>
        <FnItem n={97}>2016 O.J. (L 119).</FnItem>
        <FnItem n={98}>Cal. Civ. Code § 1798.100.</FnItem>
        <FnItem n={99}>
          Kalev Leetaru,{" "}
          <Cite>
            <Link
              href="https://www.forbes.com/sites/kalevleetaru/2018/12/15/what-does-it-mean-for-social-media-platforms-to-sell-our-data/"
              quiet
            >
              What Does It Mean For Social Media Platforms To “Sell” Our Data?
            </Link>
          </Cite>
          , Forbes (2018).
        </FnItem>
        <FnItem n={100}>
          <Cite>
            <Link
              href="https://www.productplan.com/glossary/minimum-viable-product/"
              quiet
            >
              Minimum Viable Product (MVP)
            </Link>
          </Cite>
          , ProductPlan (last visited May 6, 2023).
        </FnItem>
        <FnItem n={101}>
          Natasha Lomas,{" "}
          <Cite>
            <Link
              href="https://techcrunch.com/2019/07/24/researchers-spotlight-the-lie-of-anonymous-data/"
              quiet
            >
              Researchers spotlight the lie of ‘anonymous’ data
            </Link>
          </Cite>
          , TechCrunch (2019).
        </FnItem>
        <FnItem n={102}>
          Ian Bogost,{" "}
          <Cite>
            <Link
              href="https://www.theatlantic.com/technology/archive/2022/11/twitter-facebook-social-media-decline/672074/"
              quiet
            >
              The Age of Social Media Is Ending
            </Link>
          </Cite>
          , The Atlantic (2022).
        </FnItem>
        <FnItem n={103}>
          <Cite>Supra</Cite> note 73.
        </FnItem>
      </Footnotes>
    </>
  );
}
