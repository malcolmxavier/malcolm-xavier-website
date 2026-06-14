// BackToTelevision — the TV cluster's "← All television" back-link.
// Thin binding of the shared BackToCluster (components/feeds/BackToCluster)
// to the TV listing + label. The shared component carries the push-to-
// `?from=` behaviour, the `?ref=` strip, and the #grid anchor; exact
// scroll restoration is handled by useScrollRestoration on the listing.

"use client";

import { BackToCluster } from "@/components/feeds/BackToCluster";

export function BackToTelevision() {
  return (
    <BackToCluster fallbackHref="/television/reviews" label="← All television" />
  );
}
