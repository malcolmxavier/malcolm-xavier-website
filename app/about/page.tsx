// ─────────────────────────────────────────────────────────────────
// /about — the long version of who Malcolm is.
//
// Layout: the same spine /resume and /consulting use — a 14rem left
// rail, gap-16, narrowing to a single centred 64rem column below lg.
// Before this pass /about was the odd one out: a 16rem rail on the
// RIGHT inside a grid that stopped at ~904px, while Container (which
// lost its size prop — one width for the whole site now) runs to
// 104rem. The result was a page whose headline spanned the full well
// and whose body did not, leaving ~700px of dead space at 1440 and no
// shared left edge with either sibling page.
//
// The content column is a fixed 42rem rather than the siblings' 1fr,
// which is the one place this page departs from them and is a
// consequence of what it holds. They fill 1fr with cards and resume
// entries; this page holds a single prose column, and at 1fr it ran to
// ~88 characters a line. (Body/Lede do cap at 60ch, but `ch` is the
// width of "0" — in this face that admits roughly 88 real characters,
// so the cap was not doing the work its name implies.) Capping the
// COLUMN rather than retuning those shared components keeps the fix on
// this page. The grid therefore ends at 14+4+42 = 60rem and the rest
// of the well stays empty as an outer margin, which is what preserves
// the shared LEFT edge — the thing that actually reads as alignment.
//
// Within that spine the rail does editorial sidenote duty rather than
// holding one block: each movement is its own sub-grid, so the small
// mono label sits in the margin beside the prose it names. Two things
// ride the rail besides the labels — the portrait, beside the lede,
// and the logged index, beside the paragraph whose claim it backs up.
// Per-movement sub-grids rather than one grid with explicit
// row-starts: self-contained, so adding or reordering a movement needs
// no row-coordination.
//
// Mobile / tablet: every sub-grid collapses to one column, so each
// label stacks directly above its own prose and the reading order is
// unchanged. The portrait moves into the flow right after the lede.
//
// Voice: sartorial with a dash of sardonic, editorial, lightly
// self-deprecating. Copy is intentionally inline (not MDX) so
// editorial passes don't need a separate file open.
//
// NOTE: the words here are a Claude draft Malcolm asked for on
// 2026-09-27, NOT the voice pass. `voice-pass-site-copy` still owns
// /about's copy and its read-cold / rewrite-core tasks are his — the
// point of that node is that this pitch copy should be written by him
// rather than approved by him. Treat these paragraphs as a container
// with sentences in it, not as settled copy.
//
// TODO(creative-cv): Per the "no public placeholders" rule, the
// talent-scout / Creative CV inline link is OMITTED until
// /creative-cv ships. When it does, drop a quiet inline <Link> in
// the "What I'm into" movement. Tracked via l-creative-cv-todo
// (2026-04-29 /full-review).
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Headline } from "@/components/typography/Headline";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";
import { CONTACT } from "../resume/resume-data";
// Feed accessors for the "logged" rail. All three are synchronous
// reads of committed JSON fixtures — see loggedEntries() below.
import { getLetterboxdSnapshotMeta } from "@/lib/feeds/letterboxd";
import { getShows } from "@/lib/feeds/serializd";
import { getSnapshotMeta } from "@/lib/feeds/spotify";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these explicit blocks, /about shared
// on LinkedIn unfurled with the sitewide stub title rather than
// the page's own positioning. (2026-04-29 /full-review,
// a-per-page-og-twitter.)
const ABOUT_DESCRIPTION =
  "Senior PM building growth, marketing, and data platforms—AI-native, theater and law degrees. Creative by trade, a child of the Internet.";
const ABOUT_OG_TITLE =
  "About Malcolm Xavier · Senior PM, Growth and MarTech";

