"use client";

// ─────────────────────────────────────────────────────────────────
// ShareBar — per-page share affordance.
//
// This is the real, per-surface sharing control (distinct from the
// Footer's global "Send this site" button, which is left untouched).
// It renders a compact row of icon buttons for the channels an
// emphasis profile pins above the fold, with the long tail collapsed
// under a "More" disclosure — so every surface can share to every
// channel ("swing wide") without the row itself getting noisy.
//
// Three kinds of channel, handled differently (see lib/share):
//   • copy         — writes the share URL to the clipboard and shows
//                    transient "Copied!" feedback (mirrors the
//                    Footer ShareButton's inline aria-live pattern).
//   • native       — opens the OS share sheet via navigator.share.
//                    Only rendered on devices that support it (feature
//                    detected after mount to avoid a hydration
//                    mismatch), where it's the mobile catch-all that
//                    reaches Signal, Instagram, Threads, etc.
//   • web-intent   — a normal link to a platform's compose/share URL
//                    (X, Bluesky, LinkedIn, WhatsApp, Messages, …).
//
// When the surface has a review card (film + TV show-level hero, and
// the per-review TV breakout), the "More" disclosure also carries a
// "Card image" group: download the landscape/Story card, or — on
// devices that support file sharing — native-share the Story card to
// the OS sheet (the Instagram-Story path). Downloading or sharing an
// image isn't most people's share mental model, so it lives under
// "More" rather than competing with the link channels up top.
//
// Every activation fires a SHARE_CLICK analytics event tagged with the
// channel, the content surface, and the path, so the dashboard can
// report what gets shared and through which channel. The shared URL is
// UTM-tagged per channel (buildShareUrl); the on-page canonical stays
// clean.
//
// Accessibility: the row is a labelled group; each icon-only button
// carries an aria-label; the copy feedback is announced via an
// aria-live status region; the "More" disclosure is a standard
// aria-expanded button whose popover closes on Escape (returning focus
// to the trigger) or an outside click; focus rings use --border-focus
// and hover transitions honor prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────

import { track } from "@vercel/analytics";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { buildShareUrl, type ShareChannelId } from "@/lib/share/build-share-url";
import { CHANNELS } from "@/lib/share/channels";
import { PINNED, overflowChannels, type EmphasisProfile } from "@/lib/share/emphasis";
import { IconDownload, IconShare } from "@/components/icons";

type ShareBarProps = {
  /** Site-relative path being shared (e.g. "/films/foo"). */
  path: string;
  /** Human title of the thing being shared — used as the native-share
   *  title and prefilled into the web-intent drafts. */
  title: string;
  /** Optional longer blurb passed to native share / intents that
   *  accept body text. */
  text?: string;
  /** Which channels pin above the "More" fold, and in what order. */
  emphasis: EmphasisProfile;
  /** Analytics surface tag for SHARE_CLICK — see ANALYTICS_EVENTS. */
  surface: string;
  /** Optional utm_campaign tag identifying the specific content
   *  (e.g. "case-study-user-interviews"). */
  campaign?: string;
  /** "bar" (default) = full-size row; "compact" = smaller buttons for
   *  dense contexts like a per-review "share this take" control. */
  variant?: "bar" | "compact";
  /** Optional visible label rendered with the buttons. */
  label?: string;
  /** "inline" (default) sits the label on the same row as the pills;
   *  "block" puts it on its own line with the pills grouped beneath —
   *  used in the narrow case-study TOC rail so the pills don't wrap
   *  mid-row around the label. */
  labelPlacement?: "inline" | "block";
  /** When set, a "Card image" row (download + native-share of the
   *  review card) renders beneath the link channels — the film + TV
   *  show-level hero share. Base path to the review-image route, WITHOUT
   *  a format query (e.g. "/films/foo-2024/review-image/0"). */
  imageBasePath?: string;
  /** Download filename stem for the card image. Required alongside
   *  `imageBasePath`; ignored without it. */
  imageFilenameStem?: string;
};

const FEEDBACK_TIMEOUT_MS = 1500;

// Whether navigator.share exists. Read through useSyncExternalStore so
// the server snapshot is always `false` (no navigator) and the client
// resolves the real capability after hydration — no setState-in-effect,
// no hydration mismatch. Web Share support never changes within a
// session, so the subscribe callback is a no-op.
function useNativeShareSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false,
  );
}

