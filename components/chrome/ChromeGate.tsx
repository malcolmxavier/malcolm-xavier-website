// ─────────────────────────────────────────────────────────────────
// ChromeGate — conditionally renders site chrome (Nav, Footer)
// based on the current route. Used to suppress the chrome on routes
// that need a clean canvas, like the LinkedIn banner page at
// /banner/linkedin which renders at exact 1584×396 pixel dimensions
// for screenshot export.
//
// Why a thin client wrapper instead of restructuring into a route
// group: Nav and Footer are rendered unconditionally in the root
// layout. Wrapping them with this gate is a 3-line change with no
// blast radius on existing pages, vs. the alternative of splitting
// the root layout into (site)/(bare) groups which would touch every
// existing page.
//
// Server components passed as `children` to a client component is a
// supported App Router pattern — Footer stays a server component.
// ─────────────────────────────────────────────────────────────────

"use client";

import { usePathname } from "next/navigation";

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Any route under /banner is a chrome-free canvas for export.
  if (pathname?.startsWith("/banner")) return null;
  return <>{children}</>;
}
