// ─────────────────────────────────────────────────────────────────
// /contact — single-purpose page for booking, email, and the
// quieter "find me elsewhere" links.
//
// Layout:
//   • Container md (~64rem) so the booking widget has room without
//     overflowing on desktop, and the prose stays readable on mobile.
//   • Hero: kicker + Display + 2-3 sentence framing of who should
//     reach out and how Malcolm responds.
//   • Two-column at lg+: Calendly inline widget on the left
//     (the primary action), direct contact methods on the right.
//   • Below: "elsewhere on the internet" rail mirroring the footer's
//     same-named block — useful here too because /contact is where
//     someone lands when they explicitly want to find Malcolm.
//
// Voice: warm, plain, with one sardonic beat. The page exists so
// that someone who already wants to talk has the easiest possible
// path; copy doesn't need to convince.
//
// Calendly widget:
//   Loaded via a small "use client" wrapper (./components/primitives/
//   CalendlyWidget). Pinned to Calendly's light theme regardless of
//   site theme; framed inside a bordered card so the visual context
//   reads as embedded third-party.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { SITE_URL, twitterAttribution } from "@/lib/site-config";
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
import { CONTACT } from "../resume/resume-data";
import { ELSEWHERE } from "@/lib/elsewhere";
import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these explicit blocks, /contact shared
// on LinkedIn unfurled with the sitewide stub. (2026-04-29
// /full-review, a-per-page-og-twitter.)
//
// Description copy is intentionally generic about session length
// (no "30-minute" specificity) because the inline Calendly widget
// loads the profile root, which lets the visitor pick from all
// available event types — a 30-min, 15-min screen, or a longer
// portfolio walk if added later. (2026-04-29 /full-review,
// a-calendly-widget-url-and-tracking — copy half of the fix.)
const CONTACT_DESCRIPTION =
  "Reach Malcolm Xavier—senior PM in growth, marketing, and data platforms. Book a call or send an email. Currently interviewing.";

export const metadata: Metadata = {
  title: "Contact",
  description: CONTACT_DESCRIPTION,
  // Explicit canonical override — without it, /contact inherits the
  // root layout's canonical-of-"/" and Googlebot treats it as a
  // duplicate of the landing page (2026-04-29 /full-review,
  // c-canonicals-all-root).
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Malcolm Xavier",
    description: CONTACT_DESCRIPTION,
    type: "website",
    url: "/contact",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    // No explicit `images` — ./opengraph-image.tsx resolves this route's
    // own tailored card via the App Router file convention, which
    // auto-populates og:image / og:image:type / width / height / alt.
  },
  twitter: {
    card: "summary_large_image",
    // Re-spread because App Router REPLACES the root twitter block per
    // route; without it, /contact dropped @malxavi site + creator
    // attribution. /contact is an actively-promoted share surface, so it
    // belongs here per the twitterAttribution doc comment in
    // lib/site-config.ts.
    ...twitterAttribution,
    title: "Contact Malcolm Xavier",
    description: CONTACT_DESCRIPTION,
    // twitter:image is auto-populated from ./opengraph-image.tsx too.
  },
};

// ─── JSON-LD: ContactPage ─────────────────────────────────────────
// /contact is a ContactPage — the last of the four primary recruiter
// pages to get its own page-type node, so all four (ProfilePage,
// AboutPage, CollectionPage, ContactPage) connect into the sitewide
// graph identically. isPartOf points at the WebSite `@id`; mainEntity
// points at the canonical Person `@id` declared once in app/layout.tsx,
// so a retriever landing here resolves "this is the contact surface for
// that one person" rather than treating the page as orphaned. Not a
// rich-result type — pure graph-completeness / AEO hygiene.
const CONTACT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${SITE_URL}/contact/#contactpage`,
  url: `${SITE_URL}/contact`,
  name: "Contact Malcolm Xavier",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  mainEntity: { "@id": `${SITE_URL}/#person` },
};

// "Direct" methods — the right column on desktop. Each row is an
// icon + a single visible value (the platform name, or the email
// address). Per the "no handles on platform links" rule, only email
// shows its full string; LinkedIn / GitHub show the platform name.
type DirectMethod = {
  icon: React.ReactNode;
  /** Visible link text — platform name, or (for email) the address. */
  value: string;
  href: string;
};

// ELSEWHERE imported from @/lib/elsewhere — same set the footer
// surfaces. /contact is the canonical "how do I reach this person"
// surface, so it shows the rail too.

