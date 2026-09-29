// ─────────────────────────────────────────────────────────────────
// /about — who Malcolm is, in four paragraphs.
//
// Layout: the landing page's hero, reused. Copy left, square portrait
// right at md+, collapsing to one column below that. Everything under
// the hero is a single prose column at the reading measure.
//
// There IS a closing contact block again, and it is the whole of what
// used to be /contact (2026-09-28). A thin version of one used to sit
// here mirroring the resume's, and it went when the page got short
// enough that a second ask a screen below the first read as anxious
// rather than open. What arrived instead is not a second ask — it is
// the only one: /contact retired into this page's `#contact` section
// because almost nothing pointed at it (two links in the whole
// codebase), every relevant page already carries its own contact CTA,
// and the footer puts the direct links closer to where a reader
// actually leaves. The old URL permanently redirects to /about#contact
// (see next.config.ts), because it may be printed on things already in
// circulation.
//
// The one block deliberately NOT carried over is "Elsewhere on the
// internet" — components/chrome/Footer.tsx already renders the same
// list from @/lib/elsewhere on every page, and the footer sits closer
// to the exit than a mid-page rail does.
//
// The portrait's settings are deliberately identical to the landing
// page's — same --hero-portrait clamp, same square frame, same 1.5×
// zoom at center 22%. Two pages showing the same person should not
// crop him two different ways, and the landing page is where that
// treatment was tuned. If it changes there, change it here.
//
// What this replaced, so it does not come back: a 14rem mono rail
// carrying sidenote labels beside each paragraph and an index of
// film/TV/music counts. It was apparatus. The nav and the cluster
// pages already carry the site's shape, so a page arguing for them
// from the margin was doing a job nobody needed done twice.
//
// Voice: sartorial with a dash of sardonic, editorial, lightly
// self-deprecating. Copy is intentionally inline (not MDX) so
// editorial passes don't need a separate file open.
//
// NOTE: `voice-pass-site-copy` owns this copy and its read-cold and
// rewrite-core tasks are Malcolm's — the point of that node is that
// the pitch copy should be written by him rather than approved by
// him. What is here is a short container, not settled copy.
//
// TODO(creative-cv): Per the "no public placeholders" rule, the
// talent-scout / Creative CV inline link is OMITTED until
// /creative-cv ships. When it does, drop a quiet inline <Link> in the
// media paragraph — the Link primitive is imported here again (the
// contact section below uses it), so that is a one-line change.
// Tracked via l-creative-cv-todo (2026-04-29 /full-review).
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
import { Link } from "@/components/primitives/Link";
import { CalendlyWidget } from "@/components/primitives/CalendlyWidget";
import { IconEmail, IconLinkedIn } from "@/components/icons";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { CONTACT } from "../resume/resume-data";
import { SITE_URL } from "@/lib/site-config";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these explicit blocks, /about shared
// on LinkedIn unfurled with the sitewide stub title rather than
// the page's own positioning. (2026-04-29 /full-review,
// a-per-page-og-twitter.)
const ABOUT_DESCRIPTION =
  "Senior PM building growth, marketing, and data platforms—AI-native, theater and law degrees. Creative by trade, a child of the Internet.";
const ABOUT_OG_TITLE = "About Malcolm Xavier · Senior PM, Growth and MarTech";

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
//
// This stays a single `AboutPage` even though the page now carries the
// contact surface. The `ContactPage` node retired with its URL rather
// than moving here: STRUCTURED-DATA.md sets out one page-type node per
// URL, `ContactPage` is validator-only rather than a rich-result type
// (so it buys close to nothing), and multi-typing this route as
// ["AboutPage","ContactPage"] would be the one deviation from an
// otherwise mechanical pattern. A section anchor is not a page.
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

// Clears the sticky site header when a reader lands on /about#contact.
// Same value /consulting's own section anchors use.
const contactAnchorStyle: React.CSSProperties = { scrollMarginTop: "6rem" };

