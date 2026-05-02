// ─────────────────────────────────────────────────────────────────
// Pagination primitive — shared across /music and /films.
//
// Two modes:
//   • Callback (`onPageChange`): renders <button> elements. Use when
//     pagination is part of a larger client-side state machine that
//     does more than navigate (e.g. /music updates URL via
//     router.replace AND announces the page change AND scrolls the
//     grid into view, so a Link wouldn't carry the side effects).
//   • Href (`hrefForPage`): renders <Link> elements. Use when
//     pagination is just URL state and you want next/link's
//     prefetching. /films will use this once it lands.
//
// The active page renders as a non-interactive <span aria-current=
// "page"> so it stays out of the tab order. Visible window is
// `currentPage ± windowSize`, clamped to [1, totalPages]. No
// ellipsis / first-last anchors yet — fine for /music (3-13 pages)
// and acceptable for /films at MVP. If pagination depth becomes
// painful later, add ellipsis here rather than per-consumer.
//
// Pages are 1-indexed throughout the public API. Consumers that
// store 0-indexed state internally (e.g. MusicShell) adapt at the
// boundary.
// ─────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

// Discriminated union: exactly one of onPageChange / hrefForPage
// must be provided. TypeScript enforces this at call sites.
type CallbackMode = {
  onPageChange: (page: number) => void;
  hrefForPage?: never;
  scroll?: never;
  replace?: never;
};

type HrefMode = {
  hrefForPage: (page: number) => string;
  /** Forwarded to <Link>. Default: false (page changes shouldn't jump scroll). */
  scroll?: boolean;
  /** Forwarded to <Link>. Default: false (use push by default). */
  replace?: boolean;
  onPageChange?: never;
};

export type PaginationProps = {
  /** 1-indexed: page 1 is the first page. */
  currentPage: number;
  totalPages: number;
  /** Pages shown on either side of currentPage. Default: 2. */
  windowSize?: number;
  /** Outer <nav> aria-label. Default: "Pagination". */
  ariaLabel?: string;
  /** Outer <nav> className. */
  className?: string;
} & (CallbackMode | HrefMode);

/** windowSize pages on either side of current, clamped to [1, totalPages]. */
function pageWindow(
  current: number,
  totalPages: number,
  windowSize: number,
): number[] {
  const out: number[] = [];
  for (let i = current - windowSize; i <= current + windowSize; i++) {
    if (i >= 1 && i <= totalPages) out.push(i);
  }
  return out;
}

export function Pagination({
  currentPage,
  totalPages,
  windowSize = 2,
  ariaLabel = "Pagination",
  className,
  ...mode
}: PaginationProps) {
  // Single-page (or empty) sets don't need pagination chrome.
  if (totalPages <= 1) return null;

  const visible = pageWindow(currentPage, totalPages, windowSize);
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;
  const modeProps = mode as CallbackMode | HrefMode;

  return (
    <nav aria-label={ariaLabel} className={className}>
      {/* role="list" because Safari iOS strips the implicit role
          when list-style: none is applied. */}
      <ol
        role="list"
        className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        <li>
          <NavButton
            label="← Prev"
            ariaLabel="Previous page"
            disabled={atStart}
            target={currentPage - 1}
            mode={modeProps}
          />
        </li>

        {visible.map((n) => (
          <li key={n}>
            <PageItem page={n} isCurrent={n === currentPage} mode={modeProps} />
          </li>
        ))}

        <li>
          <NavButton
            label="Next →"
            ariaLabel="Next page"
            disabled={atEnd}
            target={currentPage + 1}
            mode={modeProps}
          />
        </li>
      </ol>
    </nav>
  );
}

// ─── Internals ────────────────────────────────────────────────────

type ModeProps = CallbackMode | HrefMode;

const isCallback = (m: ModeProps): m is CallbackMode =>
  typeof (m as CallbackMode).onPageChange === "function";

/** Prev/Next button. Always renders as <button> (links can't be disabled). */
function NavButton({
  label,
  ariaLabel,
  disabled,
  target,
  mode,
}: {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  target: number;
  mode: ModeProps;
}) {
  const style: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--p-xs-font-size)",
    lineHeight: "var(--p-xs-line-height)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    // Use the action token chain so [data-theme="dark"][data-subbrand]
    // cascade applies. Bypassing to --primary-default rendered as
    // primary-500 on black = 2.7:1 in dark+music, failing SC 1.4.3
    // (caught by axe in the 2026-04-28 follow-up).
    color: disabled ? "var(--text-disabled)" : "var(--text-action)",
    background: "none",
    border: "none",
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    outlineColor: "var(--border-focus)",
  };
  const className =
    "pagination-action transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4";

  // Disabled or callback mode → <button>. Href mode (and not disabled)
  // → <Link>. Disabled never reaches a Link because Link can't carry
  // a disabled state semantically.
  if (disabled || isCallback(mode)) {
    return (
      <button
        type="button"
        onClick={
          disabled || !isCallback(mode) ? undefined : () => mode.onPageChange(target)
        }
        disabled={disabled}
        aria-label={ariaLabel}
        style={style}
        className={className}
      >
        {label}
      </button>
    );
  }
  return (
    <Link
      href={mode.hrefForPage(target)}
      aria-label={ariaLabel}
      style={style}
      className={className}
      scroll={mode.scroll ?? false}
      replace={mode.replace ?? false}
    >
      {label}
    </Link>
  );
}

/** A single page-number entry. Active = non-interactive span; otherwise button or link. */
function PageItem({
  page,
  isCurrent,
  mode,
}: {
  page: number;
  isCurrent: boolean;
  mode: ModeProps;
}) {
  // Both the active <span> and the inactive <button>/<Link> share
  // shape/weight so the row reads as one cohesive group.
  const sharedStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--p-xs-font-size)",
    lineHeight: "var(--p-xs-line-height)",
    letterSpacing: "0.08em",
    color: isCurrent ? "var(--text-action)" : "var(--text-caption)",
    fontWeight: isCurrent ? 600 : 400,
    padding: "6px 10px",
    borderBottom: isCurrent
      ? "2px solid var(--text-action)"
      : "2px solid transparent",
    minWidth: 32,
    display: "inline-block",
    textAlign: "center",
  };

  // Render the active page as a non-interactive <span> so it doesn't
  // appear in the tab order and screen readers don't announce
  // "Page 3, button" with a click handler that does nothing.
  if (isCurrent) {
    return (
      <span
        aria-current="page"
        aria-label={`Page ${page}, current`}
        style={sharedStyle}
      >
        {page}
      </span>
    );
  }

  const interactiveStyle: CSSProperties = {
    ...sharedStyle,
    background: "none",
    border: "none",
    cursor: "pointer",
    outlineColor: "var(--border-focus)",
  };
  const className =
    "pagination-action transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4";

  if (isCallback(mode)) {
    return (
      <button
        type="button"
        onClick={() => mode.onPageChange(page)}
        aria-label={`Page ${page}`}
        style={interactiveStyle}
        className={className}
      >
        {page}
      </button>
    );
  }
  return (
    <Link
      href={mode.hrefForPage(page)}
      aria-label={`Page ${page}`}
      style={interactiveStyle}
      className={className}
      scroll={mode.scroll ?? false}
      replace={mode.replace ?? false}
    >
      {page}
    </Link>
  );
}