// Whether navigator can share *files* — the gate for the "Share image"
// menu item (distinct from useNativeShareSupported: sharing a File needs
// navigator.canShare({ files }), which many desktop browsers lack even
// when navigator.share exists). Same server-false / client-resolved
// pattern so first paint matches on both sides.
function useFileShareSupported(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function",
    () => false,
  );
}

export function ShareBar({
  path,
  title,
  text,
  emphasis,
  surface,
  campaign,
  variant = "bar",
  label,
  labelPlacement = "inline",
  imageBasePath,
  imageFilenameStem,
}: ShareBarProps) {
  // The "Card image" group only renders when both the route base and a
  // download stem are supplied (film + TV show-level hero, and the
  // per-review TV breakout).
  const hasImage = Boolean(imageBasePath && imageFilenameStem);
  // Native share is client-only; this is false on the server and during
  // the first client render, then resolves to the real capability —
  // keeping first paint identical on both sides (see the hook above).
  const nativeSupported = useNativeShareSupported();
  // File sharing is a narrower capability than native link sharing;
  // gates the "Share image" menu item (same server-false pattern).
  const fileShareSupported = useFileShareSupported();
  // Transient "Copied!" (or failure) message for the aria-live region.
  const [feedback, setFeedback] = useState<string | null>(null);
  // Whether the "More" overflow popover is open.
  const [moreOpen, setMoreOpen] = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const iconSize = variant === "compact" ? 15 : 18;
  const buttonSize = variant === "compact" ? 32 : 40;

  // Clear any pending copy-feedback timeout on unmount.
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  // Close the "More" popover on Escape (returning focus to its trigger)
  // or on a click outside it — the standard non-modal disclosure
  // dismissal contract.
  useEffect(() => {
    if (!moreOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreTriggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!moreWrapRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [moreOpen]);

  /** Fire the shared analytics event. Channel is the ShareChannelId for
   *  link channels, or an "image-…" tag for the card-image actions. */
  const fireShare = (channel: ShareChannelId | (string & {})) => {
    track(ANALYTICS_EVENTS.SHARE_CLICK, { channel, surface, path });
  };

  /** Show a status message that auto-clears — used for "Copied!" and
   *  other momentary confirmations. */
  const flashFeedback = (message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(
      () => setFeedback(null),
      FEEDBACK_TIMEOUT_MS,
    );
  };

  /** Show a status message that persists until explicitly changed —
   *  used for the async image share ("Preparing image…"), where a timed
   *  clear could wipe the message mid-operation. */
  const holdFeedback = (message: string | null) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(message);
  };

  /** Copy the UTM-tagged share URL and flash inline confirmation. */
  const handleCopy = async () => {
    const shareUrl = buildShareUrl(path, "copy", campaign);
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashFeedback("Copied!");
    } catch {
      flashFeedback("Copy failed");
    }
    fireShare("copy");
  };

  /** Open the OS share sheet. A cancel (AbortError) or unsupported
   *  environment resolves silently — no error surfaced to the user. */
  const handleNative = async () => {
    const shareUrl = buildShareUrl(path, "native", campaign);
    try {
      await navigator.share({ url: shareUrl, title, text });
      fireShare("native");
    } catch {
      // User dismissed the sheet or share is unavailable — no-op.
    }
  };

  // Card-image action targets. The landscape card is the bare route; the
  // Story (9:16) card adds ?format=story. Only meaningful when hasImage.
  const landscapeHref = imageBasePath ?? "";
  const storyHref = `${imageBasePath ?? ""}?format=story`;

  /** Record a card-image download for attribution (the <a download>
   *  performs the actual save). */
  const trackImageDownload = (format: "landscape" | "story") => {
    fireShare(`image-download-${format}`);
  };

  /** Fetch the rendered Story card and hand it to the OS share sheet as
   *  a file. Silent on user-cancel; on real failure, surfaces a message
   *  and opens the image so the reader can still save it manually. */
  const shareImageFile = async () => {
    const filename = `${imageFilenameStem}-story.png`;
    holdFeedback("Preparing image…");
    try {
      const res = await fetch(storyHref);
      if (!res.ok) throw new Error(`Image ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) {
        throw new Error("File share unsupported");
      }
      await navigator.share({ files: [file], title, text });
      holdFeedback(null);
      fireShare("image-story");
    } catch (err) {
      // AbortError = the user dismissed the sheet; not a failure.
      if (err instanceof DOMException && err.name === "AbortError") {
        holdFeedback(null);
        return;
      }
      flashFeedback("Couldn’t share the image — opening it instead.");
      window.open(storyHref, "_blank", "noopener,noreferrer");
    }
  };

  // Shared button chrome for the icon-only pinned buttons: a faint
  // bordered square that picks up body color, dims on hover, and shows
  // a keyboard-only focus ring in the active palette.
  const iconButtonClass =
    "inline-flex items-center justify-center rounded-md border border-solid " +
    "transition-opacity motion-reduce:transition-none hover:opacity-70 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2";
  const iconButtonStyle: React.CSSProperties = {
    width: buttonSize,
    height: buttonSize,
    color: "var(--text-body)",
    background: "var(--surface-default)",
    borderColor: "var(--border-default)",
    outlineColor: "var(--border-focus)",
    cursor: "pointer",
  };

  // Shared chrome for a labelled row inside the "More" popover — used by
  // both the channel items and the card-image items so they read as one
  // consistent menu.
  const menuItemClass =
    "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left no-underline " +
    "transition-opacity motion-reduce:transition-none hover:opacity-70 " +
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px]";
  const menuItemStyle: React.CSSProperties = {
    color: "var(--text-body)",
    background: "none",
    border: "none",
    outlineColor: "var(--border-focus)",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    letterSpacing: "0.02em",
    cursor: "pointer",
  };

  /** Render one channel as a compact icon-only control (pinned row). */
  const renderIconChannel = (id: ShareChannelId) => {
    const channel = CHANNELS[id];
    const Icon = channel.icon;

    if (channel.kind === "copy") {
      return (
        <button
          key={id}
          type="button"
          onClick={handleCopy}
          aria-label={channel.label}
          className={iconButtonClass}
          style={iconButtonStyle}
        >
          <Icon size={iconSize} />
        </button>
      );
    }

    // web-intent — a plain link to the platform's share/compose URL.
    const href = channel.buildHref!(
      buildShareUrl(path, id, campaign),
      title,
      text,
    );
    // sms: and mailto: hand off to a native app in place; http(s)
    // intents open a new tab so the reader keeps their spot on-site.
    const isExternal = href.startsWith("http");
    return (
      <a
        key={id}
        href={href}
        onClick={() => fireShare(id)}
        aria-label={channel.label}
        className={iconButtonClass}
        style={iconButtonStyle}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        <Icon size={iconSize} />
      </a>
    );
  };

  /** Render one channel as a labelled row item (inside "More"). */
  const renderMenuChannel = (id: ShareChannelId) => {
    const channel = CHANNELS[id];
    const Icon = channel.icon;

    const onActivate = (id2: ShareChannelId) => {
      // Close the popover after any selection so focus can return to
      // the page flow rather than stranding it in a dismissed menu.
      setMoreOpen(false);
      fireShare(id2);
    };

    if (channel.kind === "copy") {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            setMoreOpen(false);
            handleCopy();
          }}
          className={menuItemClass}
          style={menuItemStyle}
        >
          <Icon size={16} />
          <span>{channel.label}</span>
        </button>
      );
    }

    const href = channel.buildHref!(
      buildShareUrl(path, id, campaign),
      title,
      text,
    );
    const isExternal = href.startsWith("http");
    return (
      <a
        key={id}
        href={href}
        onClick={() => onActivate(id)}
        className={menuItemClass}
        style={menuItemStyle}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        <Icon size={16} />
        <span>{channel.label}</span>
      </a>
    );
  };

  const overflow = overflowChannels(emphasis);
  // "More" opens whenever there are overflow channels OR a card image to
  // offer — the image actions live inside it rather than competing with
  // the link channels up top (downloading/sharing an image isn't most
  // people's share mental model; it's a nicety kept a tap away).
  const hasMore = overflow.length > 0 || hasImage;

  // Label can sit inline with the pills (default) or on its own line
  // above them ("block") — the narrow case-study TOC rail uses block so
  // the pills group cleanly under the "Share" header instead of
  // wrapping mid-row.
  const isBlockLabel = labelPlacement === "block";

  const linkGroup = (
    <div
      role="group"
      aria-label="Share this page"
      className={
        isBlockLabel
          ? "flex flex-col items-start gap-2"
          : "inline-flex flex-wrap items-center gap-2"
      }
    >
      {label ? (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--p-xs-font-size)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-caption)",
            marginInlineEnd: isBlockLabel ? 0 : 4,
          }}
        >
          {label}
        </span>
      ) : null}

      {/* Controls — pinned pills, "More" disclosure, copy feedback. In
          block-label mode they sit in their own flex-wrap row under the
          label; inline mode uses display:contents so they flow as direct
          children of the outer inline-flex row (no layout box added). */}
      <div className={isBlockLabel ? "flex flex-wrap items-center gap-2" : "contents"}>
      {/* Native share leads the row on supporting devices — the mobile
          catch-all that reaches apps without a web intent. */}
      {nativeSupported ? (
        <button
          type="button"
          onClick={handleNative}
          aria-label={CHANNELS.native.label}
          className={iconButtonClass}
          style={iconButtonStyle}
        >
          {(() => {
            const Icon = CHANNELS.native.icon;
            return <Icon size={iconSize} />;
          })()}
        </button>
      ) : null}

      {/* Pinned channels for the active emphasis profile. */}
      {PINNED[emphasis].map(renderIconChannel)}

      {/* "More" disclosure — reveals every remaining channel, plus the
          "Card image" group when the surface has a review card. */}
      {hasMore ? (
        <div ref={moreWrapRef} style={{ position: "relative" }}>
          <button
            ref={moreTriggerRef}
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={moreOpen}
            aria-controls={menuId}
            className={
              "inline-flex items-center rounded-md border border-solid " +
              "transition-opacity motion-reduce:transition-none hover:opacity-70 " +
              "focus-visible:outline-2 focus-visible:outline-offset-2"
            }
            style={{
              height: buttonSize,
              padding: "0 12px",
              color: "var(--text-body)",
              background: "var(--surface-default)",
              borderColor: "var(--border-default)",
              outlineColor: "var(--border-focus)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--p-xs-font-size)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            More
          </button>

          {moreOpen ? (
            <div
              id={menuId}
              className="flex flex-col"
              style={{
                position: "absolute",
                insetInlineStart: 0,
                top: "calc(100% + 6px)",
                zIndex: 50,
                minWidth: 200,
                padding: 4,
                borderRadius: "var(--border-radius-md)",
                background: "var(--surface-default)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              }}
            >
              {overflow.map(renderMenuChannel)}

              {/* Card-image group — download the landscape/Story card,
                  or native-share the Story card on capable devices. Set
                  off from the channels above by a divider and a caption
                  header so the menu reads as two short groups, not one
                  long list. */}
              {hasImage ? (
                <>
                  {overflow.length > 0 ? (
                    <hr
                      style={{
                        margin: "4px 0",
                        border: "none",
                        borderTop: "1px solid var(--border-default)",
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      padding: "6px 12px 2px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-caption)",
                    }}
                  >
                    Card image
                  </span>

                  {/* Downloads use <a download>; the browser handles the
                      save, so we just track and close the menu. */}
                  <a
                    href={landscapeHref}
                    download={`${imageFilenameStem}.png`}
                    onClick={() => {
                      setMoreOpen(false);
                      trackImageDownload("landscape");
                    }}
                    className={menuItemClass}
                    style={menuItemStyle}
                  >
                    <IconDownload size={16} />
                    <span>Download landscape</span>
                  </a>
                  <a
                    href={storyHref}
                    download={`${imageFilenameStem}-story.png`}
                    onClick={() => {
                      setMoreOpen(false);
                      trackImageDownload("story");
                    }}
                    className={menuItemClass}
                    style={menuItemStyle}
                  >
                    <IconDownload size={16} />
                    <span>Download Story (9:16)</span>
                  </a>

                  {/* Native file share — only where the browser can share
                      a File. Closes the menu; the async status shows in
                      the bar's live region below. */}
                  {fileShareSupported ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        shareImageFile();
                      }}
                      className={menuItemClass}
                      style={menuItemStyle}
                    >
                      <IconShare size={16} />
                      <span>Share image</span>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Copy confirmation — always present so the live region can
          announce changes; empty until a copy fires. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "var(--text-caption)",
          marginInlineStart: 2,
          minWidth: feedback ? undefined : 0,
        }}
      >
        {feedback}
      </span>
      </div>
    </div>
  );

  // The link group is the whole control now: link channels pinned up
  // top, and — when the surface has a review card — the "Card image"
  // group folded into the same "More" disclosure rather than a separate
  // row. One affordance, no second live region.
  return linkGroup;
}
