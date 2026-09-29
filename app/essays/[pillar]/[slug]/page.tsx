// ─────────────────────────────────────────────────────────────────
// /essays/[pillar]/[slug] — a single essay.
//
// Renders the essay body (a TSX module registered in lib/writing/
// essays.ts) inside the narrow reading column, with an Article +
// BreadcrumbList JSON-LD graph following the case-study pattern
// (author/publisher → #person, isPartOf → #website; see
// STRUCTURED-DATA.md). Static: params come from generateStaticParams
// and dynamicParams is off, so every essay prerenders at build.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { ArticleContainer } from "@/components/writing/ArticleContainer";
import {
  BackToEssays,
  BackToEssaysFallback,
} from "@/components/writing/BackToEssays";
import {
  EssayNav,
  EssayNavCards,
  type EssayNavItem,
  type EssayNavNeighbors,
} from "@/components/writing/EssayNav";
import {
  pillarLinkReady,
  ESSAYS,
  essayNeighbors,
  getEssay,
  WRITING_PILLARS,
  formatEssayDate,
  type Essay,
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

/** Flatten an essay to the plain strings the neighbour cards render.
 *
 *  The nav is a client component, and an Essay carries its `Body`
 *  component — a server component, which cannot cross that boundary. The
 *  date is formatted here for the same reason: formatEssayDate lives in
 *  the registry module, which imports all six essay bodies. */
function toNavItem(essay: Essay | undefined): EssayNavItem | undefined {
  if (!essay) return undefined;
  return {
    href: `/essays/${essay.pillar}/${essay.slug}`,
    title: essay.title,
    description: essay.description,
    dateLabel: formatEssayDate(essay.postDate),
  };
}

/** Both sides of one scope, flattened. */
function toNavNeighbors(
  essay: Essay,
  scope: "all" | Essay["pillar"],
): EssayNavNeighbors {
  const { newer, older } = essayNeighbors(essay, scope);
  return { newer: toNavItem(newer), older: toNavItem(older) };
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
  const url = `/essays/${essay.pillar}/${essay.slug}`;
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
  const url = `${SITE_URL}/essays/${essay.pillar}/${essay.slug}`;
  const published = isoWithTz(essay.postDate);
  const EssayBody = essay.Body;

  // Both neighbour scopes, computed at build time. The page may not read
  // `searchParams` — that would opt this route out of the static
  // prerender it is built on (dynamicParams = false above) — so instead
  // of resolving the reader's scope here, every scope is resolved and the
  // client picks. Six essays and four pillars: the work is trivial and
  // the route stays static. See the header comment in EssayNav.
  const pillarListingHref = `/essays/${essay.pillar}`;
  const globalNeighbors = toNavNeighbors(essay, "all");
  const pillarNeighbors = toNavNeighbors(essay, essay.pillar);

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
            name: "Essays",
            item: `${SITE_URL}/essays`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: pillarMeta.label,
            item: `${SITE_URL}/essays/${essay.pillar}`,
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
        {/* Back link first, above the header: a reader who has just
            arrived from a listing wants the way out in the same glance as
            the headline, not after the essay. BackToEssays reads `?from=`
            with useSearchParams, which on a prerendered route pushes its
            subtree to client-only rendering up to the nearest Suspense
            boundary — so it gets one, with the plain "← All essays"
            default as the fallback rather than `null`. That keeps a real
            link in the built HTML, and the hydrated component swaps in
            the pillar destination when the reader came from a pillar
            page. */}
        <Suspense fallback={<BackToEssaysFallback />}>
          <BackToEssays
            pillarHref={pillarListingHref}
            pillarLabel={pillarMeta.label}
          />
        </Suspense>

        <header className="flex flex-col gap-4">
          {/* The pillar label links to its pillar page only once that page
              is worth arriving at — three essays, per pillarLinkReady. Below
              that it is the same label as plain text, because a reader who
              follows it would land on one or two cards and a link back, which
              is worse than not having been invited. This was an unconditional
              link until 2026-09-28 and was the only reader-reachable route
              into three single-card pages. */}
          <Kicker>
            {pillarLinkReady(essay.pillar) ? (
              <Link href={pillarListingHref} quiet>
                {pillarMeta.label}
              </Link>
            ) : (
              pillarMeta.label
            )}
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

        {/* Neighbour cards replace what was a single "All essays →"
            link. A reader who finishes an essay is offered the next one
            either side of it instead of being sent back to the index —
            the back link at the top already covers the way out.

            The Suspense fallback renders the corpus-wide pair, so the
            built HTML carries these links (they are the essay's outbound
            internal links, and a `null` fallback would leave the page
            with none); the hydrated picker narrows them to the pillar
            when `?from=` says the reader is walking one. */}
        <Suspense fallback={<EssayNavCards neighbors={globalNeighbors} />}>
          <EssayNav
            global={globalNeighbors}
            scoped={pillarNeighbors}
            scopedFrom={pillarListingHref}
          />
        </Suspense>
      </ArticleContainer>
    </>
  );
}
