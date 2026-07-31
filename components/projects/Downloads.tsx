// ─────────────────────────────────────────────────────────────────
// Downloads — the "read the full work" block at the foot of a
// /projects page, plus the CompanionSlot for an artifact that isn't
// available yet.
//
// Downloads are static files under public/projects/<slug>/, so each
// row is a PLAIN anchor opening in a new tab — never the Link
// primitive, which routes internal hrefs through next/link and would
// try to client-navigate (and prefetch) a non-route .pdf. Opening
// in-tab lets the browser's PDF viewer handle view-or-save rather than
// forcing a download.
// ─────────────────────────────────────────────────────────────────

import type { ProjectCompanion, ProjectDownload } from "@/lib/projects/types";

export function Downloads({
  heading = "Read the full work",
  items,
}: {
  heading?: string;
  items: ProjectDownload[];
}) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="downloads-heading"
      className="flex flex-col gap-4 rounded-lg p-5 md:p-6"
      style={{
        border: "1px solid var(--border-default)",
        background: "var(--surface-muted)",
      }}
    >
      <h2
        id="downloads-heading"
        className="m-0 text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {heading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.href} className="flex flex-col gap-0.5">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-[var(--text-heading)] underline decoration-2 underline-offset-4 hover:[color:var(--text-action-hover)]"
              style={{ fontFamily: "var(--font-primary)", fontSize: "1.05rem" }}
            >
              {item.label} ↓<span className="sr-only"> (opens in new tab)</span>
            </a>
            {item.meta && (
              <span
                className="text-[var(--text-caption)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--p-xs-font-size)",
                }}
              >
                {item.meta}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A not-yet-available companion (e.g. the MSL presentation recording
 *  and deck still gated behind Northwestern). Acknowledges the artifact
 *  as pending rather than shipping a dead link or a placeholder route. */
export function CompanionSlot({ companion }: { companion: ProjectCompanion }) {
  return (
    <section
      className="flex flex-col gap-1.5 rounded-lg p-5"
      style={{
        border: "1px dashed var(--border-default)",
        background: "transparent",
      }}
    >
      <p
        className="m-0 text-[var(--text-caption)]"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--p-xs-font-size)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {companion.label}
      </p>
      <p
        className="m-0 text-[var(--text-body)]"
        style={{ fontSize: "0.95rem", lineHeight: 1.5 }}
      >
        {companion.note}
      </p>
    </section>
  );
}
