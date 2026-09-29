import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { ESSAYS } from "@/lib/writing/essays";
import { CASE_STUDIES } from "@/app/resume/resume-data";
import { INDEXED_PROJECTS } from "@/lib/projects/projects";

// The feed is machine-read, so a reader app is the only thing that would
// notice it breaking — and it would notice by silently failing to parse.
// These assert the things that make it parseable and correct.
describe("/feed.xml", () => {
  const xml = GET().text();

  it("serves RSS with the right content type", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
  });

  it("carries every essay, case study, and indexed research paper", async () => {
    const body = await xml;
    for (const essay of ESSAYS) {
      expect(body).toContain(`/essays/${essay.pillar}/${essay.slug}`);
    }
    for (const study of CASE_STUDIES) {
      expect(body).toContain(study.href);
    }
    for (const project of INDEXED_PROJECTS) {
      expect(body).toContain(`/research/${project.slug}`);
    }
    const itemCount = (body.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(
      ESSAYS.length + CASE_STUDIES.length + INDEXED_PROJECTS.length,
    );
  });

  it("leaves a noindex research paper out", async () => {
    const body = await xml;
    // A paper carrying `noindex` is deliberately kept out of search, and
    // pushing it into somebody's reader would route around that. The feed
    // reads INDEXED_PROJECTS for exactly this reason; asserting on the
    // difference means the day a paper is marked noindex, this catches a
    // feed that kept publishing it.
    const { PROJECTS } = await import("@/lib/projects/projects");
    for (const project of PROJECTS.filter((p) => p.noindex)) {
      expect(body).not.toContain(`/research/${project.slug}`);
    }
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
    expect(dates.length).toBe(
      ESSAYS.length + CASE_STUDIES.length + INDEXED_PROJECTS.length,
    );
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
