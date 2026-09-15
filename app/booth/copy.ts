// ─────────────────────────────────────────────────────────────────
// /booth — every word a reader sees, in one file.
//
// WHY IT IS SPLIT OUT. The page beside this one is layout: bands,
// columns, washes, and the components that carry them. This file is
// the argument the page makes. Keeping them apart means the copy can
// be rewritten end to end without opening a single tag, and a comma
// moved here can never break a build.
//
// HOW TO EDIT IT. Change the strings and nothing else. Every value
// below is plain text — there is no markup in any of them, so there
// is nothing to balance and nothing to escape. Adding or removing an
// entry from one of the arrays adds or removes a card, a row, or a
// table line; that is the one kind of edit that also changes the
// shape of the page.
//
// TWO MECHANICAL RULES, both of which a check will fail the build on.
//   1. Real glyphs, never HTML entities: ’ for an apostrophe, “ ” for
//      quotes, — for an em-dash, … for an ellipsis. Type them, do not
//      spell them out. `npm run typography:check` enforces it.
//   2. Em-dashes take no spaces around them — the site's own rule,
//      and the reason every — below is set tight.
//
// THREE REGISTERS, AND THIS FILE ONLY EVER SPEAKS THE THIRD.
//   1. Engine ids — `lane`, `emitter`, `item.id`. Identifiers in code,
//      never rendered where a person can read them.
//   2. Installation vocabulary — what one configured instance calls a
//      thing. "Role" in the author's own install, "Opportunity" in the
//      demo. Set per install in booth/vocabulary.json.
//   3. Product language — what this page, the onboarding screen, and
//      any marketing about the Booth call things to somebody who has
//      never seen it.
// An earlier version leaked register 1 into register 3: "ranked" and
// "lane" are how the system is described internally, not how a buyer
// describes their own work. The external words are "prioritized" and
// "workstream". Keep them consistent here, on the onboarding screen,
// and in anything published about the Booth.
//
// CLAIMS. Every factual statement here describes the real system.
// Anything named as a setting is one: the words come out of
// booth/vocabulary.json and the rules out of the config files
// beside it.
// Nothing on this page claims a business outcome, because the Booth
// has not produced one that has been measured.
// ─────────────────────────────────────────────────────────────────

// ─── Metadata ────────────────────────────────────────────────────
// `name` is the bare product name, used wherever a title is already
// in context (the OG card, the structured data). `pageTitle` is the
// browser tab and the search result, so it carries the claim as well
// as the name. `description` is the sentence a link preview shows and
// is the only place on the page that has to work with no page around
// it, which is why it ends by saying how to get in.
export const META = {
  name: "The Booth",
  pageTitle: "The Booth · One prioritized day, out of every system you work in",
  description:
    "The control room for your operations. The Booth merges every workstream into one prioritized day, sized against the hours you actually have, and writes every decision back into the system that owns the record. Access on request.",
};

// ─── Hero ────────────────────────────────────────────────────────
// One claim, one paragraph under it, two ways forward, and the
// product itself beside them. The headline is the whole pitch in a
// line: if a reader takes nothing else off this page, it should be
// this sentence.
//
// `shotAlt` is what a screen reader gets instead of the capture, so
// it describes the layout and the controls rather than saying "a
// screenshot of Today". There is no caption here, unlike the five
// surface shots further down: those are each making a point about one
// screen and the caption is what names it, while this one is the
// paragraph's own illustration and the paragraph is already the
// caption.
export const HERO = {
  heading: "The control room for your operations",
  lede:
    "The Booth connects to the tools you already use and prioritizes your day across every workstream. Manage your tasks, contacts, and calendar from one place. Every change you make is pushed back to the tool where that work lives.",
  primaryCta: "Request access",
  secondaryCta: "Sign in",
  shotAlt:
    "The Booth’s Today view: a line stating the date and how much of the day’s planned hours are spent, then the day’s prioritized cards, a timed call first, each tagged with the workstream it came from and carrying Done, Not today, and Won’t do buttons, beside a Coming up column listing the next dated items.",
};

