// ─────────────────────────────────────────────────────────────────
// Link — the canonical link primitive for body and inline contexts.
//
// Three behaviors based on `href`:
//   1. Internal route (starts with "/")        → next/link with prefetch
//   2. Hash anchor or "mailto:" / "tel:"       → plain <a>, same-tab
//   3. External URL (http://, https://)        → plain <a> with
//                                                 rel="noopener noreferrer"
//                                                 and target="_blank"
//
// Visual: underline with offset for legibility; underline-thickness
// set to 1px so it doesn't dominate at body sizes; on hover, the
// color subtly darkens (or lightens in dark mode) via --text-action-hover.
//
// `quiet` variant drops the underline-by-default in favor of an
// underline-on-hover treatment — used for the "Creative CV" inline
// link in the About teaser, where the design rule is "discoverable
// but not spotlit".
// ─────────────────────────────────────────────────────────────────

import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Optional color override drawn from the design-system color
 * ramps. Useful when a specific link wants to carry a third-
 * party brand color (e.g. People → yellow, Muck Rack → blue) or
 * a sub-brand accent in a context where the default green isn't
 * what's wanted. Maps to `.link-accent-{accent}` rules in
 * app/components.css.
 */
export type LinkAccent =
  | "yellow"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "pink";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  /** Drop default underline; underline appears on hover/focus only. */
  quiet?: boolean;
  /** Override the default link color with a specific palette ramp. */
  accent?: LinkAccent;
};

export function Link({
  href,
  children,
  quiet = false,
  accent,
  className = "",
  style,
  ...rest
}: LinkProps) {
  // Decide which link semantics apply based on the href shape.
  const isInternal = href.startsWith("/") && !href.startsWith("//");
  const isHashOrProtocol =
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");
  const isExternal = !isInternal && !isHashOrProtocol;

  // Underline behavior: quiet → on hover/focus only; loud → always on.
  const underlineClass = quiet
    ? "no-underline hover:underline focus-visible:underline"
    : "underline";

  // Underline thickness: loud links get 2px so they read as clearly
  // tappable inside body copy (the previous 1px was disappearing on
  // recruiter pages where --text-action sits visually close to body
  // text). Quiet links keep 1px — they're meant to be subordinate in
  // chrome / footer / "elsewhere" lists.
  const decorationClass = quiet ? "decoration-1" : "decoration-2";

  // Hover behavior: both quiet and loud links shift to
  // var(--text-action-hover) on hover. Loud's color comes from the
  // .link-loud / [data-subbrand] a rules in components.css with
  // !important, so loud's hover override sits there too — see
  // `a.link-loud:hover` in components.css. The earlier opacity-70
  // workaround dated from when --text-action-hover resolved to a
  // lighter grey on recruiter pages and read as "becoming disabled";
  // post the AA-safe action-chain fix it resolves to a darker stop
  // (foundation-black on light recruiter, primary-600 on sub-brand),
  // so the color-shift hover is the right affordance.
  const hoverClass = quiet ? "hover:[color:var(--text-action-hover)]" : "";

  const sharedClasses = [
    underlineClass,
    `underline-offset-4 ${decorationClass}`,
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm",
    hoverClass,
    // Loud links carry a class used by app/components.css to set
    // their color: newsletter green by default, swapping to the
    // sub-brand primary inside any [data-subbrand] context (so
    // Music's links read purple, Film's would read orange, etc.).
    // Class-based so the cascade works without inline-style
    // overrides — see components.css for the rules.
    quiet ? "" : "link-loud",
    // Optional per-link accent color override (yellow / blue /
    // red / etc.) — wins over the default loud color. See
    // app/components.css for the rules.
    accent ? `link-accent-${accent}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Color: quiet links keep --text-action (subordinate by design,
  // used in chrome / footer / "elsewhere" contexts). Loud links
  // omit the inline color and let the .link-loud rule in
  // components.css take over — see comment above.
  const sharedStyle: React.CSSProperties = {
    ...(quiet ? { color: "var(--text-action)" } : null),
    outlineColor: "var(--border-focus)",
    textDecorationColor: "currentColor",
    ...style,
  };

  if (isExternal) {
    // External link: open in new tab, scrub referrer for privacy.
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClasses}
        style={sharedStyle}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (isHashOrProtocol) {
    // mailto:, tel:, or in-page anchor — same-tab plain anchor.
    return (
      <a href={href} className={sharedClasses} style={sharedStyle} {...rest}>
        {children}
      </a>
    );
  }

  // Internal route — next/link gets prefetching + client-side nav.
  return (
    <NextLink
      href={href}
      className={sharedClasses}
      style={sharedStyle}
      {...rest}
    >
      {children}
    </NextLink>
  );
}
