// ─────────────────────────────────────────────────────────────────
// CalendlyWidget — small client component that mounts the Calendly
// inline-embed widget into the page.
//
// How it works:
//   1. Renders an empty container <div> with a ref.
//   2. On mount, drives the widget explicitly via
//      `window.Calendly.initInlineWidget({ url, parentElement })`.
//   3. Three branches handle every load state:
//      • window.Calendly exists  → init now (fast-nav case)
//      • script tag exists, global doesn't yet → wait for `load`
//      • neither                 → inject script, then wait for `load`
//
// Why explicit init (not Calendly's auto-scan): Calendly's
// auto-scan reads `.calendly-inline-widget` + `data-url` from the
// DOM, but only on the script's first load — it doesn't re-scan
// on subsequent React mounts. With Next.js SPA fast-nav, visiting
// /about → /resume → /about would render an empty box on the
// second visit because the script tag was deduped (so re-injection
// was skipped) but auto-scan was already spent. Driving init
// explicitly side-steps the dedupe trap entirely. Closes
// cv-calendly-script-reinjection from the 2026-04-29 /full-review.
//
// Limitations / decisions:
//   • Theme: pinned to Calendly's default light theme regardless of
//     site theme. Calendly only re-themes via query params at mount;
//     re-themeing on next-themes flip would require remounting the
//     widget, which isn't worth the wiring for MVP. The widget sits
//     inside a bordered card so the contrast jump reads as
//     "embedded third party" rather than a styling miss.
//   • Reduced motion: Calendly's widget UI is mostly static; no
//     additional motion guarding needed at the embed level. The
//     short fade-in on iframe load is acceptable.
//   • Privacy: this loads a third-party script and embeds an iframe
//     from Calendly. That's intentional for the contact surface —
//     the booking flow is the value. If a privacy-first variant is
//     ever needed, swap to a "click to load" pattern.
//
// Sizing: 320px min-width per Calendly's snippet recommendation,
// 1080px height.
//
// That height is large on purpose and fixes a real bug. It used to be
// 700, and 700 did not fit the booking view: after picking an event
// type the calendar's last week was cut off at the card's edge and the
// time list, which sits below it, was not reachable at all. The old
// comment here claimed 700 fit "the date picker + time slots + form
// without internal scrolling" — measured on 2026-09-27 by driving real
// clicks into the iframe, that was never true.
//
// WIDTH AND HEIGHT ARE COUPLED, which is the counter-intuitive part.
// Calendly renders the booking view STACKED — event header, then
// calendar, then times — at every width this page can give it (42rem,
// 48rem, 56rem and ~976px uncapped were all tested, all stacked). So a
// NARROWER embed needs a TALLER container, not a shorter one. Trying to
// shrink the embed by capping its width made it clip worse.
//
// 1080 is verified end to end at the current column width: event
// picker, day picker, and time list all render without the iframe
// scrolling internally. Re-verify against the TIME LIST — not the event
// picker, which is short and fits almost anything — before changing
// this or the column width in app/about/page.tsx (the #contact
// section, which is where the only embed on the site lives since
// /contact retired into it on 2026-09-28).
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { CONTACT } from "@/app/resume/resume-data";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

// Pull from the central CONTACT constant so the widget URL stays in
// lockstep with the rest of the codebase (2026-04-29 /full-review,
// a-calendly-widget-url-and-tracking — URL half of the fix).
//
// CONTACT.calendlyRoot is the profile root, which renders the event-
// type picker — visitors can pick a 30-min product chat, a shorter
// screen, or any longer slot Malcolm adds later. The deep-linked
// CONTACT.calendly (specific 30-min event) is reserved for outbound
// CTAs on the homepage and resume; the inline widget host page is
// kept flexible.
// hide_gdpr_banner suppresses Calendly's own cookie-consent bar, which
// otherwise renders INSIDE the iframe — a second consent dialog on a
// page that already has one, in a vendor's styling, sitting across the
// foot of the embed. Hiding the bar does not opt anybody out of
// anything: it is Calendly's notice about Calendly's cookies, and the
// page's own privacy notice still governs. Built with URL so a query
// string on calendlyRoot would be preserved rather than clobbered by a
// naive "?" concatenation.
const CALENDLY_URL = (() => {
  const u = new URL(CONTACT.calendlyRoot);
  u.searchParams.set("hide_gdpr_banner", "1");
  return u.toString();
})();
const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";
// Calendly broadcasts widget lifecycle events as window
// `message` events. Origin to match against — Calendly's iframe
// posts from this exact host.
const CALENDLY_ORIGIN = "https://calendly.com";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (config: {
        url: string;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

export function CalendlyWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cancellation flag — a mid-load unmount must not fire init()
    // against a stale container reference once the script lands.
    let cancelled = false;

    function init() {
      if (cancelled) return;
      if (!window.Calendly || !container) return;
      // Calendly appends an iframe to parentElement; clear first so
      // a re-mount doesn't stack two iframes inside the same node.
      container.innerHTML = "";
      window.Calendly.initInlineWidget({
        url: CALENDLY_URL,
        parentElement: container,
      });
    }

    if (window.Calendly) {
      // Fast-nav case — script already loaded by a prior mount.
      init();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      // Mid-load — script is in the DOM but window.Calendly hasn't
      // populated yet. Hook the load event with `once: true` so the
      // listener cleans itself up after firing.
      existing.addEventListener("load", init, { once: true });
      return () => {
        cancelled = true;
      };
    }

    // First visit — inject the script and init when it lands.
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", init, { once: true });
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  // postMessage listener — fires CALENDLY_BOOKED when the iframe
  // emits `calendly.event_scheduled` (the booking-completed signal).
  // This is the conversion end of the recruiter funnel; without it
  // we'd see clicks-to-Calendly but never know how many actually
  // booked. Closes the tracking half of
  // a-calendly-widget-url-and-tracking from the 2026-04-29
  // /full-review (URL half shipped in Batch 2).
  //
  // Origin check is mandatory — without it any page-frame on the
  // open web could spoof the event. We also defensively gate on
  // the data shape since postMessage payloads are unconstrained.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== CALENDLY_ORIGIN) return;
      const data = event.data as unknown;
      if (
        typeof data === "object" &&
        data !== null &&
        "event" in data &&
        (data as { event: unknown }).event === "calendly.event_scheduled"
      ) {
        track(ANALYTICS_EVENTS.CALENDLY_BOOKED);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ minWidth: 320, height: 1080 }}
    />
  );
}
