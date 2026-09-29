// ─────────────────────────────────────────────────────────────────
// /feed.xml — the site's RSS feed.
//
// ONE feed, not one per section. Somebody subscribes to a person, not
// to a route, and three feeds would mean three subscriptions nobody
// makes.
//
// It carries ESSAYS, CASE STUDIES, and RESEARCH — everything on the site
// written to be read.
//
// Research was excluded on the first cut, on the reasoning that it is a
// finished corpus rather than a stream: three papers from Malcolm's MS in
// Law, so a feed would hand a subscriber three old items and then go
// silent. Malcolm overruled it and the reasoning does not survive
// inspection. The FEED does not go silent — essays and case studies keep
// it moving — and research simply stops contributing, which costs a
// subscriber nothing. Because the feed is one stream for the whole site
// rather than one per section, nothing in it has to be a stream by
// itself. They are also the deepest things here, which is a reason to
// put them in front of a reader rather than hold them back.
//
// Their 2021–2023 dates sort them to the bottom, so a new subscriber
// meets them once at the end of the first fetch and never again — which
// is the right treatment for finished work.
//
// INDEXED_PROJECTS, not every project: a paper carrying `noindex` is
// deliberately kept out of search, and pushing it into somebody's reader
// would route around that decision.
//
// SUMMARY AND LINK, never full text. A feed carrying whole essays means
// they are read inside somebody's reader app and the site is never
// visited — which would undo the point of the surface this feed exists
// to serve. The description is the same one-to-two-sentence summary the
// cards and the meta description use.
//
// It collects nothing. No form, no account, no cookie, no inbound write
// of any kind: a static XML file of content that is already public.
// Which also means there is no subscriber list — a subscription lives
// in the reader's own app and never touches this site. That is the real
// trade, and it is the right one here.
//
// `force-static` is what makes this a file built once rather than a
// handler run per request: route handlers are NOT cached by default in
// this version of Next, so without it the feed would be rendered on
// demand, against the static-serving posture the rest of the site holds.
// ─────────────────────────────────────────────────────────────────

import { ESSAYS } from "@/lib/writing/essays";
import { CASE_STUDIES } from "@/app/resume/resume-data";
import { INDEXED_PROJECTS } from "@/lib/projects/projects";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-static";

/** Escape the five XML predefined entities.
 *
 *  This is the one place on the site where `&amp;` and friends are
 *  correct rather than banned: AGENTS.md's real-Unicode-glyphs rule
 *  governs reader-facing prose, and these are XML delimiters. A title
 *  containing an ampersand or an angle bracket produces a feed no
 *  reader can parse if it is emitted raw. Curly quotes and em-dashes
 *  pass through untouched — they are ordinary UTF-8 characters and the
 *  declaration below says so. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;") // typography-ok — an XML escaper, not prose
    .replace(/'/g, "&apos;"); // typography-ok — an XML escaper, not prose
}

/** RSS 2.0 requires RFC 822 dates, which is not what the site stores.
 *  Both sources keep a plain YYYY-MM-DD, so noon UTC is used as the
 *  time: it cannot land an item on the previous day for a reader in a
 *  western timezone the way midnight would. */
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toUTCString();
}

type FeedItem = {
  title: string;
  url: string;
  description: string;
  date: string;
  category: string;
};

export function GET() {
  const items: FeedItem[] = [
    ...ESSAYS.map((essay) => ({
      title: essay.title,
      url: `${SITE_URL}/essays/${essay.pillar}/${essay.slug}`,
      description: essay.description,
      date: essay.postDate,
      category: "Essay",
    })),
    ...CASE_STUDIES.map((study) => ({
      title: study.title,
      url: `${SITE_URL}${study.href}`,
      description: study.description,
      date: study.publishedAt,
      category: "Case study",
    })),
    ...INDEXED_PROJECTS.map((project) => ({
      title: project.title,
      url: `${SITE_URL}/research/${project.slug}`,
      description: project.description,
      date: project.datePublished,
      category: "Research",
    })),
    // Newest first. Both sources carry their own date field — postDate
    // for an essay, publishedAt for a case study — and they are compared
    // as strings because both are YYYY-MM-DD, where lexical order is
    // chronological order.
  ].sort((a, b) => b.date.localeCompare(a.date));

  const latest = items[0]?.date;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Malcolm Xavier</title>
    <link>${SITE_URL}</link>
    <description>Essays, case studies, and research on growth, media, AI, and craft.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>${
      latest ? `\n    <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ""
    }
${items
  .map(
    (item) => `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(item.url)}</link>
      <guid isPermaLink="true">${xmlEscape(item.url)}</guid>
      <pubDate>${rfc822(item.date)}</pubDate>
      <category>${item.category}</category>
      <description>${xmlEscape(item.description)}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // An hour is plenty: the feed only changes when something is
      // published, and a reader app polling more often than that is
      // polling more often than Malcolm writes.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
