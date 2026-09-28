// ─────────────────────────────────────────────────────────────────
// Divider — a short decorative rule between passages in a reading
// column.
//
// The MS-in-Law essay inlined this markup directly to set its closing
// job CTA off from the argument. The data primer wants the same break
// in several places, so it becomes a component rather than a string
// copied a fifth time.
//
// Deliberately NOT BeatSeparator (components/case-study/primitives):
// that rule spans the full article column and marks the boundary
// between two case-study Beats, which are structural sections. This is
// a short centred-left stub that marks a pause inside one section —
// a different job at a different weight.
//
// aria-hidden because it carries no meaning a screen reader needs: the
// heading structure already conveys where sections begin and end, and
// an announced separator here would be noise. Semantic <hr> is kept
// anyway so the visual break survives with CSS off.
// ─────────────────────────────────────────────────────────────────

export function Divider() {
  return (
    <hr
      className="w-16 h-px border-0"
      style={{ background: "var(--border-default)" }}
      aria-hidden
    />
  );
}
