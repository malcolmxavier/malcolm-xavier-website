// ─────────────────────────────────────────────────────────────────
// Nav — sticky top header. Wordmark on the left, route links in the
// middle/right (when any are live), theme toggle on the far right.
//
// Per the project's "no public placeholders" rule, route links are
// driven by explicit `SUB_BRAND_ROUTES` + `MAIN_ROUTES` registries.
// Routes don't appear in nav until their pages actually exist.
//
// Visual / behavioral rules baked in here (per Malcolm 2026-04-25):
//
//   • Order (left → right): sub-brand routes, separator, main routes.
//     Concretely today: Music | About, Resume, Contact.
//   • Active route: underlined ahead of hover so users can tell on
//     glance which page they're on.
//   • Inactive routes: underline appears on hover/focus only (matches
//     footer treatment, intentionally subordinate to active state).
//   • Sub-brand routes: the Music link (and future Newsletter /
//     Film / etc.) always renders in its sub-brand color regardless
//     of which page the user is currently on. Achieved by setting
//     data-subbrand on the anchor itself; the components.css
//     `a[data-subbrand="X"]` rule applies the color. Main brand
//     routes (About, Resume, Contact) keep default text color.
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
//   - Active route gets aria-current="page" for screen-reader
//     awareness, beyond the visual underline cue.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "./ThemeToggle";

type NavRoute = {
  label: string;
  href: string;
  /** Sub-brand slug (music, newsletter, film, ...) — present for
   *  sub-brand routes only. Drives the always-on color treatment
   *  via `a[data-subbrand="X"]` rules in components.css. */
  subbrand?: string;
};

// Sub-brand routes — added to this list as Newsletter / Film / TV /
// Games / Books / Podcast ship. The `subbrand` slug per entry must
// match a `[data-subbrand="X"]` rule in components.css.
const SUB_BRAND_ROUTES: NavRoute[] = [
  { label: "Music", href: "/music", subbrand: "music" },
];

// Main brand routes — recruiter-facing pages (default grey alias).
const MAIN_ROUTES: NavRoute[] = [
  { label: "About", href: "/about" },
  { label: "Resume", href: "/resume" },
  { label: "Contact", href: "/contact" },
];

/**
 * True when the given route href matches the current pathname,
 * either exactly or as a prefix (so /music/[playlistId] keeps
 * the Music nav item active).
 *
 * The exact + prefix predicate is enough on its own: for `/`, the
 * prefix check becomes `pathname.startsWith("//")`, which never
 * matches a real client-side pathname — so the earlier `routeHref
 * === "/"` early return was doing the same work as the fall-through.
 */
function isActiveRoute(routeHref: string, pathname: string): boolean {
  return pathname === routeHref || pathname.startsWith(routeHref + "/");
}

export function Nav() {
  const pathname = usePathname();

  return (
    <header
      // Sticky so the wordmark + theme toggle stay reachable as the
      // user scrolls. z-40 keeps it above page content but below
      // anything modal (which would sit at z-50+).
      //
      // data-site-nav is the canonical hook for measuring this
      // header's height (used by case-study ScrollProgress so the
      // progress bar pins to the nav's bottom edge). Selecting via
      // this attribute is more durable than `document.querySelector
      // ("header")`, which would silently match any future <header>.
      data-site-nav
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
          {/* Wordmark: links home, doubles as logo. Active when
              we're on the landing page itself. */}
          <NextLink
            href="/"
            className={[
              "rounded-sm",
              "transition-opacity motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-4",
              "hover:opacity-70",
              isActiveRoute("/", pathname) ? "underline underline-offset-4 decoration-2" : "no-underline",
            ].join(" ")}
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: "var(--p-lg-font-size)",
              lineHeight: "1",
              color: "var(--text-heading)",
              outlineColor: "var(--border-focus)",
            }}
            aria-current={isActiveRoute("/", pathname) ? "page" : undefined}
          >
            Malcolm Xavier
          </NextLink>

          {/* Route lists + theme toggle. Sub-brand routes on the
              left of a divider, main routes on the right. */}
          <div className="flex items-center gap-6">
            {SUB_BRAND_ROUTES.length > 0 ? (
              <NavRouteList routes={SUB_BRAND_ROUTES} pathname={pathname} />
            ) : null}

            {SUB_BRAND_ROUTES.length > 0 && MAIN_ROUTES.length > 0 ? (
              // Visual divider between sub-brand and main routes.
              // 1px CSS rule rather than a Unicode pipe glyph: the
              // glyph would surface in reader-mode/CSS-disabled
              // contexts and never matched the weight/leading of
              // adjacent 12px Roboto Mono labels. aria-hidden because
              // it's purely decorative — the separation reads from
              // spacing + grouping for AT.
              <span
                aria-hidden
                role="presentation"
                className="block h-4 w-px"
                style={{ background: "var(--border-default)" }}
              />
            ) : null}

            {MAIN_ROUTES.length > 0 ? (
              <NavRouteList routes={MAIN_ROUTES} pathname={pathname} />
            ) : null}

            <ThemeToggle />
          </div>
        </nav>
      </Container>
    </header>
  );
}

// ─── Route list sub-component ────────────────────────────────────
// Extracted so the active-state logic + class-building stays in one
// place across both groups (sub-brand and main). Each route's link
// gets:
//   • underline + decoration-2 when active (visible identifier)
//   • underline on hover/focus when inactive (consistent w/ footer)
//   • aria-current="page" when active (screen-reader cue)

function NavRouteList({
  routes,
  pathname,
}: {
  routes: NavRoute[];
  pathname: string;
}) {
  return (
    <ul className="flex items-center gap-6">
      {routes.map((route) => {
        const active = isActiveRoute(route.href, pathname);
        return (
          <li key={route.href}>
            <NextLink
              href={route.href}
              // data-subbrand on the anchor itself drives the
              // a[data-subbrand="X"] color rule in components.css —
              // sub-brand routes always render in their sub-brand
              // color, regardless of the current page.
              data-subbrand={route.subbrand}
              className={[
                "rounded-sm",
                "transition-colors motion-reduce:transition-none",
                "hover:[color:var(--text-action-hover)]",
                "focus-visible:outline-2 focus-visible:outline-offset-4",
                // Active state: always underlined.
                // Inactive: underline on hover/focus only.
                active
                  ? "underline underline-offset-4 decoration-2"
                  : "no-underline hover:underline focus-visible:underline underline-offset-4 decoration-2",
              ].join(" ")}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--p-xs-font-size)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                // Color is set by the a[data-subbrand="X"] rules in
                // components.css when subbrand is present, otherwise
                // defaults to body text color. Unset here so the CSS
                // rule wins without inline-style override.
                ...(route.subbrand
                  ? null
                  : { color: "var(--text-body)" }),
                outlineColor: "var(--border-focus)",
              }}
              aria-current={active ? "page" : undefined}
            >
              {route.label}
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}
