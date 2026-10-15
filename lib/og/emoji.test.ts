import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { fetchEmojiSvg, LEGACY_TWEMOJI_PREFIX, TWEMOJI_VERSION } from "./emoji";

const svg = (body: string) => new Response(body, { status: 200 });
const notFound = () => new Response("Not found", { status: 404 });

describe("fetchEmojiSvg", () => {
  it("serves the pinned release when it has the emoji", async () => {
    const f = vi.fn(async (_url: string) => svg("<svg>pinned</svg>"));
    const res = await fetchEmojiSvg("1fae9.svg", f as unknown as typeof fetch);
    expect(await res.text()).toBe("<svg>pinned</svg>");
    expect(String(f.mock.calls[0][0])).toContain(`jdecked/twemoji@${TWEMOJI_VERSION}/`);
  });

  it("falls forward to the latest release for an emoji newer than the pin", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi.fn(async (url: string) =>
      url.includes("@latest/") ? svg("<svg>latest</svg>") : notFound(),
    );
    const res = await fetchEmojiSvg("1fae9.svg", f as unknown as typeof fetch);
    expect(await res.text()).toBe("<svg>latest</svg>");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("gives back a blank picture, never an error, when no release has it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await fetchEmojiSvg("1ffff.svg", (async () => notFound()) as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    expect(await res.text()).toMatch(/^<svg[^>]*><\/svg>$/);
    warn.mockRestore();
  });

  it("survives the CDN being unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await fetchEmojiSvg("1f600.svg", (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    warn.mockRestore();
  });
});

describe("next/og contract", () => {
  // The interception only works while next/og asks for this exact
  // address. If a Next upgrade changes it, this fails rather than the
  // fix silently switching off.
  it("still requests emoji from the address we intercept", () => {
    const require = createRequire(import.meta.url);
    const bundle = readFileSync(
      require.resolve("next/dist/compiled/@vercel/og/index.node.js"),
      "utf-8",
    );
    expect(bundle).toContain(`"${LEGACY_TWEMOJI_PREFIX}"`);
  });
});
