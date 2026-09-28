// ─────────────────────────────────────────────────────────────────
// useHydrated — true once the component is running on the client.
//
// Some things can only be known in the browser: which theme
// next-themes resolved, what the viewport is, what is in localStorage.
// A component that renders one thing on the server and another on the
// client produces a hydration warning, so the usual move is to render
// a neutral placeholder until hydration finishes.
//
// The idiom this replaces was `useState(false)` plus
// `useEffect(() => setMounted(true), [])`, written out twice — in
// ThemeToggle and in the sub-brand card on /styles. It works, and it
// is what react-hooks/set-state-in-effect flags: an effect whose whole
// job is to immediately set state is a render the component did not
// need to do, and the rule cannot tell this benign case apart from the
// cascading ones it exists to catch.
//
// useSyncExternalStore says the same thing without an effect. It takes
// three arguments: how to subscribe to changes, what the value is on
// the client, and what it is on the server. Hydration is a one-way
// door, so there is nothing to subscribe to — the subscribe function
// returns an unsubscribe and is never called back. React reads the
// server snapshot while hydrating and the client snapshot afterwards,
// which is exactly the transition being modelled.
// ─────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";

/** Hydration never changes after it happens, so there is no change to
 *  subscribe to. Defined at module scope rather than inline so the
 *  reference is stable and React does not treat every render as a new
 *  store to resubscribe to. */
const subscribe = () => () => {};

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during server render and the hydrating pass, `true` after.
 * Gate any browser-only reading on it.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}
