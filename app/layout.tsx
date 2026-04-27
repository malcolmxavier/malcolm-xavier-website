import type { Metadata } from "next";
import {
  DM_Sans,
  Instrument_Serif,
  Roboto_Slab,
  Roboto_Mono,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
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
// `title: "Music"` renders as `<title>Music — Malcolm Xavier</title>`
// while the root page (which sets only `title.default`) renders the
// bare `Malcolm Xavier`.
//
// `openGraph.images` and `twitter.images` are auto-populated from
// `app/opengraph-image.tsx` — we don't need to repeat them here.
// Same for icons (auto-populated from `app/icon.tsx`).
// ─────────────────────────────────────────────────────────────────
const SITE_URL = "https://malxavi.com";
const SITE_NAME = "Malcolm Xavier";
const SITE_DESCRIPTION =
  "Senior product manager with an artist's eye. Tech, media, streaming.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} antialiased`}
    >
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
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:border focus:outline-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--p-xs-font-size)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "var(--surface-page)",
              color: "var(--text-body)",
              borderColor: "var(--border-default)",
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
      </body>
    </html>
  );
}
