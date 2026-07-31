// ─────────────────────────────────────────────────────────────────
// /writing — the essays hub.
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
  WRITING_PILLARS,
} from "@/lib/writing/essays";
import { SITE_URL } from "@/lib/site-config";

const DESCRIPTION =
  "Essays by Malcolm Xavier on growth, media, AI, and the craft of product management—written for the page, not the feed.";
const OG_TITLE = "Writing · Malcolm Xavier";

export const metadata: Metadata = {
  title: "Writing",
  description: DESCRIPTION,
  alternates: { canonical: "/writing" },
  openGraph: {
    title: OG_TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/writing",
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
    "@id": `${SITE_URL}/writing/#collectionpage`,
    url: `${SITE_URL}/writing`,
    name: "Writing",
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#person` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: pillars.map((slug, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/writing/${slug}`,
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
      <Container size="lg">
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

        {/* Browse by theme — only the pillars that currently have essays,
            so no link points at an empty page. */}
        {pillars.length > 0 ? (
          <Section padding="md" bordered>
            <Stack gap="400">
              <Kicker as="h2">Browse by theme</Kicker>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {pillars.map((slug) => (
                  <Link key={slug} href={`/writing/${slug}`}>
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
