// BackToFilms — the film cluster's "← All films" back-link. Thin binding
// of the shared BackToCluster (components/feeds/BackToCluster) to the film
// listing + label.
//
// This converged onto the push-to-`?from=` model (it previously used
// router.back()): now that film detail pages have filter-aware, multi-hop
// neighbour navigation, router.back() would walk one detail page at a time
// instead of returning to the listing. Exact scroll position is restored
// by useScrollRestoration on the listing, so the scroll-preserving benefit
// of the old router.back() is retained without the multi-hop breakage.

"use client";

import { BackToCluster } from "@/components/feeds/BackToCluster";

export function BackToFilms() {
  return <BackToCluster fallbackHref="/films/reviews" label="← All films" />;
}
