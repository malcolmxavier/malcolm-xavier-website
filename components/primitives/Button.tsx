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

// Variant styles are applied as inline styles (not Tailwind classes)
// because they reference CSS custom properties that flip per-theme
// and per-subbrand. Inline style keeps the resolution dynamic.
function variantStyles(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      // High-contrast inversion of the page surface — black-on-light,
      // white-on-dark. This gives a dominant CTA without depending on
      // --surface-action, which on grey-default pages resolves to a
      // near-invisible grey-500. The text-heading / surface-page pair
      // flips automatically per theme via the mapped tokens.
      return {
        background: "var(--text-heading)",
        color: "var(--surface-page)",
        border: "1px solid var(--text-heading)",
      };
    case "secondary":
      return {
        background: "transparent",
        color: "var(--text-body)",
        border: "1px solid var(--text-heading)",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--text-body)",
        border: "1px solid transparent",
      };
  }
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    as = "button",
    className = "",
    style,
    children,
    ...rest
  } = props as CommonProps & {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  } & Record<string, unknown>;

  // Shared visual + a11y classes. Focus ring is keyboard-only thanks
  // to focus-visible. motion-reduce shuts off the hover transition.
  const sharedClasses = [
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-medium",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "hover:opacity-90",
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const sharedStyle: React.CSSProperties = {
    fontFamily: "var(--font-secondary)",
    outlineColor: "var(--border-focus)",
    ...variantStyles(variant),
    ...style,
  };

  if (as === "a") {
    return (
      <a className={sharedClasses} style={sharedStyle} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button className={sharedClasses} style={sharedStyle} {...rest}>
      {children}
    </button>
  );
}
