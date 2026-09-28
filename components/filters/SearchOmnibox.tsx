// ─────────────────────────────────────────────────────────────────
// SearchOmnibox — the reviews-page search front door. One field that
// suggests, as you type, across titles (→ a jump to that review) and the
// high-cardinality facets (actor / writer / studio / director for film;
// actor / creator for TV → apply a filter). Replaces the old separate
// title + director text boxes and is the only way to reach the high-card
// facets from the reviews page itself.
//
// The candidate lists are ~160 KB, so suggestions are fetched from a
// per-cluster Route Handler (the `endpoint` prop) rather than shipped to
// the client. The actual filter still rides the existing URL-param path
// via onSelect — this component only surfaces candidates.
//
// Accessibility: a WAI-ARIA combobox. The input is role=combobox with
// aria-expanded / aria-controls / aria-autocomplete="list" and tracks the
// highlighted option via aria-activedescendant; the popup is a role=listbox
// of role=option items grouped by kind. Arrow keys move the active option,
// Enter selects, Escape closes. The popup lives in the normal DOM flow
// (no portal) so the mobile drawer's focus-trap covers it.
// ─────────────────────────────────────────────────────────────────

"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Kicker } from "@/components/typography/Kicker";
import { searchInputStyle } from "./filter-styles";
import type { Suggestion } from "./omnibox-types";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

export type SearchOmniboxProps = {
  /** Route Handler path, e.g. "/films/reviews/facet-search". */
  endpoint: string;
  /** Mono eyebrow above the field. */
  label: string;
  placeholder: string;
  /** Self-contained accessible name (the field renders twice — sidebar +
   *  drawer — so a shared <label> id would collide). */
  ariaLabel: string;
  /** Called when a suggestion is chosen. The shell routes it: a Title
   *  navigates to its href; a facet applies its param/value. */
  onSelect: (s: Suggestion) => void;
};

