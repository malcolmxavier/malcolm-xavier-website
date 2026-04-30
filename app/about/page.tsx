// ─────────────────────────────────────────────────────────────────
// /about — the long version of who Malcolm is.
//
// Layout:
//   • Container md (~64rem) so prose + sidebar can live side-by-side
//     on desktop without the prose column getting too wide.
//   • Two-column grid at lg+: prose column on the left, headshot +
//     "What I'm into" sidebar in a 16rem rail on the right.
//   • Mobile / tablet: collapses to a single column. Headshot moves
//     to a small top-of-page anchor so the personal-greeting feel
//     survives without hijacking the viewport on narrow screens.
//
// Voice: directionally Malcolm's — sartorial with a dash of sardonic,
// editorial, lightly self-deprecating. Expect to revise on the first
// pass; copy is intentionally inline (not MDX) so editorial passes
// don't need a separate file open.
//
// Per the "no public placeholders" rule, the talent-scout / Creative
// CV inline link is OMITTED until /creative-cv ships. When it does,
// drop a quiet inline <Link> in the second-to-last paragraph of the
// "Other half of my life" block.
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
import { CONTACT } from "../resume/resume-data";

// Per-page openGraph + twitter blocks because Next.js App Router
// REPLACES (does not merge) parent-layout OG blocks when a page
// declares its own. Without these explicit blocks, /about shared
// on LinkedIn unfurled with the sitewide stub title rather than
// the page's own positioning. (2026-04-29 /full-review,
// a-per-page-og-twitter.)
const ABOUT_DESCRIPTION =
  "The long version: senior product manager, sometime artist, full-time New Yorker living in Los Angeles.";
const ABOUT_OG_TITLE =
  "About Malcolm Xavier · Senior PM, Media and Streaming";

