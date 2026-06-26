"use client";

// /styles — type system reference
//
// Internal-only design-system reference. Not part of the public
// site (excluded from search via app/styles/layout.tsx robots
// metadata). The route exists so Malcolm can sanity-check tokens,
// fonts, and sub-brand palettes during the build, and so collaborators
// can be sent the URL directly.
//
// Three sections:
//   01. Recruiter cluster: Instrument Serif display + DM Sans body
//   02. Sub-brand cluster: Roboto Mono display + Roboto Slab body
//   03. Seven sub-brand color cards using the locked stack
//
// Use the global theme toggle in the Nav for light/dark validation.

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const HERO_COPY = "Senior product manager with an artist’s eye.";
const BODY_COPY =
  "Body copy renders here. The work happens at this size — five lines, fifteen lines, fifty. Looking for legibility, voice, and the absence of fatigue. Spaces between letters, the thickness of a stem, the way a comma falls.";
const KICKER = "Currently interviewing · LA · open to media & streaming";

// ─── Sub-brand color reference ─────────────────────────────────────
type FamilyName =
  | "green"
  | "blue"
  | "grey"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

type SubBrand = {
  name: string;
  slug: string;
  color: FamilyName;
  hero: string;
  kicker: string;
};

const SUBBRANDS: SubBrand[] = [
  { name: "Newsletter", slug: "newsletter", color: "green", hero: "Every Sunday morning, a few hundred words.", kicker: "Newsletter · weekly" },
  { name: "Film", slug: "film", color: "orange", hero: "Last thing I watched. What I made of it.", kicker: "Film · via Letterboxd" },
  { name: "TV", slug: "tv", color: "blue", hero: "Episodes worth your time.", kicker: "TV · via Serializd" },
  { name: "Music", slug: "music", color: "purple", hero: "Things I’ve been listening to lately.", kicker: "Music · via Spotify" },
  { name: "Games", slug: "games", color: "red", hero: "Played, finished, recommended.", kicker: "Games" },
  { name: "Books", slug: "books", color: "yellow", hero: "Reading, currently.", kicker: "Books · via StoryGraph" },
  { name: "Podcast", slug: "podcast", color: "pink", hero: "Conversations worth pressing play on.", kicker: "Podcast" },
];

// Per-family contrast-safe accent stops (kicker text) and button stops.
const ACCENT_TEXT: Record<FamilyName, { light: string; dark: string }> = {
  yellow: { light: "800", dark: "200" },
  orange: { light: "700", dark: "200" },
  green: { light: "700", dark: "200" },
  pink: { light: "700", dark: "200" },
  red: { light: "700", dark: "200" },
  blue: { light: "700", dark: "300" },
  purple: { light: "700", dark: "300" },
  grey: { light: "800", dark: "200" },
};

const BUTTON_BG: Record<FamilyName, string> = {
  yellow: "800",
  orange: "700",
  green: "700",
  pink: "700",
  red: "700",
  blue: "700",
  purple: "700",
  grey: "800",
};