export function SearchOmnibox({
  endpoint,
  label,
  placeholder,
  ariaLabel,
  onSelect,
}: SearchOmniboxProps) {
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // index into `results`
  // Which query `fetched` actually belongs to. This is the whole trick for
  // getting `loading` without a flag: a request is outstanding exactly when
  // the query is worth searching and the results in hand are for some other
  // query. Nothing has to be set to start loading, so nothing is set
  // synchronously in the effect below.
  const [fetchedFor, setFetchedFor] = useState("");

  // Both of these follow from the query, so they are derived rather than
  // stored. Two things this fixes beyond the lint rule:
  //
  // Deleting a character to drop back under the minimum length used to
  // leave the old results on screen for one render while an effect cleared
  // them. Now they are gone in the same render.
  //
  // And a `loading` flag set true before the debounce timer and false in
  // the response handler is two sources of truth for one fact. If a
  // response never arrived — a thrown parse, a path nobody thought about —
  // the flag stuck on. Comparing the query to what the results are for
  // cannot get stuck, because both sides are read fresh every render.
  const searchable = query.trim().length >= MIN_QUERY_LENGTH;
  const results = searchable ? fetched : [];
  const loading = searchable && fetchedFor !== query.trim();

  const baseId = useId();
  const listId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced fetch. Aborts the in-flight request on each keystroke so
  // out-of-order responses can't clobber a newer query's results.
  useEffect(() => {
    const q = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    // Nothing to fetch, and nothing to clear — `results` and `loading`
    // are derived from the query above, so they are already empty.
    if (q.length < MIN_QUERY_LENGTH) return;
    debounce.current = setTimeout(() => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { results: Suggestion[] }) => {
          setFetched(data.results ?? []);
          setActive(-1);
          setFetchedFor(q);
        })
        .catch((e) => {
          // Stamping the query on a real failure is what stops `loading`
          // hanging forever: the results are empty and they are empty FOR
          // this query, which is a finished state. An abort is skipped
          // because a newer keystroke already owns the next request.
          if (e?.name !== "AbortError") setFetchedFor(q);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, endpoint]);

  // Close on outside click (the popup is in-flow, so a click elsewhere
  // should dismiss it).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const showPopup = open && query.trim().length >= MIN_QUERY_LENGTH;

  function choose(s: Suggestion) {
    onSelect(s);
    // Reset for the next search. Titles navigate away via onSelect; for
    // facet selections this clears the field so the user can stack more.
    setQuery("");
    setFetched([]);
    // Forget which query the (now empty) results belong to. Without this,
    // retyping the query just chosen would read as "results already in
    // hand for this query" and flash an empty list instead of the spinner,
    // because `loading` compares the query to `fetchedFor`.
    setFetchedFor("");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (results.length) setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length)
        setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (active >= 0 && active < results.length) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  // Group the flat results into kind-runs ("Titles", "Actor", "Director"…)
  // so each renders as a real ARIA listbox group with an accessible name.
  // Without this, screen readers hear one flat option list and lose the
  // signal that the omnibox searches across several facet types (SC 1.3.1).
  // Each item keeps its flat index `i` because keyboard nav and
  // aria-activedescendant address options by that index, not by group.
  const resultGroups: { kind: string; items: { s: Suggestion; i: number }[] }[] =
    [];
  results.forEach((s, i) => {
    const last = resultGroups[resultGroups.length - 1];
    if (last && last.kind === s.kind) last.items.push({ s, i });
    else resultGroups.push({ kind: s.kind, items: [{ s, i }] });
  });

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <Kicker>{label}</Kicker>
      <input
        type="text"
        role="combobox"
        aria-expanded={showPopup}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPopup && active >= 0 ? optionId(active) : undefined
        }
        aria-label={ariaLabel}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="reviews-search-input focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ ...searchInputStyle, marginTop: "var(--scale-200)" }}
      />

      {showPopup ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={popupStyle}
        >
          {results.length === 0 ? (
            <li role="presentation" style={emptyStyle}>
              {loading ? "Searching…" : "No matches"}
            </li>
          ) : (
            resultGroups.map((group) => (
              // One ARIA group per facet kind, named by the kind so screen
              // readers announce "Actor, group" before its options. The
              // visible header is aria-hidden to avoid double-announcing the
              // name the group already carries.
              <li key={group.kind} role="group" aria-label={group.kind}>
                <div aria-hidden="true" style={groupHeaderStyle}>
                  {group.kind}
                </div>
                {group.items.map(({ s, i }) => (
                  <div
                    key={`${s.kind}-${s.label}-${i}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    // Pointer-down (not click) so the input's blur doesn't
                    // close the popup before the selection registers.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                    style={{
                      ...optionStyle,
                      background:
                        i === active ? "var(--surface-default)" : "transparent",
                    }}
                  >
                    <span style={optionLabelStyle}>{s.label}</span>
                    {s.sublabel ? (
                      <span style={optionMetaStyle}>{s.sublabel}</span>
                    ) : null}
                  </div>
                ))}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────

const popupStyle: CSSProperties = {
  position: "absolute",
  zIndex: 20,
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  margin: 0,
  padding: 4,
  listStyle: "none",
  maxHeight: 320,
  overflowY: "auto",
  background: "var(--surface-page)",
  border: "1px solid var(--border-interactive)",
  borderRadius: "var(--border-radius-sm)",
  // Per-theme elevation: a black-alpha shadow vanishes on the near-black
  // dark surface, so the token swaps to a light-channel glow in dark mode.
  boxShadow: "var(--shadow-popup)",
};

const groupHeaderStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-caption)",
  padding: "8px 8px 4px",
};

const optionStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  padding: "6px 8px",
  borderRadius: "var(--border-radius-sm)",
  cursor: "pointer",
};

const optionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-body)",
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const optionMetaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-caption)",
  flexShrink: 0,
  fontVariantNumeric: "tabular-nums",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-caption)",
  padding: "8px",
};
