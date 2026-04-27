interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Reading-progress bar for long-form case study pages. Renders
// only the fill — no track. The Nav's bottom border serves as the
// visual rail; the fill paints over it as the user scrolls, so the
// bar reads as the Nav's border progressively coloring in.
//
// Gradient comes from --progress-gradient, defined in
// case-study.css with theme-conditional values so the range is
// always high-contrast against whichever page bg is showing.
export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="h-[1px] w-full">
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background: "var(--progress-gradient)",
        }}
      />
    </div>
  );
}
