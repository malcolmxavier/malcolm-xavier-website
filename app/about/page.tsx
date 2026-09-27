// ─────────────────────────────────────────────────────────────────
// /about — who Malcolm is, in four paragraphs.
//
// Layout: the landing page's hero, reused. Copy left, square portrait
// right at md+, collapsing to one column below that. Everything under
// the hero is a single prose column at the reading measure.
//
// There is no closing contact block. One used to sit here mirroring
// the resume's, and it went when the page got short enough that a
// second ask a screen below the first read as anxious rather than
// open. The footer carries email and LinkedIn on every page, /contact
// is in the nav, and the last paragraph already says he is looking.
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
// media paragraph — note the Link primitive is no longer imported
// here, since the contact block that used it is gone. Tracked via
// l-creative-cv-todo (2026-04-29 /full-review).
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Display } from "@/components/typography/Display";
import { Lede } from "@/components/typography/Lede";
import { Body } from "@/components/typography/Body";
import { Kicker } from "@/components/typography/Kicker";
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

export default function AboutPage() {
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
      </Container>
    </>
  );
}
