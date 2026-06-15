// ─────────────────────────────────────────────────────────────────
// SearchInput — debounced text box for the reviews grid. Owns local
// input state for responsive typing and pushes the trimmed value to the
// URL ~300ms after the last keystroke (instant-filter model without a
// navigation per character). Re-syncs from `value` when it changes
// externally (a chip dismiss or Clear all). Rendered in both the desktop
// sidebar and the mobile drawer, in both clusters — identical behavior,
// so it carries no cluster-specific prop.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useState } from "react";
import { Kicker } from "@/components/typography/Kicker";
import { searchInputStyle } from "./filter-styles";

export type SearchInputProps = {
  value: string;
  onSearch: (v: string) => void;
  /** Visible mono eyebrow above the input (e.g. "Title", "Director"). */
  label: string;
  placeholder: string;
  /** Self-contained accessible name (the box renders twice — sidebar +
   *  drawer — so a shared <label> id would duplicate). */
  ariaLabel: string;
};

export function SearchInput({
  value,
  onSearch,
  label,
  placeholder,
  ariaLabel,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  // The last value we pushed to the URL. Lets the sync effect below
  // distinguish an EXTERNAL change (chip ×, Clear all) from the echo of
  // our own debounced push, so it never resets the box mid-type.
  const lastPushed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== lastPushed.current) {
      lastPushed.current = value;
      setLocal(value);
    }
  }, [value]);

  // Clear any pending debounce on unmount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function handleChange(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      lastPushed.current = trimmed;
      onSearch(trimmed);
    }, 300);
  }

  return (
    <div>
      <Kicker>{label}</Kicker>
      <input
        type="search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        // <Kicker> renders as <p>, not <label>, and this box renders
        // twice (sidebar + drawer) so a shared id would duplicate —
        // aria-label is the self-contained accessible name. type=search
        // carries the implicit searchbox role.
        aria-label={ariaLabel}
        className="reviews-search-input focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ ...searchInputStyle, marginTop: 8 }}
      />
    </div>
  );
}
