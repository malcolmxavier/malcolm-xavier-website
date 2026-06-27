// Dev-only preview route for the stats filter chips. 404s in production
// (mirrors the dev-only /api/spotify/snapshot posture) so it never ships
// as a public surface — it exists purely to judge the tri-state chip
// look-and-feel on real tokens and to give the a11y pass a rendered
// target while the real dashboard rails are wired in.

import { notFound } from "next/navigation";
import { FilterPreview } from "./FilterPreview";

export const metadata = {
  // Belt-and-suspenders: even in dev, keep it out of any index.
  robots: { index: false, follow: false },
};

export default function FilterPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FilterPreview />;
}
