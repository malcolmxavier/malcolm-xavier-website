import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { ESSAYS } from "@/lib/writing/essays";
import { CASE_STUDIES } from "@/app/resume/resume-data";

// The feed is machine-read, so a reader app is the only thing that would
// notice it breaking — and it would notice by silently failing to parse.
// These assert the things that make it parseable and correct.
describe("/feed.xml", () => {
  const xml = GET().text();

  it("serves RSS with the right content type", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
  });

  it("carries every essay and every case study, and no research", async () => {
    const body = await xml;
    for (const essay of ESSAYS) {
      expect(body).toContain(`/essays/${essay.pillar}/${essay.slug}`);
    }
    for (const study of CASE_STUDIES) {
      expect(body).toContain(study.href);
    }
    // Research is a finished corpus rather than a stream — see the note
    // at the top of route.ts. If it is ever added, this is the assertion
    // to change deliberately.
    expect(body).not.toContain("/research/");
    const itemCount = (body.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(ESSAYS.length + CASE_STUDIES.length);
  });

  it("escapes XML delimiters rather than emitting them raw", async () => {
    const body = await xml;
    // Strip the things that are legitimately markup, then assert no bare
    // delimiter survives inside the text content.
    const textOnly = body.replace(/<[^>]*>/g, "").replace(/<\?xml[^>]*\?>/g, "");
    expect(textOnly).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it("dates every item in RFC 822, which is what RSS 2.0 requires", async () => {
    const body = await xml;
    const dates = [...body.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => m[1]);
    expect(dates.length).toBe(ESSAYS.length + CASE_STUDIES.length);
    for (const d of dates) {
      expect(d).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
      expect(Number.isNaN(new Date(d).getTime())).toBe(false);
    }
  });

  it("orders newest first", async () => {
    const body = await xml;
    const times = [...body.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) =>
      new Date(m[1]).getTime(),
    );
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it("uses absolute URLs, since a feed is read away from the site", async () => {
    const body = await xml;
    for (const link of [...body.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1])) {
      expect(link).toMatch(/^https:\/\//);
    }
  });
});
