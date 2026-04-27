interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Sticky reading-progress bar for long-form case study pages.
// Uses recruiter-cluster surface + heading tokens so it adapts
// automatically when the visitor toggles light/dark mode.
export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className="h-[3px] w-full"
      style={{ background: "var(--border-default)" }}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%`, background: "var(--text-heading)" }}
      />
    </div>
  );
}
