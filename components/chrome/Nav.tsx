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
// Responsive layout:
//   • md+ (≥768px): horizontal nav row — wordmark | routes | toggle.
//   • <md: wordmark | hamburger trigger. Hamburger opens a dropdown
//     panel below the nav containing the same routes (vertical) and
//     theme toggle. Same content, same separator, same a11y story —
//     just stacked.
//
// Accessibility:
//   - Skip-to-content link is the very first focusable element on
//     the page; it's visually hidden until focused (provided by
//     the layout — Nav assumes `#main` is the landmark below).
//   - <nav> with aria-label="Primary" so multiple landmarks (Footer
//     also uses <nav>) are distinguishable to assistive tech.
//   - Active route gets aria-current="page" for screen-reader
//     awareness, beyond the visual underline cue.
//   - Mobile disclosure: trigger carries aria-expanded + aria-controls
//     pointing at the panel. aria-label changes between "Open menu"
//     and "Close menu" so screen-reader users hear the action they're
//     about to take, not the glyph (which is aria-hidden). Esc closes
//     and returns focus to the trigger. Tapping a route auto-closes
//     via the pathname-watching effect.
// ─────────────────────────────────────────────────────────────────

"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/Container";
import { IconClose, IconMenu } from "@/components/icons";
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

const MOBILE_MENU_ID = "primary-mobile-menu";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes the menu and returns focus to the trigger button so
  // the keyboard user lands somewhere sensible. Without the focus
  // restore, focus would vanish into <body> and the next tab would
  // start from the top of the document — disorienting.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Tap-outside closes the menu — standard mobile dismissal. Skips
  // the trigger itself so the button's own toggle handler doesn't
  // race with this effect (mousedown fires before click; if we
  // closed on a trigger mousedown, the subsequent click would
  // re-open it).
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  // Auto-close on route change. When a user taps a link inside the
  // panel, the pathname changes; this effect closes the menu so the
  // landed-on page is fully visible. No-op when the menu is already
  // closed (common case on first mount + every desktop nav).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const showSeparator =
    SUB_BRAND_ROUTES.length > 0 && MAIN_ROUTES.length > 0;

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

          {/* Desktop layout — md+. Horizontal route lists + toggle.
              Hidden below md where the hamburger takes over. */}
          <div className="hidden md:flex items-center gap-6">
            {SUB_BRAND_ROUTES.length > 0 ? (
              <NavRouteList
                routes={SUB_BRAND_ROUTES}
                pathname={pathname}
                layout="horizontal"
              />
            ) : null}

            {showSeparator ? (
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
              <NavRouteList
                routes={MAIN_ROUTES}
                pathname={pathname}
                layout="horizontal"
              />
            ) : null}

            <ThemeToggle />
          </div>

          {/* Mobile layout — <md only. Hamburger trigger that opens
              the disclosure panel below. The button is at least
              40×40 to clear WCAG 2.5.8 Target Size (24×24 AA, 44×44
              AAA). Glyph swaps between hamburger and X based on
              menuOpen; both glyphs are aria-hidden because the
              accessible name lives on the button via aria-label. */}
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={MOBILE_MENU_ID}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((current) => !current)}
            className={[
              "md:hidden",
              "inline-flex h-10 w-10 items-center justify-center",
              "rounded-md border",
              "transition-colors motion-reduce:transition-none",
              "hover:opacity-80",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
            ].join(" ")}
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-body)",
              background: "var(--surface-page)",
              outlineColor: "var(--border-focus)",
            }}
          >
            {menuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>
        </nav>
      </Container>

      {/* Mobile disclosure panel — rendered absolutely below the nav
          row so the page content underneath doesn't reflow when the
          menu opens. Same backdrop-blur surface as the nav itself
          for visual continuity. md:hidden so it never appears on
          desktop layouts even if menuOpen somehow flips true (it
          can't, since the trigger is hidden md+, but defense in
          depth never hurt anyone). */}
      {menuOpen ? (
        <div
          ref={panelRef}
          id={MOBILE_MENU_ID}
          className="md:hidden absolute left-0 right-0 top-full backdrop-blur-md border-b"
          style={{
            background:
              "color-mix(in srgb, var(--surface-page) 95%, transparent)",
            borderColor: "var(--border-default)",
          }}
        >
          <Container size="lg">
            <div className="flex flex-col py-4">
              {SUB_BRAND_ROUTES.length > 0 ? (
                <NavRouteList
                  routes={SUB_BRAND_ROUTES}
                  pathname={pathname}
                  layout="vertical"
                />
              ) : null}

              {showSeparator ? (
                <MobileSeparator />
              ) : null}

              {MAIN_ROUTES.length > 0 ? (
                <NavRouteList
                  routes={MAIN_ROUTES}
                  pathname={pathname}
                  layout="vertical"
                />
              ) : null}

              {/* Always render a separator above the toggle when any
                  routes are present. Otherwise (route-less future)
                  the toggle is the only item and needs no divider. */}
              {SUB_BRAND_ROUTES.length + MAIN_ROUTES.length > 0 ? (
                <MobileSeparator />
              ) : null}

              <div className="flex pt-2 pb-1">
                <ThemeToggle />
              </div>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

// ─── Mobile-panel separator ──────────────────────────────────────
// Decorative-only horizontal rule. Sits between the sub-brand and
// main route groups, and again between the route groups and the
// theme toggle. aria-hidden because the grouping is announced by
// list structure, not by a separator semantic.
function MobileSeparator() {
  return (
    <span
      aria-hidden
      role="presentation"
      className="block h-px w-full my-2"
      style={{ background: "var(--border-default)" }}
    />
  );
}

// ─── Route list sub-component ────────────────────────────────────
// Extracted so the active-state logic + class-building stays in one
// place across both groups (sub-brand and main) and both layouts
// (horizontal desktop, vertical mobile). Each route's link gets:
//   • underline + decoration-2 when active (visible identifier)
//   • underline on hover/focus when inactive (consistent w/ footer)
//   • aria-current="page" when active (screen-reader cue)
//
// `layout="vertical"` (mobile) bumps the per-link tap area to ~44px
// (py-3 + line-height) so the target clears WCAG 2.5.8 AAA target
// size (44×44) — the AA threshold is 24×24, but on touch we should
// aim higher.

type NavRouteListLayout = "horizontal" | "vertical";

function NavRouteList({
  routes,
  pathname,
  layout,
}: {
  routes: NavRoute[];
  pathname: string;
  layout: NavRouteListLayout;
}) {
  const horizontal = layout === "horizontal";
  return (
    <ul
      className={
        horizontal
          ? "flex items-center gap-6"
          : "flex flex-col"
      }
    >
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
                // Mobile (vertical) gets a generous tap target.
                horizontal ? "" : "block py-3",
                // Active state: always underlined.
                // Inactive: underline on hover/focus only.
                active
                  ? "underline underline-offset-4 decoration-2"
                  : "no-underline hover:underline focus-visible:underline underline-offset-4 decoration-2",
              ]
                .filter(Boolean)
                .join(" ")}
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