export const metadata: Metadata = {
  // Title surfaces the role + domain keywords recruiters Google
  // ("Senior PM in Media and Streaming"). The root layout's
  // `%s—Malcolm Xavier` template appends the brand name once; not
  // duplicating it here. Closes h-titles-underdeveloped from the
  // 2026-04-29 /full-review.
  title: "About · Senior PM, Growth and MarTech",
  description: ABOUT_DESCRIPTION,
  // Explicit canonical override — without it, /about inherits the
  // root layout's canonical-of-"/" and Googlebot treats it as a
  // duplicate of the landing page (2026-04-29 /full-review,
  // c-canonicals-all-root).
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: ABOUT_OG_TITLE,
    description: ABOUT_DESCRIPTION,
    type: "profile",
    url: "/about",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    // No explicit `images` — ./opengraph-image.tsx resolves this route's
    // own card via the App Router file convention, auto-populating
    // og:image / width / height / alt. An explicit array here would
    // fight the file-convention output.
  },
  twitter: {
    card: "summary_large_image",
    title: ABOUT_OG_TITLE,
    description: ABOUT_DESCRIPTION,
    // twitter:image is auto-populated from ./opengraph-image.tsx too.
  },
};

// ─── JSON-LD: AboutPage ───────────────────────────────────────────
// /about is an AboutPage whose mainEntity is the sitewide Person node
// declared once in app/layout.tsx. Same rationale as the resume's
// ProfilePage: point at the canonical Person `@id` so retrievers
// resolve one entity for "who is Malcolm Xavier" rather than treating
// this page's prose as a second, competing person description.
const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/about/#aboutpage`,
  url: `${SITE_URL}/about`,
  name: ABOUT_OG_TITLE,
  // Declare this page as part of the sitewide WebSite node (same link
  // the /case-studies CollectionPage carries), so the graph is fully
  // connected: AboutPage → WebSite, AboutPage → Person.
  isPartOf: { "@id": `${SITE_URL}/#website` },
  mainEntity: { "@id": `${SITE_URL}/#person` },
};

// ─── The "logged" rail ────────────────────────────────────────────
// The receipts behind the culture claim in the prose beside it. Two
// deliberate choices here.
//
// First, these point at Malcolm's OWN cluster pages, not at Letterboxd
// / Serializd / Spotify. The footer's "Elsewhere" column already
// carries all three outbound profiles on every page of the site, so
// the rail this replaces was a verbatim duplicate of the footer that
// also routed attention OFF a page whose whole job is to argue the
// site's own surfaces are worth opening.
//
// Second, the figures are read from the committed feed fixtures rather
// than typed in, so they cannot drift away from the thing they are
// evidence for. Grain is lifetime for all three, which keeps them
// parallel and keeps this page out of date arithmetic: the prose beside
// the rail makes the RATE claim ("about 300 films and 100 seasons a
// year") and the rail answers the depth question a rate invites, so the
// two are complementary rather than the rail restating the sentence.
// Each is a single property read off an existing accessor — no env var,
// no network, no await, safe to prerender.
//
// totalSeasonReviews is already double-count-correct: summarizeShows
// routes every review through modesForReview, so a show-level review
// on a miniseries-pinned show counts as a season too (rule locked
// 2026-05-07). Counting season-level reviews by hand here would
// undercount, which is exactly why this reads the summary rather than
// the review array.
function loggedEntries() {
  return [
    {
      kicker: "Film",
      label: "Films",
      note: `${getLetterboxdSnapshotMeta().filmCount.toLocaleString()} logged`,
      href: "/films",
    },
    {
      kicker: "TV",
      label: "Television",
      note: `${getShows().summary.totalSeasonReviews.toLocaleString()} seasons`,
      href: "/television",
    },
    {
      kicker: "Music",
      label: "Music",
      note: `${getSnapshotMeta().playlistCount.toLocaleString()} playlists`,
      href: "/music",
    },
  ];
}

// One movement of the essay: a small mono label in the 14rem rail and
// its prose in the content column. Collapses to a single stacked
// column below lg, where the label sits directly above its own text.
function Movement({
  label,
  children,
  aside,
}: {
  label: string;
  children: React.ReactNode;
  /** Optional rail content rendered under the label (e.g. the index). */
  aside?: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[14rem_minmax(0,42rem)] lg:gap-16">
      <div className="mb-3 lg:mb-0">
        <Kicker as="h2">{label}</Kicker>
        {aside ? <div className="mt-5">{aside}</div> : null}
      </div>
      <Stack gap="500">{children}</Stack>
    </div>
  );
}

