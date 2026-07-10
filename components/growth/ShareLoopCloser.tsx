"use client";

// ─────────────────────────────────────────────────────────────────
// ShareLoopCloser — the return arc of the share loop.
//
// Mounted once at the site root (Suspense-wrapped, because it reads
// useSearchParams). It renders NOTHING for the overwhelming majority of
// visits: it shows a small "follow along" card only to a warm
// share-arrival (utm_medium=share) landing on a personal cluster, and
// only after the visitor has engaged. All of the "should this show, and
// with what" logic lives in lib/growth/loop-closer.ts (unit-tested);
// this component owns the engagement trigger, the dismissal memory, the
// analytics funnel, and the accessible presentation.
//
// Why a nudge here and not on case studies: the professional pages
// already close their own loop (résumé / Calendly / next-study exit
// ramps). The film/TV/music pages don't — a detail page ends on the
// next review. This catches the warm arrival there and points them at
// the platform where Malcolm already posts publicly. See
// lib/growth/loop-closer.ts for the fuller rationale.
//
// Privacy: reads only UTM params already present in the URL; the only
// thing it writes is a dismissal timestamp in localStorage (a boolean-
// in-effect, no PII). No email, no backend, no consent surface.
// ─────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { resolveLoopCloser } from "@/lib/growth/loop-closer";
import { Button } from "@/components/primitives/Button";

// localStorage key holding the ms-timestamp of the last dismissal (or
// follow — a follow is treated as a successful close).
const DISMISS_KEY = "mx:loop-closer:dismissed-at";
// How long a dismissal suppresses the nudge everywhere. 30 days — long
// enough not to re-nag a returning visitor, short enough that a genuine
// fan who dismissed once months ago can be re-invited.
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Reveal after the earlier of this dwell time or the scroll-depth
// threshold below — value-first, so the card never interrupts before
// the visitor has spent real attention on the page.
const REVEAL_AFTER_MS = 20000;
const SCROLL_DEPTH = 0.5;

/** True when the visitor dismissed (or followed) within the suppression
 *  window. Fails open (returns false) if storage is unavailable, e.g.
 *  private mode — better to occasionally re-show than to hard-crash.
 *
 *  Data minimization: localStorage has no native expiry, so once the
 *  window has lapsed (or the stored value is unparseable) we proactively
 *  delete the key rather than leave stale state lingering in the
 *  browser. Nothing else would ever remove it. */
function isRecentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    const active = Number.isFinite(at) && Date.now() - at < DISMISS_WINDOW_MS;
    if (!active) window.localStorage.removeItem(DISMISS_KEY);
    return active;
  } catch {
    return false;
  }
}

/** Persist "closed" so the nudge doesn't reappear for the window. */
function rememberDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the in-memory `closed` state still hides it for
    // this page view, which is the important case.
  }
}

