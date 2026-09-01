"use client";

// ─────────────────────────────────────────────────────────────────
// The sign-in card on /booth.
//
// The demo lives on another project, behind a password, and is reached
// through the rewrite in next.config.ts — so /booth/enter is a route
// over there, not here, and the passwords never enter this repo. This
// form is the only part of the exchange the public site owns.
//
// PROGRESSIVE ENHANCEMENT, and it is not ceremony here. This is the
// page a stranger opens from a link in an email, on whatever device
// and whatever browser they happen to have; a login that needs
// JavaScript to submit is a login that can fail silently in front of
// somebody Malcolm is trying to impress. So the markup is a real form
// with a real action and a real method, and it works with the script
// removed. The script only adds the thing a plain form cannot do —
// report the error without throwing the page away.
//
// Both paths are told apart on the other end by `Accept`. A plain
// post gets a redirect back to `?e=1`, which is what the effect below
// reads; a fetch gets a status and a sentence.
// ─────────────────────────────────────────────────────────────────

import { useState, type FormEvent } from "react";
import { Button } from "@/components/primitives/Button";
import { Body } from "@/components/typography/Body";

/** One message for every way a sign-in fails, because the other side
 *  deliberately does not say which half was wrong — distinguishing
 *  "no such user" from "wrong password" is how a list of names gets
 *  enumerated, and somebody holding a demo link has one credential to
 *  check either way. */
const REJECTED = "That login was not recognized. Check the username and password you were sent.";

/* The error tint, on both paths below.
 *
 * Body text rather than `--text-error`: the error ramp is tuned to sit on the
 * page background, and on the error SURFACE it fails AA in both themes (3.8:1
 * light, 3.4:1 dark, measured). The red is carried by the fill and the border,
 * which is where it belongs — the message itself only has to be legible, and
 * color is not what tells anybody this is an error anyway. */
const ERROR_STYLE = {
  background: "var(--surface-error)",
  color: "var(--text-body)",
  border: "1px solid var(--border-error)",
};

const UNREACHABLE = "The demo did not answer. Try again in a moment, or email me and I will send you a working link.";

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.next) {
        // A full navigation rather than a router push: the destination
        // is not a route in this app at all, it is the rewritten demo.
        window.location.assign(body.next);
        return;
      }
      setError(body?.message || REJECTED);
    } catch {
      setError(UNREACHABLE);
    }
    setBusy(false);
  }

  return (
    <form
      action="/booth/enter"
      method="post"
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      <Field
        name="username"
        label="Username"
        type="text"
        autoComplete="username"
        describedBy={error ? "sign-in-error" : undefined}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        describedBy={error ? "sign-in-error" : undefined}
      />

      {/* The script's own error. `role="alert"` rather than a live
          region on a permanent node: the message appears in response to
          something the visitor just did, which is exactly the case
          alert is for, and it is rendered only when there is one so
          nothing empty is announced. */}
      {error ? (
        <p
          id="sign-in-error"
          role="alert"
          className="m-0 rounded-md px-3 py-2 text-[13px]"
          style={ERROR_STYLE}
        >
          {error}
        </p>
      ) : null}

      {/* And the same message for the visitor with no script, revealed
          by the address alone. A failed post over there redirects to
          #sign-in-rejected, so `:target` is what shows this — no state,
          no effect reading the URL after the fact, and the browser
          moves focus here on arrival, which is how it gets announced.
          It stays hidden the rest of the time, including on the path
          above: the fetch never navigates, so the two can never both
          be showing. */}
      <p
        id="sign-in-rejected"
        className="m-0 hidden rounded-md px-3 py-2 text-[13px] target:block"
        style={ERROR_STYLE}
      >
        {REJECTED}
      </p>

      <Button type="submit" variant="primary" size="md" disabled={busy}>
        {busy ? "Opening…" : "Open the demo"}
      </Button>

      <Body size="sm" style={{ color: "var(--text-caption)" }}>
        Logins are issued one at a time. There is a link below for asking
        for one.
      </Body>
    </form>
  );
}

/** A labelled input. Split out because the two are identical apart
 *  from their names, and a login form is the wrong place for two
 *  slightly different copies of the same markup to drift. */
function Field({
  name, label, type, autoComplete, describedBy,
}: {
  name: string;
  label: string;
  type: "text" | "password";
  autoComplete: string;
  describedBy?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`sign-in-${name}`}
        className="text-[12px] uppercase tracking-[0.12em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-caption)" }}
      >
        {label}
      </label>
      <input
        id={`sign-in-${name}`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-describedby={describedBy}
        // 16px on the input itself: anything smaller makes iOS Safari
        // zoom the whole page on focus, and a login that jumps out of
        // frame when you tap it reads as broken.
        className="w-full rounded-md px-3 py-2 text-[16px]"
        style={{
          fontFamily: "var(--font-secondary)",
          background: "var(--surface-page)",
          color: "var(--text-body)",
          border: "1px solid var(--border-interactive)",
        }}
      />
    </div>
  );
}
