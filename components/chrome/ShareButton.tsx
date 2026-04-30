"use client";

// ─────────────────────────────────────────────────────────────────
// ShareButton — small button that opens the native share sheet on
// mobile (via navigator.share), falling back to a clipboard copy
// on desktop browsers that don't support Web Share. Renders inline
// post-click feedback ("Copied!") so the user knows the action
// landed.
//
// Lives in chrome because the Footer hosts it; could be hoisted to
// /components/primitives later if other surfaces want to share.
//
// Closes m-no-share-affordance from the 2026-04-29 /full-review.
// ─────────────────────────────────────────────────────────────────

import { useState } from "react";

type ShareButtonProps = {
  /** URL to share. Defaults to window.location.origin at click time. */
  url?: string;
  /** Title sent to the native share sheet (mobile) — ignored on
   *  clipboard fallback. */
  title?: string;
  /** Button label. */
  label?: string;
};

const FEEDBACK_TIMEOUT_MS = 1500;

export function ShareButton({
  url,
  title = "Malcolm Xavier",
  label = "Send this site",
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleClick = async () => {
    const shareUrl =
      url ??
      (typeof window !== "undefined" ? window.location.origin : "");
    if (!shareUrl) return;

    // navigator.share opens the native share sheet on mobile / iPad
    // and any desktop browser that supports Web Share Level 2. Cancel
    // (user dismissed the sheet) is indistinguishable from failure
    // via thrown AbortError, so we silently fall through to clipboard.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url: shareUrl, title });
        return;
      } catch {
        // Fall through to the clipboard path.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("Copied!");
    } catch {
      setFeedback("Share unavailable");
    }
    setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      // aria-live on the inline span announces the feedback message
      // when it appears, so screen-reader users hear "Copied!" too.
      className="inline-flex items-center rounded-sm transition-opacity motion-reduce:transition-none hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--text-action)",
        background: "none",
        border: "none",
        padding: "4px 0",
        cursor: "pointer",
        outlineColor: "var(--border-focus)",
      }}
    >
      <span aria-live="polite" aria-atomic="true">
        {feedback ?? label}
      </span>
    </button>
  );
}
