// ─────────────────────────────────────────────────────────────────
// Icons — inline SVG icon set used in chrome and resume contact
// strips. No icon-library dependency; each component is a pure
// SVG that picks up the surrounding text color via currentColor.
//
// Sizing:  default 16×16. Override via the size prop (1em is also
//          common — pass `style={{ width: '1em', height: '1em' }}`).
// Color:   currentColor — matches the text color of the parent element.
// A11y:    decorative by default (aria-hidden). When the icon is the
//          only content in an interactive element, set role="img" +
//          aria-label on the parent or wrap with a visible label.
//
// Brand glyphs (LinkedIn, GitHub) use the official simplified marks.
// Generic icons (phone, email, location) are Heroicons (MIT-licensed).
// ─────────────────────────────────────────────────────────────────

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  /** Size in CSS pixels. Defaults to 16. */
  size?: number;
};

// Shared defaults — the per-icon component spreads {...props} last
// so callers can override anything.
function strokeIconProps(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
  };
}

function fillIconProps(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    focusable: false,
  };
}

// ─── Generic icons (Heroicons outline) ─────────────────────────────

export function IconPhone({ size = 16, ...props }: IconProps) {
  // Heroicons outline handset — single-path closed silhouette of a
  // curved phone receiver. Matches the line style used by the rest
  // of the icon set (round caps + joins via strokeIconProps), so
  // the contact strip reads as one family. Reads cleanly at 16px
  // (the resume contact-strip size) where the previous retro-brick
  // version's internal keypad lines and LCD inset collapsed into
  // sub-pixel noise. Picked from a four-round design comparison
  // documented in the building-this-site case study (see the
  // Workflow beat's "blind spot" card).
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

export function IconEmail({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

export function IconLocation({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

// ─── Brand glyphs ──────────────────────────────────────────────────

export function IconLinkedIn({ size = 16, ...props }: IconProps) {
  return (
    <svg {...fillIconProps(size)} {...props}>
      {/* Official LinkedIn brand glyph, simplified one-color mark */}
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

export function IconGitHub({ size = 16, ...props }: IconProps) {
  return (
    <svg {...fillIconProps(size)} {...props}>
      {/* Official GitHub Octocat glyph, simplified one-color mark */}
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ─── Mobile menu glyphs ────────────────────────────────────────────
// Hamburger + close (X) used by the Nav's mobile disclosure trigger.
// Both are decorative (aria-hidden) — the parent <button> carries
// the accessible label via aria-label, since the meaning of the
// glyph depends on the open/closed state and is announced dynamically.

export function IconMenu({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function IconClose({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

// ─── Bonus: download arrow used by the resume CTA ──────────────────
export function IconDownload({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ─── Cluster-rail glyphs (Heroicons outline) ──────────────────────
// Small leading icons for the cluster sub-nav tabs, so the pills read
// as navigation at a glance and the labels can carry less weight.
// Overview = home (the cluster landing), Reviews = star (rated work),
// The Stats = bar chart (stats), Connected = link (cross-brand).
// Decorative — the tab's own text is the accessible label.

export function IconHome({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

export function IconStar({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

export function IconChartBar({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

export function IconLink({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

// ─── Theme-toggle glyphs ───────────────────────────────────────────
// Replace the prior Unicode trio (◐ ☀ ☾) which came from three
// different blocks and rendered with mismatched stroke weights at
// 12px, especially on Windows. Inline SVGs render identically across
// platforms and inherit the surrounding color via currentColor.
// Closes l-theme-toggle-glyphs from the 2026-04-29 /full-review.

export function IconSun({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}

export function IconMoon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function IconMonitor({ size = 16, ...props }: IconProps) {
  // System / auto — half-filled circle hints at "follows whatever
  // the OS prefers" without invoking a screen icon (which would
  // collide with display-related glyphs in the rest of the system).
  return (
    <svg {...strokeIconProps(size)} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
