import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { ShareLoopCloser } from "@/components/growth/ShareLoopCloser";
import "./globals.css";
// Loaded AFTER globals.css so unlayered component overrides beat
// any Tailwind utility rules in @layer utilities.
import "./components.css";

// ─────────────────────────────────────────────────────────────────
// Type system — locked 2026-04-24
//
// Recruiter cluster (Landing/Resume/About/Contact/CV):
//   Display = Instrument Serif (high-contrast editorial, calm)
//   Body    = DM Sans (clean, scannable)
//
// Sub-brand cluster (Newsletter/Film/TV/Music/Games/Books/Podcast):
//   Display = Roboto Mono (early-internet/terminal voice)
//   Body    = Roboto Slab (warm slab serif for the long read)
//
// Mono kicker/dateline (sitewide):
//   Roboto Mono
//
// Wired into globals.css via:
//   --font-primary, --font-secondary, --font-mono
// which the parser-emitted alias blocks override per sub-brand.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Why the fonts live in this repo instead of coming from Google
//
// Every typeface below used to be downloaded from Google Fonts while
// the site was being built. Our host rebuilds from scratch on every
// deploy, so each deploy depended on Google answering in time, and
// when it didn't, the deploy failed. The font files now sit in
// `app/fonts/`, one folder per family, so building the site needs
// nothing from outside the repo.
//
// The designs, weights, and styles are the ones Google was serving.
// Each file covers the two character sets Google split them into,
// basic Latin and extended Latin, combined in one file. Extended
// Latin carries letters such as č, ł, ş, and Đ, which turn up in the
// cast and crew names the film and TV pages print, so those names
// stay in one typeface instead of switching fonts mid-word. Anonymous
// Pro is the exception: it is the designer's own file, unchanged, in
// a web format. Its license reserves the name "Anonymous Pro" for
// unaltered copies, so we don't trim it. Each folder carries the
// font's license (SIL Open Font License, or Apache 2.0 for Roboto
// Slab), which permits shipping the files with the site.
//
// While a font file is still loading, the browser shows a standard
// system font resized to take up the same space (Arial for the sans
// and mono faces, Times New Roman for the serifs), so text doesn't
// jump when the real font arrives. That is what `adjustFontFallback`
// picks below. Big Shoulders is the one face without it; see its
// note.
//
// Where a family is a "variable" font, one file holds every weight,
// so the same file is listed once per weight we use. That keeps the
// weights the site can ask for exactly as they were. DM Sans and Big
// Shoulders can also reshape themselves for different text sizes;
// Google served them fixed at one setting, and these files are fixed
// at that same setting, so nothing shifts.
// ─────────────────────────────────────────────────────────────────

// preload: false on the three cluster-scoped families — recruiter
// pages don't render Roboto Slab; sub-brand pages don't render
// Instrument Serif or DM Sans. Default preload: true injected a
// <link rel="preload"> for every family on every route, which
// browsers warned about as "preloaded but unused within ~3s of the
// load event." display: swap means we never block on fonts anyway,
// so dropping the preload hint costs ~50ms of initial discovery in
// exchange for a clean console. Roboto Mono stays preloaded — it's
// used sitewide via Kicker + Dateline.

