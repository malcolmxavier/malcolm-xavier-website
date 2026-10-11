// ─────────────────────────────────────────────────────────────────
// Review grid columns—the one column ramp shared by the /films and
// /television review grids (FilmsShell and TelevisionShell, which
// also back every facet route like /films/genre/[slug]).
//
// Why an explicit ramp instead of `repeat(auto-fill, minmax(160px, 1fr))`:
// auto-fill picks whatever column count fits, and between roughly
// 1384px and 1567px wide it fits FIVE. The page size is 24 (12 under
// Save-Data), and 24 ÷ 5 leaves a lonely four-card last row on every
// full page. Pinning the count to 2, 3, 4, or 6—all of which divide
// both 24 and 12—guarantees every full page ends on a complete row.
//
// How the steps were chosen (container is max 1664px with 24/40/64px
// side padding; from md up a 280px filter sidebar sits beside the
// grid, 320px from lg, with a 32px or 40px gap). Each step keeps a
// card at roughly 155px or wider, matching the old 160px floor:
//   • base (phones)     2 columns  — ~155px at 375px wide
//   • sm  (640px+)      3 columns  — no sidebar yet, so room for three
//   • md  (768px+)      2 columns  — the sidebar arrives and eats the
//                                    width; three would drop to ~109px
//   • lg  (1024px+)     3 columns
//   • xl  (1280px+)     4 columns
//   • 2xl (1536px+)     6 columns  — five is skipped on purpose
// Gap tightens to 16px on phones and opens to 24px from sm up, same
// as before.
// ─────────────────────────────────────────────────────────────────

export const REVIEW_GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6";
