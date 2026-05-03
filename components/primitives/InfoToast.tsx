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
// Responsive placement (single component, two viewport-specific
// renderings):
//   • Mobile (<md): fixed-position above the viewport bottom, width
//     matched to the mobile drawer's "Show N films" sticky CTA via
//     left/right insets of 20px. The two read as a paired unit when
//     both are present.
//   • md+: inline-flex element that flows in the caller's layout —
//     typical placement is alongside the active-filter chip rail
//     above the grid, sharing the same flex-wrap row.
//   Tailwind responsive utilities (flex md:hidden / hidden
//   md:inline-flex) drive the visibility — `display: none` removes
//   the inactive variant from the accessibility tree so AT users
//   only ever announce the visible one.
//
// Accessibility:
//   • role="status" + aria-live="polite" on each variant so AT
//     users hear the content without it stealing focus.
//   • pointer-events: none on the mobile floating variant so the
//     toast can't intercept a tap aimed at the UI underneath —
//     informational, not interactive.
//
// Lifecycle:
//   • Stateless — caller owns the message state and the dismiss
//     timer. Pass `null` to hide; pass a string to show.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

type InfoToastProps = {
  /** Message to surface. null hides the toast (returns null from render). */
  message: string | null;
  /**
   * Mobile-only: distance from the viewport bottom in pixels for
   * the floating variant. Default 24. Pass a higher value (e.g. 96)
   * when other fixed chrome — the drawer's "Show N films" sticky
   * CTA, an app footer — needs to stay clear underneath. Ignored
   * on md+ where the toast flows inline.
   */
  mobileBottomOffset?: number;
};

export function InfoToast({
  message,
  mobileBottomOffset = 24,
}: InfoToastProps) {
  if (!message) return null;
  return (
    <>
      {/* Mobile (<md): fixed at the bottom, pinned to left:20 /
          right:20 so the toast width matches the drawer CTA above
          which it stacks. flex md:hidden = display:flex by default,
          display:none on md+ (so AT only sees this variant on
          mobile). */}
      <div
        role="status"
        aria-live="polite"
        className="flex md:hidden"
        style={{
          ...visualStyle,
          position: "fixed",
          left: 20,
          right: 20,
          bottom: mobileBottomOffset,
          zIndex: 60,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}
      >
        <InfoGlyph />
        <span>{message}</span>
      </div>
      {/* md+: inline-flex, flows in the parent's natural layout.
          The caller places <InfoToast> wherever it should appear
          (typically alongside the active-filter chips above the
          grid). hidden md:inline-flex = display:none by default,
          display:inline-flex on md+ (so AT only sees this variant
          on tablet/desktop). */}
      <div
        role="status"
        aria-live="polite"
        className="hidden md:inline-flex"
        style={visualStyle}
      >
        <InfoGlyph />
        <span>{message}</span>
      </div>
    </>
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

// Shared visual treatment — tinted blue surface with the saturated
// left-bar accent (Option A from the design preview). Display is
// intentionally NOT set here; each variant's wrapper class (flex
// vs inline-flex) carries it so the responsive visibility toggle
// works without inline-style precedence fighting Tailwind classes.
const visualStyle: CSSProperties = {
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
};
