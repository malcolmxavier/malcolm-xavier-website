"use client";

// VideoClip — demo video player for case studies.
//
// Autoplays (muted, looped) when the video scrolls into view, pauses
// on exit. Respects prefers-reduced-motion — reduced-motion users get
// the poster/first-frame at rest and must press play themselves.
// Controls are always rendered so keyboard and screen-reader users
// can operate the video independently of autoplay behavior.
//
// Usage inside a Beat (fills the Beat's content column):
//
//   <VideoClip
//     src="/demo/01-stats-sketch.webm"
//     poster="/demo/01-stats-sketch-poster.jpg"
//     caption="The interactive HTML prototype — one session, Roboto Mono, draggable tiles."
//     label="Before"
//   />
//
// Both webm and mp4 src values work. For LinkedIn export, record as
// webm then convert: ffmpeg -i clip.webm -c:v libx264 -crf 20 clip.mp4
//
// src must be a path under /public (e.g. "/demo/clip.webm") so Next.js
// can serve it as a static asset. The _private/_demo-videos directory
// is gitignored — copy finished clips to public/demo/ before publishing.

import { useRef, useEffect } from "react";

interface VideoClipProps {
  /** Path to the video file under /public (webm or mp4). */
  src: string;
  /** Poster image shown before play and while loading. */
  poster?: string;
  /** Caption rendered below the clip as a <figcaption>. */
  caption?: string;
  /** Chip label overlaid top-left: "Before", "After", "Final", etc. */
  label?: string;
  /**
   * CSS aspect-ratio value. Defaults to "16 / 9".
   * Use "4 / 3" for the stats-sketch prototype (original viewport shape).
   */
  aspect?: string;
}

export function VideoClip({
  src,
  poster,
  caption,
  label,
  aspect = "16 / 9",
}: VideoClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Skip autoplay for users who prefer reduced motion. The video
    // element remains interactive — they can press play manually.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay was blocked by the browser (common in some
              // user-agent policies); silently ignore — controls are
              // visible and the user can play manually.
            });
          } else {
            video.pause();
          }
        }
      },
      // 40% visibility threshold: enough of the player is on screen
      // to make autoplay feel intentional rather than accidental.
      { threshold: 0.4 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="cs-video-figure">
      <div className="cs-video-clip" style={{ aspectRatio: aspect }}>
        {label && (
          // aria-hidden: the label is decorative context ("Before" /
          // "After"). The figcaption below carries the accessible
          // description; screen readers don't need to announce both.
          <span className="cs-video-label" aria-hidden="true">
            {label}
          </span>
        )}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          controls
          className="cs-video-el"
          // title provides an accessible name when no figcaption exists.
          // When caption is present, the figcaption is the primary label
          // and title becomes redundant but harmless.
          title={caption ?? label}
        />
      </div>
      {caption && (
        <figcaption className="cs-video-caption">{caption}</figcaption>
      )}
    </figure>
  );
}
