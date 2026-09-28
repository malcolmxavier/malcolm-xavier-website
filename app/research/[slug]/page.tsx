// ─────────────────────────────────────────────────────────────────
// /research/[slug] — a single research piece (a data-science capstone
// or an MSL paper), hosted as a first-class reading page.
//
// Renders the body (a TSX module registered in lib/projects/projects.ts)
// inside the narrow reading column, with an Article + BreadcrumbList
// JSON-LD graph following the case-study / essay pattern
// (author/publisher → #person, isPartOf → #website; see
// STRUCTURED-DATA.md). Static: params come from generateStaticParams
// and dynamicParams is off, so every item prerenders at build.
//
// SHIPPED STATE: these pages are indexed (no `robots: noindex`), listed
// in app/sitemap.ts, and each carries its own Open Graph card from the
// colocated ./opengraph-image.tsx. Readers reach them from the résumé's
// education entries and from the /research index. The index route
// itself lands separately from this migration.
//
// DELIBERATE: the section was renamed from /projects to /research at
// the URL level only. `lib/projects/*` and `components/projects/*` keep
// their directory names — they are internal identifiers, not addresses,
// and renaming them would manufacture rebase conflicts with the
// in-flight `feat/writing` branch for no user-visible gain. Please
// don't "tidy" those imports.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kicker } from "@/components/typography/Kicker";
import { Dateline } from "@/components/typography/Dateline";
import { Link } from "@/components/primitives/Link";
import { Container } from "@/components/layout/Container";
import { ProjectContainer } from "@/components/projects/ProjectContainer";
import { ProjectToc } from "@/components/projects/ProjectToc";
import { TocDisclosure } from "@/components/chrome/TocDisclosure";
import { ScrollProgress } from "@/components/case-study/ScrollProgress";
import {
  Downloads,
  DOWNLOADS_ANCHOR_ID,
  DOWNLOADS_DEFAULT_HEADING,
} from "@/components/projects/Downloads";
import {
  PROJECTS,
  getProject,
  formatByline,
} from "@/lib/projects/projects";
import { SITE_URL, twitterAttribution } from "@/lib/site-config";
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
  if (!project) return { title: "Research not found" };
  const pageTitle = project.metaTitle ?? project.title;
  // The snippet surfaces truncate at roughly 155 characters; the on-page
  // description does not have to. See ProjectMeta.metaDescription.
  const snippet = project.metaDescription ?? project.description;
  const socialTitle = `${pageTitle}—Malcolm Xavier`;
  const url = `/research/${project.slug}`;
  return {
    title: pageTitle,
    description: snippet,
    alternates: { canonical: url },
    // `noindex` stays optional on ProjectMeta so a future draft can be
    // parked out of search, but no shipped item sets it — the section is
    // indexed and in the sitemap.
    robots: project.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: socialTitle,
      description: snippet,
      type: "article",
      url,
      siteName: "Malcolm Xavier",
      locale: "en_US",
      publishedTime: isoWithTz(project.datePublished),
      modifiedTime: BUILD_TIMESTAMP,
      authors: ["Malcolm Xavier"],
      // No explicit `images` — ./opengraph-image.tsx resolves this
      // route's own per-slug card via the App Router file convention,
      // auto-populating og:image / width / height / alt. An explicit
      // array here would fight the file-convention output (the same
      // trap documented in app/about/page.tsx).
    },
    twitter: {
      card: "summary_large_image",
      ...twitterAttribution,
      title: socialTitle,
      description: snippet,
      // twitter:image is auto-populated from ./opengraph-image.tsx too.
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

  const url = `${SITE_URL}/research/${project.slug}`;
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
        // `image` is required for Google Article rich results. Points
        // at this item's own opengraph-image route (its per-slug Satori
        // card, resolved by file convention), not the sitewide card.
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
            name: "Research",
            item: `${SITE_URL}/research`,
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

  // The header, body, and tail (downloads / related) are
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
            <Link key={r.slug} href={`/research/${r.slug}`}>
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

  // The Contents list is the piece's own sections PLUS the downloads
  // block, which is a real destination on the page and was the one
  // thing a reader could not jump to. It's appended here rather than
  // typed into each item's `toc` array so the entry's label is the
  // block's actual heading — one source of truth, and a new long piece
  // gets the entry without anyone remembering to add it.
  //
  // Composed even when `toc` is empty, so the branch below stays the
  // single test for "does this piece get a rail at all" — a short,
  // unsectioned piece is not given a two-item rail just because it has
  // a PDF.
  const hasDownloads = Boolean(project.downloads?.length);
  const tocItems = [
    ...(project.toc ?? []),
    ...(hasDownloads
      ? [
          {
            id: DOWNLOADS_ANCHOR_ID,
            label: project.downloadsHeading ?? DOWNLOADS_DEFAULT_HEADING,
          },
        ]
      : []),
  ];

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
        {/* The site's content well, with the Contents rail as its
            first column — the same shape a case study uses. The well
            used to be a 78rem box of its own, centred independently of
            the header, which is why this page's left edge sat 176px
            inside the nav's on a wide screen. */}
        <Container className="py-14 md:py-20 lg:grid lg:grid-cols-[14rem_minmax(0,54rem)] lg:gap-12 xl:gap-16">
          <ProjectToc items={tocItems} />
          <article className="flex min-w-0 flex-col gap-9 md:gap-11">
            {header}
            {/* Mobile companion to the desktop rail: the sitewide
                collapsible Contents disclosure, shown only below lg
                where the rail is hidden. Maps the project's toc ids to
                the chrome TocItem href shape. */}
            <TocDisclosure
              items={tocItems.map((t) => ({
                href: `#${t.id}`,
                label: t.label,
              }))}
              className="lg:hidden"
            />
            <ProjectBody />
            {tail}
          </article>
        </Container>
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
