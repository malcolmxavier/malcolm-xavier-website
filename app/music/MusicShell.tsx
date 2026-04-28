// ─────────────────────────────────────────────────────────────────
// MusicShell — client wrapper around the /music grid.
//
// Owns two pieces of UI state on top of the server-fetched playlist
// data:
//
//   1. View mode — "all" (default paginated grid) vs "collections"
//      (named groupings from spotify-config.COLLECTIONS).
//
//   2. Pagination (only meaningful in "all" mode). Page size is
//      responsive: 12 per page at sm+ breakpoints, 6 per page below
//      sm (single-column mobile). Users can browse all 37 playlists
//      across roughly 3-7 pages depending on viewport.
//
// Why client component: matchMedia / page state / scroll-into-view
// all need a client runtime. PlaylistCard itself stays "shared" (no
// "use client") so it can be rendered both here and from server
// contexts without forcing duplicate bundles.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Headline } from "@/components/typography/Headline";
import { Kicker } from "@/components/typography/Kicker";
import { Stack } from "@/components/layout/Stack";
import type { EnrichedPlaylist } from "@/lib/feeds/spotify-utils";
import type { Collection } from "@/lib/feeds/spotify-config";
import { PlaylistCard } from "./PlaylistCard";

type Props = {
  playlists: EnrichedPlaylist[];
  collections: ReadonlyArray<Collection>;
};

// Page sizes per viewport. Spec'd by Malcolm:
//   - Desktop / tablet (sm+): 12 per page (3 rows × 4-up at xl,
//     4 rows × 3-up at lg, 6 rows × 2-up at sm-md)
//   - Mobile (< sm): 6 per page (1-column, half the page size so
//     the vertical scroll stays manageable)
const PAGE_SIZE_DESKTOP = 12;
const PAGE_SIZE_MOBILE = 6;
const MOBILE_BREAKPOINT_PX = 640; // matches Tailwind's `sm` breakpoint

type ViewMode = "all" | "collections";

