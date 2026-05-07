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
// Layout: First / windowed / Last with inert ellipses for elided
// gaps. At currentPage 13 of 25 with windowSize=2 the row reads
// `← Prev | 1 … 11 12 [13] 14 15 … 25 | Next →`. Anchors only
// appear when the window doesn't already touch them; ellipses
// only appear when there's a real gap (≥1 elided page). For small
// totals (≤ ~5) the row collapses to plain `← Prev | 1 2 3 4 5 |
// Next →` automatically.
//
// Ellipses are decorative <span aria-hidden> inside aria-hidden
// list items — not in the tab order, not announced by screen
// readers. Industry default for pagination chrome: ambiguous
// click targets ("which elided page do I jump to?") trade clarity
// for nothing. Users navigate via Prev/Next, the windowed numbers,
// or the First/Last anchors.
//
// The active page renders as a non-interactive <span aria-current=
// "page"> so it stays out of the tab order.
//
// Pages are 1-indexed throughout the public API. Consumers that
// store 0-indexed state internally (e.g. MusicShell) adapt at the
// boundary.
// ─────────────────────────────────────────────────────────────────

"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

// Discriminated union: exactly one of onPageChange / hrefForPage /
// basePath must be provided. TypeScript enforces this at call sites.
//
// • CallbackMode (client only): onPageChange handler. Use when the
//   parent owns side effects beyond navigation (state updates,
//   scroll, aria-live announcements).
// • HrefFnMode (client only): hrefForPage function. Use when
//   pagination is just URL state and the parent is already a
//   client component that can pass the closure.
// • BasePathMode (server-safe): basePath + pageParam strings.
//   Use from server components where Next.js forbids passing
//   functions across the boundary. Internally builds hrefs as
//   `${basePath}?${pageParam}=${page}` plus any preserveParams.
type CallbackMode = {
  onPageChange: (page: number) => void;
  hrefForPage?: never;
  basePath?: never;
  scroll?: never;
  replace?: never;
};

type HrefFnMode = {
  hrefForPage: (page: number) => string;
  /** Forwarded to <Link>. Default: false (page changes shouldn't jump scroll). */
  scroll?: boolean;
  /** Forwarded to <Link>. Default: false (use push by default). */
  replace?: boolean;
  onPageChange?: never;
  basePath?: never;
};

type BasePathMode = {
  /** URL prefix for the hrefs, e.g. "/films". */
  basePath: string;
  /** Query param name for the page number. Default: "page". Page 1
   *  is rendered as the basePath alone (no param) to keep URLs clean. */
  pageParam?: string;
  /** Extra query params to preserve on every href. Useful when the
   *  parent has filter state that should survive page changes. */
  preserveParams?: Record<string, string | undefined>;
  /** Forwarded to <Link>. Default: false. */
  scroll?: boolean;
  /** Forwarded to <Link>. Default: false. */
  replace?: boolean;
  onPageChange?: never;
  hrefForPage?: never;
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
  /** Surface label fired with PAGINATION_CLICK analytics. Free-form
   *  string so consumers choose the granularity ("films",
   *  "television", "music"). When omitted, the primitive renders
   *  without firing any event — keeps the analytics-agnostic
   *  default for consumers that don't track pagination. */
  surface?: string;
} & (CallbackMode | HrefFnMode | BasePathMode);

/**
 * Build the ordered list of items in the pagination row: First
 * anchor (if elided), optional left ellipsis, the windowed page
 * numbers, optional right ellipsis, Last anchor (if elided).
 *
 * Ellipses only appear when there's a real gap (≥ 2 elided pages)
 * — otherwise the row reads cleaner with the would-be-elided page
 * inline (e.g. `1 2 3 4 5` not `1 … 3 4 5`).
 */
type PaginationEntry =
  | { kind: "page"; page: number }
  | { kind: "ellipsis"; id: "left" | "right" };

function buildPaginationEntries(
  current: number,
  totalPages: number,
  windowSize: number,
): PaginationEntry[] {
  if (totalPages <= 1) return [];

  const windowStart = Math.max(1, current - windowSize);
  const windowEnd = Math.min(totalPages, current + windowSize);
  const entries: PaginationEntry[] = [];

  // Leading anchor + left ellipsis (only if there's a gap).
  if (windowStart > 1) {
    entries.push({ kind: "page", page: 1 });
    if (windowStart > 2) {
      entries.push({ kind: "ellipsis", id: "left" });
    }
    // windowStart === 2 → no ellipsis; row reads "1, 2, 3, …"
  }

  for (let p = windowStart; p <= windowEnd; p++) {
    entries.push({ kind: "page", page: p });
  }

  // Trailing right ellipsis + last anchor (only if there's a gap).
  if (windowEnd < totalPages) {
    if (windowEnd < totalPages - 1) {
      entries.push({ kind: "ellipsis", id: "right" });
    }
    entries.push({ kind: "page", page: totalPages });
  }

  return entries;
}

