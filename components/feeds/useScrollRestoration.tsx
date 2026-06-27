// ─────────────────────────────────────────────────────────────────
// useScrollRestoration — restore a listing's exact scroll position when
// the user returns to it from a detail page.
//
// The cluster back-link (BackToCluster) uses router.push(from) rather
// than router.back() so multi-hop neighbour browsing always lands back on
// the original listing. But router.push is a fresh navigation, so the
// browser's native back/forward scroll restoration doesn't apply — the
// page would land at the top (or the #grid anchor). This hook fills that
// gap: it continuously saves the scroll position (throttled) keyed to the
// listing's full URL, and restores it once on mount.
//
// Keyed by pathname + search, so each filter state remembers its own
// scroll; changing a filter is a new key (starts at top / #grid).
// Restore overrides the #grid anchor jump when a saved position exists
// (the saved spot is more precise than "the grid row"). Scroll is always
// instant — a smooth scroll-restore would be disorienting and would
// fight prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────

"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function useScrollRestoration(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = searchParams.toString();
    const key = `scroll:${pathname}${qs ? `?${qs}` : ""}`;

    // Restore once on mount. Double-rAF so the write lands after the
    // browser's #grid anchor jump (which happens during the navigation
    // commit) — otherwise the anchor would clobber the restored position.
    const saved = sessionStorage.getItem(key);
    if (saved !== null) {
      const y = Number.parseInt(saved, 10);
      if (Number.isFinite(y)) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            window.scrollTo({ top: y, behavior: "auto" }),
          ),
        );
      }
    }

    // Save on scroll, throttled to one write per frame.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(key, String(window.scrollY));
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, searchParams]);
}

function ScrollRestorationInner(): null {
  useScrollRestoration();
  return null;
}

/**
 * Null-rendering mount point for useScrollRestoration — for listing pages
 * that are server components (watching, collection leaves) and so can't
 * call the hook directly. Wrapped in Suspense because useSearchParams
 * requires a boundary on statically-generated pages (the collection leaves
 * prerender via generateStaticParams). The client shells
 * (FilmsShell/TelevisionShell) live on dynamic pages, so they call the
 * hook inline without needing this wrapper.
 */
export function ScrollRestoration() {
  return (
    <Suspense fallback={null}>
      <ScrollRestorationInner />
    </Suspense>
  );
}
