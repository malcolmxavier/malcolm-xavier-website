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
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Malcolm Xavier",
  description:
    "Senior product manager with an artist's eye. Tech, media, streaming.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