export default function AboutPage() {
  const mailHref = `mailto:${CONTACT.email}`;

  // Shared by the two portrait copies (rail on lg+, inline flow below).
  const portrait = (
    <div
      className="overflow-hidden rounded-md border"
      style={{ borderColor: "var(--border-default)" }}
    >
      <Image
        src="/headshot.jpg"
        alt="Portrait of Malcolm Xavier"
        width={3280}
        height={4928}
        sizes="14rem"
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );

  return (
    <>
      {/* AboutPage JSON-LD — see ABOUT_SCHEMA above. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_SCHEMA) }}
      />
      <Container>
        <Section padding="lg">
          {/* The spine. Below lg this is one centred 64rem column;
              at lg+ it opens into rail + content and every child
              sub-grid inherits the same two-column geometry. */}
          <div className="mx-auto max-w-[64rem] lg:max-w-none">
            <Stack gap="900">
              {/* Title + lede share ONE row, which is what makes the
                  portrait work in the rail. Split across two rows, the
                  336px portrait sat beside a ~180px lede and left ~150px
                  of dead space under it; against the Display and the
                  lede together (~300px) the two columns land close
                  enough that the seam disappears. The Display's left
                  edge also lands on the same rail as every paragraph
                  below it rather than spanning the full 104rem well. */}
              <div className="lg:grid lg:grid-cols-[14rem_minmax(0,42rem)] lg:gap-16">
                {/* Desktop portrait. Gated `hidden lg:block` because a
                    second copy renders in the flow below on narrow
                    screens; only one is ever visible. */}
                <div className="hidden lg:block">{portrait}</div>

                {/* gap 800 (32px), not 500. Display carries
                    text-box-trim, which eats the positive half-leading
                    under the last line, so a gap here renders roughly
                    14px tighter than its token — the same asymmetry the
                    landing hero's rhythm table records. At 500 the
                    headline and lede were ~6px apart on screen. */}
                <Stack gap="800">
                  <Stack gap="300">
                    <Kicker>About</Kicker>
                    <Display>A long story short(-ish).</Display>
                  </Stack>

                  <Lede>
                    I’m a senior product manager, a creative by trade, and a
                    child of the Internet era. I hold degrees in theater and
                    law, and I’ve also studied music, studio art, web
                    development, and data science. The through line is smaller
                    than that list makes it sound: figure out how a complex
                    system works, find the gaps, and make it better for the
                    people around me and after me.
                  </Lede>

                  {/* Mobile portrait. Sits right after the lede so the
                      visual hook lands early instead of at the foot of a
                      long single-column scroll. `loading="eager"` rather
                      than `priority` — both copies reference the same
                      /headshot.jpg, and the high-priority hint was firing
                      on desktop cold loads where this copy is hidden.
                      Closes m-about-headshot-priority-dup (2026-04-29
                      /full-review). */}
                  <div className="lg:hidden max-w-[16rem] mx-auto">
                    <div
                      className="overflow-hidden rounded-md border"
                      style={{ borderColor: "var(--border-default)" }}
                    >
                      <Image
                        src="/headshot.jpg"
                        alt="Portrait of Malcolm Xavier"
                        width={1640}
                        height={2464}
                        sizes="16rem"
                        loading="eager"
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                </Stack>
              </div>

              <Movement label="Where I’m from">
                <Body>
                  I grew up in Massachusetts and spent most of my adult life in
                  New York. I’m in Los Angeles now, by way of a brief stint in
                  Chicago (ask me about the standup sidequests). Massachusetts
                  built the taste, New York set the bar, and LA is where I get
                  to use both—though I’ll be a New Yorker about it regardless.
                </Body>
              </Movement>

              <Movement
                label="What I’m into"
                aside={
                  // The receipts, in the margin beside the claim.
                  // Semantically complementary, hence <aside> with its
                  // own accessible name — it is nested inside <main>, so
                  // axe's landmark-complementary-is-top-level wants it
                  // named to be distinguishable in landmark navigation.
                  <aside aria-label="What I log">
                    <Stack gap="400">
                      {/* A hairline rather than a second text label:
                          the rail already carries the movement's
                          "What I'm into" kicker directly above, and a
                          word under a word read as two competing
                          labels. The aside keeps its accessible name
                          via aria-label, so nothing is lost to a
                          screen reader by dropping the visible one. */}
                      <hr
                        className="w-8 border-0 border-t"
                        style={{ borderColor: "var(--border-default)" }}
                      />
                      <ul
                        role="list"
                        className="space-y-3"
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {loggedEntries().map((item) => (
                          <li key={item.href}>
                            <Stack gap="100">
                              <Kicker
                                style={{
                                  color: "var(--text-caption)",
                                  fontSize: "var(--p-xs-font-size)",
                                }}
                              >
                                {item.kicker}
                              </Kicker>
                              {/* Mono so the rail reads as one cohesive
                                  "computer is talking" voice block, the
                                  same register the old outbound rail
                                  used. */}
                              <Link
                                href={item.href}
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "var(--p-sm-font-size)",
                                  lineHeight: "var(--p-sm-line-height)",
                                }}
                              >
                                {item.label} →
                              </Link>
                              <Dateline>{item.note}</Dateline>
                            </Stack>
                          </li>
                        ))}
                      </ul>
                    </Stack>
                  </aside>
                }
              >
                <Body>
                  I log about 300 films and 100 seasons of television a year,
                  and I release a new playlist every month. Some of that
                  happens in a theater (imagine my pitch for AMC Stubs A-List
                  here) and a lot of it happens on the couch—a new streaming
                  hit, a Housewives re-run, the news, an intense tennis match,
                  no hierarchy among them.
                </Body>

                <Body>
                  When I’m not building or watching, I’m out on a run or deep
                  in a video game; I like a good puzzle, even outside of work.
                  When I want to let loose, I’m looking for a concert or a
                  dancefloor. And I love a great dinner and a cheeky martini,
                  though the room matters more to me than the menu (you can
                  take the boy out of the hospitality industry…)
                </Body>
              </Movement>

              <Movement label="Right now">
                <Body>
                  I’m interviewing—senior PM roles building growth, marketing,
                  and data platforms, ideally somewhere that takes the growth
                  side and the editorial side equally seriously.
                </Body>
              </Movement>
            </Stack>
          </div>
        </Section>

        {/* ── Closing CTA ───────────────────────────────────────────
            Light bottom prompt that mirrors the resume's closing
            section so the about page also has an exit ramp toward
            conversation. Sits on the same rail as the essay above it:
            empty rail slot, content in column two.

            The "Right now" movement used to end with "If that sounds
            like your team, I'd love to connect" — cut, because this
            block makes the same ask 200px lower and asking twice in
            one screen reads as anxious rather than open. */}
        <Section padding="md" bordered>
          <div className="mx-auto max-w-[64rem] lg:max-w-none">
            <div className="lg:grid lg:grid-cols-[14rem_minmax(0,42rem)] lg:gap-16">
              <div aria-hidden="true" />
              <Stack gap="400" align="start">
                <Kicker>Get in touch</Kicker>
                <Headline level={2}>Want to compare notes?</Headline>
                <Body>
                  Pick a slot for a{" "}
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                    eventData={{ kind: "outbound", surface: "about-closing" }}
                  >
                    <Link href={CONTACT.calendly}>30-minute product chat</Link>
                  </TrackOnClick>
                  , send an{" "}
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.EMAIL_CLICK}
                    eventData={{ kind: "direct", surface: "about-closing" }}
                  >
                    <Link href={mailHref}>email</Link>
                  </TrackOnClick>
                  , or{" "}
                  <Link href={CONTACT.linkedin}>
                    {/* Non-breaking space between "LinkedIn" and the
                        external-arrow glyph keeps the arrow from being
                        orphaned on its own line when the link wraps.
                        Screen readers announce U+00A0 identically to a
                        normal space, so this is a11y-neutral. */}
                    connect with me on LinkedIn{" "}↗
                  </Link>
                  .
                </Body>
              </Stack>
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
}