export const metadata: Metadata = {
  title: "About",
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
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Malcolm Xavier—Senior product manager. Tech, media, streaming.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ABOUT_OG_TITLE,
    description: ABOUT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

// "What I'm into" sidebar items. Each entry is a {kicker, label, href}
// triple. Kicker is the editorial category tag (FILM / TV / MUSIC);
// label is the platform name only — handles are intentionally hidden
// per the global "no handles on platform links" rule.
// Substack and StoryGraph are intentionally excluded until URLs are
// confirmed and the sub-brand pages ship.
const INTERESTS: { kicker: string; label: string; href: string }[] = [
  {
    kicker: "Film",
    label: "Letterboxd",
    href: "https://letterboxd.com/malxavi/",
  },
  {
    kicker: "TV",
    label: "Serializd",
    href: "https://www.serializd.com/user/malxavi/profile",
  },
  {
    kicker: "Music",
    label: "Spotify",
    href: "https://open.spotify.com/user/malcolmxevans",
  },
];

export default function AboutPage() {
  const mailHref = `mailto:${CONTACT.email}`;

  return (
    <Container size="md">
      <Section padding="lg">
        <Stack gap="600">
          {/* Page title row — kicker + Display, full-bleed across the
              two columns below so the headline breathes. */}
          <Stack gap="300">
            <Kicker>About</Kicker>
            <Display>A long story short(-ish).</Display>
          </Stack>

          {/* Two-column body. lg:grid-cols-[minmax(0,60ch)_16rem]
              gives a prose column capped at the same 60ch reading
              measure that <Lede>/<Body> enforce internally — without
              the cap, the 1fr column was wider than the prose,
              leaving a visible gutter between text and sidebar at
              lg+. Mobile collapses to one column with the headshot
              floated above the prose. */}
          <div className="lg:grid lg:grid-cols-[minmax(0,60ch)_16rem] lg:gap-12">
            {/* ── Prose column ─────────────────────────────────── */}
            <div>
              <Stack gap="500">
                <Lede>
                  I&rsquo;m a senior product manager and, like many PMs,
                  my journey into product was non-linear. I'm a creative by trade
                  and a child of the Internet era. My life has been defined by
                  drawing these threads together. I hold degrees in theater and law,
                  and have also studied music, studio art, web development, and data science.
                  How I navigate all of these domains is roughly the same:
                  figure out how a complex system works, identify the gaps, and
                  make it better for the people around me and after me.
                </Lede>

                {/* Mobile-only headshot. On lg+ the photo lives in
                    the right rail; below lg it slides into the prose
                    flow right after the lede so the visual hook lands
                    early instead of getting pushed to the bottom of a
                    long single-column scroll. Capped at 16rem wide
                    (matches the desktop sidebar size) so it reads as
                    an inline editorial portrait, not a full-bleed
                    slab. priority lives here rather than on the
                    desktop copy because mobile first-paint is the
                    more common cold-load case. */}
                <div className="lg:hidden">
                  <div
                    className="overflow-hidden rounded-md border max-w-[16rem] mx-auto"
                    style={{ borderColor: "var(--border-default)" }}
                  >
                    <Image
                      src="/headshot.jpg"
                      alt="Portrait of Malcolm Xavier"
                      width={3280}
                      height={4928}
                      sizes="16rem"
                      priority
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                </div>

                <Body>
                  I grew up in Massachusetts, and spent most of my
                  adult life in New York. I recently moved to Los Angeles 
                  after a brief stint in Chicago (ask me about my standup sidequests).
                  Massachusetts developed my taste,
                  NYC refined it and set the bar high, and
                  now LA is where I share it with the world.
                </Body>

                <Body>
                  When I'm not building, I'm probably out on a run or playing some video games
                  (I love a good puzzle, even outside of work). I watch 300 films and 100
                  seasons of television a year, and I release a new playlist each month.
                  Outside of work, I'm usually at a theater (imagine my pitch for AMC Stubs
                  A-List here); if I'm at home, I'm probably watching TV&mdash;anything
                  from a new streaming hit, to a Housewives re-run, to the news, to an intense tennis match.
                  When I want to let loose, I'm usually trying to find a concert
                  or a dancefloor. I love a great dinner and a cheeky martini, but the
                  dining experience is the most important part (you can take the boy out of
                  the hospitality industry...)
                </Body>

                <Body>
                  Right now I&rsquo;m interviewing&mdash;looking
                  for senior PM roles in media and streaming,
                  ideally somewhere that takes both the growth side
                  and the editorial side seriously. If that sounds
                  like your team, I&rsquo;d love to{" "}
                  <Link href={CONTACT.linkedin}>connect</Link>.
                </Body>
              </Stack>
            </div>

            {/* ── Sidebar rail ─────────────────────────────────── */}
            <aside
              // Visually a sidebar; semantically a complementary
              // landmark. Top margin separates from prose on mobile;
              // resets at lg+ where the grid does the spacing.
              //
              // No aria-label here — the inner <nav aria-label="What
              // I'm into"> carries the label. Doubling them up created
              // two landmarks discoverable separately with identical
              // names, which screen readers announce as duplicates.
              className="mt-10 lg:mt-0"
            >
              <Stack gap="500">
                {/* Desktop-only headshot. The mobile copy of this
                    photo lives inside the prose column above (right
                    after the lede), so this sidebar instance is gated
                    `hidden lg:block` to avoid rendering twice. No
                    `priority` here — that hint stays on the mobile
                    copy where the image is more likely to be in the
                    cold-load LCP. Browsers fetch hidden images at
                    lower priority anyway. */}
                <div
                  className="hidden lg:block overflow-hidden rounded-md border"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  <Image
                    src="/headshot.jpg"
                    alt="Portrait of Malcolm Xavier"
                    width={3280}
                    height={4928}
                    sizes="16rem"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>

                {/* "What I'm into" — a small mono index of the
                    platforms where Malcolm publishes culturally.
                    Reads as an editorial sidebar, not a duplicate
                    of the footer. Categorical kicker + link. */}
                <Stack gap="400" as="nav" aria-label="What I'm into">
                  <Kicker>What I&rsquo;m into</Kicker>
                  <ul
                    role="list"
                    className="space-y-3"
                    style={{ listStyle: "none", padding: 0, margin: 0 }}
                  >
                    {INTERESTS.map((item) => (
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
                          {/* Label uses the mono font family directly
                              so the sidebar reads as one cohesive
                              "computer is talking" voice block. */}
                          <Link
                            href={item.href}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--p-sm-font-size)",
                              lineHeight: "var(--p-sm-line-height)",
                            }}
                          >
                            {item.label} ↗
                          </Link>
                        </Stack>
                      </li>
                    ))}
                  </ul>
                </Stack>
              </Stack>
            </aside>
          </div>
        </Stack>
      </Section>

      {/* ── Closing CTA ───────────────────────────────────────────
          Light bottom prompt that mirrors the resume's closing
          section so the about page also has an exit ramp toward
          conversation. Headline + one-liner + two quiet links. */}
      <Section padding="md" bordered>
        <Stack gap="400" align="start">
          <Kicker>Get in touch</Kicker>
          <Headline level={2}>Want to compare notes?</Headline>
          <Body>
            Pick a slot for a{" "}
            <Link href={CONTACT.calendly}>30-minute product chat</Link>,
            send an <Link href={mailHref}>email</Link>, or{" "}
            <Link href={CONTACT.linkedin}>
              {/* Non-breaking space between "LinkedIn" and the
                  external-arrow glyph keeps the arrow from being
                  orphaned on its own line when the link wraps.
                  Screen readers announce U+00A0 identically to a
                  normal space, so this is a11y-neutral. */}
              connect with me on LinkedIn{" "}↗
            </Link>
            .
          </Body>
        </Stack>
      </Section>
    </Container>
  );
}
