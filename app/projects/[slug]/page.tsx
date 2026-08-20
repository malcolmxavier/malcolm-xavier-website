// ─────────────────────────────────────────────────────────────────
// /projects/[slug] — a single portfolio project (a data-science
// capstone or an MSL paper), hosted as a first-class reading page.
//
// Renders the project body (a TSX module registered in
// lib/projects/projects.ts) inside the narrow reading column, with an
// Article + BreadcrumbList JSON-LD graph following the case-study /
// essay pattern (author/publisher → #person, isPartOf → #website; see
// STRUCTURED-DATA.md). Static: params come from generateStaticParams
// and dynamicParams is off, so every project prerenders at build.
//
// PHASE 1: pages carry `robots: noindex` (meta.noindex) so they work
// as permanent résumé-link targets without entering search. There is
// deliberately no /projects index route yet — the résumé links point
// straight at these detail URLs. Phase 2 flips noindex off, adds the
// index + sitemap entries, and lights up per-project OG cards.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { ProjectContainer } from "@/components/projects/ProjectContainer";
import { ProjectToc } from "@/components/projects/ProjectToc";
import { TocDisclosure } from "@/components/chrome/TocDisclosure";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import { Downloads, CompanionSlot } from "@/components/projects/Downloads";
import {
  PROJECTS,
  getProject,
  formatByline,
} from "@/lib/projects/projects";
import { SITE_URL, SOCIAL_CARD_ALT, twitterAttribution } from "@/lib/site-config";
import { BUILD_TIMESTAMP } from "@/lib/build-meta";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

// ISO-8601 with a timezone — Google's Rich Results validator flags a
// date-only value as "missing a timezone." Noon Pacific also keeps the
// displayed date on the intended calendar day in a UTC build env.
function isoWithTz(datePublished: string): string {
  return `${datePublished}T12:00:00-07:00`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };
  const pageTitle = project.metaTitle ?? project.title;
  const socialTitle = `${pageTitle}—Malcolm Xavier`;
  const url = `/projects/${project.slug}`;
  return {
    title: pageTitle,
    description: project.description,
    alternates: { canonical: url },
    // Phase 1: keep these out of the index while they serve as
    // résumé-link targets. Follow stays on so the crawler can still
    // traverse the internal links when Phase 2 opens indexing.
    robots: project.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: socialTitle,
      description: project.description,
      type: "article",
      url,
      siteName: "Malcolm Xavier",
      locale: "en_US",
      publishedTime: isoWithTz(project.datePublished),
      modifiedTime: BUILD_TIMESTAMP,
      authors: ["Malcolm Xavier"],
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SOCIAL_CARD_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      ...twitterAttribution,
      title: socialTitle,
      description: project.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const url = `${SITE_URL}/projects/${project.slug}`;
  const published = isoWithTz(project.datePublished);
  const ProjectBody = project.Body;
  const byline = formatByline(project.authors);

  // Author node(s). The self-author (Malcolm) resolves to the sitewide
  // Person `@id`; co-authors render as plain Person names so the byline
  // credit is machine-readable without minting extra identity nodes.
  const authorNodes = project.authors.map((a) =>
    a.self
      ? { "@type": "Person", "@id": `${SITE_URL}/#person`, name: a.name }
      : { "@type": "Person", name: a.name },
  );

  // Related projects to cross-link at the foot (e.g. MSL Y1 ↔ Y2),
  // resolved from the registry so titles stay in sync.
  const related = (project.related ?? [])
    .map((relatedSlug) => getProject(relatedSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}/#article`,
        headline: project.title,
        description: project.description,
        image: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image`,
          contentUrl: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
        },
        url,
        datePublished: published,
        dateModified: BUILD_TIMESTAMP,
        inLanguage: "en-US",
        articleSection: project.kind,
        author: authorNodes,
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
            name: "Projects",
            item: `${SITE_URL}/projects`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: project.title,
            item: url,
          },
        ],
      },
    ],
  };

  // The header, body, and tail (companion / downloads / related) are
  // the same regardless of layout — only their container changes: a
  // single centered column for short pieces, or a two-column grid with
  // a sticky Contents rail for a long, sectioned one (project.toc).
  const header = (
    <header className="flex flex-col gap-4">
      <Kicker>{project.kind}</Kicker>
      <h1
        className="m-0 text-[34px] md:text-[46px] lg:text-[52px] leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)]"
        style={{ fontFamily: "var(--font-primary)" }}
      >
        {project.title}
      </h1>
      {project.subtitle && (
        <p
          className="m-0 text-[var(--text-body)]"
          style={{ fontSize: "1.15rem", lineHeight: 1.45 }}
        >
          {project.subtitle}
        </p>
      )}
      {/* Byline and the read-time/date line are split so the long
          multi-author byline never shares a line with the date (which
          produced an awkward mid-phrase wrap). Read time mirrors the
          case-study hero's "N min read" detail. */}
      <div className="flex flex-col gap-1">
        <Dateline>{byline}</Dateline>
        <Dateline as="time" dateTime={project.datePublished}>
          {project.readMin} min read ·{" "}
          {project.credential && (
            <>
              {/* Quiet variant: a provenance jump-link that reads as
                  chrome, not a loud body link, inside the caption row. */}
              <Link href={project.credential.href} quiet>
                {project.credential.label}
              </Link>
              {" · "}
            </>
          )}
          {project.dateDisplay}
        </Dateline>
      </div>
    </header>
  );

  const tail = (
    <>
      {project.companion && <CompanionSlot companion={project.companion} />}

      {project.downloads && project.downloads.length > 0 && (
        <Downloads items={project.downloads} heading={project.downloadsHeading} />
      )}

      {related.length > 0 && (
        <footer className="flex flex-col gap-2">
          <p
            className="m-0 text-[var(--text-caption)]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--p-xs-font-size)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Related
          </p>
          {related.map((r) => (
            <Link key={r.slug} href={`/projects/${r.slug}`}>
              {r.title} →
            </Link>
          ))}
        </footer>
      )}
    </>
  );

  const jsonLdScript = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );

  // Long, sectioned piece: sticky Contents rail beside the reading
  // column (desktop), collapsible Contents inside the column (mobile).
  if (project.toc && project.toc.length > 0) {
    return (
      <>
        {jsonLdScript}
        {/* Reading-progress bar — first child so its sticky natural
            position lands at the Nav's bottom edge (see ScrollProgress).
            On any long-read surface: case studies, guides, essays, and
            these project pages. */}
        <ScrollProgress />
        <div className="mx-auto w-full max-w-[78rem] px-6 md:px-8 py-14 md:py-20 lg:grid lg:grid-cols-[14rem_minmax(0,54rem)] lg:gap-12 xl:gap-16 lg:justify-center">
          <ProjectToc items={project.toc} />
          <article className="flex min-w-0 flex-col gap-9 md:gap-11">
            {header}
            {/* Mobile companion to the desktop rail: the sitewide
                collapsible Contents disclosure, shown only below lg
                where the rail is hidden. Maps the project's toc ids to
                the chrome TocItem href shape. */}
            <TocDisclosure
              items={project.toc.map((t) => ({
                href: `#${t.id}`,
                label: t.label,
              }))}
              className="lg:hidden"
            />
            <ProjectBody />
            {tail}
          </article>
        </div>
      </>
    );
  }

  // Short, unsectioned piece: a single centered reading column.
  return (
    <>
      {jsonLdScript}
      {/* Reading-progress bar — first child (see the toc branch above). */}
      <ScrollProgress />
      <ProjectContainer>
        {header}
        <ProjectBody />
        {tail}
      </ProjectContainer>
    </>
  );
}
