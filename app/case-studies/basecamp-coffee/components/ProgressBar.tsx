interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
