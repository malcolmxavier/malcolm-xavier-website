// ─────────────────────────────────────────────────────────────────
// CalendlyWidget — small client component that mounts the Calendly
// inline-embed widget into the page.
//
// How it works:
//   1. Renders the empty .calendly-inline-widget container with the
//      data-url Calendly's script reads.
//   2. On mount, injects Calendly's external widget.js (once per
//      page lifetime, deduped by checking the existing <script> tag).
//   3. Once loaded, the script auto-detects any .calendly-inline-widget
//      elements on the page and renders the booking iframe into them.
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
// Sizing: 320px min-width per Calendly's snippet recommendation;
// 700px height accommodates the date picker + time slots + form
// without internal scrolling at desktop widths.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";

const CALENDLY_URL = "https://calendly.com/malcolmxavier";
const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

export function CalendlyWidget() {
  useEffect(() => {
    // Dedupe: another instance of the widget on a different page
    // (or a fast-nav back to /contact) shouldn't double-inject.
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      className="calendly-inline-widget"
      data-url={CALENDLY_URL}
      style={{ minWidth: 320, height: 700 }}
    />
  );
}
