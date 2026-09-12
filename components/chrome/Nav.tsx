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
//   • Order (left → right): sub-brand routes, separator, main
//     routes, separator, the Booth chip. Concretely today:
//     Films, Television, Music | About ... Contact | The Booth.
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
//   • xl and up (≥1280px): horizontal nav row — wordmark | routes |
//     toggle.
//   • Below xl: wordmark | hamburger trigger. Hamburger opens a
//     dropdown panel below the nav containing the same routes
//     (vertical) and theme toggle. Same content, same separators,
//     same a11y story — just stacked.
//
// WHY xl AND NOT md. The row used to start at md (768px) and did not
// fit there, and nothing said so, because the failure was silent
// rather than broken-looking. Measured across 768–1280px, the two
// two-word labels — "Case studies" and "The Booth" — were being
// squeezed below their max-content width and wrapping inside their
// own anchors ("Case / studies"), which pushed the header from 68px
// to 80px tall and left the route group flush against the wordmark.
// Every one-word label was untouched, because only a two-word label
// can break. `whitespace-nowrap` below is what stops that: a label
// that will not fit now overflows visibly instead of quietly
// restyling itself.
//
// With nothing left to squeeze, the row's real width is measurable,
// and it is 900px plus a 106px wordmark plus the container's 128px of
// padding — 1134px before any gap between the wordmark and the first
// link. So md is short by nearly 400px and even lg (1024px) is short
// by 110. xl (1280px) is the first step on the scale that clears it,
// with 146px to spare, so this needs no bespoke number of its own —
// see the breakpoint block in globals.css, where the scale is
// declared.
//
// It should come back down. The culture section is moving to its own
// site, and Films, Television, and Music are ~225px of the 900 — once
// they leave, the row fits at md again. Worth re-measuring then.
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
  { label: "Films", href: "/films", subbrand: "film" },
  { label: "Television", href: "/television", subbrand: "tv" },
  { label: "Music", href: "/music", subbrand: "music" },
];

// Main brand routes — recruiter-facing pages (default grey alias).
// Order: About (who) → Resume (what) → Case studies (proof) →
// Consulting (offer) → Contact (action). The funnel reads as
// introduce → claim → evidence → offer → next step; Consulting sits
// after the evidence because the case studies are what qualify the
// offer, and immediately before Contact because booking a call is
// the action the consulting page asks for.
const MAIN_ROUTES: NavRoute[] = [
  { label: "About", href: "/about" },
  { label: "Resume", href: "/resume" },
  { label: "Case studies", href: "/case-studies" },
  { label: "Consulting", href: "/consulting" },
  { label: "Contact", href: "/contact" },
];