// ─── How it works ────────────────────────────────────────────────
// Three steps, in the order they happen. This is the "broad overview"
// a reader needs before any individual surface means anything.
//
// `tint` is the hue the card is filled with, and these three cards are
// where the page's whole palette is introduced. They sit side by side, so
// a reader meets green, blue, and orange once, together, before any of
// the three turns up again as a wash further down.
export const MOVES = [
  {
    tint: "green",
    title: "It reads the systems you already use",
    body: "Choose the systems it can reach, and how much of each one it can see. A mailbox, a calendar, a CRM, a backlog—whatever tools are already in your stack.",
  },
  {
    tint: "blue",
    title: "It automatically prioritizes your day",
    body: "Set your capacity and the rules for work priority. The Booth interleaves each workstream around those settings.",
  },
  {
    tint: "orange",
    title: "It writes your updates back",
    body: "Make an update in the Booth and it writes through to your systems of record. If it can’t write something, it tells you.",
  },
];

// The words around the three cards.
export const HOW_IT_WORKS = {
  heading: "Connect your tools. Streamline your day.",
  // The space in "The Booth" is a non-breaking space (U+00A0), not a
  // normal one. This block's measure tracks the hero's grid column, so
  // it is fluid and where the lede breaks changes with the viewport —
  // at 1280 the first sentence ends with just enough room left over for
  // one short word, which split the product's name across two lines.
  // The name is one word as far as wrapping is concerned. It is not an
  // attempt to pin the break, which a fluid measure cannot hold.
  lede:
    "Connect your CRM, mailbox, calendar, or other tools. The Booth prioritizes your day against the goals you set.",
  // Prefixed to the card's number. The counter is not decoration —
  // each move is only possible once the one before it has happened,
  // and the number is what lets a reader hold that across three cards.
  stepPrefix: "Step",
};

// ─── The surfaces ────────────────────────────────────────────────
// Five views, each with the capture that proves it, laid out two-up:
// the claim on the left and the screen it is a claim about on the
// right. `shot` is the basename of a pair in /public/booth-shots.
//
// `tint` is the hue of the wash behind the row, and the sequence is a
// property of the whole page rather than of this array: the rows are
// five slabs in a run of nine, and no two touching slabs may share a
// hue. Counting from the hero that run is green, untinted, blue,
// orange, green, blue, orange, green, untinted — the five rows being the
// third through seventh of those, and the vocabulary band below them
// being fixed in the page itself. The ask at the foot takes no hue at
// all, which a band supports: it keeps the rhythm and the padding and
// draws its gradient transparent. An earlier order ended
// the rows on orange directly against the orange vocabulary band, and
// the two read as one slab of twice the height rather than as two
// sections, which is the failure this is arranged to avoid.
//
// `rule` is optional and is where a design decision lives that only
// makes sense against the surface it governs. These used to be their
// own section at the foot of the page, which separated every rule from
// the thing it was a rule about and asked the reader to hold four
// screens in their head to understand three constraints.
export type Surface = {
  name: string;
  tint: "green" | "blue" | "orange";
  shot: string;
  what: string;
  how: string;
  caption: string;
  rule?: string;
};

export const SURFACES: Surface[] = [
  {
    name: "Today",
    tint: "blue",
    shot: "today",
    what: "The Booth’s homepage. Your prioritized day at a glance.",
    how: "See your daily task list, your standing routines, and what is coming up. Each card tells you what workstream it came from and has the functionality to handle it without leaving the page. Anything with a fixed time sits at the top, and the rest of the day is arranged around it.",
    caption: "Today, with the day’s fixed points at the top and the budget already spent against them.",
  },
  {
    name: "The calendar",
    tint: "orange",
    shot: "calendar",
    what: "Your week or month of work in one view, including a full record of prior work.",
    how: "Drag tasks between days to reorder priorities, clear a crowded day, or pin work to a date yourself. Recurring work sits in its own band, so it never blocks your view of the rest of the day.",
    caption: "The calendar. Dragging a card takes the day, because a card’s position is its date.",
  },
  {
    name: "The network",
    tint: "green",
    shot: "network",
    what: "The people you know and what organizations they’re connected to.",
    how: "Flag the organizations you want to reach and the Booth sweeps every contact you have against them. Connections are ordered by what your own records show of each relationship, warmest first. Your standing routine starts from your top opportunity and takes the warmest connection into it, so the right person turns up in your daily task list. The card names the person and the tie, and leaves the message to you.",
    caption: "The network view on its Targets tab: each organization with its tier and the people already on file there.",
  },
  {
    name: "The pipeline",
    tint: "blue",
    shot: "pipeline",
    what: "Every opportunity you are working, stage by stage, and how long each has been sitting there. Connect your mailbox and the Booth scans it for updates, so the board keeps itself current.",
    how: "Work an opportunity from first contact to close, with every meeting, note, and person on its record. Mailbox updates do the rest—a loss notice closes the opportunity, and sending a reply closes the task that asked for one.",
    caption: "The pipeline, grouped by stage. Stage names come from a settings file, not the code.",
  },
  {
    name: "The backlog",
    tint: "orange",
    shot: "backlog",
    what: "Every open initiative across every project, in one dependency graph.",
    how: "Each card is one piece of work, holding the sub-tasks that finish it, and arrows run between the cards to show what is waiting on what—inside a single initiative and across all of them. It is the planning surface the others draw from.",
    caption: "The dependency map. The first column is what is unblocked right now.",
  },
];

