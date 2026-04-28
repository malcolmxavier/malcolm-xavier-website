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

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a 30-minute product chat, send an email, or find Malcolm elsewhere on the internet.",
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

// "Elsewhere" — the same set as the footer; restated here because
// /contact is the canonical "how do I reach this person" surface.
const ELSEWHERE: { label: string; href: string }[] = [
  { label: "Letterboxd", href: "https://letterboxd.com/malxavi/" },
  {
    label: "Serializd",
    href: "https://www.serializd.com/user/malxavi/profile",
  },
  { label: "Spotify", href: "https://open.spotify.com/user/malcolmxevans" },
];

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
          <Display>Let&rsquo;s talk.</Display>
          <Lede>
            Hiring a senior PM in media or streaming? Want to
            compare notes on growth, data, AI, or anything I&rsquo;ve
            written about? Pick a slot below, send a note, or find
            me elsewhere on the internet. I reply within a day or two&mdash;faster
            if there&rsquo;s a job at the end of it.
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
              <Kicker>Book a chat</Kicker>
              <Headline level={2}>30 minutes, on the record.</Headline>
              <Body>
                Best for: recruiter intros, product chats, and
                anyone who&rsquo;d rather not write three emails to
                coordinate a meeting time.
              </Body>
            </Stack>

            <div
              // Container card around the iframe widget — borders
              // visually separate the third-party light-theme embed
              // from the surrounding page (which may be dark).
              className="overflow-hidden rounded-lg border"
              style={{
                borderColor: "var(--border-default)",
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
              <Link href={CONTACT.calendlyRoot}>Calendly ↗</Link>
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
                  {directMethods.map((method) => (
                    <li key={method.href}>
                      {/* Single-line row: icon + platform name (or
                          the email address). The icon already
                          telegraphs the platform, so a per-row
                          kicker would just repeat the label.
                          minHeight 24 keeps each row at the WCAG 2.2
                          SC 2.5.8 minimum target size on touch. */}
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
                    </li>
                  ))}
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
