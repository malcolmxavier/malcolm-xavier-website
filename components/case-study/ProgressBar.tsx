// ─────────────────────────────────────────────────────────────
// ProgressBar — the visual track + fill for ScrollProgress.
//
// Two stacked elements:
//   - Wrapper: 2px tall, full width, painted with
//     `var(--progress-track)`. Sits at the Nav's bottom-border
//     y-coordinate (the border itself is suppressed in
//     scroll-progress.css when ScrollProgress is mounted) and
//     reads as the chrome's bottom edge plus a deliberate
//     reading-progress indicator. 2px (vs. the Nav's original
//     1px border) is the visibility-vs-subtlety compromise: 1px
//     reads as pure continuation but disappears against busy
//     page content; 3px+ feels heavy.
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
      className="h-[2px] w-full"
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
