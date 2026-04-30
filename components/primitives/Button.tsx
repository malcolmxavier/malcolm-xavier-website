// ─────────────────────────────────────────────────────────────────
// Button — three visual variants:
//
//   primary   filled, used for the single dominant CTA on a page
//             (e.g. "See my resume →" on landing).
//   secondary outlined, used for adjacent actions of equal weight
//             (e.g. "Download PDF" next to "View web version").
//   ghost     text-only with hover affordance, used inside dense
//             contexts where a full button would be too loud.
//
// Sizes follow the type-scale paragraph steps so they read as
// proportional to the text around them.
//
// Accessibility:
//   - Renders <button> by default; pass `as="a"` for link buttons
//     and provide `href` (the wrapper preserves keyboard semantics).
//   - Visible focus ring uses --border-focus, which derives from the
//     active palette (grey-800 on recruiter pages, primary-700 on
//     sub-brand pages) so it's contrast-safe everywhere.
//   - Honors prefers-reduced-motion via Tailwind's motion-reduce:
//     transition modifier — micro hover transitions are skipped.
// ─────────────────────────────────────────────────────────────────

import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as an anchor when an href is needed. */
  as?: "button" | "a";
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[length:var(--p-xs-font-size)]",
  md: "px-4 py-2 text-[length:var(--p-sm-font-size)]",
  lg: "px-6 py-3 text-[length:var(--p-md-font-size)]",
};

// Variant styles emitted as Tailwind arbitrary-value utility classes
// rather than inline styles. Why the switch from inline:
//   • Tailwind compiles these to real CSS rules in the utilities
//     layer, where their var() references resolve cleanly and win
//     specificity battles against preflight reset rules.
//   • In practice, inline-style declarations like
//     `style={{ backgroundColor: "var(--text-heading)" }}` were being
//     visually overridden in production despite (a) emitting in the
//     HTML correctly and (b) having higher cascade precedence than
//     Tailwind preflight's `a { color: inherit }`. Symptom: primary
//     buttons rendering as transparent outlines instead of filled
//     pills. Switching to utility-class emission makes the resolution
//     work everywhere.
//
// Each variant returns the className fragment that goes onto the
// element. The CSS variables (--text-heading, --surface-page,
// --text-body) flip per-theme and per-subbrand exactly as they did
// under the inline-style approach.
function variantClasses(variant: ButtonVariant): string {
  switch (variant) {
    case "primary":
      // High-contrast inversion of the page surface — black-on-light,
      // white-on-dark. Dominant CTA. The visible rest + hover + focus
      // colors are pinned by literal #000/#fff !important rules in
      // app/components.css (see [data-variant="primary"] there). The
      // Tailwind classes below previously resolved through
      // var(--text-heading)/var(--surface-page) and emitted competing
      // values that axe-core read alongside the !important overrides
      // — flagging a phantom contrast violation on sub-brand surfaces
      // even though the rendered fill was correct. Collapsing to
      // literal color utilities removes the ambiguity and keeps
      // automated audits clean. components.css remains the source of
      // truth for the primary variant's actual paint.
      return [
        "bg-black",
        "text-white",
        "border border-solid border-black",
      ].join(" ");
    case "secondary":
      // Note: the actual rest + hover + focus colors for [data-variant="secondary"]
      // are hardcoded in app/components.css (with !important) to bypass a
      // var() resolution issue documented at the top of that file. The
      // Tailwind classes here keep semantic structure but are visually
      // overridden by the components.css rules.
      return [
        "bg-transparent",
        "text-[color:var(--text-body)]",
        "border border-solid border-[var(--text-heading)]",
      ].join(" ");
    case "ghost":
      return [
        "bg-transparent",
        "text-[color:var(--text-body)]",
        "border border-solid border-transparent",
      ].join(" ");
  }
}

export function Button(props: ButtonProps) {
  // Read shared visual props directly from `props` rather than
  // destructuring with a union-widening cast. The earlier pattern
  // (`props as CommonProps & Record<string, unknown>`) defeated the
  // discriminated union — after that cast, `as="a"` no longer required
  // `href` and `onClick` lost its <button>/<a> typing. Below, props
  // narrows correctly inside each branch of the `if (props.as === "a")`
  // check.
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const className = props.className ?? "";
  const { style, children } = props;

  // Shared visual + a11y classes. Focus ring is keyboard-only thanks
  // to focus-visible. motion-reduce shuts off the hover transition.
  // no-underline kills the user-agent default underline that <a> tags
  // pick up — without it, `as="a"` buttons render as underlined text.
  const sharedClasses = [
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-medium no-underline",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "hover:opacity-90",
    SIZE_CLASSES[size],
    variantClasses(variant),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const sharedStyle: React.CSSProperties = {
    // DM Sans is hardcoded rather than reading var(--font-secondary)
    // because sub-brand surfaces (e.g. data-subbrand="music") re-bind
    // --font-secondary to their own typeface (Roboto Slab on music,
    // Roboto Slab on newsletter). Reading the token meant a primary
    // CTA inside a sub-brand wrapper rendered in serif slab — visibly
    // off-voice for "Open on Spotify ↗" and similar buttons. The
    // Button is intended as a sitewide-neutral chrome element (see
    // app/components.css commentary at [data-variant="primary"]), so
    // its label needs to read in DM Sans regardless of context. The
    // fallback chain matches the :root --font-secondary definition.
    fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
    outlineColor: "var(--border-focus)",
    // Defense in depth — kill underline at the inline-style level too,
    // in case a higher-specificity stylesheet rule sneaks one in.
    textDecoration: "none",
    ...style,
  };

  if (props.as === "a") {
    // TypeScript narrows props to ButtonAsAnchor here, so the rest
    // spread carries the proper anchor-event typings to <a>. The
    // discarded keys are underscore-prefixed; the eslint config
    // ignores `^_` for unused-vars so they don't trip the linter.
    const {
      variant: _variant,
      size: _size,
      as: _as,
      className: _className,
      style: _style,
      children: _children,
      ...anchorRest
    } = props;
    return (
      <a
        className={sharedClasses}
        style={sharedStyle}
        data-variant={variant}
        {...anchorRest}
      >
        {children}
      </a>
    );
  }

  // <button> branch — props narrows to ButtonAsButton, so the rest
  // spread keeps the proper button-event typings (onClick, type, etc.).
  const {
    variant: _variant,
    size: _size,
    as: _as,
    className: _className,
    style: _style,
    children: _children,
    ...buttonRest
  } = props;
  return (
    <button
      className={sharedClasses}
      style={sharedStyle}
      data-variant={variant}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