// "Direct" methods — the ways to reach him that are not the calendar.
// Each row is an icon plus a single visible value (the platform name,
// or the email address). Per the "no handles on platform links" rule
// only email shows its full string; LinkedIn shows the platform name.
type DirectMethod = {
  icon: React.ReactNode;
  /** Visible link text — platform name, or (for email) the address. */
  value: string;
  href: string;
};

export default function AboutPage() {
  const mailHref = `mailto:${CONTACT.email}`;

  // GitHub is intentionally omitted — it is a code-portfolio surface,
  // not a "reach out to me" channel. (The footer carries it, because
  // the footer is an index of where he is rather than a contact ask.)
  const directMethods: DirectMethod[] = [
    {
      icon: <IconEmail size={20} />,
      value: CONTACT.email,
      href: mailHref,
    },
    {
      icon: <IconLinkedIn size={20} />,
      value: "LinkedIn ↗",
      href: CONTACT.linkedin,
    },
  ];

  return (
    <>
      {/* AboutPage JSON-LD — see ABOUT_SCHEMA above. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_SCHEMA) }}
      />
      <Container>
        <Section padding="lg">
          {/* Same two-column shape as the landing page: copy in a 1fr
              column, portrait in a column sized by the image itself.
              --hero-portrait is the only number to edit — --hero-cols
              reads it, so the column can never disagree with the
              picture in it.

              Two rows, and the portrait spans both from column 2, so
              the body prose flows BESIDE the picture rather than
              starting below it. Without the span the grid row was as
              tall as the 32rem portrait while the copy in it was not,
              which left a wide band of dead space under the lede and
              pushed every paragraph past the bottom of the image. */}
          <div
            // gap-y-5 (20px) rather than the landing page's 10/14: there
            // the row gap separates a hero from a button row, here it
            // separates the lede from three paragraphs that are part of
            // the same short read. Matching the body Stack's own gap-500
            // makes all four paragraphs one block instead of a standfirst
            // with an essay parked under it.
            className="md:grid md:grid-cols-[var(--hero-cols)] md:grid-rows-[auto_1fr] md:gap-x-6 md:gap-y-5 md:items-start lg:gap-x-12 lg:gap-y-5"
            style={{
              ["--hero-portrait" as string]: "clamp(17rem, 38vw, 32rem)",
              ["--hero-cols" as string]: "minmax(0, 1fr) var(--hero-portrait)",
            }}
          >
            <Stack gap="800">
              <Stack gap="300">
                <Kicker>About</Kicker>
                <Display>Nice to meet you.</Display>
              </Stack>

              <Lede>
                I’m a senior product manager, a creative by trade, and a child
                of the Internet era. I figure out how a complex system works,
                find the gaps, and make it better for the people around me and
                after me.
              </Lede>
            </Stack>

            {/* Portrait. Settings copied from the landing page hero and
                  meant to stay in step with it — square frame, fluid
                  width, 1.5× zoom at center 22% to tighten the crop
                  without re-exporting the file. `fill` needs a
                  positioned parent with its own intrinsic size, which
                  is what aspect-square + the width classes provide. */}
            <div
              className="relative my-5 mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-md border md:my-0 md:mx-0 md:w-[var(--hero-portrait)] md:max-w-none md:row-start-1 md:row-span-2 md:col-start-2"
              style={{ borderColor: "var(--border-default)" }}
            >
              <Image
                src="/headshot.jpg"
                alt="Portrait of Malcolm Xavier"
                fill
                // Mirrors --hero-portrait above. Kept in step by hand —
                // sizes cannot read a custom property, and a stale
                // value here costs a wrong-sized download.
                sizes="(min-width: 768px) min(38vw, 32rem), 16rem"
                // Above the fold and the largest element on the page,
                // so it is this route's LCP candidate. `preload` emits
                // the <link rel=preload>; fetchPriority adds the hint
                // the deprecated `priority` prop never carried. Only
                // one copy of this image renders now, so there is no
                // risk of fanning the hint out to a hidden duplicate.
                preload
                fetchPriority="high"
                style={{
                  objectFit: "cover",
                  objectPosition: "center 22%",
                  transform: "scale(1.5)",
                  transformOrigin: "center 22%",
                }}
              />
            </div>

            {/* Body. Auto-places into column 1, row 2 — the portrait's
                  explicit col-start-2 / row-span-2 is what leaves this
                  the only cell available. One column at the reading
                  measure Body already enforces. */}
            <Stack gap="500">
              <Body>
                I’ve lived all across the US. I’m currently located in Los
                Angeles, but I bring an East Coast sensibility to all that I do.
              </Body>

              {/* The closing sentence is worded so the destination can be
                  swapped without touching the rest of the paragraph: when
                  the separate publishing property launches, "on this site"
                  becomes its name and the two sentences above it stand
                  unchanged. Deliberately not naming that property here —
                  this repo is public, and it has not shipped. */}
              <Body>
                I’m media-obsessed. I watch about 300 films and 100 seasons of
                television a year, and release a new playlist each month. You
                can find all my reviews and playlists on this site.
              </Body>

              <Body>
                I’m currently interviewing and open to full-time, contract, and
                fractional product work—AI‑native growth, marketing, and data
                platforms, ideally somewhere that takes the growth side and the
                editorial side equally seriously.
              </Body>
            </Stack>
          </div>
        </Section>

        {/* ─── Contact ──────────────────────────────────────────────
            Ported wholesale from the retired /contact route. `bordered`
            is what makes it read as the next move rather than a fifth
            paragraph, and Section's padding rules make the gap below
            the divider match the gap above it automatically.

            id="contact" is the contract: /contact permanently redirects
            to /about#contact, so anything already printed or sent lands
            here. scrollMarginTop keeps the heading clear of the sticky
            site header when a reader arrives on the anchor — the same
            6rem /consulting's section anchors use. */}
        <Section id="contact" style={contactAnchorStyle} padding="lg" bordered>
          {/* The same grid /contact used, and for the same reason: a
              1fr copy column against a column sized by the thing in it,
              with that thing spanning both rows so the direct-contact
              block flows BESIDE the embed rather than starting under
              it.

              --contact-embed is the only number to edit; --contact-cols
              reads it, so the column can never disagree with the widget
              in it. It opens at lg rather than md because below ~1024px
              the left column gets too narrow to hold a lede: at 768 the
              split would leave it around 310px.

              The column is deliberately NOT matched to the portrait's
              --hero-portrait above. Calendly renders its booking view
              stacked, so a narrower card makes the embed TALLER and the
              iframe starts scrolling internally; CalendlyWidget's own
              1080px height is verified against THIS width. Same right
              edge, different left edge, on purpose. */}
          <div
            className="lg:grid lg:grid-cols-[var(--contact-cols)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-12 lg:items-start"
            style={{
              ["--contact-embed" as string]: "clamp(22rem, 40vw, 36rem)",
              ["--contact-cols" as string]:
                "minmax(0, 1fr) var(--contact-embed)",
            }}
          >
            {/* Row 1, column 1 — the ask. `Headline level={2}` rather
                than the Display /contact carried: this page's h1 is
                "Nice to meet you." above, and one page gets one h1. A
                second Display would announce a second page. */}
            <Stack gap="500">
              <Stack gap="300">
                <Kicker>Contact</Kicker>
                <Headline level={2}>Let’s talk.</Headline>
              </Stack>

              {/* The availability sentence is gone from this lede, and that is
                  a consequence of the collapse rather than a copy preference.
                  On /contact it opened "I’m currently interviewing and open to
                  full-time, contract, and fractional product work" so all three
                  recruiter surfaces stated availability identically — a reason
                  that dissolves when two of those surfaces become one page. The
                  body paragraph a screen above says the same thing and then
                  keeps going, naming the domains and what he is looking for, so
                  the version here was a strict prefix of the better one. What
                  is left is the part only this section can say. */}
              <Lede>
                Pick a slot for a recruiter intro or a product chat, or send a
                note.
              </Lede>
            </Stack>

            {/* Column 2, both rows — the booking embed. Spanning the
                rows is what lets the direct-methods block below the
                lede sit beside it instead of being pushed past its
                foot. */}
            <div className="mt-10 lg:mt-0 lg:row-start-1 lg:row-span-2 lg:col-start-2">
              <Stack gap="400">
                <div
                  // Container card around the iframe widget — borders
                  // visually separate the third-party light-theme embed
                  // from the surrounding page (which may be dark).
                  //
                  // Border color hardcoded to a theme-neutral light hex
                  // so the white-pinned card has a visible edge in dark
                  // mode — without it, --border-default resolved to a
                  // light token and the border vanished against the
                  // white wrapper inside the dark page surface
                  // (2026-04-29 /full-review, a-calendly-card-dark).
                  //
                  // role="region" + a name exposes this as a landmark in
                  // screen-reader landmark lists, so somebody navigating
                  // by landmark can jump to the booking widget instead
                  // of tabbing into an unnamed iframe. A plain
                  // functional label rather than a borrowed heading:
                  // there is no sighted phrasing over the card to match.
                  //
                  // No width cap here. One was tried and it backfired:
                  // Calendly renders its booking view stacked, and a
                  // narrower card makes that TALLER, not smaller. The
                  // column sets the width and the height follows.
                  role="region"
                  aria-label="Book a meeting"
                  className="overflow-hidden rounded-lg border"
                  style={{
                    borderColor: "#e0e0e0",
                    background: "#fff",
                  }}
                >
                  <CalendlyWidget />
                </div>

                {/* Fallback: link to the root Calendly profile (shows
                    all event types) in case the widget fails to load
                    — third-party script blocked, ad blocker, etc. Root
                    URL rather than the specific 30-min slot so users
                    can still pick whatever event suits them. */}
                <Body
                  size="sm"
                  /* --measure-read rather than a hand-written 60ch: this
                     caption follows the site measure if it ever moves.
                     See MEASURE.md. */
                  style={{
                    color: "var(--text-caption)",
                    maxWidth: "var(--measure-read)",
                  }}
                >
                  {/* The explicit {" "} is load-bearing: JSX strips
                      whitespace that contains a newline, so without it
                      "on" and "Calendly" would run together. */}
                  Widget not loading? Book directly on{" "}
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                    eventData={{
                      kind: "fallback",
                      surface: "about-widget-fallback",
                    }}
                  >
                    <Link href={CONTACT.calendlyRoot}>Calendly ↗</Link>
                  </TrackOnClick>
                </Body>
              </Stack>
            </div>

            {/* Row 2, column 1 — the ways to reach him that are not the
                calendar.

                A plain <div>, not the <aside> /contact used. There it
                was a complementary rail beside a whole page; here it is
                a subsection of a contact block, and its own kicker and
                heading already say what it is — so an extra landmark
                with a label duplicating that heading would be one more
                thing to skip past for no information. Headline level 3
                for the same reason: it sits under "Let’s talk.", so h3
                states that relationship without skipping a level. */}
            <div className="mt-12 lg:mt-0">
              <Stack gap="500">
                <Stack gap="200">
                  <Kicker>Or, directly</Kicker>
                  <Headline level={3}>Skip the calendar.</Headline>
                </Stack>

                <ul
                  role="list"
                  className="space-y-3"
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {directMethods.map((method) => {
                    const linkEl = (
                      <Link
                        href={method.href}
                        className="inline-flex items-center gap-2"
                        style={{
                          fontFamily: "var(--font-secondary)",
                          fontSize: "var(--p-md-font-size)",
                          minHeight: 24,
                        }}
                      >
                        {method.icon}
                        <span>{method.value}</span>
                      </Link>
                    );
                    // Single-line row: icon + platform name (or the
                    // email address). minHeight 24 clears the WCAG 2.2
                    // SC 2.5.8 minimum target size on touch. Wrap the
                    // email entry with TrackOnClick; LinkedIn isn't
                    // tracked (not in the funnel-event spec).
                    return (
                      <li key={method.href}>
                        {method.href.startsWith("mailto:") ? (
                          <TrackOnClick
                            event={ANALYTICS_EVENTS.EMAIL_CLICK}
                            eventData={{
                              kind: "direct",
                              surface: "about-direct",
                            }}
                          >
                            {linkEl}
                          </TrackOnClick>
                        ) : (
                          linkEl
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Stack>
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
}
