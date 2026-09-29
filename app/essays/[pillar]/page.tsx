// ─────────────────────────────────────────────────────────────────
// /essays/[pillar] — a per-pillar essay landing.
//
// A real, indexable AEO surface (thin to start, not nav-promoted):
// its own CollectionPage entity scoped to one pillar, so a retriever
// can resolve "Malcolm's growth writing" as a thing. Only pillars that
// have essays prerender (generateStaticParams filters, dynamicParams
// is off), so an empty pillar 404s instead of shipping a placeholder.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  pillarIndexReady,
  activePillars,
  essaysByPillar,
  WRITING_PILLARS,
  WRITING_PILLAR_SLUGS,
} from "@/lib/writing/essays";
import type { WritingPillar } from "@/lib/writing/types";
import { SITE_URL } from "@/lib/site-config";

type Params = { pillar: string };

// Only prerender pillars that have at least one essay; combined with
// dynamicParams=false, an empty pillar route 404s rather than
// rendering a thin/placeholder page.
export const dynamicParams = false;

export function generateStaticParams() {
  return activePillars().map((pillar) => ({ pillar }));
}

function pillarKey(pillar: string): WritingPillar | undefined {
  return WRITING_PILLAR_SLUGS.find((p) => p === pillar);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pillar } = await params;
  const key = pillarKey(pillar);
  if (!key) return { title: "Not found" };
  const meta = WRITING_PILLARS[key];
  const canonical = `/essays/${key}`;
  const socialTitle = `${meta.label}—Essays—Malcolm Xavier`;
  return {
    title: `${meta.label}—Essays`,
    description: meta.blurb,
    alternates: { canonical },
    // `noindex, follow` until this pillar clears the index bar. Below it
    // the page restates a subset of the hub in the same words as the
    // essays it lists, so it competes with both instead of answering
    // anything they do not — and `follow` is the half that matters: the
    // page still passes a crawler on to the essays it links.
    //
    // The same predicate drives the sitemap, so a page is never listed
    // and told to be ignored at the same time. See pillarIndexReady in
    // lib/writing/essays.ts for the thresholds and why linking and
    // indexing are two different numbers.
    ...(pillarIndexReady(key)
      ? {}
      : { robots: { index: false, follow: true } }),
    openGraph: {
      title: socialTitle,
      description: meta.blurb,
      type: "website",
      url: canonical,
      siteName: "Malcolm Xavier",
      locale: "en_US",
      // Inherit the writing hub's OG card (the pillar routes don't
      // carry their own opengraph-image). Without this, Next 16's
      // per-page openGraph replaces the parent's and the pillar
      // unfurl loses its image.
      images: ["/essays/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: meta.blurb,
      images: ["/essays/opengraph-image"],
    },
  };
}

export default async function WritingPillarPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pillar } = await params;
  const key = pillarKey(pillar);
  if (!key) notFound();
  const meta = WRITING_PILLARS[key];
  const essays = essaysByPillar(key);
  // Belt-and-suspenders with dynamicParams=false: never render an
  // empty pillar page.
  if (essays.length === 0) notFound();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/essays/${key}/#collectionpage`,
    url: `${SITE_URL}/essays/${key}`,
    name: `${meta.label}—Essays`,
    description: meta.blurb,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#person` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: essays.map((essay, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/essays/${essay.pillar}/${essay.slug}`,
        name: essay.title,
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
            <Kicker>
              {/* Reads "Essays", matching the route, the nav label, and the
                  hub's own eyebrow. It said "Writing" until 2026-09-28 —
                  left behind by the rename in 04484b3, and missed again when
                  that was swept, because the sweep only checked the hub. */}
              <Link href="/essays" quiet>
                Essays
              </Link>{" "}
              · {meta.label}
            </Kicker>
            <Display>{meta.label}.</Display>
            <Lede>{meta.blurb}</Lede>
          </Stack>
        </Section>
        <Section padding="md" bordered>
          <Grid cols={2} gap="600">
            {essays.map((essay) => (
              <EssayCard
                key={`${essay.pillar}/${essay.slug}`}
                essay={essay}
                // This pillar page is the listing these cards sit on, so
                // an essay reached from here keeps the pillar as its
                // scope: the back link returns here, and the neighbour
                // cards walk this pillar rather than the whole corpus.
                originHref={`/essays/${key}`}
              />
            ))}
          </Grid>
        </Section>
      </Container>
    </>
  );
}
