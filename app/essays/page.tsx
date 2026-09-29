// ─────────────────────────────────────────────────────────────────
// /essays — the essays hub.
//
// The recruiter-side home for Malcolm's evergreen essays: the same
// arguments he distributes on LinkedIn, rendered as richer, canonical
// pages on the owned surface. This Batch-A version lists the active
// pillars + every essay; the faceted filter-chip UX lands in Batch B.
//
// CollectionPage + ItemList JSON-LD frames the hub for crawlers and
// answer engines and enumerates the pillars, wiring back to the
// sitewide WebSite + Person nodes by @id (see STRUCTURED-DATA.md).
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { Grid } from "@/components/layout/Grid";
import { Display } from "@/components/typography/Display";
import { Kicker } from "@/components/typography/Kicker";
import { Lede } from "@/components/typography/Lede";
import { Link } from "@/components/primitives/Link";
import { EssayCard } from "@/components/writing/EssayCard";
import {
  ESSAYS,
  activePillars,
  themeBrowseReady,
  WRITING_PILLARS,
} from "@/lib/writing/essays";
import { SITE_URL } from "@/lib/site-config";

// The subject list matches the four pillars and the on-page deck. It read
// "the craft of product management" until 2026-09-28, which was both narrower
// than the Craft pillar actually is and out of step with the deck.
const DESCRIPTION =
  "Essays by Malcolm Xavier on growth, media, AI, and craft—written for the page, not the feed.";
// Title and OG title said "Writing" until 2026-09-28 — left behind when the
// route and the nav label became Essays. A reader clicking Essays landed on a
// tab reading Writing, and the search result said Writing too.
const OG_TITLE = "Essays · Malcolm Xavier";

export const metadata: Metadata = {
  title: "Essays",
  description: DESCRIPTION,
  alternates: { canonical: "/essays" },
  openGraph: {
    title: OG_TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/essays",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    // opengraph-image.tsx resolves this hub's card via the file
    // convention; an explicit images array would fight it.
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: DESCRIPTION,
  },
};

export default function WritingHub() {
  const pillars = activePillars();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/essays/#collectionpage`,
    url: `${SITE_URL}/essays`,
    name: "Essays",
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#person` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: pillars.map((slug, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/essays/${slug}`,
        name: WRITING_PILLARS[slug].label,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
{/* Authored as size="lg" (80rem). The Container refactor dropped
          the prop and made the well one width everywhere, and its rule is
          that only a READING column — where the constraint is line length
          — narrows inside. This is a card grid, which is page geometry, so
          it takes the shared rail like every other index. That is a real
          width change from how the page was written; it wants a look on
          screen before it counts as reviewed. */}
      <Container>
        <Section padding="lg">
          <Stack gap="500">
            <Kicker>Essays</Kicker>
            {/* The LinkedIn bio disclaimer, repurposed. "Opinions are my
                own" exists to protect you from an employer on somebody
                else's platform; on his own domain there is nobody to
                disclaim from, so saying it anyway stops being a hedge and
                becomes a claim of ownership — which is the argument this
                whole section makes. Truncating "my own" to "mine" is what
                keeps it from reading as boilerplate.

                It replaced "Essays, built for the page." on 2026-09-28,
                which failed three ways: it repeated the kicker directly
                above it, "built for the page" argued with an opponent the
                reader cannot see, and it described the format when the
                deck below already carries the subject. */}
            <Display>Opinions are mine.</Display>
            {/* The four nouns are the four pillars in lib/writing/essays.ts,
                verbatim and in registry order, so the deck and the theme
                browse speak one vocabulary — including once that browse
                turns on. Adding a fifth subject here means adding a pillar
                there, which is the right amount of friction.

                The deck used to open "The arguments I share on LinkedIn,
                rendered the way they were meant to be read." That made
                LinkedIn the origin and this page the reprint, in the second
                sentence on the surface he owns, and it restated the headline
                besides — "built for the page" and "the way they were meant to
                be read" are one idea twice, which left the deck doing no work
                of its own. It now names the subjects and lets the back half
                place the format. */}
            <Lede>
              Growth, media, AI, and craft—where my thinking goes when it needs
              more room than a post.
            </Lede>
          </Stack>
        </Section>

        {/* Browse by theme — hidden until the corpus can support it. See
            themeBrowseReady() in the registry for the test and why it is
            a distribution rather than a total. Today three of the four
            pillars hold one essay each, and a theme link that lands on a
            one-card page is worse than no theme nav at all.

            When it turns on it still lists only pillars that have
            essays, so no link can point at an empty page. */}
        {themeBrowseReady() ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker as="h2">Browse by theme</Kicker>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {pillars.map((slug) => (
                  <Link key={slug} href={`/essays/${slug}`}>
                    {WRITING_PILLARS[slug].label} →
                  </Link>
                ))}
              </div>
            </Stack>
          </Section>
        ) : null}

        <Section padding="md" bordered>
          <Stack gap="500">
            <Kicker as="h2">All essays</Kicker>
            <Grid cols={2} gap="600">
              {ESSAYS.map((essay) => (
                <EssayCard
                  key={`${essay.pillar}/${essay.slug}`}
                  essay={essay}
                />
              ))}
            </Grid>
          </Stack>
        </Section>
      </Container>
    </>
  );
}