// ─── Set up in your own words ──────────────────────────
// The commercial argument, and the last thing said before the ask: an
// instance is configured to one team's words and rules rather than
// built for one kind of business.
//
// This band used to carry a six-row table setting the author's own
// configuration beside the demo's, word for word. Every pair in it was
// real, and it still had to go. Two columns of synonyms is an audit of
// the software, not a claim about the reader's business — and the band
// spent five paragraphs establishing which installation each column
// belonged to, which is the page explaining itself rather than selling
// anything. The claim survives in prose, where it is two sentences,
// and what it costs to have one built moved to the ask, which is
// where a reader is deciding rather than reading about features.
export const VOCABULARY_COPY = {
  heading: "Your instance, in your own words",
  lede:
    "What you call a deal, a stage, a meeting, an introduction—each one is configuration rather than code, so an instance arrives speaking the way your team already talks.",
  body: [
    "The rules work the same way: what counts as urgent, what your daily capacity is, which kinds of work sit beside each other. The same build runs a sales desk, an admissions office, or a two-person studio, because none of that is written into the software.",
  ],
};

// ─── Getting in ──────────────────────────────────────────────────
// The ask, and the only place on the page that says what can be
// had. Two things can: a login, which is free and is the whole
// product, and a build, which is the consulting page's business.
//
// IT IS AN INVITATION, NOT A DESCRIPTION. Every earlier draft of this
// block explained the demo before asking for anything — what it is,
// how a login is issued, how fast one comes back. A reader at the foot
// of this page has read five surfaces and does not need the product
// described again; they need to be asked. Two sentences do it: what a
// login opens, and the two ways of asking for one, which are the two
// buttons underneath.
//
// Four things are deliberately absent, each of them present in an
// earlier draft. No turnaround is promised, because a timeline stated
// on a page is a commitment made by nobody. Nothing says how a login
// arrives either, and that one is a question of accuracy rather than
// taste: setting one up is sales-assisted, so "it comes back by email"
// described a self-serve flow that does not exist — a small untruth at
// the exact point the page is asking to be trusted. The walkthrough is
// named instead, because it is what actually happens and it is worth
// having. Nothing tells the reader what to put in the mail, either:
// "say who you are and what you want to see" attaches conditions to a
// request that has not been made yet, which reads as a door policy
// rather than an invitation. And the demo is not defined against
// something it is not — "the whole product, not a tour" asks a reader
// to picture a worse product nobody offered them, while the first half
// of that sentence was already carrying the claim on its own.
//
// The build note sits BELOW the buttons on purpose. It is the more
// expensive thing and the smaller audience: a reader who came for a
// login should hit the buttons first and meet the build on the way
// past, rather than read a paragraph about a price they did not ask
// for before they find the control they came for.
//
// This block also used to close on a paragraph about what the automated
// jobs behind these surfaces are allowed to reach, set under a divider
// as the last doubt before the ask. It came out. That answer belongs in
// a conversation and, at scale, in a licence and a privacy page —
// printing it here put the page's most technical paragraph in the place
// a reader is deciding to write, and it answered a question almost
// nobody has asked yet.
export const ACCESS = {
  heading: "Request demo access",
  body:
    "A demo login opens the whole product, with a worked example already running in it. Ask by mail, or book half an hour for a walkthrough.",
  // The build note, rendered under the buttons. The link lands on the
  // page's name rather than on the whole sentence: a full underlined
  // line directly beneath two buttons reads as a third control. It is
  // also the one link on this page that leaves by a full page load
  // rather than a client-side route change — see the `jump` prop in
  // page.tsx for why a deep link into a long page needs it.
  offer: {
    before: "Ready for your own? Scope and rates are on the ",
    linkLabel: "consulting page",
    href: "/consulting#ongoing-support",
    after: ".",
  },
  primaryCta: "Request access",
  secondaryCta: "Book 30 minutes",
  signInHeading: "Already have one?",
  signInBody: "Sign in with the username and password you were sent.",
};
