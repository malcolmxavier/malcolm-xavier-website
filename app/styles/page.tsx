// Local-only type-system reference. 404s in production (the same
// dev-only posture as /api/spotify/snapshot) so it never ships as a
// public surface — it is a tool Malcolm uses to sanity-check tokens,
// fonts, and sub-brand palettes during the build, not a portfolio
// artifact.
//
// The guard lives here, in a server component, and the specimen markup
// lives in ./StylesPreview. That split is the point: the 404 is decided
// on the server before any of the reference is rendered, so production
// serves a real Not Found rather than a page that hides itself in the
// browser. Under `next dev` the route renders exactly as it always did.

import { notFound } from "next/navigation";
import { StylesPreview } from "./StylesPreview";

export const metadata = {
  // Belt-and-suspenders: even in dev, keep it out of any index.
  robots: { index: false, follow: false },
};

export default function StylesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StylesPreview />;
}
