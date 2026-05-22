// ─────────────────────────────────────────────────────────────
// ProgressBar — the visual track + fill for ScrollProgress.
//
// Two stacked elements:
//   - Wrapper: 1px tall, full width, painted with
//     `var(--progress-track)`. The track matches the Nav's bottom
//     border at the same y-coordinate so the bar reads as a
//     continuation of the Nav chrome rather than a stacked
//     separate line.
//   - Inner fill: width = scroll fraction, painted by the
//     `.progress-bar-fill` rule in scroll-progress.css. The fill
//     gradient is declared on the class (not via an intermediate
//     custom property) so its `var(--cs-accent-*)` references
//     resolve at the fill element itself — inside the
//     [data-cs-accent] themed scope — instead of at :root where
//     they'd bake in the green recruiter defaults.
//
// Track color (--progress-track) is the only token still set at
// :root; gradient cascade lives entirely on the class. Both are
// defined in scroll-progress.css (loaded by ScrollProgress.tsx).
// Bar height is 1px to match the Nav's `border-b` thickness.
// ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

export function ProgressBar({ fraction }: ProgressBarProps) {
  // Trust the contract: callers MUST pass a clamped fraction in
  // [0,1] per the JSDoc above. ScrollProgress (the only producer)
  // already clamps before set-state, so a defensive re-clamp here
  // was dead work AND fragmented the invariant — a future caller
  // passing a raw unclamped value would have been silently fixed,
  // masking the upstream bug.
  const pct = fraction * 100;
  // role="progressbar" + aria-valuenow/min/max so screen-reader
  // users perceive reading progress alongside the visual bar.
  // Without these the element is announced as a generic group and
  // the progress information is lost. aria-label is set explicitly
  // because the bar has no visible label.
  return (
    <div
      className="h-[1px] w-full"
      style={{ background: "var(--progress-track)" }}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-bar-fill h-full transition-[width] duration-100 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