export function Pagination({
  currentPage,
  totalPages,
  windowSize = 2,
  ariaLabel = "Pagination",
  className,
  surface,
  ...mode
}: PaginationProps) {
  // Single-page (or empty) sets don't need pagination chrome.
  if (totalPages <= 1) return null;

  const entries = buildPaginationEntries(currentPage, totalPages, windowSize);
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;
  // The discriminated union (CallbackMode | HrefFnMode | BasePathMode)
  // is enforced at the component prop boundary but TypeScript widens
  // `mode` after the rest-spread, so we re-narrow with a single cast
  // here. The actual safety still lives at runtime in the isCallback /
  // isBasePath / isHrefFn guards below — this cast is a structural
  // pass-through, not a permissive widening.
  const modeProps = mode as ModeProps;

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
            direction="prev"
            surface={surface}
            mode={modeProps}
          />
        </li>

        {entries.map((entry) =>
          entry.kind === "page" ? (
            <li key={`page-${entry.page}`}>
              <PageItem
                page={entry.page}
                isCurrent={entry.page === currentPage}
                surface={surface}
                mode={modeProps}
              />
            </li>
          ) : (
            // aria-hidden on the <li> so the ellipsis is invisible
            // to screen readers AND falls out of the list count.
            // SR users hear only the navigable items announced.
            <li key={`ellipsis-${entry.id}`} aria-hidden="true">
              <Ellipsis />
            </li>
          ),
        )}

        <li>
          <NavButton
            label="Next →"
            ariaLabel="Next page"
            disabled={atEnd}
            target={currentPage + 1}
            direction="next"
            surface={surface}
            mode={modeProps}
          />
        </li>
      </ol>
    </nav>
  );
}

/** Fire PAGINATION_CLICK with normalized payload. Skipped when the
 *  consumer didn't pass a surface — keeps the primitive analytics-
 *  agnostic for consumers that don't track. */
function firePaginationClick(
  surface: string | undefined,
  page: number,
  direction: "prev" | "next" | "page",
) {
  if (surface === undefined) return;
  track(ANALYTICS_EVENTS.PAGINATION_CLICK, { surface, page, direction });
}

/** Inert decorative ellipsis cell. Matches the typography of the
 *  surrounding page numbers so the row reads as a single visual
 *  group; --text-caption signals "not interactive" without color
 *  contrast tricks. */
function Ellipsis() {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        letterSpacing: "0.08em",
        color: "var(--text-caption)",
        padding: "6px 4px",
        minWidth: 24,
        display: "inline-block",
        textAlign: "center",
        userSelect: "none",
      }}
    >
      …
    </span>
  );
}

// ─── Internals ────────────────────────────────────────────────────

type ModeProps = CallbackMode | HrefFnMode | BasePathMode;

const isCallback = (m: ModeProps): m is CallbackMode =>
  typeof (m as CallbackMode).onPageChange === "function";

const isBasePath = (m: ModeProps): m is BasePathMode =>
  typeof (m as BasePathMode).basePath === "string";

/**
 * Build an href for a target page. Resolves whichever mode is in
 * use:
 *   • HrefFnMode: defer to the consumer's closure.
 *   • BasePathMode: assemble basePath?pageParam=N&...preserveParams.
 *     Page 1 omits the param so the canonical URL stays clean.
 *   • CallbackMode: not applicable (caller renders a <button>).
 */
function resolveHref(target: number, mode: ModeProps): string {
  if (isBasePath(mode)) {
    const paramName = mode.pageParam ?? "page";
    const params = new URLSearchParams();
    if (mode.preserveParams) {
      for (const [k, v] of Object.entries(mode.preserveParams)) {
        if (v !== undefined && v !== "") params.set(k, v);
      }
    }
    if (target > 1) params.set(paramName, String(target));
    const qs = params.toString();
    return qs ? `${mode.basePath}?${qs}` : mode.basePath;
  }
  // HrefFnMode (callback mode never reaches here).
  return (mode as HrefFnMode).hrefForPage(target);
}

/** Prev/Next button. Always renders as <button> (links can't be disabled). */
function NavButton({
  label,
  ariaLabel,
  disabled,
  target,
  direction,
  surface,
  mode,
}: {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  target: number;
  direction: "prev" | "next";
  surface: string | undefined;
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
          disabled || !isCallback(mode)
            ? undefined
            : () => {
                firePaginationClick(surface, target, direction);
                mode.onPageChange(target);
              }
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
  // Non-callback mode: render as <Link>. Resolve href from either
  // function-mode or basePath-mode internally so server-component
  // callers can pass serializable inputs.
  const hrefMode = mode as HrefFnMode | BasePathMode;
  return (
    <Link
      href={resolveHref(target, hrefMode)}
      onClick={() => firePaginationClick(surface, target, direction)}
      aria-label={ariaLabel}
      style={style}
      className={className}
      scroll={hrefMode.scroll ?? false}
      replace={hrefMode.replace ?? false}
    >
      {label}
    </Link>
  );
}

/** A single page-number entry. Active = non-interactive span; otherwise button or link. */
function PageItem({
  page,
  isCurrent,
  surface,
  mode,
}: {
  page: number;
  isCurrent: boolean;
  surface: string | undefined;
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
        onClick={() => {
          firePaginationClick(surface, page, "page");
          mode.onPageChange(page);
        }}
        aria-label={`Page ${page}`}
        style={interactiveStyle}
        className={className}
      >
        {page}
      </button>
    );
  }
  const hrefMode = mode as HrefFnMode | BasePathMode;
  return (
    <Link
      href={resolveHref(page, hrefMode)}
      onClick={() => firePaginationClick(surface, page, "page")}
      aria-label={`Page ${page}`}
      style={interactiveStyle}
      className={className}
      scroll={hrefMode.scroll ?? false}
      replace={hrefMode.replace ?? false}
    >
      {page}
    </Link>
  );
}