// ─── The Booth ───────────────────────────────────────────────────
// The Booth used to sit inside the main run, between Case studies
// and Consulting, on the reasoning that it is the strongest single
// piece of proof on the site and proof belongs before the offer.
// That reasoning held while it read as a portfolio page. It is now a
// product page for a working tool somebody can ask for access to,
// and a product is not a station on a funnel about Malcolm — so it
// comes out of the run entirely and sits on the far right behind its
// own divider, which is where a product site puts the way into the
// product itself.
//
// Far right rather than far left is also what survives the culture
// section moving to its own site. When Films, Television, and Music
// leave, the bar reads [professional] | [Booth]: one divider, still
// correct. A Booth group on the left would be left sitting exactly
// where the sub-brand cluster used to be, and would inherit the
// reading that it is one.
const BOOTH_ROUTE: NavRoute = { label: "The Booth", href: "/booth" };

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
      className="sticky top-0 z-40 border-b"
      style={{
        // Fully opaque surface (no backdrop-blur): the translucent
        // treatment let page content show through behind the bar, which
        // read as visual noise — worst on the reviews pages, where the
        // card grid scrolled blurrily behind the nav above the sticky
        // filter header. Token resolves to white in light, black in dark.
        background: "var(--surface-page)",
        borderColor: "var(--border-default)",
      }}
    >
      <Container>
        <nav
          aria-label="Primary"
          className="flex items-center justify-between py-4"
        >
          {/* Wordmark: links home, doubles as logo. Active when
              we're on the landing page itself. */}
          <NextLink
            href="/"
            className={[
              "rounded-sm whitespace-nowrap",
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

          {/* Desktop layout. Horizontal route lists + toggle. Hidden
              below the measured threshold, where the hamburger takes
              over — see the note at the top of this file. */}
          <div className="hidden xl:flex items-center gap-5">
            {SUB_BRAND_ROUTES.length > 0 ? (
              <NavRouteList
                routes={SUB_BRAND_ROUTES}
                pathname={pathname}
                layout="horizontal"
              />
            ) : null}

            {showSeparator ? <NavDivider /> : null}

            {MAIN_ROUTES.length > 0 ? (
              <NavRouteList
                routes={MAIN_ROUTES}
                pathname={pathname}
                layout="horizontal"
              />
            ) : null}

            <NavDivider />
            <BoothChip pathname={pathname} layout="horizontal" />

            {/* Extra room before the toggle. The toggle is the same
                height, the same radius, and the same 1px interactive
                border as the chip, so at the row's own gap the two
                read as a pair of buttons and the chip stops being
                the one different thing on the bar. */}
            <span className="ml-2 flex">
              <ThemeToggle />
            </span>
          </div>

          {/* Stacked layout — below the threshold only. Hamburger
              trigger that opens
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
              "xl:hidden",
              "inline-flex h-10 w-10 items-center justify-center",
              "rounded-md border",
              "transition-colors motion-reduce:transition-none",
              "hover:opacity-80",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
            ].join(" ")}
            style={{
              // --border-interactive instead of --border-default —
              // 3:1+ in both themes; --border-default failed SC 1.4.11
              // on UI components. Closes h-border-default-1411-fail
              // from the 2026-04-29 /full-review.
              borderColor: "var(--border-interactive)",
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
          for visual continuity. Hidden at the same threshold as the
          trigger so it never appears on desktop layouts even if
          menuOpen somehow flips true (it can't, since the trigger is
          hidden there, but defense in depth never hurt anyone). */}
      {menuOpen ? (
        <div
          ref={panelRef}
          id={MOBILE_MENU_ID}
          className="xl:hidden absolute left-0 right-0 top-full backdrop-blur-md border-b"
          style={{
            background:
              "color-mix(in srgb, var(--surface-page) 95%, transparent)",
            borderColor: "var(--border-default)",
          }}
        >
          <Container>
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

              {/* Same three groups in the same order as the row
                  above, so the stacked menu is the horizontal bar
                  turned on its side rather than a second idea about
                  what the sections are. */}
              <MobileSeparator />
              <div className="flex py-2">
                <BoothChip pathname={pathname} layout="vertical" />
              </div>

              <MobileSeparator />

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

// ─── Row divider ─────────────────────────────────────────────────
// The 1px rule between one group of nav items and the next. A CSS
// rule rather than a Unicode pipe glyph: the glyph would surface in
// reader-mode and CSS-disabled contexts and never matched the weight
// or leading of the adjacent 12px Roboto Mono labels. aria-hidden
// because it is purely decorative — the separation reads from
// spacing and grouping for assistive tech.
//
// Painted in --border-separator rather than --border-default. Those
// are the same idea at two weights, and the difference matters here:
// a card edge is a long line that reads fine at low contrast, while
// this is a 1px tick 16px tall and vanishes at the same value. Light
// mode's --border-default sits at roughly 1.3:1 against white, so the
// rule that sets the Booth apart from the professional routes was
// only ever visible in dark mode. --border-separator is calibrated to
// match what the dark divider already looks like — about 2.4:1 on
// white against 2.7:1 on black — and stays a stop quieter than
// --border-interactive, which outlines the chip and the theme toggle
// sitting right beside it.
function NavDivider() {
  return (
    <span
      aria-hidden
      role="presentation"
      className="block h-4 w-px shrink-0"
      style={{ background: "var(--border-separator)" }}
    />
  );
}

// ─── The Booth chip ──────────────────────────────────────────────
// The one nav item that is a way into a product rather than a page
// about Malcolm, so it is the one that does not look like the
// others.
//
// Outlined rather than filled, deliberately. A filled button here
// would be the loudest thing on every page of the site, and it would
// compete with the page it links to, whose own primary action is
// "Request access" — two solid buttons two clicks apart, the second
// one the one that matters. Outlined still reads as chrome you enter
// something through rather than as a tenth link, which is the whole
// job.
//
// Nothing here paints a fill, in either state. The active state used
// to, and it was wrong in a way only the render showed: on the Booth's
// own pages, in dark, --surface-muted resolves to grey-800 and the
// chip became a solid slab sitting on a black bar — the heaviest thing
// in the chrome, on the one page where the control does nothing
// because it is already the page you are on.
//
// No `data-subbrand`. The colored treatment in components.css marks
// the culture verticals, and borrowing it here would say the Booth is
// another one of those.
//
// It has no arrow either. An arrow is this site's mark for a
// CTA-styled link, and a nav item is not a CTA — if it earned one
// here, every item in the bar would have earned one. The arrow was
// doing a second job, though: telling this apart at a glance from the
// theme toggle beside it, which is the same height, the same radius,
// the same border, and the same mono uppercase. Without it they twin.
//
// THREE THINGS SEPARATE THEM NOW, and none of them is a shape.
//
//   the face — --font-booth (Anonymous Pro), the only place in the
//     site's chrome that is not Roboto Mono. A slab-terminalled mono
//     against a bar of grotesque mono: the difference is quiet at 12px
//     and it is the difference between a product and a page.
//
//   the colour — --booth-accent, the site's own secondary green. Not a
//     new hue, because the Booth is an extension of this site's chrome
//     until it is spun off, and a colour nobody has seen before would
//     announce a separation that has not happened. The toggle beside
//     it stays grey; only one of the two is a destination.
//
//   the cast — the active state, a hard offset shadow with no blur,
//     down and to the left. This is the sign-painter's device, which
//     is the room the Booth's name comes from. It is cast left because
//     that is the side the eye arrives from: the shadow reads as the
//     chip's leading edge and pulls the reader through it left to
//     right, rather than trailing off the far side after the word is
//     already read. It also falls into the gap the divider holds open,
//     instead of into the 8px before the theme toggle.
//
// The underline every other route uses is not applied here. On a
// bordered chip at 12px it reads as a rule crammed inside a box rather
// than as "you are here", which is what the cast replaces.
function BoothChip({
  pathname,
  layout,
}: {
  pathname: string;
  layout: NavRouteListLayout;
}) {
  const active = isActiveRoute(BOOTH_ROUTE.href, pathname);
  const horizontal = layout === "horizontal";
  return (
    <NextLink
      href={BOOTH_ROUTE.href}
      className={[
        "inline-flex items-center justify-center whitespace-nowrap",
        "rounded-md border no-underline",
        "transition-colors motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        // Colour lives in classes rather than in the style prop below
        // because it has a hover state, and an inline style wins over
        // a stylesheet rule whatever its specificity — so a hover
        // declared in a class could never take effect against one.
        // The accent clears 7.3:1 on white and 15.4:1 on black, so it
        // satisfies both the 4.5:1 this owes as small text and the
        // 3:1 the border owes as a component boundary under SC 1.4.11.
        "[border-color:var(--booth-accent)]",
        "[color:var(--booth-accent)]",
        "hover:[border-color:var(--booth-accent-hover)]",
        "hover:[color:var(--booth-accent-hover)]",
        // Horizontal clears the 24x24 AA target size at 30px tall.
        // Vertical is a touch target, so it takes the 44px AAA size
        // the stacked route links already take.
        horizontal ? "px-3 py-1.5" : "min-h-11 px-4 py-2",
      ].join(" ")}
      style={{
        fontFamily: "var(--font-booth)",
        fontSize: "var(--p-xs-font-size)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        // Active takes the cast and an opaque ground under it, so the
        // shadow reads as a solid block behind the chip rather than as
        // a second border showing through a transparent one. At rest
        // there is no shadow, so there is nothing to hide and the bar
        // shows through.
        background: active ? "var(--surface-page)" : "transparent",
        boxShadow: active ? "-2px 2px 0 var(--booth-accent)" : undefined,
        outlineColor: "var(--border-focus)",
      }}
      aria-current={active ? "page" : undefined}
    >
      {BOOTH_ROUTE.label}
    </NextLink>
  );
}

// ─── Mobile-panel separator ──────────────────────────────────────
// Decorative-only horizontal rule. Sits between the sub-brand and
// main route groups, and again between the route groups and the
// theme toggle. aria-hidden because the grouping is announced by
// list structure, not by a separator semantic.
//
// Same token as the desktop divider above, for the same reason.
function MobileSeparator() {
  return (
    <span
      aria-hidden
      role="presentation"
      className="block h-px w-full my-2"
      style={{ background: "var(--border-separator)" }}
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
          // gap-5 (20px) rather than gap-6 inside a group, with the
          // gap-6 kept between groups on the row itself. The looser
          // gap was doing two jobs at once — separating one link from
          // the next and separating one group from the next — so the
          // grouping had to be read off the divider alone. Tightening
          // it inside the group makes the grouping visible and buys
          // back ~30px of the width the row was short.
          ? "flex items-center gap-5"
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
                // A route label is one thing and must read as one
                // line. Without this the flex row squeezes the
                // two-word labels below their natural width and they
                // break mid-label, silently, which is worse than an
                // overflow because nothing about it looks broken.
                "whitespace-nowrap",
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