const dmSans = localFont({
  variable: "--font-dm-sans",
  src: [
    { path: "./fonts/dm-sans/DMSans-variable.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-sans/DMSans-variable.woff2", weight: "500", style: "normal" },
    { path: "./fonts/dm-sans/DMSans-variable.woff2", weight: "600", style: "normal" },
    { path: "./fonts/dm-sans/DMSans-variable.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
});

const instrumentSerif = localFont({
  variable: "--font-instrument-serif",
  src: [
    { path: "./fonts/instrument-serif/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const robotoSlab = localFont({
  variable: "--font-roboto-slab",
  src: [
    { path: "./fonts/roboto-slab/RobotoSlab-variable.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto-slab/RobotoSlab-variable.woff2", weight: "500", style: "normal" },
    { path: "./fonts/roboto-slab/RobotoSlab-variable.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});

const robotoMono = localFont({
  variable: "--font-roboto-mono",
  src: [
    { path: "./fonts/roboto-mono/RobotoMono-variable.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto-mono/RobotoMono-variable.woff2", weight: "500", style: "normal" },
    { path: "./fonts/roboto-mono/RobotoMono-variable.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});

// The Booth's own label face. It is the one product surface on this
// site that is allowed a face of its own — a departure rather than an
// extension — and it appears in the site's chrome in exactly one
// place: the nav chip. Anonymous Pro's slab terminals carry the
// typed-paperwork reference the Booth's name comes from without
// tipping into period costume the way a true typewriter face does.
//
// preload: false for the same reason the cluster fonts carry it. The
// chip is one word of 12px type on every route, so preloading it
// would buy a font file ahead of the text people are actually here to
// read. display: swap means it never blocks; the chip renders in the
// size-matched Arial fallback for a beat and settles.
const anonymousPro = localFont({
  variable: "--font-anonymous-pro",
  src: [
    { path: "./fonts/anonymous-pro/AnonymousPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/anonymous-pro/AnonymousPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
});

// The Booth's display face, and the other half of the pairing above.
// Big Shoulders was drawn for Chicago's street signage, so it carries
// the poster voice a marquee needs without dressing up as a vintage
// playbill — front of house to Anonymous Pro's paperwork. It is used
// on /booth and nowhere in the site's own chrome, which is why the
// nav chip takes the mono alone.
//
// Variable weight, so one file covers the 600 the headings set; the
// file is declared across its whole 100–900 range rather than at
// single weights for that reason. preload: false because it is one
// route's face, not the site's.
//
// adjustFontFallback: false because that is how it has always loaded.
// Google had no measurements on file for Big Shoulders, so it never
// got a resized stand-in, and a stand-in sized for a face this narrow
// would look visibly different in the moment before the real font
// lands. Turning it on is its own decision, not part of moving files.
const bigShoulders = localFont({
  variable: "--font-big-shoulders",
  src: "./fonts/big-shoulders/BigShoulders-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// ─────────────────────────────────────────────────────────────────
// Sitewide metadata defaults.
//
// `metadataBase` is the anchor every relative URL in metadata
// resolves against (canonical, OG, Twitter). With it set here, a
// per-page `metadata.alternates.canonical: "/resume"` produces
// `https://malxavi.com/resume` — no per-page repetition needed.
//
// The `title` template means a per-page metadata export of
// `title: "Music"` renders as `<title>Music—Malcolm Xavier</title>`
// while the root page (which sets only `title.default`) renders the
// bare `Malcolm Xavier`.
//
// `openGraph.images` and `twitter.images` are auto-populated from
// `app/opengraph-image.tsx` — we don't need to repeat them here.
// Same for icons (auto-populated from `app/icon.tsx`).
// ─────────────────────────────────────────────────────────────────
import { SITE_URL, SITE_NAME, twitterAttribution } from "@/lib/site-config";

const SITE_DESCRIPTION =
  "Senior product manager with an artist’s eye. Growth, marketing, and data platforms—AI-native, with hands-on LLM evaluation, an MS in Law, and a theater background that shows.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s—${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    // @malxavi credited as site + creator; see twitterAttribution.
    ...twitterAttribution,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

const fontVariables = [
  dmSans.variable,
  instrumentSerif.variable,
  robotoSlab.variable,
  robotoMono.variable,
  anonymousPro.variable,
  bigShoulders.variable,
].join(" ");

// ─────────────────────────────────────────────────────────────────
// Sitewide JSON-LD structured data.
//
// Two entities, joined via @graph:
//   1. WebSite — the malxavi.com property, with a publisher pointer
//      to the Person.
//   2. Person — Malcolm, with sameAs pointers to the canonical
//      external profiles (LinkedIn, GitHub, Letterboxd, Serializd,
//      Spotify). Drives Google's "people also search for" knowledge
//      panels and gives AI-search retrievers (Perplexity, ChatGPT
//      search, Gemini) a structured entity to extract from when
//      someone asks "who is Malcolm Xavier" or "senior PM media
//      streaming." Per the 2026-04-29 /full-review (a-no-jsonld) —
//      single biggest discoverability lever before launch.
//
// `sameAs` URLs mirror the live `CONTACT` and `ELSEWHERE` constants
// in `app/resume/resume-data.tsx` and `components/chrome/Footer.tsx`.
// If those move, update here too.
// ─────────────────────────────────────────────────────────────────
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#person` },
      inLanguage: "en-US",
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      jobTitle: "Senior Product Manager",
      url: SITE_URL,
      description:
        "Senior product manager specializing in growth, marketing, and data platforms—MarTech infrastructure, customer data platforms, lifecycle programs, and experimentation—across media, publishing, and B2B SaaS. AI-native builder with three years of hands-on LLM and agent training and evaluation, an MS in Law focused on data privacy and IP, and a BA in theater.",
      sameAs: [
        "https://www.linkedin.com/in/malxavi/",
        "https://github.com/malcolmxavier",
        "https://letterboxd.com/malxavi/",
        "https://www.serializd.com/user/malxavi/profile",
        "https://open.spotify.com/user/malcolmxevans",
      ],
      knowsAbout: [
        "Product Management",
        "Growth",
        "Marketing Technology",
        "Customer Data Platforms",
        "Data Platforms",
        "Lifecycle Marketing",
        "Experimentation",
        "Personalization",
        "Data Privacy",
        "Artificial Intelligence",
        "Large Language Models",
        "AI Evaluation",
        "Media",
        "Publishing",
        "Streaming",
      ],
      alumniOf: [
        {
          "@type": "EducationalOrganization",
          name: "Northwestern University Pritzker School of Law",
        },
        {
          "@type": "EducationalOrganization",
          name: "Trinity College",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} antialiased`}
    >
      <head>
        {/* Feed auto-discovery, so a reader app offers to subscribe from
            whatever page somebody happens to land on.

            Written as a real <link> here rather than through the Metadata
            API's `alternates.types`, and that is not a style preference.
            Next REPLACES a parent's `alternates` object when a page sets
            its own rather than merging into it, and 42 pages here set
            `alternates: { canonical: … }`. Declaring the feed in the root
            metadata therefore reached the homepage and nothing else —
            verified before this was changed. The alternative was adding
            the same `types` block to all 42. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={SITE_NAME}
          href={`${SITE_URL}/feed.xml`}
        />
        {/* Sitewide JSON-LD: WebSite + Person. See STRUCTURED_DATA
            comment above. Placed in <head> so crawlers and AI-search
            retrievers find the schema before the body parses. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Skip-to-content: hidden visually but reachable via Tab as
              the very first focusable element on every page. Becomes
              visible only when focused, anchored to the main landmark. */}
          <a
            href="#main"
            // No focus border — only the focus outline. The earlier
            // `focus:border` was painted in --border-default
            // (--grey-50, near-invisible on white), giving low-vision
            // users two competing focus cues: a faint inner border and
            // the proper outline ring. The outline alone, in
            // --border-focus, is the canonical site-wide signal.
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:outline-2 focus:outline-offset-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--p-xs-font-size)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "var(--surface-page)",
              color: "var(--text-body)",
              outlineColor: "var(--border-focus)",
            }}
          >
            Skip to content
          </a>

          <Nav />

          {/* Main landmark — single source of <main> sitewide. Pages
              return their own content (no inner <main>) so the
              landmark hierarchy stays clean and the skip-link target
              is consistent. flex-1 lets the footer push to the bottom
              when content is short. */}
          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer />

          {/* Share-loop closer — a "follow along" nudge shown only to
              warm share-arrivals (utm_medium=share) on the personal
              clusters. Renders null for every other visit. Suspense-
              wrapped because it reads useSearchParams(), which would
              otherwise opt the whole app out of static rendering. */}
          <Suspense fallback={null}>
            <ShareLoopCloser />
          </Suspense>
        </ThemeProvider>

        {/* Vercel Web Analytics — page-view counts sent to the
            Vercel dashboard. Beacons no-op in dev; fire only on
            Preview/Prod. Placed outside ThemeProvider since it
            doesn't read theme context. Speed Insights intentionally
            skipped — paid add-on on Pro, not worth it for MVP. */}
        <Analytics />
      </body>
    </html>
  );
}
