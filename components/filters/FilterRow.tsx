// ─────────────────────────────────────────────────────────────────
// FilterRow — a labelled group wrapping a flex-wrap rail of chips.
// role="group" + aria-labelledby give the chip cluster programmatic
// context so AT users navigating button-by-button know the chips belong
// together (and whether multi-select applies). Shared by both shells;
// `idPrefix` namespaces the generated labelId per cluster ("films" /
// "television") so the id stays unique and stable.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Kicker } from "@/components/typography/Kicker";

export type FilterRowProps = {
  label: string;
  children: ReactNode;
  /** Cluster id namespace for the generated labelId ("films" / "television"). */
  idPrefix: string;
};

export function FilterRow({ label, children, idPrefix }: FilterRowProps) {
  const labelId = `${idPrefix}-filter-row-${label
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <Kicker id={labelId}>{label}</Kicker>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}
