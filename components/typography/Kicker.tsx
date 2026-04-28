// ─────────────────────────────────────────────────────────────────
// Kicker — the small uppercase mono label that sits above a Display
// or Headline. The "computer is talking" voice (status lines,
// section eyebrows, dateline-style metadata).
//
// Always Roboto Mono regardless of cluster — it's the sitewide
// constant per the type system spec. Tracks wide, uppercases content,
// uses --text-caption for muted weight.
//
// Default tag is <p>. Pass `as="h2"` (or h3/h4) when the kicker is
// also acting as the section heading — e.g. on the resume, where
// "01 · Work experience" is the sole label for the Work-experience
// section and the document outline expects an h2 there to bridge
// from the page h1 to the role-level h3s. Visual treatment is
// identical regardless of tag.
//
// Pass `as="a"` (with `href`) for kicker-shaped scroll-target /
// in-page anchors — used for the landing page's "Or, explore the
// rest ↓" affordance. The anchor branch adds hover/focus styling
// (color shift to --text-action-hover, focus ring) so the element
// reads as interactive; non-anchor kickers stay inert.
// ─────────────────────────────────────────────────────────────────

import type { AnchorHTMLAttributes, HTMLAttributes } from "react";

type KickerHeadingTag = "p" | "h2" | "h3" | "h4";

// Discriminated union: anchor branch enforces href; heading branch
// keeps the standard HTMLAttributes typings. Without this split,
// `as="a"` would lose `href` typing and onClick handlers wouldn't
// be anchor-typed.
type KickerHeadingProps = HTMLAttributes<HTMLElement> & {
  accent?: boolean;
  as?: KickerHeadingTag;
};

type KickerAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  accent?: boolean;
  as: "a";
  href: string;
};

type KickerProps = KickerHeadingProps | KickerAnchorProps;

export function Kicker(props: KickerProps) {
  const accent = props.accent ?? false;
  const className = props.className ?? "";
  const style = props.style;
  const children = props.children;

  const sharedStyle: React.CSSProperties = {
    // Mono is sitewide-constant — bypass --font-primary so this
    // role stays consistent on both recruiter and sub-brand pages.
    fontFamily: "var(--font-mono)",
    fontSize: "var(--p-xs-font-size)",
    lineHeight: "var(--p-xs-line-height)",
    textTransform: "uppercase",
    // Wider tracking reads as "label" rather than running text.
    letterSpacing: "0.08em",
    color: accent ? "var(--text-action)" : "var(--text-caption)",
    // Headings carry default browser margins; reset so the
    // typographic rhythm matches the <p> baseline.
    margin: 0,
    fontWeight: "inherit",
    ...style,
  };

  if (props.as === "a") {
    // Anchor branch: add hover/focus interactivity. Non-anchor
    // kickers stay inert — adding these classes unconditionally
    // would make every kicker color-shift on cursor hover.
    const {
      accent: _accent,
      as: _as,
      className: _className,
      style: _style,
      children: _children,
      ...anchorRest
    } = props;
    void _accent; void _as; void _className; void _style; void _children;
    return (
      <a
        className={[
          "rounded-sm transition-colors motion-reduce:transition-none",
          "hover:[color:var(--text-action-hover)]",
          "focus-visible:outline-2 focus-visible:outline-offset-4",
          "no-underline",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...sharedStyle,
          outlineColor: "var(--border-focus)",
          textDecoration: "none",
        }}
        {...anchorRest}
      >
        {children}
      </a>
    );
  }

  const Tag = props.as ?? "p";
  const {
    accent: _accent,
    as: _as,
    className: _className,
    style: _style,
    children: _children,
    ...rest
  } = props;
  void _accent; void _as; void _className; void _style; void _children;
  return (
    <Tag className={className} style={sharedStyle} {...rest}>
      {children}
    </Tag>
  );
}
