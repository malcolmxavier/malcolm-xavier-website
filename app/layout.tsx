import type { Metadata } from "next";
import {
  DM_Sans,
  Instrument_Serif,
  Roboto_Slab,
  Roboto_Mono,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { ChromeGate } from "@/components/chrome/ChromeGate";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
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
import { SITE_URL, SITE_NAME } from "@/lib/site-config";

const SITE_DESCRIPTION =
  "Senior product manager with an artist's eye. Growth and data in tech, media, and streaming. AI-native, MS in Law, plus a theater background that shows.";

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
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

const fontVariables = [
  dmSans.variable,
  instrumentSerif.variable,
  robotoSlab.variable,
  robotoMono.variable,
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
        "Senior product manager specializing in growth and data platforms in media, publishing, and streaming. AI-native builder with an MS in Law and a BA in theater.",
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
        "Data Platforms",
        "Media",
        "Streaming",
        "AI",
        "MarTech",
        "Lifecycle Marketing",
        "Experimentation",
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

          {/* ChromeGate hides Nav + Footer on chrome-free routes
              (e.g. /banner/* — the LinkedIn banner export view). All
              other routes see Nav and Footer as normal. */}
          <ChromeGate>
            <Nav />
          </ChromeGate>

          {/* Main landmark — single source of <main> sitewide. Pages
              return their own content (no inner <main>) so the
              landmark hierarchy stays clean and the skip-link target
              is consistent. flex-1 lets the footer push to the bottom
              when content is short. */}
          <main id="main" className="flex-1">
            {children}
          </main>

          <ChromeGate>
            <Footer />
          </ChromeGate>
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