export function ShareLoopCloser() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve once per route/params change: is this a warm share-arrival
  // on a personal cluster, and if so, which platform + copy?
  const target = useMemo(
    () =>
      resolveLoopCloser({
        pathname,
        utmMedium: searchParams.get("utm_medium"),
        utmSource: searchParams.get("utm_source"),
      }),
    [pathname, searchParams],
  );

  const [visible, setVisible] = useState(false); // engagement threshold reached
  const [entered, setEntered] = useState(false); // post-mount tick for the enter transition
  const [closed, setClosed] = useState(false); // dismissed or followed this view
  // Motion preference drives the enter transition (render output), so it
  // lives in state rather than a ref. Resolved when the trigger arms.
  const [reduceMotion, setReduceMotion] = useState(false);
  const viewedRef = useRef(false); // guards a single VIEW event

  // Dismiss + follow handlers are declared before the effects so the
  // Escape-key effect can depend on a stable reference.
  const handleDismiss = useCallback(() => {
    rememberDismissed();
    setClosed(true);
    if (target) {
      track(ANALYTICS_EVENTS.LOOP_CLOSER_DISMISS, {
        section: target.section,
        channel: target.channel,
        path: pathname,
      });
    }
  }, [target, pathname]);

  const handleFollow = useCallback(() => {
    // A follow is a success — remember it so the nudge doesn't reappear,
    // and record the conversion. The <a> navigates on its own.
    rememberDismissed();
    if (target) {
      track(ANALYTICS_EVENTS.LOOP_CLOSER_CLICK, {
        section: target.section,
        channel: target.channel,
        path: pathname,
      });
    }
  }, [target, pathname]);

  // Arm the engagement trigger for a qualifying visit that hasn't
  // recently closed the nudge. Reveals on the earlier of ~20s dwell or
  // 50% scroll depth, then tears everything down.
  useEffect(() => {
    if (!target || isRecentlyDismissed()) return;

    let raf = 0;
    const reveal = () => {
      cleanup();
      // Resolve the motion preference at reveal time — inside a callback,
      // not synchronously in the effect body — so the enter transition
      // can honor it.
      setReduceMotion(
        typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      setVisible(true);
    };
    const timer = window.setTimeout(reveal, REVEAL_AFTER_MS);
    const onScroll = () => {
      if (raf) return; // rAF-throttle: at most one measurement per frame
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        const depth = scrollable > 0 ? window.scrollY / scrollable : 0;
        if (depth >= SCROLL_DEPTH) reveal();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    function cleanup() {
      window.clearTimeout(timer);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, [target]);

  // On reveal: fire VIEW once, then run the enter transition (skipped
  // under reduced motion, where the card simply appears in place).
  useEffect(() => {
    if (!visible || !target) return;
    if (!viewedRef.current) {
      viewedRef.current = true;
      track(ANALYTICS_EVENTS.LOOP_CLOSER_VIEW, {
        section: target.section,
        channel: target.channel,
        path: pathname,
      });
    }
    // Flip `entered` one frame after mount so the CSS transition runs.
    // Under reduced motion the transition resolves to "none", so this
    // just makes the card appear in place with no movement.
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [visible, target, pathname]);

  // Escape closes the open nudge — keyboard parity with the dismiss
  // button. The card is non-modal (it never traps focus), so this is a
  // convenience, not an escape from a trap.
  useEffect(() => {
    if (!visible || closed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, closed, handleDismiss]);

  if (!target || !visible || closed) return null;

  return (
    <aside
      aria-label="Keep up with Malcolm"
      // Full-width above the fold-line on mobile; a compact corner card
      // on sm+. Non-modal, so it sits in the normal tab order after the
      // page content rather than trapping focus.
      className="fixed left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] sm:max-w-[calc(100vw-3rem)]"
      style={{
        zIndex: 55,
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--border-radius-lg)",
        boxShadow: "var(--shadow-popup)",
        padding: "18px 20px",
        // Enter transition: fade + 8px rise. Under reduced motion the
        // reveal effect sets `entered` synchronously and duration is
        // "none", so the card appears without movement.
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(8px)",
        transition: reduceMotion
          ? "none"
          : "opacity 260ms ease-out, transform 260ms ease-out",
      }}
    >
      {/* Dismiss — ghost X, top-right. 32px box clears the WCAG 2.5.8
          target-size minimum; visible focus ring in the canonical
          focus color. */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width: 32,
          height: 32,
          color: "var(--text-caption)",
          background: "transparent",
          cursor: "pointer",
          outlineColor: "var(--border-focus)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Eyebrow — mono label acting as the card's title. Right-padded
          so it clears the X. Uses --text-body (not --text-caption): at
          11px the caption grey falls to 3.05:1 on the card surface,
          failing WCAG 1.4.3; body color clears AA in both themes. The
          quiet-label read still comes from size, uppercase, tracking,
          and the mono face rather than from a lighter color. */}
      <p
        style={{
          margin: 0,
          paddingRight: 28,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--text-body)",
        }}
      >
        Keep up with me
      </p>

      {/* Warm one-liner in editorial (body) voice. */}
      <p
        style={{
          margin: "8px 0 14px",
          fontFamily: "var(--font-primary)",
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--text-body)",
        }}
      >
        {target.blurb}
      </p>

      {/* Follow CTA — the site's primary filled button (black-on-light /
          white-on-dark via the primitive, with focus ring, hover, and
          reduced-motion all handled there). Opens the public profile in
          a new tab; onClick records the conversion before navigation,
          rel=noopener is the standard reverse-tabnabbing guard. */}
      <Button
        as="a"
        variant="primary"
        size="md"
        href={target.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleFollow}
      >
        {target.cta}
        <span aria-hidden="true">↗</span>
      </Button>
    </aside>
  );
}