export function MusicShell({ playlists, collections }: Props) {
  // Initial state honors URL params so the view + page are
  // deep-linkable, shareable, and (most importantly) survive
  // browser-back from a playlist detail page. Defaults: view="all",
  // page=0.
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialView: ViewMode =
    searchParams?.get("view") === "collections" ? "collections" : "all";
  // ?page is 1-indexed in the URL ("page=1" = first page), 0-indexed
  // internally. Guard against missing / non-numeric values explicitly
  // rather than relying on the NaN-falsiness chain (NaN - 1 = NaN,
  // NaN || 0 = 0). Negative inputs are clamped to 0 so a hand-edited
  // "?page=0" or "?page=-3" doesn't crash downstream slicing.
  const rawPage = Number.parseInt(searchParams?.get("page") ?? "1", 10);
  const initialPage = Number.isFinite(rawPage) ? Math.max(0, rawPage - 1) : 0;

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DESKTOP);

  // Sync state → URL via replaceState so each pagination click doesn't
  // pollute the browser history stack — but the LATEST URL still
  // captures the current page+view so router.back() from a detail
  // page lands the user where they were.
  //
  // Run on every state change after mount; skip the initial render
  // (we just READ from URL above; writing now would be a no-op or
  // worse, drop a stale param).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (viewMode === "collections") params.set("view", "collections");
    if (viewMode === "all" && page > 0) params.set("page", String(page + 1));
    const query = params.toString();
    const next = query ? `/music?${query}` : "/music";
    router.replace(next, { scroll: false });
  }, [viewMode, page, router]);

  // Anchor we scroll back to when user paginates or switches views,
  // so they don't have to manually scroll up after clicking "Next".
  const gridAnchorRef = useRef<HTMLDivElement>(null);

  // Polite live-region announcement on page changes. Without this,
  // screen-reader users click Next/Prev and hear nothing — the grid
  // re-renders silently and focus stays on the pagination button. We
  // keep focus where it is (so keyboard power users can keep paging
  // without getting bounced into the grid) but post a short status
  // string for AT, satisfying SC 4.1.3.
  const [pageAnnouncement, setPageAnnouncement] = useState("");

  // Listen for breakpoint crossings and update page size on the fly.
  // matchMedia is the right tool here (vs. a resize listener) because
  // we only care about a single threshold, not every pixel of width.
  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    );
    const update = () =>
      setPageSize(mq.matches ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // If the user is on page 4 with 12-per-page (rows 37-48 → only
  // 1 card visible) and resizes to mobile (6-per-page → that page
  // doesn't exist), drop them onto the last valid page.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(playlists.length / pageSize));
    if (page >= totalPages) setPage(totalPages - 1);
  }, [pageSize, playlists.length, page]);

  const totalPages = Math.max(1, Math.ceil(playlists.length / pageSize));
  const start = page * pageSize;
  const visiblePlaylists = playlists.slice(start, start + pageSize);

  const goToPage = (next: number) => {
    setPage(next);
    // Build the live-region message before the rAF so AT picks it
    // up as soon as React commits the next render.
    const firstItem = next * pageSize + 1;
    const lastItem = Math.min(playlists.length, (next + 1) * pageSize);
    setPageAnnouncement(
      `Page ${next + 1} of ${totalPages}, showing playlists ${firstItem} through ${lastItem}.`,
    );
    // Smooth-scroll the grid anchor into view at the top of the
    // viewport. Use rAF so the scroll happens after the new page
    // has rendered and laid out.
    requestAnimationFrame(() => {
      gridAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // Switching views resets page to 0. Otherwise a user could be on
  // grid page 3, switch to Collections, switch back, and land on
  // page 3 of a possibly-different content order.
  const switchView = (next: ViewMode) => {
    if (next === viewMode) return;
    setViewMode(next);
    setPage(0);
  };

  // Index playlists by id once for O(1) lookup when assembling
  // collection groupings.
  const playlistsById = new Map(playlists.map((p) => [p.id, p]));

  return (
    <Stack gap="600">
      {/* ── View toggle ────────────────────────────────────────── */}
      <ViewToggle viewMode={viewMode} onChange={switchView} />

      {/* Anchor the page scrolls back to on pagination / view change. */}
      <div ref={gridAnchorRef} aria-hidden style={{ scrollMarginTop: 24 }} />

      {/* Polite status region — announces page changes to screen
          readers without grabbing focus. aria-atomic forces the
          full string to be read on every update so successive
          page changes ("Page 2 of 4 …" → "Page 3 of 4 …") are
          announced cleanly. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {pageAnnouncement}
      </div>

      {viewMode === "all" ? (
        <Stack gap="800">
          <PlaylistGrid playlists={visiblePlaylists} />
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={goToPage}
            />
          ) : null}
        </Stack>
      ) : (
        <CollectionsView
          collections={collections}
          playlistsById={playlistsById}
        />
      )}
    </Stack>
  );
}

// ─── View toggle ───────────────────────────────────────────────────

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  // <fieldset>/<legend> is the conventional grouping pattern for a
  // set of related toggle controls — screen readers announce the
  // legend as the group's name when focus enters any button. We
  // strip the default <fieldset> chrome (border, padding) so the
  // visual layout reads as a flat row of buttons.
  return (
    <fieldset
      className="flex items-center gap-6"
      style={{ border: 0, padding: 0, margin: 0 }}
    >
      <legend className="sr-only">Music view</legend>
      <ToggleButton
        active={viewMode === "all"}
        onClick={() => onChange("all")}
      >
        All
      </ToggleButton>
      <ToggleButton
        active={viewMode === "collections"}
        onClick={() => onChange("collections")}
      >
        Collections
      </ToggleButton>
    </fieldset>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        // Use --primary-default directly — see Pagination button
        // for the same workaround note. --text-action is the alias
        // that's broken inside sub-brand contexts.
        color: active
          ? "var(--primary-default)"
          : "var(--text-caption)",
        background: "none",
        border: "none",
        padding: "0 0 4px",
        // Active state gets a 2px sub-brand underline; inactive gets
        // hover underline so the button still reads as interactive.
        borderBottom: active
          ? "2px solid var(--primary-default)"
          : "2px solid transparent",
        cursor: "pointer",
        // Match the design-system focus contract — every interactive
        // element draws its outline ring in --border-focus rather than
        // the browser default, so keyboard users get a consistent ring
        // across the site.
        outlineColor: "var(--border-focus)",
      }}
      className="transition-colors motion-reduce:transition-none hover:[color:var(--text-action-hover)] focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {children}
    </button>
  );
}

// ─── Grid (used inside the All view + each collection section) ────

function PlaylistGrid({ playlists }: { playlists: EnrichedPlaylist[] }) {
  return (
    <ul
      // Same uniform-card grid used in the original page. auto-rows-fr
      // + uniform card heights = every card identical size per row.
      className={[
        "grid auto-rows-fr gap-x-8 gap-y-12",
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-3",
        "xl:grid-cols-4",
      ].join(" ")}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      {playlists.map((p) => (
        <li key={p.id} className="h-full">
          <PlaylistCard playlist={p} />
        </li>
      ))}
    </ul>
  );
}

// ─── Pagination controls ──────────────────────────────────────────

/**
 * Build the visible page-number window: 2 pages out in either
 * direction from the current page, clamped to [0, totalPages-1].
 *
 * Examples (totalPages = 7):
 *   page 0 → [0, 1, 2]
 *   page 3 → [1, 2, 3, 4, 5]
 *   page 6 → [4, 5, 6]
 *
 * Users can click any visible number directly. To reach pages
 * outside the window, click any visible number to widen the window
 * (or use Prev/Next).
 */
function pageNumberWindow(current: number, totalPages: number): number[] {
  const candidates = [
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ];
  return candidates.filter((n) => n >= 0 && n < totalPages);
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  const atStart = page === 0;
  const atEnd = page === totalPages - 1;
  const visible = pageNumberWindow(page, totalPages);

  return (
    <nav aria-label="Playlist pages">
      {/* Prev, page numbers, and Next all sit inside one <ol> so
          screen readers announce a single list of N items rather
          than two buttons floating outside the list. The current
          page renders as a styled non-interactive <span aria-
          current="page"> so it stays out of the tab order. */}
      <ol
        className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        <li>
          <PaginationButton
            onClick={() => onChange(page - 1)}
            disabled={atStart}
            aria-label="Previous page"
          >
            ← Prev
          </PaginationButton>
        </li>

        {visible.map((n) => {
          const isCurrent = n === page;
          // Shared visual styles. Both the active <span> and the
          // inactive <button> use the same shape/weight so the
          // pagination row reads as one cohesive group.
          const sharedStyle: React.CSSProperties = {
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-xs-font-size)",
            lineHeight: "var(--p-xs-line-height)",
            letterSpacing: "0.08em",
            // Current page: sub-brand color (purple on /music) +
            // underline. Inactive pages: muted, clickable.
            //
            // Use --primary-default (the per-sub-brand brand swatch)
            // directly instead of --text-action; Tailwind 4's @theme
            // inline breaks the alias-chain cascade for the active
            // sub-brand color.
            color: isCurrent
              ? "var(--primary-default)"
              : "var(--text-caption)",
            fontWeight: isCurrent ? 600 : 400,
            padding: "6px 10px",
            borderBottom: isCurrent
              ? "2px solid var(--primary-default)"
              : "2px solid transparent",
            minWidth: 32,
            display: "inline-block",
            textAlign: "center",
          };
          // Render the current page as a non-interactive <span> so it
          // doesn't appear in the keyboard tab order and screen readers
          // don't announce "Page 3, button" with a click handler that
          // does nothing. aria-current="page" tells AT this is the
          // active page; only the OTHER page numbers stay focusable.
          if (isCurrent) {
            return (
              <li key={n}>
                <span
                  aria-current="page"
                  aria-label={`Page ${n + 1}, current`}
                  style={sharedStyle}
                >
                  {n + 1}
                </span>
              </li>
            );
          }
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onChange(n)}
                aria-label={`Page ${n + 1}`}
                style={{
                  ...sharedStyle,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  outlineColor: "var(--border-focus)",
                }}
                className="transition-colors motion-reduce:transition-none hover:[color:var(--text-action-hover)] focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {n + 1}
              </button>
            </li>
          );
        })}

        <li>
          <PaginationButton
            onClick={() => onChange(page + 1)}
            disabled={atEnd}
            aria-label="Next page"
          >
            Next →
          </PaginationButton>
        </li>
      </ol>
    </nav>
  );
}

function PaginationButton({
  onClick,
  disabled,
  children,
  ...rest
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        // --primary-default workaround: see Pagination button.
        color: disabled
          ? "var(--text-disabled)"
          : "var(--primary-default)",
        background: "none",
        border: "none",
        padding: "8px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      className="transition-opacity hover:[color:var(--text-action-hover)] focus-visible:outline-2 focus-visible:outline-offset-4"
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Collections view ─────────────────────────────────────────────

/** Resolve an array of playlist IDs to live EnrichedPlaylist records,
 *  silently dropping any ID that isn't in the current playlist map
 *  (could be excluded by EXCLUDE_IDS or made private on Spotify). */
function resolveMembers(
  ids: readonly string[],
  byId: Map<string, EnrichedPlaylist>,
): EnrichedPlaylist[] {
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is EnrichedPlaylist => p !== undefined);
}

function CollectionsView({
  collections,
  playlistsById,
}: {
  collections: ReadonlyArray<Collection>;
  playlistsById: Map<string, EnrichedPlaylist>;
}) {
  return (
    <Stack gap="900">
      {collections.map((collection) => {
        // Volumed collection: render one shared header + one grid
        // per volume, with a sub-kicker per volume.
        if ("volumes" in collection) {
          const populatedVolumes = collection.volumes
            .map((v) => ({
              label: v.label,
              members: resolveMembers(v.ids, playlistsById),
            }))
            .filter((v) => v.members.length > 0);

          if (populatedVolumes.length === 0) return null;

          const totalCount = populatedVolumes.reduce(
            (sum, v) => sum + v.members.length,
            0,
          );

          return (
            <section key={collection.name}>
              <Stack gap="600">
                <Stack gap="200">
                  <Kicker accent>
                    Collection · {populatedVolumes.length} volumes ·{" "}
                    {totalCount} playlist{totalCount === 1 ? "" : "s"}
                  </Kicker>
                  <Headline level={2}>{collection.name}</Headline>
                </Stack>
                {populatedVolumes.map((v) => (
                  <Stack key={v.label} gap="400">
                    <Kicker>
                      {v.label} · {v.members.length} playlist
                      {v.members.length === 1 ? "" : "s"}
                    </Kicker>
                    <PlaylistGrid playlists={v.members} />
                  </Stack>
                ))}
              </Stack>
            </section>
          );
        }

        // Flat collection: single grid, single kicker.
        const members = resolveMembers(collection.ids, playlistsById);
        if (members.length === 0) return null;

        return (
          <section key={collection.name}>
            <Stack gap="500">
              <Stack gap="200">
                <Kicker accent>
                  Collection · {members.length} playlist
                  {members.length === 1 ? "" : "s"}
                </Kicker>
                <Headline level={2}>{collection.name}</Headline>
              </Stack>
              <PlaylistGrid playlists={members} />
            </Stack>
          </section>
        );
      })}
    </Stack>
  );
}
