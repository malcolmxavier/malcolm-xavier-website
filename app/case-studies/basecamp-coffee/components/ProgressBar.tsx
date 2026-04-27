interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Sticky reading-progress bar for long-form case study pages.
//
// Design:
//   - Track is a 2px line in --border-default so it's barely
//     perceptible as background structure.
//   - Fill is a recruiter-green gradient (green-300 → green-500),
//     two bright values that read crisply against both light and
//     dark backgrounds without either end dissolving into the bg.
//   - No box-shadow halo: an earlier version added a soft glow
//     that made the leading edge look blurry/frosted, especially
//     where it overlapped the frosted Nav above.
export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className="h-[2px] w-full"
      style={{ background: "var(--border-default)" }}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(90deg, var(--success-300) 0%, var(--success-default) 100%)",
        }}
      />
    </div>
  );
}
