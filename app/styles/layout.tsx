import type { Metadata } from "next";
import type { ReactNode } from "react";

// /styles is internal-only — a design-system reference Malcolm uses
// during the build, not part of the public site. Setting `robots`
// metadata here keeps search engines from indexing the route while
// leaving direct visits + URL-sharing fully functional.
//
// This layout exists as a server component so it can export
// metadata; the underlying page is "use client" (it uses next-themes
// hooks for the per-card resolved-theme contrast logic).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StylesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
