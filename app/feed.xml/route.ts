// ─────────────────────────────────────────────────────────────────
// /feed.xml — the site's RSS feed.
//
// ONE feed, not one per section. Somebody subscribes to a person, not
// to a route, and three feeds would mean three subscriptions nobody
// makes.
//
// It carries ESSAYS and CASE STUDIES: the two things here that get
// published over time. RESEARCH IS DELIBERATELY EXCLUDED — it is three
// papers from Malcolm's MS in Law, a finished corpus rather than a
// stream. In a feed it would hand a new subscriber three old items on
// the first fetch and then go silent forever, which misrepresents what
// that section is.
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
    <description>Essays and case studies on growth, media, AI, and craft.</description>
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
