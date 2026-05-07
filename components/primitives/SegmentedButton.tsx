// ─────────────────────────────────────────────────────────────────
// SegmentedButton primitive — one segment in a horizontally-grouped
// segmented control. Used inside the TV cluster's filter rail
// (TelevisionShell's All/Shows/Seasons scope toggle) and the
// SummaryPanel's chart-mode toggle (Seasons/Shows/Episodes). The
// two surfaces look identical by design — sibling controls in the
// same cluster — so they share this single primitive rather than
// each carrying their own copy.
//
// Active state: `aria-pressed` on the button + a sub-brand fill
// (var(--text-action) on var(--surface-page)). The parent supplies
// the surrounding `role="group"` and label; this component is one
// segment, not the whole control.
//
// Focus styling: outline-color, outline-width, and outline-offset
// all live in the className via Tailwind arbitrary values, so
// there's no inline/utility specificity collision. Inline styles
// only handle the layout + active-fill properties that need to
// change with the `active` prop.
//
// Width: flex: 1 makes each segment fill its share of the parent's
// inline space, assuming the parent is a flex row with a fixed
// gap (the existing call sites use display: flex; gap: 4).
// ─────────────────────────────────────────────────────────────────

"use client";

import type { ReactNode } from "react";

type SegmentedButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function SegmentedButton({
  active,
  onClick,
  children,
}: SegmentedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "6px 8px",
        border: "none",
        borderRadius: "var(--border-radius-sm)",
        cursor: "pointer",
        background: active ? "var(--text-action)" : "transparent",
        color: active ? "var(--surface-page)" : "var(--text-body)",
      }}
      className="hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--border-focus)]"
    >
      {children}
    </button>
  );
}
