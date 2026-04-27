interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Sticky reading-progress bar for long-form case study pages.
//
// Design:
//   - Track is a 2px line in --border-default so it's barely
//     perceptible as background structure.
//   - Fill is a recruiter-green gradient (success-default →
//     success-700) with a soft glow underneath, echoing the
//     gradient style of the original Basecamp Coffee project's
//     scroll bar (which ran gold → matcha) but pulled into
//     malxavi's recruiter palette.
//   - Active TOC item also lights up in green; using the same
//     hue on both progress bar and TOC keeps the page reading
//     as a single system.
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
            "linear-gradient(90deg, var(--success-default) 0%, var(--success-700) 100%)",
          // Soft directional glow that follows the leading edge —
          // mostly invisible in light mode (against bright bg) and
          // gives a faint neon halo in dark mode.
          boxShadow: "0 0 10px 0 var(--success-default)",
        }}
      />
    </div>
  );
}
