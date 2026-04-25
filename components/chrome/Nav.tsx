// ─────────────────────────────────────────────────────────────────
// Nav — sticky top header. Wordmark on the left, route links in the
// middle/right (when any are live), theme toggle on the far right.
//
// Per the project's "no public placeholders" rule, route links are
// driven by an explicit `LIVE_ROUTES` registry. Routes don't appear
// in nav until their pages actually exist. As Resume / About /
// Contact ship on Day 3–4, they get added to the registry one line
// at a time.
//
// Sticky positioning + a subtle backdrop-blur keeps the nav legible
// over scrolling content without going opaque.
//
// Accessibility:
//   - Skip-to-content link is the very first focusable element on
//     the page; it's visually hidden until focused (provided by
//     the layout — Nav assumes `#main` is the landmark below).
//   - <nav> with aria-label="Primary" so multiple landmarks (Footer
//     also uses <nav>) are distinguishable to assistive tech.
// ─────────────────────────────────────────────────────────────────

import NextLink from "next/link";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "./ThemeToggle";

// As pages ship, add them here. Order = nav order.
// Format: { label shown to user, href }
type NavRoute = { label: string; href: string };
const LIVE_ROUTES: NavRoute[] = [
  { label: "Resume", href: "/resume" },
  // { label: "About", href: "/about" },
  // { label: "Contact", href: "/contact" },
];

export function Nav() {
  return (
    <header
      // Sticky so the wordmark + theme toggle stay reachable as the
      // user scrolls. z-40 keeps it above page content but below
      // anything modal (which would sit at z-50+).
      className="sticky top-0 z-40 backdrop-blur-md border-b"
      style={{
        // Semi-transparent surface so backdrop-blur has something to
        // work with. Token resolves to white in light, black in dark.
        background: "color-mix(in srgb, var(--surface-page) 80%, transparent)",
        borderColor: "var(--border-default)",
      }}
    >
      <Container size="lg">
        <nav
          aria-label="Primary"
          className="flex items-center justify-between py-4"
        >
          {/* Wordmark: links home, doubles as logo */}
          <NextLink
            href="/"
            className="focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm"
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: "var(--p-lg-font-size)",
              lineHeight: "1",
              color: "var(--text-heading)",
              outlineColor: "var(--border-focus)",
            }}
          >
            Malcolm Xavier
          </NextLink>

          {/* Route list + theme toggle */}
          <div className="flex items-center gap-6">
            {LIVE_ROUTES.length > 0 ? (
              <ul className="flex items-center gap-6">
                {LIVE_ROUTES.map((route) => (
                  <li key={route.href}>
                    <NextLink
                      href={route.href}
                      className={[
                        "rounded-sm",
                        "transition-colors motion-reduce:transition-none",
                        "hover:[color:var(--text-action-hover)]",
                        "focus-visible:outline-2 focus-visible:outline-offset-4",
                      ].join(" ")}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--p-xs-font-size)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--text-body)",
                        outlineColor: "var(--border-focus)",
                      }}
                    >
                      {route.label}
                    </NextLink>
                  </li>
                ))}
              </ul>
            ) : null}
            <ThemeToggle />
          </div>
        </nav>
      </Container>
    </header>
  );
}
