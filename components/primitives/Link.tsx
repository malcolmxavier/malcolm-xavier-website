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

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  /** Drop default underline; underline appears on hover/focus only. */
  quiet?: boolean;
};

export function Link({
  href,
  children,
  quiet = false,
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

  const sharedClasses = [
    underlineClass,
    "underline-offset-4 decoration-1",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm",
    "hover:[color:var(--text-action-hover)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const sharedStyle: React.CSSProperties = {
    color: "var(--text-action)",
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
