"use client";

// ─────────────────────────────────────────────────────────────────
// TrackOnClick — small client wrapper that fires a Vercel Analytics
// custom event when its child is clicked.
//
// Implementation note: uses a `display: contents` span as the click-
// listener mount. The span is layout-invisible (CSS contents removes
// the box from the layout tree), but click events on the inner
// anchor / button still bubble up to the span, where the onClick
// fires the analytics call. This pattern keeps the existing server-
// rendered Link / Button primitives untouched — they don't need to
// become client components just to support tracking.
//
// Supports keyboard activation too: Enter / Space on a focused
// anchor or button dispatches a click event that bubbles, so SR /
// keyboard users are tracked the same as mouse users.
//
// `track()` from @vercel/analytics is fire-and-forget on a
// sendBeacon, so it survives page navigation (the new tab opens or
// the route changes mid-call without losing the event).
//
// Closes c-no-funnel-events Tier 2 (click-event half) from the
// 2026-04-29 /full-review.
// ─────────────────────────────────────────────────────────────────

import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

import type { AnalyticsEvent } from "@/lib/analytics";

type EventData = Record<string, string | number | boolean | null>;

type TrackOnClickProps = {
  event: AnalyticsEvent;
  /** Optional metadata payload — kept small and string-only so it
   *  serializes cleanly to the analytics beacon. */
  eventData?: EventData;
  children: ReactNode;
};

export function TrackOnClick({
  event,
  eventData,
  children,
}: TrackOnClickProps) {
  return (
    <span
      onClick={() => track(event, eventData)}
      style={{ display: "contents" }}
    >
      {children}
    </span>
  );
}
