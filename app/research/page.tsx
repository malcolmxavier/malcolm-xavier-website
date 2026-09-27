// ─────────────────────────────────────────────────────────────────
// /research — the index for the Master of Science in Law work.
//
// This route did not exist until 2026-09-27. The detail pages shipped
// first as `noindex` deep links off the résumé (the old "Phase 1"),
// which meant the only evidence for the law degree was a handful of
// unlisted URLs. They are indexed now and this is their home.
//
// It renders INDEXED_PROJECTS, not PROJECTS. The registry also holds
// the DS4A capstone, which is deliberately unlisted — a different
// programme on a different subject, kept as a résumé-link target only
// (see app/research/_research/sea-level-rise-florida.tsx). So this
// index can be shorter than the set of pages that exist, and that is
// the intended state rather than a bug to fix.
//
// Layout: one column, no rail. /case-studies carries a 14rem "On this
// page" rail because it has sections to jump between; a short list
// shown once does not, and a table of contents over two links is the
// kind of apparatus the /about pass removed.
//
// The items render as a rule-separated editorial list rather than the
// card grid /case-studies uses. That grid is `grid-cols-1
// sm:grid-cols-2`, which orphans the last card on an odd count — and
// with long-form reading pieces, each carrying a subtitle and a
// byline, a list reads closer to a contents page than a set of cards
// does.
//
// Ordering is the registry's own: PROJECTS is sorted newest-first by
// datePublished and INDEXED_PROJECTS preserves that order. Not
// re-sorted here, so the index and the sitemap cannot disagree.
//
// NOTE on naming: the route is /research, but lib/projects/ and
// components/projects/ deliberately keep their old names — see the
// header of ./[slug]/page.tsx for why. Nothing here should "fix" that.
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
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { SITE_URL, twitterAttribution } from "@/lib/site-config";
import {
  INDEXED_PROJECTS,
  formatProjectDate,
  formatByline,
} from "@/lib/projects/projects";

const RESEARCH_DESCRIPTION =
  "Master of Science in Law papers on data privacy, media, and how platform rules and privacy law lag the culture they govern.";

export const metadata: Metadata = {
  title: "Research",
  description: RESEARCH_DESCRIPTION,
  // Explicit canonical, same reasoning as every other page here: without
  // it the route inherits the root layout's canonical-of-"/".
  alternates: { canonical: "/research" },
  openGraph: {
    title: "Research—Malcolm Xavier",
    description: RESEARCH_DESCRIPTION,
    type: "website",
    url: "/research",
    siteName: "Malcolm Xavier",
    locale: "en_US",
    // No `images` — ./opengraph-image.tsx does not exist for this index
    // yet, so the root card applies. If one is added later, do NOT also
    // add an explicit array: it wins over the file convention and the
    // new card would silently never render. See app/about/page.tsx.
  },
  twitter: {
    card: "summary_large_image",
    ...twitterAttribution,
    title: "Research—Malcolm Xavier",
    description: RESEARCH_DESCRIPTION,
  },
};

// ─── JSON-LD: CollectionPage ──────────────────────────────────────
// Same two-tier shape as /case-studies (see STRUCTURED-DATA.md): the
// page node connects up to the sitewide WebSite and Person, and
// hasPart lists the items so a retriever resolves "these three things
// belong to that one person" rather than three orphaned articles.
// `about` rather than `mainEntity` is the collection form.
const RESEARCH_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/research/#collectionpage`,
  url: `${SITE_URL}/research`,
  name: "Research—Malcolm Xavier",
  description: RESEARCH_DESCRIPTION,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#person` },
  hasPart: INDEXED_PROJECTS.map((item) => ({
    "@type": "Article",
    "@id": `${SITE_URL}/research/${item.slug}/#article`,
    headline: item.title,
    url: `${SITE_URL}/research/${item.slug}`,
    datePublished: item.datePublished,
    author: { "@id": `${SITE_URL}/#person` },
  })),
};

export default function ResearchIndexPage() {
  return (
    <>
      {/* CollectionPage JSON-LD — see RESEARCH_SCHEMA above. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(RESEARCH_SCHEMA) }}
      />
      <Container>
        <Section padding="lg">
          <Stack gap="800">
            <Stack gap="300">
              <Kicker>Research</Kicker>
              <Display>Where I show my work.</Display>
            </Stack>

            {/* The headline names what the pieces ARE — long arguments
                with citations and a downloadable PDF, where the
                reasoning is on the page rather than summarised. An
                earlier draft, "The questions I chose.", framed the
                section around the act of choosing instead, which is
                inside baseball: it implies a contrast with assigned
                work that the reader has no reason to care about. Same
                fault as the first lede, one line up.

                The lede says what the section holds and what the two
                papers argue. An earlier draft was Malcolm's own explanation of
                WHY the section exists — "the degree is an expression of
                that rather than a line on a résumé" — which is intake,
                not page copy: it answers a question the reader has not
                asked and makes a claim about a credential instead of
                naming the work. Both halves of this one are drawn from
                the items' own descriptions rather than invented.

                Scoped to the law work on purpose — the DS4A capstone is
                a different programme on a different subject and is
                résumé-only (see _research/sea-level-rise-florida.tsx). */}
            <Lede>
              Who privacy law actually protects, and who platform rules
              erase.
            </Lede>

            {/* The list. Rule-separated rather than carded; the first
                item gets no top rule, so the rules read as separators
                between entries rather than a box around each one. */}
            <ul
              role="list"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {INDEXED_PROJECTS.map((item, i) => (
                <li
                  key={item.slug}
                  className={i === 0 ? "" : "mt-10 pt-10 border-t"}
                  style={
                    i === 0
                      ? undefined
                      : { borderColor: "var(--border-default)" }
                  }
                >
                  <Stack gap="300">
                    <Kicker>{item.kind}</Kicker>

                    {/* The title is the link. A whole-card link would
                        swallow the subtitle and byline into one very
                        long accessible name; keeping the anchor on the
                        heading means a screen reader announces the
                        piece's name and nothing else.

                        `quiet` plus an inherited color, because the
                        loud treatment renders a serif headline as a
                        green underlined slab — three of those stacked
                        read as a warning, not a contents page. Quiet
                        keeps the heading looking like a heading and
                        moves the affordance to hover and focus, where
                        it picks up both the underline and the action
                        color. The inline color overrides quiet's own
                        --text-action because `style` spreads last in
                        the primitive. */}
                    <Headline level={2}>
                      <Link
                        href={`/research/${item.slug}`}
                        quiet
                        style={{ color: "inherit" }}
                      >
                        {item.title}
                      </Link>
                    </Headline>

                    {/* The description, not the subtitle. The subtitle
                        is an academic title fragment ("Privacy Law in
                        the Social Media Era") and set as a paragraph it
                        reads as a second headline rather than a
                        sentence. The description is prose and says what
                        the piece argues, which is what an index entry
                        is for. The subtitle still heads the detail
                        page, where a title fragment belongs. */}
                    <Body>{item.description}</Body>

                    <Dateline>
                      {formatByline(item.authors)} ·{" "}
                      {formatProjectDate(item.datePublished)}
                    </Dateline>
                  </Stack>
                </li>
              ))}
            </ul>
          </Stack>
        </Section>
      </Container>
    </>
  );
}
