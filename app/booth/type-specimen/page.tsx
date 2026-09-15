// ─────────────────────────────────────────────────────────────────
// /booth/type-specimen — a throwaway comparison page.
//
// It exists to answer one question with pixels instead of font names:
// which typeface should carry the Booth as a product inside this
// site's chrome. Nothing here is wired into the token system and
// nothing here is linked from anywhere. Delete the folder once the
// choice is made.
//
// WHAT IS BEING COMPARED. Green is not in the comparison — it is
// already this site's accent (a.link-loud is green-800 light and
// green-400 dark on every default page, and --cs-accent-strong is
// green too), so every candidate below uses the same two stops. The
// only variable is the face.
//
// THREE CONTEXTS, because a typeface that works in one can fail the
// next: the nav chip at 12px uppercase, a landing headline at 44px,
// and a real tool card where the labels do the work.
//
// The tokens are copied rather than imported, the way the demo's
// welcome page copies them: both panes have to render side by side
// on one screen, and the site's own theme tokens can only express one
// of them at a time.
// ─────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Space_Grotesk,
  Space_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Courier_Prime,
  Big_Shoulders,
  Archivo,
  Martian_Mono,
  Azeret_Mono,
  Syne,
  Anonymous_Pro,
  Fragment_Mono,
  Syne_Mono,
  Kode_Mono,
} from "next/font/google";

export const metadata: Metadata = {
  title: "Booth type specimen",
  robots: { index: false, follow: false },
};

