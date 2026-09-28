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

const DESCRIPTION =
  "Essays by Malcolm Xavier on growth, media, AI, and the craft of product management—written for the page, not the feed.";
const OG_TITLE = "Writing · Malcolm Xavier";

export const metadata: Metadata = {
  title: "Writing",
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
    name: "Writing",
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
            <Kicker>Writing</Kicker>
            <Display>Essays, built for the page.</Display>
            <Lede>
              The arguments I share on LinkedIn, rendered the way they were meant
              to be read. On growth, media, AI, and the craft of the work.
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
