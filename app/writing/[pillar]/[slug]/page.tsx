// ─────────────────────────────────────────────────────────────────
// /writing/[pillar]/[slug] — a single essay.
//
// Renders the essay body (a TSX module registered in lib/writing/
// essays.ts) inside the narrow reading column, with an Article +
// BreadcrumbList JSON-LD graph following the case-study pattern
// (author/publisher → #person, isPartOf → #website; see
// STRUCTURED-DATA.md). Static: params come from generateStaticParams
// and dynamicParams is off, so every essay prerenders at build.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { ArticleContainer } from "@/components/writing/ArticleContainer";
import {
  ESSAYS,
  getEssay,
  WRITING_PILLARS,
  formatEssayDate,
} from "@/lib/writing/essays";
import {
  SITE_URL,
  LINKEDIN_PROFILE_URL,
  twitterAttribution,
} from "@/lib/site-config";
import { BUILD_TIMESTAMP } from "@/lib/build-meta";

type Params = { pillar: string; slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return ESSAYS.map((essay) => ({ pillar: essay.pillar, slug: essay.slug }));
}

// ISO-8601 with a timezone — Google's Rich Results validator flags a
// date-only value as "missing a timezone." Noon Pacific also keeps the
// displayed date on the intended calendar day in a UTC build env.
function isoWithTz(postDate: string): string {
  return `${postDate}T12:00:00-07:00`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pillar, slug } = await params;
  const essay = getEssay(pillar, slug);
  if (!essay) return { title: "Essay not found" };
  const pageTitle = essay.metaTitle ?? essay.title;
  const socialTitle = `${pageTitle}—Malcolm Xavier`;
  const url = `/writing/${essay.pillar}/${essay.slug}`;
  return {
    title: pageTitle,
    description: essay.description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description: essay.description,
      type: "article",
      url,
      siteName: "Malcolm Xavier",
      locale: "en_US",
      publishedTime: isoWithTz(essay.postDate),
      modifiedTime: BUILD_TIMESTAMP,
      authors: ["Malcolm Xavier", LINKEDIN_PROFILE_URL],
      // opengraph-image.tsx in this segment resolves the per-essay card.
    },
    twitter: {
      card: "summary_large_image",
      ...twitterAttribution,
      title: socialTitle,
      description: essay.description,
    },
  };
}

export default async function EssayPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pillar, slug } = await params;
  const essay = getEssay(pillar, slug);
  if (!essay) notFound();

  const pillarMeta = WRITING_PILLARS[essay.pillar];
  const url = `${SITE_URL}/writing/${essay.pillar}/${essay.slug}`;
  const published = isoWithTz(essay.postDate);
  const EssayBody = essay.Body;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}/#article`,
        headline: essay.title,
        description: essay.description,
        image: {
          "@type": "ImageObject",
          url: `${url}/opengraph-image`,
          contentUrl: `${url}/opengraph-image`,
          width: 1200,
          height: 630,
        },
        url,
        datePublished: published,
        dateModified: BUILD_TIMESTAMP,
        inLanguage: "en-US",
        articleSection: pillarMeta.label,
        author: {
          "@type": "Person",
          "@id": `${SITE_URL}/#person`,
          name: "Malcolm Xavier",
        },
        publisher: {
          "@type": "Person",
          "@id": `${SITE_URL}/#person`,
          name: "Malcolm Xavier",
        },
        // Ties the Article to the sitewide WebSite node — without it
        // the Article links the Person but not the site (a half-orphan).
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Writing",
            item: `${SITE_URL}/writing`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: pillarMeta.label,
            item: `${SITE_URL}/writing/${essay.pillar}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: essay.title,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleContainer>
        <header className="flex flex-col gap-4">
          <Kicker>
            <Link href={`/writing/${essay.pillar}`} quiet>
              {pillarMeta.label}
            </Link>
          </Kicker>
          <h1
            className="m-0 text-[34px] md:text-[46px] lg:text-[52px] leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)]"
            style={{ fontFamily: "var(--font-primary)" }}
          >
            {essay.title}
          </h1>
          <Dateline as="time" dateTime={essay.postDate}>
            {formatEssayDate(essay.postDate)}
          </Dateline>
        </header>

        <EssayBody />

        <footer>
          <Link href="/writing">All essays →</Link>
        </footer>
      </ArticleContainer>
    </>
  );
}
