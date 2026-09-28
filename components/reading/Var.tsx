// ─────────────────────────────────────────────────────────────────
// Var — a mathematical or placeholder variable in running prose, e.g.
// the `x` in "will anyone's line of business require this data in the
// next x years?"
//
// Deliberately NOT <Emph>. That is the site's editorial italic:
// Instrument Serif, wrapped in <em>, which carries semantic STRESS —
// a screen reader announces it with contrastive intonation. A variable
// is not emphasised speech, it is a named quantity, and <var> is the
// element HTML provides for it. Using <Emph> here would be wrong twice:
// the wrong announcement, and a display serif face doing a maths job on
// a single letter beside sans-serif body copy.
//
// Italic is the typographic convention for a variable and is set
// explicitly, so a reset that strips the UA default for <var> does not
// also strip the distinction. Inherits colour and family from the
// surrounding prose on purpose — a variable should read as part of the
// sentence, not as a highlighted term.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function Var({ children }: { children: ReactNode }) {
  return <var style={{ fontStyle: "italic" }}>{children}</var>;
}
