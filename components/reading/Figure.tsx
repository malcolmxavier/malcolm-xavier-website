// ─────────────────────────────────────────────────────────────────
// Figure — a captioned image inside a /projects reading page.
//
// Renders a next/image with a known intrinsic size (so Next reserves
// layout and serves an optimized, responsive srcset) inside a semantic
// <figure>/<figcaption>. The image itself is inert; when a `href` is
// given (typically the full-resolution PDF of a poster or datafolio),
// the caption carries an explicit "open" link rather than making the
// image a nested interactive target.
//
// The image is capped to the reading column (max 40rem); a poster is
// legible here as an overview, and the caption link is the escape
// hatch to full detail.
// ─────────────────────────────────────────────────────────────────

import Image from "next/image";
import type { ReactNode } from "react";

export function Figure({
  src,
  alt,
  width,
  height,
  caption,
  href,
  hrefLabel,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: ReactNode;
  /** Optional full-resolution target (e.g. the source PDF). */
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <figure className="m-0 flex flex-col gap-3">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        // The figure lives in the 40rem reading column; below that it
        // fills the viewport width.
        sizes="(max-width: 672px) 100vw, 640px"
        className="w-full h-auto rounded-md"
        style={{ border: "1px solid var(--border-default)" }}
      />
      {(caption || href) && (
        <figcaption
          className="text-[var(--text-caption)]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-xs-font-size)",
            lineHeight: "var(--p-xs-line-height)",
          }}
        >
          {caption}
          {caption && href ? " " : null}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-1 underline-offset-4 hover:[color:var(--text-action-hover)]"
              style={{ color: "var(--text-action)" }}
            >
              {hrefLabel ?? "Open full resolution"} ↗
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
        </figcaption>
      )}
    </figure>
  );
}