// ─── The candidates ──────────────────────────────────────────────
// Loaded here rather than in the root layout so the comparison costs
// the rest of the site nothing.
const spaceGrotesk = Space_Grotesk({
  variable: "--sp-grotesk",
  subsets: ["latin"],
  display: "swap",
});
const spaceMono = Space_Mono({
  variable: "--sp-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  variable: "--sp-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--sp-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--sp-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// ─── Round two: the name ─────────────────────────────────────────
// The Booth is the theatre sense — the room a show is run from during
// performance. These four are the places type actually appears in and
// around that room, which is a different way of choosing a face than
// "which grotesque looks like software".
const courier = Courier_Prime({
  variable: "--sp-courier",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});
const bigShoulders = Big_Shoulders({
  variable: "--sp-shoulders",
  subsets: ["latin"],
  display: "swap",
});
const archivo = Archivo({
  variable: "--sp-archivo",
  subsets: ["latin"],
  display: "swap",
});
const martian = Martian_Mono({
  variable: "--sp-martian",
  subsets: ["latin"],
  display: "swap",
});
const azeret = Azeret_Mono({
  variable: "--sp-azeret",
  subsets: ["latin"],
  display: "swap",
});
const syne = Syne({
  variable: "--sp-syne",
  subsets: ["latin"],
  display: "swap",
});

// ─── Round three: the chip ───────────────────────────────────────
// The nav chip renders the mono, never the display face, at 12px
// uppercase and tracked out. Uppercase is what suppresses a departure:
// it removes a, g, j, y, l, 1 and 0, which is most of what separates
// one squared mono from another. These four are picked for uppercase
// distinctiveness rather than for lowercase charm.
const anonymous = Anonymous_Pro({
  variable: "--sp-anon",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});
const fragment = Fragment_Mono({
  variable: "--sp-fragment",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});
const syneMono = Syne_Mono({
  variable: "--sp-syne-mono",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});
const kode = Kode_Mono({
  variable: "--sp-kode",
  subsets: ["latin"],
  display: "swap",
});

type Candidate = {
  id: string;
  name: string;
  /** What this option is actually proposing, in one line. */
  note: string;
  /** Face for headlines and the brand mark. */
  display: string;
  /** Face for chips, labels, dates, and counts. */
  mono: string;
  /** Extra styling the display face needs to read as intended — a
   *  marquee wants weight and tracking, a typewriter wants bold. */
  displayStyle?: React.CSSProperties;
};

const CONTROL: Candidate = {
  id: "control",
  name: "Today — Instrument Serif + Roboto Mono",
  note: "The control. Roboto Mono is doing three jobs at once here: site utility mono, every culture sub-brand’s display face, and the Booth’s whole label vocabulary.",
  display: "var(--font-instrument-serif), Georgia, serif",
  mono: "var(--font-roboto-mono), ui-monospace, monospace",
};

const CANDIDATES: Candidate[] = [
  {
    id: "space",
    name: "Space Grotesk + Space Mono",
    note: "One designer’s pair, so the headline and the labels read as one voice. The most distinctive of the three.",
    display: "var(--sp-grotesk), system-ui, sans-serif",
    mono: "var(--sp-space-mono), ui-monospace, monospace",
  },
  {
    id: "plex",
    name: "IBM Plex Sans + IBM Plex Mono",
    note: "The institutional-software superfamily. Reads serious and familiar; also reads as IBM to anyone in the field.",
    display: "var(--sp-plex-sans), system-ui, sans-serif",
    mono: "var(--sp-plex-mono), ui-monospace, monospace",
  },
  {
    id: "jb",
    name: "Instrument Serif + JetBrains Mono",
    note: "Minimum change: only the labels get their own face. The Booth keeps the site’s editorial display voice.",
    display: "var(--font-instrument-serif), Georgia, serif",
    mono: "var(--sp-jetbrains), ui-monospace, monospace",
  },
];

// Round two. Each of these is an argument about what kind of room the
// Booth is, not just a pair of fonts.
const ROUND_TWO: Candidate[] = [
  {
    id: "promptbook",
    name: "The prompt book — Courier Prime, throughout",
    note: "The stage manager’s book is typed, so the Booth is typed: one face doing display and labels both. Courier Prime is the screenplay standard rather than the printer default — redrawn for the page it is actually read on. The most literal reading of the name, and the biggest departure on this page.",
    display: "var(--sp-courier), ui-monospace, monospace",
    mono: "var(--sp-courier), ui-monospace, monospace",
    displayStyle: { fontWeight: 700, letterSpacing: "-0.02em" },
  },
  {
    id: "marquee",
    name: "The marquee — Big Shoulders + Space Mono",
    note: "Front of house: the sign over the door and the board in the lobby. Big Shoulders was drawn for Chicago’s street signage, so it carries the condensed poster voice without dressing up as a vintage playbill. The labels stay mono because the booth’s own paperwork is.",
    display: "var(--sp-shoulders), system-ui, sans-serif",
    mono: "var(--sp-space-mono), ui-monospace, monospace",
    displayStyle: { fontWeight: 600, letterSpacing: "0.01em" },
  },
  {
    id: "console",
    name: "The console — Archivo + Martian Mono",
    note: "Inside the room: the lighting board, the comms panel, the engraved label under every fader. Archivo is the signage grotesque and Martian Mono is wide and squared enough to read as instrumentation rather than as code.",
    display: "var(--sp-archivo), system-ui, sans-serif",
    mono: "var(--sp-martian), ui-monospace, monospace",
    displayStyle: { fontWeight: 600, letterSpacing: "-0.01em" },
  },
  {
    id: "house",
    name: "The house — Syne + Azeret Mono",
    note: "The venue’s own identity rather than the show’s: Syne was drawn for an art centre, and it is the one face here that reads as a cultural institution instead of a tool. Azeret Mono keeps the labels squared and current. The furthest from the site without becoming a costume.",
    display: "var(--sp-syne), system-ui, sans-serif",
    mono: "var(--sp-azeret), ui-monospace, monospace",
    displayStyle: { fontWeight: 700, letterSpacing: "-0.02em" },
  },
];

/** One mono, judged only where it has to win: the chip beside the site
 *  wordmark. `family` is the face; `note` is what it departs on. */
type ChipFace = { id: string; label: string; family: string; note: string };

// Ordered from closest to furthest, so the strip reads as a ramp rather
// than as a menu. The first three are the ones already on this page.
const CHIP_FACES: ChipFace[] = [
  {
    id: "roboto",
    label: "Roboto Mono",
    family: "var(--font-roboto-mono), monospace",
    note: "The control — and the site’s current everything.",
  },
  {
    id: "spacem",
    label: "Space Mono",
    family: "var(--sp-space-mono), monospace",
    note: "The marquee’s chip. Its quirks are all in the lowercase.",
  },
  {
    id: "azeret",
    label: "Azeret Mono",
    family: "var(--sp-azeret), monospace",
    note: "The house’s chip. Same problem, one notch wider.",
  },
  {
    id: "kode",
    label: "Kode Mono",
    family: "var(--sp-kode), monospace",
    note: "Squared with cut corners. Departs on shape, not on style.",
  },
  {
    id: "martian",
    label: "Martian Mono",
    family: "var(--sp-martian), monospace",
    note: "Width is the one difference uppercase cannot flatten.",
  },
  {
    id: "fragment",
    label: "Fragment Mono",
    family: "var(--sp-fragment), monospace",
    note: "Typewriter proportions, modern strokes. No slabs.",
  },
  {
    id: "anon",
    label: "Anonymous Pro",
    family: "var(--sp-anon), monospace",
    note: "Slab terminals that survive 12px. Courier’s lineage, less period.",
  },
  {
    id: "syneMono",
    label: "Syne Mono",
    family: "var(--sp-syne-mono), monospace",
    note: "The house family’s own mono. Reads as a poster, not a terminal.",
  },
  {
    id: "courier",
    label: "Courier Prime",
    family: "var(--sp-courier), monospace",
    note: "Your pick for the nav. The furthest departure at this size.",
  },
];

// ─── Round five: which way the light comes from ──────────────────
// The inset rail was drawn as a tab indicator and does not read as one.
// At 12px on a rounded chip it reads as a hard drop shadow under a
// lifted card — the corners curl up on both sides, so the chip looks
// extruded rather than underlined. Nothing in it is directional; the
// direction is the eye supplying a light source for a shadow that has
// not named one, and a bottom-only shadow on a rounded box is genuinely
// ambiguous about where that light is.
//
// So name it. A hard offset shadow with no blur is the sign-painter's
// and letterpress device, which is the same room the marquee display
// came from, and it is conventionally cast down and to the right —
// light from the upper left, the direction Western reading already
// assumes. These six are that idea at different weights, plus the
// literal reading of "left to right" as a rail that fades across.
const SHADOW_STATES: { state: ChipState; label: string; note: string }[] = [
  {
    state: "rail",
    label: "The rail, as built",
    note: "inset 0 -2px — no horizontal offset at all, which is why it will not commit to a direction",
  },
  {
    state: "cast",
    label: "Cast down and right, 2px",
    note: "the same weight, moved off the corner so the light has a side it comes from",
  },
  {
    state: "cast-deep",
    label: "Cast down and right, 3px",
    note: "signage weight — more obviously a physical object, more obviously a marquee",
  },
  {
    state: "cast-soft",
    label: "Cast in a lighter stop",
    note: "the shadow a pale green rather than the accent, so it reads as thrown light instead of a second border",
  },
  {
    state: "cast-quiet",
    label: "Cast, with the chip itself quiet",
    note: "the outline back in the nav's own grey and green only in the shadow, so the accent marks the state rather than the object",
  },
  {
    state: "sweep",
    label: "A rail that fades left to right",
    note: "the literal reading — still a rail, but with a direction built into it",
  },
];

/** Round five. One pairing, six shadow treatments, on the real bar in
 *  both themes. The face is settled here — Big Shoulders over Anonymous
 *  Pro — so the only variable left is which way the light falls. */
function ShadowSet() {
  const mono = "var(--sp-anon), ui-monospace, monospace";
  return (
    <div className="lab">
      {SHADOW_STATES.map((s) => (
        <div key={s.state} className="labrow">
          <p className="labname">
            {s.label} <span>{s.note}</span>
          </p>
          <div className="barstack">
            <SiteBar mono={mono} theme="light" state={s.state} />
            <SiteBar mono={mono} theme="dark" state={s.state} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Round six: the light from the upper right ────────────────────
// Down and to the right is the convention, and it is a convention
// rather than a rule — a shadow only has to be consistent to read as a
// shadow. Cast down and to the left, the light sits over the reader's
// right shoulder and the chip still lifts off the bar. It also puts the
// shadow on the side the eye arrives from, which is the reading that
// was there all along.
//
// One thing it changes that the right-hand cast does not: the shadow
// falls into the gap between the Booth chip and the last professional
// label rather than into the gap before the theme toggle, so it leans
// back toward the run it is meant to be separate from.
const LEFT_CAST_STATES: { state: ChipState; label: string; note: string }[] = [
  {
    state: "cast-left",
    label: "Cast down and left, 2px",
    note: "box-shadow:-2px 2px 0 — the weight you picked, thrown the other way",
  },
  {
    state: "cast-left-deep",
    label: "Cast down and left, 3px",
    note: "the same direction at signage weight",
  },
];

/** Round six. The two weights he asked for, cast down and to the left,
 *  on the real bar in both themes. Same face, same bar; the only
 *  variable is the sign of the horizontal offset. */
function LeftCastSet() {
  const mono = "var(--sp-anon), ui-monospace, monospace";
  return (
    <div className="lab">
      {LEFT_CAST_STATES.map((s) => (
        <div key={s.state} className="labrow">
          <p className="labname">
            {s.label} <span>{s.note}</span>
          </p>
          <div className="barstack">
            <SiteBar mono={mono} theme="light" state={s.state} />
            <SiteBar mono={mono} theme="dark" state={s.state} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The chip lab: one face per row on the real bar, rest state only, in
 *  both themes. `upper` is the second variable — case, which against a
 *  bar of eight uppercase labels is a bigger lever than the face. */
function ChipBars({ upper }: { upper: boolean }) {
  return (
    <div className="lab">
      {CHIP_FACES.map((f) => (
        <div key={f.id} className="labrow">
          <p className="labname">
            {f.label} <span>{f.note}</span>
          </p>
          <div className="barstack">
            <SiteBar mono={f.family} theme="light" upper={upper} />
            <SiteBar mono={f.family} theme="dark" upper={upper} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Round four. Display and mono were bound together in rounds one and
// two, which is why liking the marquee meant accepting its chip. They
// are two independent choices, so these unbind them.
const ROUND_FOUR: Candidate[] = [
  {
    id: "marquee-anon",
    name: "The marquee, relabelled — Big Shoulders + Anonymous Pro",
    note: "The display you liked, with a chip that actually departs. Anonymous Pro carries the typed-paperwork reference through the slab terminals without the period costume, so the headline can be front-of-house and the labels stay the booth’s own.",
    display: "var(--sp-shoulders), system-ui, sans-serif",
    mono: "var(--sp-anon), ui-monospace, monospace",
    displayStyle: { fontWeight: 600, letterSpacing: "0.01em" },
  },
  {
    id: "marquee-courier",
    name: "The marquee, typed — Big Shoulders + Courier Prime",
    note: "The same display against the chip you actually picked. The pairing is the literal division of labour in the room: the sign outside is set in signage type and the book on the desk is typed.",
    display: "var(--sp-shoulders), system-ui, sans-serif",
    mono: "var(--sp-courier), ui-monospace, monospace",
    displayStyle: { fontWeight: 600, letterSpacing: "0.01em" },
  },
  {
    id: "house-family",
    name: "The house, in one family — Syne + Syne Mono",
    note: "Your close second, with its own family’s mono instead of a borrowed one. Syne Mono is drawn to the same brief as the display, so the chip departs for the same reason the headline does rather than by importing a second idea.",
    display: "var(--sp-syne), system-ui, sans-serif",
    mono: "var(--sp-syne-mono), ui-monospace, monospace",
    displayStyle: { fontWeight: 700, letterSpacing: "-0.02em" },
  },
];

// ─── The bar as it actually ships ────────────────────────────────
// Copied out of components/chrome/Nav.tsx at its horizontal layout
// rather than sketched: the wordmark in Instrument Serif at 20px, then
// eight route labels in 12px Roboto Mono, uppercase, tracked 0.08em —
// three of them in their sub-brand colours — two 1px dividers, the
// chip, and the theme toggle at 36px.
//
// WHY FAITHFULLY. The first cut of this page put three title-case sans
// labels beside the chip, which made the chip the only uppercase mono
// thing on the bar and flattered every candidate equally. The real bar
// is the opposite situation: eight labels already use the chip's exact
// recipe, so a chip that keeps it has eight siblings and departs from
// nothing. Nothing in this bar is a proposal and none of it is in scope
// to change — the only variable is the chip's own face.

/** Which active treatment the chip is wearing. `rest` is the ordinary
 *  state; everything after `tint` is round five, where the rail turned
 *  out to be reading as a shadow rather than as a tab indicator. */
type ChipState =
  | "rest"
  | "rail"
  | "tint"
  | "cast"
  | "cast-deep"
  | "cast-soft"
  | "cast-quiet"
  | "sweep"
  | "cast-left"
  | "cast-left-deep";

const CHIP_STATE_CLASS: Record<ChipState, string> = {
  rest: "chip",
  rail: "chip chip-rail",
  tint: "chip chip-tint",
  cast: "chip chip-cast",
  "cast-deep": "chip chip-cast-deep",
  "cast-soft": "chip chip-cast-soft",
  "cast-quiet": "chip chip-quiet chip-cast",
  sweep: "chip chip-sweep",
  "cast-left": "chip chip-cast-left",
  "cast-left-deep": "chip chip-cast-left-deep",
};

function SiteBar({
  mono,
  theme,
  upper = true,
  state = "rest",
}: {
  mono: string;
  theme: "light" | "dark";
  upper?: boolean;
  state?: ChipState;
}) {
  return (
    <div className={`bar bar-${theme}`}>
      <span className="bar-mark">Malcolm Xavier</span>
      <span className="bar-right">
        {/* The three culture routes, each in its own sub-brand colour.
            They are leaving for their own site eventually, which is why
            the chip sits on the far right rather than where they are. */}
        <span className="bar-group">
          <span className="bar-link" style={{ color: "var(--sb-film)" }}>
            Films
          </span>
          <span className="bar-link" style={{ color: "var(--sb-tv)" }}>
            Television
          </span>
          <span className="bar-link" style={{ color: "var(--sb-music)" }}>
            Music
          </span>
        </span>
        <span className="bar-rule" />
        <span className="bar-group">
          <span className="bar-link">About</span>
          <span className="bar-link">Resume</span>
          <span className="bar-link">Case studies</span>
          <span className="bar-link">Consulting</span>
          <span className="bar-link">Contact</span>
        </span>
        <span className="bar-rule" />
        <span
          className={`${CHIP_STATE_CLASS[state]}${upper ? "" : " chip-sentence"}`}
          style={{ fontFamily: mono }}
        >
          The Booth
        </span>
        {/* The toggle, same height and radius and border as the chip.
            It is the thing the chip must not be mistaken for. */}
        <span className="bar-toggle">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          auto
        </span>
      </span>
    </div>
  );
}

/** One face, judged where it has to win: on the real bar, in both
 *  themes. The three bars per theme are the chip's three states, which
 *  is the other decision still open. */
function BarSet({ mono, upper = true }: { mono: string; upper?: boolean }) {
  return (
    <>
      {(["light", "dark"] as const).map((theme) => (
        <div key={theme} className="barstack">
          {(["rest", "rail", "tint"] as const).map((state) => (
            <SiteBar
              key={state}
              mono={mono}
              theme={theme}
              upper={upper}
              state={state}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/** One theme pane: the two contexts rendered in one candidate. */
function Pane({ c, theme }: { c: Candidate; theme: "light" | "dark" }) {
  const label = { fontFamily: c.mono };
  return (
    <div className={`pane pane-${theme}`}>
      <p className="pane-tag">{theme}</p>

      {/* ── Context 1: the landing hero ────────────────────────── */}
      <div className="hero">
        <p className="kicker" style={label}>
          A working system
        </p>
        <h2 style={{ fontFamily: c.display, ...c.displayStyle }}>
          Every noun on these screens is configuration
        </h2>
        <p className="lede">
          The Booth is one surface over several views of shared data. Rename a
          stage, a lane, or a whole view, and the surface follows — because none
          of those words is written into the code that renders them.
        </p>
      </div>

      {/* ── Context 2: the tool's own chrome, then a card in it ── */}
      <div className="toolbar">
        <span
          className="toolmark"
          style={{ fontFamily: c.display, ...c.displayStyle }}
        >
          The Booth
        </span>
        <span className="toolnav" style={label}>
          <span className="on">TODAY</span>
          <span>CALENDAR</span>
          <span>PIPELINE</span>
          <span>PEOPLE</span>
        </span>
      </div>
      <div className="card">
        <div className="cardtop">
          <span className="lane" style={label}>
            PIPELINE
          </span>
          <span className="when" style={label}>
            2 DAYS LATE
          </span>
        </div>
        <p className="cardtitle">Send the follow-up on the Northwind panel</p>
        <p className="cardctx">
          Booked when you answered the thread · nobody attached to this pursuit
        </p>
        <div className="cardfoot">
          <span className="metric" style={label}>
            14d · 3 rounds · $0
          </span>
          <span className="acts">
            <span className="btn" style={label}>
              Done
            </span>
            <span className="btn" style={label}>
              Not today
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Block({ c }: { c: Candidate }) {
  return (
    <section className="spec-block">
      <h3 className="blockname">{c.name}</h3>
      <p className="blocknote">{c.note}</p>
      <BarSet mono={c.mono} />
      <p className="micro-wide">
        The bar as it ships, three times per theme: the chip at rest, then the
        two candidate active treatments — an inset rail, then an accent tint.
      </p>
      <div className="panes">
        <Pane c={c} theme="light" />
        <Pane c={c} theme="dark" />
      </div>
    </section>
  );
}

export default function TypeSpecimen() {
  // A working page for the local type decision, not something the public
  // site serves: in a production build it answers as a missing page.
  if (process.env.NODE_ENV === "production") notFound();

  const vars = [
    spaceGrotesk.variable,
    spaceMono.variable,
    plexSans.variable,
    plexMono.variable,
    jetbrains.variable,
    courier.variable,
    bigShoulders.variable,
    archivo.variable,
    martian.variable,
    azeret.variable,
    syne.variable,
    anonymous.variable,
    fragment.variable,
    syneMono.variable,
    kode.variable,
  ].join(" ");

  return (
    <div className={`specimen ${vars}`}>
      <header className="head">
        <h1>The Booth, in four rounds</h1>
        <p>
          Green is constant in every pane — green-800 on white at 7.3:1, green-400
          on black at 15.4:1, the same stops this site’s loud links already use.
          The only variable below is the typeface.
        </p>
      </header>

      {/* Round one asked which face reads as software. Round two asks
          which face reads as a booth, which is a different question and
          the one the name was always pointing at. */}
      <h2 className="roundhead">
        Round one <span>— extending the brand</span>
      </h2>
      <Block c={CONTROL} />
      {CANDIDATES.map((c) => (
        <Block key={c.id} c={c} />
      ))}

      <h2 className="roundhead">
        Round two <span>— departing from it, on the name</span>
      </h2>
      <p className="roundnote">
        The Booth is the theatre sense: the room a show is run from during
        performance. Each of these takes its face from somewhere type
        actually appears in that room — the prompt book on the desk, the
        marquee over the door, the labels on the board, the venue’s own
        identity. Space Grotesk is still the one to beat.
      </p>
      {ROUND_TWO.map((c) => (
        <Block key={c.id} c={c} />
      ))}

      <h2 className="roundhead">
        Round three <span>— the chip, on the bar it actually sits on</span>
      </h2>
      <p className="roundnote">
        Every bar below is the shipping one, unchanged: eight route labels in
        12px Roboto Mono, uppercase, tracked 0.08em, three of them in their
        sub-brand colours. That is the chip’s own recipe, which is the whole
        problem — a chip set in another squared mono and styled the same way has
        eight siblings and departs from nothing. The faces that do break out
        break out on width or on slab terminals, because those are the only
        differences uppercase cannot flatten.
      </p>
      <ChipBars upper />
      <p className="micro-wide">
        The same nine, sentence case and untracked, against the same unchanged
        bar. Case is the larger lever by some distance: it is the one move that
        makes the chip stop reading as a ninth route label and start reading as
        a name. The Booth’s own labels stay uppercase inside the tool — this is
        the one chip that sits beside the site wordmark.
      </p>
      <ChipBars upper={false} />

      <h2 className="roundhead">
        Round four <span>— the display and the chip, unbound</span>
      </h2>
      <p className="roundnote">
        Rounds one and two bound each display face to a mono, which is why
        liking the marquee meant taking its chip. They are two decisions. These
        three take a display you already ranked and give it a chip that departs.
      </p>
      {ROUND_FOUR.map((c) => (
        <Block key={c.id} c={c} />
      ))}

      <h2 className="roundhead">
        Round five <span>— which way the light comes from</span>
      </h2>
      <p className="roundnote">
        The rail was drawn as a tab indicator and it is not reading as one. On
        a rounded chip at this size it reads as a hard shadow under a lifted
        card, and because it has no horizontal offset it never says where the
        light is — which is what leaves the eye free to put it on the wrong
        side. A hard offset shadow with no blur is the sign-painter’s device,
        which is the room the marquee came from, and it is cast down and to the
        right so the light sits where reading order already assumes it is. The
        bar and the face are unchanged below; the only variable is the shadow.
      </p>
      <ShadowSet />

      <h2 className="roundhead">
        Round six <span>— cast down and to the left</span>
      </h2>
      <p className="roundnote">
        The same hard shadow with the horizontal offset reversed: light over
        the reader’s right shoulder instead of the left. It reads perfectly
        well — a shadow only has to be consistent to be legible, and down-left
        is a convention rather than a rule. The one real difference is which
        gap it falls into. Cast right, the shadow lands in the 8px before the
        theme toggle; cast left, it lands in the space between the chip and
        the last professional label, which is the gap the divider is there to
        hold open.
      </p>
      <LeftCastSet />

      <style
        dangerouslySetInnerHTML={{
          __html: `
.specimen {
  --accent-light:#056510;
  --accent-dark:#3dfd53;
  font-family:var(--font-dm-sans), system-ui, sans-serif;
  max-width:96rem;
  margin:0 auto;
  padding:2.5rem 1.5rem 6rem;
}
.head { max-width:46rem; margin:0 0 3rem; }
.head h1 { font-family:var(--font-instrument-serif), Georgia, serif;
  font-weight:400; font-size:2.5rem; line-height:1.1; margin:0 0 0.75rem; }
.head p { margin:0; line-height:1.6; color:var(--text-body); }

/* The round dividers. They are structural rather than decorative: round
   one and round two are answers to two different questions. */
.roundhead {
  font-family:var(--font-instrument-serif), Georgia, serif;
  font-weight:400; font-size:1.75rem; line-height:1.2;
  margin:0 0 0.75rem; padding-top:1.5rem;
  border-top:2px solid var(--accent-light);
}
.roundhead span { font-family:var(--font-dm-sans), system-ui, sans-serif;
  font-size:1rem; color:var(--text-caption); }
.roundnote { max-width:46rem; margin:0 0 2.5rem; line-height:1.6;
  color:var(--text-body); }

.spec-block { margin:0 0 3.5rem; }
.blockname { font-family:var(--font-dm-sans), system-ui, sans-serif;
  font-size:1.0625rem; font-weight:600; margin:0 0 0.25rem; }
.blocknote { margin:0 0 1rem; font-size:0.9375rem; line-height:1.55;
  color:var(--text-caption); max-width:52rem; }

/* Two panes side by side so both themes are judged at once. Under the
   breakpoint they stack rather than shrink — a chip at half width is
   not the thing being judged. */
.panes { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
@media (max-width:64rem) { .panes { grid-template-columns:1fr; } }

/* ── The panes carry their own tokens ─────────────────────────
   Copied, not inherited: both themes render on one screen, and the
   site's own theme tokens can only be one of them at a time. */
.pane { border-radius:10px; padding:1.25rem; border:1px solid; }
.pane-light, .bar-light {
  --bg:#ffffff; --raised:#ffffff; --muted:#f5f6f5;
  --tx:#000000; --soft:#525452; --faint:#6d706d;
  --bd:#e1e4e1; --accent:var(--accent-light); --tint:#e7ffe9;
  /* The bar's own two borders, which are not the same token: the
     dividers are --border-default and the chip and toggle outlines are
     --border-interactive, which is the stop that clears 3:1. */
  --rule:#a4a7a4; --ui:#7b7e7b; --cast:#9efea9;
  --sb-film:#8f5912; --sb-tv:#08127b; --sb-music:#46067d;
}
.pane-dark, .bar-dark {
  --bg:#000000; --raised:#0e0f0e; --muted:#1a1c1a;
  --tx:#ffffff; --soft:#e1e4e1; --faint:#a4a7a4;
  --bd:#525452; --accent:var(--accent-dark); --tint:rgba(61,253,83,0.12);
  --rule:#525452; --ui:#a4a7a4; --cast:#024e07;
  --sb-film:#f2a94b; --sb-tv:#6e78e1; --sb-music:#ac6ce3;
}
.pane { background:var(--bg); color:var(--tx); border-color:var(--bd); }
.pane-tag { margin:0 0 1rem; font-family:var(--font-roboto-mono), monospace;
  font-size:0.6875rem; letter-spacing:0.1em; text-transform:uppercase;
  color:var(--faint); }

/* ── The real bar ────────────────────────────────────────────────
   Measurements lifted from components/chrome/Nav.tsx and the token
   values it resolves to, so the backdrop is the shipping bar rather
   than a sketch of one: gap-5 (20px) inside a group and between
   groups, an extra ml-2 (8px) before the toggle, a 36px toggle, and
   12px/0.08em uppercase mono on every label.

   The dividers were --border-default, which resolves to #e1e4e1 in
   light — about 1.3:1 on white, so the rule separating the Booth from
   the professional run was effectively invisible in the light theme.
   They are --border-separator now (grey-600 light, grey-800 dark), and
   the values below are that. */
.bar {
  display:flex; align-items:center; justify-content:space-between;
  gap:1.25rem; padding:0.75rem 1rem;
  border:1px solid var(--bd); background:var(--bg); color:var(--tx);
}
.barstack { margin:0 0 0.5rem; }
.barstack .bar + .bar { border-top:0; }
.bar-mark { font-family:var(--font-instrument-serif), Georgia, serif;
  font-size:20px; line-height:1; white-space:nowrap; }
.bar-right { display:flex; align-items:center; gap:1.25rem; }
.bar-group { display:flex; align-items:center; gap:1.25rem; }
.bar-link { font-family:var(--font-roboto-mono), ui-monospace, monospace;
  font-size:12px; text-transform:uppercase; letter-spacing:0.08em;
  white-space:nowrap; }
.bar-rule { width:1px; height:1rem; background:var(--rule); flex:none; }
.bar-toggle {
  display:inline-flex; align-items:center; gap:0.5rem;
  height:36px; padding:0 0.75rem; margin-left:-0.75rem;
  border-radius:6px; border:1px solid var(--ui);
  background:var(--bg); color:var(--tx);
  font-family:var(--font-roboto-mono), ui-monospace, monospace;
  font-size:12px; text-transform:uppercase; letter-spacing:0.08em;
  white-space:nowrap;
}

/* ── The chip lab ────────────────────────────────────────────── */
.lab { margin:0 0 2.5rem; }
.labrow { margin:0 0 1.75rem; }
.labname { margin:0 0 0.375rem; font-size:0.8125rem; font-weight:600;
  color:var(--text-body); }
.labname span { font-weight:400; color:var(--text-caption); }

.chip {
  display:inline-flex; align-items:center; justify-content:center;
  padding:0.375rem 0.75rem; border-radius:6px;
  border:1px solid var(--accent);
  color:var(--accent);
  font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em;
  white-space:nowrap;
}
/* Active, take one: a rail hugging the inside of the chip's own border.
   It reads as a tab indicator rather than as an underline crammed
   under 12px of tracked-out type. */
.chip-rail { box-shadow:inset 0 -2px 0 var(--accent); }
/* Active, take two: the accent as a tint rather than a rule. No slab —
   the fill is the palest stop on the ramp, not the darkest. */
.chip-tint { background:var(--tint); }
/* Round five. A hard offset shadow, no blur, cast down and to the right.
   The chip keeps its own background so the shadow reads as a solid block
   behind it rather than as a second outline showing through. */
.chip-cast { box-shadow:2px 2px 0 var(--accent); background:var(--bg); }
.chip-cast-deep { box-shadow:3px 3px 0 var(--accent); background:var(--bg); }
/* Round six. The same shadow with the offset reversed — light from the
   upper right. Nothing else changes. */
.chip-cast-left { box-shadow:-2px 2px 0 var(--accent); background:var(--bg); }
.chip-cast-left-deep { box-shadow:-3px 3px 0 var(--accent); background:var(--bg); }
/* The same offset thrown in a pale stop of the ramp rather than the
   accent itself, so it reads as light falling off the chip. */
.chip-cast-soft { box-shadow:2px 2px 0 var(--cast); background:var(--bg); }
/* The chip outlined in the nav's own interactive grey, with the accent
   appearing only in the shadow. Pairs with .chip-cast. */
.chip-quiet { border-color:var(--ui); color:var(--tx); }
/* The literal reading of left-to-right: still a bottom rail, but drawn
   as a gradient so it has a direction. A background image rather than a
   box-shadow, because a shadow cannot carry a gradient. */
.chip-sweep {
  background-image:linear-gradient(90deg, var(--accent), transparent);
  background-size:100% 2px;
  background-position:left bottom;
  background-repeat:no-repeat;
}
/* The second variable in round three. Sentence case keeps the letterforms
   a mono is actually drawn around, which is most of what uppercase was
   throwing away. */
.chip-sentence { text-transform:none; letter-spacing:0; }
/* The same caption outside a pane, where there is no --faint to inherit. */
.micro-wide { margin:1rem 0 1rem; font-size:0.8125rem; line-height:1.55;
  color:var(--text-caption); max-width:52rem; }

/* ── Context 1: hero ─────────────────────────────────────────── */
.hero { margin:0 0 1.75rem; }
.kicker { margin:0 0 0.5rem; font-size:0.75rem; letter-spacing:0.08em;
  text-transform:uppercase; color:var(--accent); }
.hero h2 { margin:0 0 0.75rem; font-weight:400; font-size:2.125rem;
  line-height:1.12; letter-spacing:-0.01em; }
.lede { margin:0; font-size:0.9375rem; line-height:1.6; color:var(--soft);
  max-width:34rem; }

/* ── Context 2: a card off the tool ──────────────────────────── */
/* The tool's own top bar. This is where the display face does its real
   work — the site's wordmark is not the Booth's mark. */
.toolbar { display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;
  padding:0.5rem 0.75rem; margin-bottom:0.5rem;
  border:1px solid var(--bd); border-radius:8px; background:var(--muted); }
.toolmark { font-size:1.375rem; line-height:1.1; }
.toolnav { display:flex; gap:0.9rem; font-size:0.6875rem; letter-spacing:0.07em;
  color:var(--faint); }
.toolnav .on { color:var(--accent); box-shadow:inset 0 -2px 0 var(--accent);
  padding-bottom:2px; }
.card { background:var(--raised); border:1px solid var(--bd);
  border-radius:8px; padding:0.875rem 1rem; }
.cardtop { display:flex; align-items:center; gap:0.6rem; margin-bottom:0.5rem; }
.lane { font-size:0.625rem; letter-spacing:0.06em; padding:0.125rem 0.375rem;
  border-radius:3px; background:var(--muted); color:var(--soft); }
.when { font-size:0.6875rem; color:var(--accent); letter-spacing:0.04em; }
.cardtitle { margin:0 0 0.25rem; font-size:0.9375rem; line-height:1.45;
  font-weight:500; }
.cardctx { margin:0 0 0.75rem; font-size:0.8125rem; line-height:1.5;
  color:var(--faint); }
.cardfoot { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; }
.metric { font-size:0.6875rem; color:var(--soft); font-variant-numeric:tabular-nums; }
.acts { display:flex; gap:0.375rem; margin-left:auto; }
.btn { border:1px solid var(--bd); border-radius:4px; padding:0.25rem 0.5rem;
  font-size:0.625rem; text-transform:uppercase; letter-spacing:0.06em;
  color:var(--soft); white-space:nowrap; }
`,
        }}
      />
    </div>
  );
}