export default function ContactPage() {
  const mailHref = `mailto:${CONTACT.email}`;

  // Direct contact methods. Email shows the full address (per the
  // "no handles" rule exception); LinkedIn shows the platform name.
  // GitHub is intentionally omitted here — it's a code-portfolio
  // surface, not a "reach out to me" channel.
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
      {/* ContactPage JSON-LD — see CONTACT_SCHEMA above. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(CONTACT_SCHEMA) }}
      />
      <Container>
        {/* One grid for the whole page, the same shape /about uses: a
          1fr copy column against a column sized by what sits in it,
          and that right-hand thing spanning both rows so the copy
          below the intro flows BESIDE it rather than starting under
          it.

          The page used to be two stacked Sections — a full-width hero,
          then a bordered section holding widget-left / rail-right. So
          the intro ran the full page width while everything under it
          was in columns, and the widest element on the page was the
          third-party embed. Now the embed is the right column and the
          intro and the direct-contact blocks share the left one.

          --contact-embed is the only number to edit; --contact-cols
          reads it, so the column can never disagree with the widget in
          it. It opens at lg rather than md because below ~1024px the
          left column gets too narrow to hold a lede: at 768 the split
          would leave it around 310px. */}
        <Section padding="lg">
          <div
            className="lg:grid lg:grid-cols-[var(--contact-cols)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-12 lg:items-start"
            style={{
              ["--contact-embed" as string]: "clamp(22rem, 40vw, 36rem)",
              ["--contact-cols" as string]:
                "minmax(0, 1fr) var(--contact-embed)",
            }}
          >
            {/* Row 1, column 1 — the intro. */}
            <Stack gap="800">
              <Stack gap="300">
                <Kicker>Contact</Kicker>
                <Display>Let’s talk.</Display>
              </Stack>

              {/* Opens on the same sentence the landing page and /about
                open on, so the three recruiter-facing surfaces state
                the availability identically rather than three ways.

                The previous version led with two rhetorical questions
                ("Hiring a senior PM…? Want to compare notes…?"), which
                is the hook-question pattern the voice guide rules out,
                and it was the only page of the three that did not
                simply say what he is looking for. The "recruiter
                intros, product chats" framing is folded in from the
                schedule block's own blurb, which this replaces. */}
              <Lede>
                I’m currently interviewing and open to full-time, contract, and
                fractional product work. Pick a slot for a recruiter intro or a
                product chat, send a note, or find me elsewhere on the
                internet.
              </Lede>
            </Stack>

            {/* Column 2, both rows — the booking embed. Spanning the
              rows is what lets the rail below the intro sit beside it
              instead of being pushed past its foot. */}
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
                  // screen-reader landmark lists. It used to borrow the
                  // editorial heading above it so SR users heard the
                  // same voice the sighted UI carried; with that heading
                  // gone there is no sighted phrasing left to match, so
                  // a plain functional label is the honest one.
                  //
                  // No width cap here any more. One was tried while the
                  // embed still sat in the wide column and it backfired:
                  // Calendly renders its booking view stacked, and a
                  // narrower card makes that TALLER, not smaller. The
                  // column now sets the width and the height follows.
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
                  /* 60ch written by hand here was --measure-read spelled
                     out. Pointing at the token means this caption follows the
                     site measure if it ever moves. See MEASURE.md. */
                  style={{
                    color: "var(--text-caption)",
                    maxWidth: "var(--measure-read)",
                  }}
                >
                  Widget not loading? Book directly on{" "}
                  <TrackOnClick
                    event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                    eventData={{
                      kind: "fallback",
                      surface: "contact-widget-fallback",
                    }}
                  >
                    <Link href={CONTACT.calendlyRoot}>Calendly ↗</Link>
                  </TrackOnClick>
                </Body>
              </Stack>
            </div>

            {/* Row 2, column 1 — the ways to reach him that are not the
              calendar. These used to be the narrow right rail; they
              read better under the intro they belong to, and it frees
              the right column for the thing that actually needs the
              width. */}
            <aside
              className="mt-12 lg:mt-0"
              aria-label="Other ways to reach Malcolm"
            >
              <Stack gap="700">
                {/* Direct methods — the recruiter-facing reach-out
                  paths. */}
                <Stack gap="500">
                  <Stack gap="200">
                    <Kicker>Or, directly</Kicker>
                    <Headline level={2}>Skip the calendar.</Headline>
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
                      // Single-line row: icon + platform name (or
                      // the email address). minHeight 24 clears the
                      // WCAG 2.2 SC 2.5.8 minimum target size on
                      // touch. Wrap the email entry with TrackOnClick;
                      // LinkedIn isn't tracked (not in the funnel-
                      // event spec).
                      return (
                        <li key={method.href}>
                          {method.href.startsWith("mailto:") ? (
                            <TrackOnClick
                              event={ANALYTICS_EVENTS.EMAIL_CLICK}
                              eventData={{
                                kind: "direct",
                                surface: "contact-direct",
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
                {/* Elsewhere rail — pulled into the right column
                  beneath the direct-methods block. Mirrors the
                  "Or, directly" / "Skip the calendar" pattern with
                  a kicker + headline + link list. */}
                <Stack gap="400">
                  <Stack gap="200">
                    <Kicker>Elsewhere on the internet</Kicker>
                    <Headline level={2}>The cultural side.</Headline>
                  </Stack>
                  <ul
                    role="list"
                    className="flex flex-wrap gap-x-6 gap-y-2"
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--p-sm-font-size)",
                    }}
                  >
                    {ELSEWHERE.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href}>{item.label} ↗</Link>
                      </li>
                    ))}
                  </ul>
                </Stack>{" "}
              </Stack>
            </aside>
          </div>
        </Section>
      </Container>
    </>
  );
}
