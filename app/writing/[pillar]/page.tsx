// ─────────────────────────────────────────────────────────────────
// /writing/[pillar] — a per-pillar essay landing.
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
  const canonical = `/writing/${key}`;
  const socialTitle = `${meta.label}—Writing—Malcolm Xavier`;
  return {
    title: `${meta.label}—Writing`,
    description: meta.blurb,
    alternates: { canonical },
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
      images: ["/writing/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: meta.blurb,
      images: ["/writing/opengraph-image"],
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
    "@id": `${SITE_URL}/writing/${key}/#collectionpage`,
    url: `${SITE_URL}/writing/${key}`,
    name: `${meta.label}—Writing`,
    description: meta.blurb,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#person` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: essays.map((essay, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/writing/${essay.pillar}/${essay.slug}`,
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
      <Container size="lg">
        <Section padding="lg">
          <Stack gap="500">
            <Kicker>
              <Link href="/writing" quiet>
                Writing
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
              <EssayCard key={`${essay.pillar}/${essay.slug}`} essay={essay} />
            ))}
          </Grid>
        </Section>
      </Container>
    </>
  );
}