// ─── Section primitive ─────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-t py-16"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div className="mb-10">
        <p
          className="mb-2 uppercase tracking-widest"
          style={{
            fontSize: "var(--p-xs-font-size)",
            fontFamily: "var(--font-roboto-mono)",
            color: "var(--text-caption)",
          }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            style={{
              fontSize: "var(--p-md-font-size)",
              lineHeight: "var(--p-md-line-height)",
              color: "var(--text-body)",
              maxWidth: "60ch",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// ─── Sub-brand specimen card ───────────────────────────────────────
function SubBrandCard({ sb }: { sb: SubBrand }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeMode: "light" | "dark" =
    mounted && resolvedTheme === "dark" ? "dark" : "light";
  const accentTextStop = ACCENT_TEXT[sb.color][themeMode];
  const buttonStop = BUTTON_BG[sb.color];

  return (
    <div
      data-subbrand={sb.slug}
      className="overflow-hidden rounded-lg border"
      style={{
        background: "var(--surface-page)",
        borderColor: "var(--border-default)",
      }}
    >
      <div
        style={{ height: 8, background: `var(--${sb.color}-500)` }}
      />

      <div className="p-8">
        <p
          className="mb-6 uppercase tracking-wider"
          style={{
            fontSize: "var(--p-xs-font-size)",
            fontFamily: "var(--font-roboto-mono)",
            color: "var(--text-caption)",
          }}
        >
          {sb.name} · {sb.color} · Roboto Mono + Slab
        </p>

        <p
          className="mb-3 uppercase tracking-widest"
          style={{
            fontSize: "var(--p-xs-font-size)",
            fontFamily: "var(--font-roboto-mono)",
            color: `var(--${sb.color}-${accentTextStop})`,
            fontWeight: 600,
          }}
        >
          {sb.kicker}
        </p>

        <h3
          className="mb-4"
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "var(--h3-font-size)",
            lineHeight: "var(--h3-line-height)",
            fontWeight: 700,
            color: "var(--text-heading)",
            letterSpacing: "-0.02em",
          }}
        >
          {sb.hero}
        </h3>

        <p
          className="mb-6"
          style={{
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-md-font-size)",
            lineHeight: "var(--p-md-line-height)",
            color: "var(--text-body)",
          }}
        >
          Body copy in Roboto Slab. Same on every sub-brand — warm slab
          serif for the long read.
        </p>

        <button
          className="rounded-md px-4 py-2 transition hover:opacity-90"
          style={{
            background: `var(--${sb.color}-${buttonStop})`,
            color: "var(--foundation-white)",
            fontFamily: "var(--font-secondary)",
            fontSize: "var(--p-sm-font-size)",
            fontWeight: 600,
          }}
        >
          Read more →
        </button>

        <div className="mt-8 flex gap-1">
          {(["200", "400", "500", "700", "800"] as const).map((stop) => (
            <div key={stop} className="flex-1">
              <div
                style={{
                  background: `var(--${sb.color}-${stop})`,
                  height: 32,
                  borderRadius: 4,
                }}
              />
              <p
                className="mt-1 text-center"
                style={{
                  fontFamily: "var(--font-roboto-mono)",
                  fontSize: 10,
                  color: "var(--text-caption)",
                }}
              >
                {stop}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StylesPreview() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-16">
      <div className="mb-12">
        <p
          className="mb-2 uppercase tracking-widest"
          style={{
            fontSize: "var(--p-xs-font-size)",
            fontFamily: "var(--font-roboto-mono)",
            color: "var(--text-caption)",
          }}
        >
          Internal · /styles · LOCKED
        </p>
        <h1
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "var(--h1-font-size)",
            lineHeight: "var(--h1-line-height)",
            color: "var(--text-heading)",
          }}
        >
          Type system reference
        </h1>
      </div>

      {/* ─── Section 01: Recruiter cluster ──────────────────────── */}
      <Section
        title="01 · Recruiter cluster — Instrument Serif + DM Sans"
        subtitle="Recruiter pages (Landing, Resume, About, Contact, Creative CV) use Instrument Serif as the display layer (high-contrast editorial calm) and DM Sans for body / UI (clean, scannable, recruiter-familiar)."
      >
        <div className="space-y-8">
          <p
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "var(--h1-font-size)",
              lineHeight: "var(--h1-line-height)",
              color: "var(--text-heading)",
            }}
          >
            {HERO_COPY}
          </p>
          <p
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "var(--h3-font-size)",
              lineHeight: "var(--h3-line-height)",
              color: "var(--text-heading)",
            }}
          >
            Headline at h3 size — section titles, sub-heads, asides.
          </p>
          <p
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "var(--p-md-font-size)",
              lineHeight: "var(--p-md-line-height)",
              maxWidth: "60ch",
              color: "var(--text-body)",
            }}
          >
            {BODY_COPY}
          </p>
          <p
            style={{
              fontFamily: "var(--font-roboto-mono)",
              fontSize: "var(--p-xs-font-size)",
              lineHeight: "var(--p-xs-line-height)",
              color: "var(--text-caption)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {KICKER}
          </p>
        </div>
      </Section>

      {/* ─── Section 02: Sub-brand cluster ──────────────────────── */}
      <Section
        title="02 · Sub-brand cluster — Roboto Mono display + Roboto Slab body"
        subtitle="Sub-brand pages (Newsletter, Film, TV, Music, Games, Books, Podcast) get Roboto Mono for display headlines (early-internet/terminal voice) and Roboto Slab for body (warm slab serif for the long read). Mirrors what Substack serves — Malcolm’s publication will flip to match."
      >
        <div className="space-y-8" data-subbrand="newsletter">
          <p
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: "var(--h1-font-size)",
              lineHeight: "var(--h1-line-height)",
              fontWeight: 700,
              color: "var(--text-heading)",
              letterSpacing: "-0.02em",
            }}
          >
            {HERO_COPY}
          </p>
          <p
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: "var(--h3-font-size)",
              lineHeight: "var(--h3-line-height)",
              fontWeight: 600,
              color: "var(--text-heading)",
              letterSpacing: "-0.02em",
            }}
          >
            Headline at h3 size — section titles, episode titles, post
            sub-heads.
          </p>
          <p
            style={{
              fontFamily: "var(--font-secondary)",
              fontSize: "var(--p-md-font-size)",
              lineHeight: "var(--p-md-line-height)",
              maxWidth: "60ch",
              color: "var(--text-body)",
            }}
          >
            {BODY_COPY}
          </p>
          <p
            style={{
              fontFamily: "var(--font-roboto-mono)",
              fontSize: "var(--p-xs-font-size)",
              lineHeight: "var(--p-xs-line-height)",
              color: "var(--text-caption)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {KICKER}
          </p>
        </div>
      </Section>

      {/* ─── Section 03: Sub-brand color reference ──────────────── */}
      <Section
        title="03 · Sub-brand color reference — all 7 locked"
        subtitle="One card per sub-brand showing the locked color paired with the locked type stack. Toggle the theme top-right to verify contrast holds in both modes."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {SUBBRANDS.map((sb) => (
            <SubBrandCard key={sb.slug} sb={sb} />
          ))}
        </div>
      </Section>

      <p
        className="mt-16 text-center opacity-60"
        style={{
          fontFamily: "var(--font-roboto-mono)",
          fontSize: "var(--p-xs-font-size)",
          color: "var(--text-caption)",
        }}
      >
        End of reference · everything above is locked in
        tokens/ and app/layout.tsx
      </p>
    </div>
  );
}
