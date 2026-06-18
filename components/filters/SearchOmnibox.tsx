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
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // index into `results`
  const [loading, setLoading] = useState(false);

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
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(() => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { results: Suggestion[] }) => {
          setResults(data.results ?? []);
          setActive(-1);
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setLoading(false);
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
    setResults([]);
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

  // Render the flat results with a group heading inserted whenever `kind`
  // changes. Keeps one running option index for aria-activedescendant.
  let lastKind: string | null = null;

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
        style={{ ...searchInputStyle, marginTop: 8 }}
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
            results.map((s, i) => {
              const headerForGroup = s.kind !== lastKind ? s.kind : null;
              lastKind = s.kind;
              return (
                <li key={`${s.kind}-${s.label}-${i}`} role="presentation">
                  {headerForGroup ? (
                    <div role="presentation" style={groupHeaderStyle}>
                      {headerForGroup}
                    </div>
                  ) : null}
                  <div
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
                </li>
              );
            })
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
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
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
