// ─────────────────────────────────────────────────────────────────
// InfoToast — transient information toast.
//
// For non-destructive informational cues that follow a user action
// without preventing it (e.g. /films's mode-switch toast that fires
// when watched-window xor watched-year selection clobbers the other
// dimension). The blue colorway carries the role per the design
// system's --information-* token chain — surface, text, icon, and
// border tokens all flip in dark mode automatically.
//
// Visual: tinted blue surface with a saturated blue left bar (4px),
// inline info glyph, body-color text. Reads as quiet system chrome
// rather than editorial voice.
//
// Accessibility:
//   • role="status" + aria-live="polite" so AT users hear the
//     content without it stealing focus.
//   • pointer-events: none so the toast can't intercept a tap that
//     was aimed at the UI underneath — informational, not interactive.
//
// Lifecycle:
//   • Stateless — caller owns the message state and the dismiss
//     timer. Pass `null` to hide; pass a string to show.
//   • Caller can override `bottomOffset` to lift the toast above
//     other fixed chrome (e.g. mobile drawer's "Show N films" CTA).
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

type InfoToastProps = {
  /** Message to surface. null hides the toast (returns null from render). */
  message: string | null;
  /**
   * Distance from the viewport bottom, in pixels. Default 24. Set to
   * a higher value (e.g. 96) when other fixed chrome (mobile drawer
   * sticky CTA, app footer) needs to stay clear underneath the
   * toast. Passing the value as a number keeps the call site
   * declarative — no string-template gymnastics.
   */
  bottomOffset?: number;
};

export function InfoToast({ message, bottomOffset = 24 }: InfoToastProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...wrapperStyle,
        bottom: bottomOffset,
      }}
    >
      <InfoGlyph />
      <span>{message}</span>
    </div>
  );
}

// Inline SVG so size + color are deterministic across font-stack
// variations and the icon scales with the surrounding text. The
// outer circle uses --icon-information; the inner "i" inverts to
// --surface-page so the glyph reads cleanly against the dot.
function InfoGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, color: "var(--icon-information)" }}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="var(--font-primary)"
        fontStyle="italic"
        fontWeight="600"
        fontSize="14"
        fill="var(--surface-page)"
      >
        i
      </text>
    </svg>
  );
}

const wrapperStyle: CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 60,
  maxWidth: "calc(100% - 32px)",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  paddingInlineStart: 16,
  borderRadius: "var(--border-radius-sm)",
  background: "var(--surface-information)",
  color: "var(--text-body)",
  borderLeft: "4px solid var(--information-default)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
  pointerEvents: "none",
};
