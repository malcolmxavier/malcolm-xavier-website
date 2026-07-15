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
import { twitterAttribution } from "@/lib/site-config";
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
  "Book a chat with Malcolm Xavier, send an email, or find him elsewhere on the internet. Currently interviewing in media + streaming.";

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
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Malcolm Xavier—Senior product manager. Tech, media, and streaming.",
      },
    ],
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
    images: ["/opengraph-image"],
  },
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
    <Container size="md">
      {/* ─── Hero ──────────────────────────────────────────────── */}
      <Section padding="lg">
        <Stack gap="500">
          <Kicker>Contact</Kicker>
          <Display>Let’s talk.</Display>
          <Lede>
            Hiring a senior PM in media or streaming? Want to
            compare notes on growth, data, AI, or anything I’ve
            written about? Pick a slot below, send a note, or find
            me elsewhere on the internet. I reply within a day or two—faster
            if there’s a job at the end of it.
          </Lede>
        </Stack>
      </Section>

      {/* ─── Booking + direct contact ──────────────────────────── */}
      <Section padding="md" bordered>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
          {/* Left column — Calendly widget. Bordered card so the
              third-party embed reads as a contained surface rather
              than fighting the page styling. */}
          <Stack gap="400">
            <Stack gap="200">
              {/* Kicker swapped from the vendor name "Calendly" to
                  the editorial label "Schedule" per the 2026-04-29
                  /full-review (m-calendly-kicker — vendor names as
                  section labels read like ad insertions). The
                  headline below also shed its "30 minutes"
                  specificity since the widget loads the profile
                  root, which lets the visitor pick any event type. */}
              <Kicker>Schedule</Kicker>
              <Headline level={2} id="calendly-heading">
                Book time, on the record.
              </Headline>
              <Body>
                Best for: recruiter intros, product chats, and
                anyone who’d rather not write three emails to
                coordinate a meeting time.
              </Body>
            </Stack>

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
              // role="region" + aria-labelledby exposes this as a
              // named landmark in screen-reader landmark lists. The
              // landmark name reuses the editorial heading above
              // ('Book time, on the record.') instead of a generic
              // 'Book a meeting via Calendly,' so SR users hear the
              // same voice the sighted UI carries — caught in the
              // 2026-04-28 follow-up audit.
              role="region"
              aria-labelledby="calendly-heading"
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
              style={{ color: "var(--text-caption)", maxWidth: "60ch" }}
            >
              Widget not loading? Book directly on{" "}
              <TrackOnClick
                event={ANALYTICS_EVENTS.CALENDLY_CLICK}
                eventData={{ kind: "fallback", surface: "contact-widget-fallback" }}
              >
                <Link href={CONTACT.calendlyRoot}>Calendly ↗</Link>
              </TrackOnClick>
            </Body>
          </Stack>

          {/* Right column — direct contact + cultural elsewhere
              rail, stacked. Stacks under the widget at smaller
              widths; sits beside it at lg+. */}
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
                      <Link href={item.href}>
                        {item.label} ↗
                      </Link>
                    </li>
                  ))}
                </ul>
              </Stack>
            </Stack>
          </aside>
        </div>
      </Section>
    </Container>
  );
}
