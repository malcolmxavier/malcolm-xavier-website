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
// CLAIMS. Every factual statement here describes the real system. The
// vocabulary table is generated from the two profiles that actually
// ship in booth/vocabulary.json — nothing in it is illustrative.
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
    "A working surface that merges every workstream into one prioritized day, sized against the hours you actually have, and writes every decision back into the system that owns the record. Access on request.",
};

// ─── The label on every access button ────────────────────────────
// Every section ends with the same ask, and this is the word it uses
// unless a row overrides it. Written once so the button, the tracked
// event, and the mail subject can never drift apart.
export const REQUEST_ACCESS_LABEL = "Request access";

// ─── Hero ────────────────────────────────────────────────────────
// One claim, one paragraph under it, two ways forward, and the
// product itself beside them. The headline is the whole pitch in a
// line: if a reader takes nothing else off this page, it should be
// this sentence.
//
// `shotAlt` is what a screen reader gets instead of the capture, so
// it describes the layout and the controls rather than saying "a
// screenshot of Today". `shotCaption` is printed under the image and
// has one job beyond describing it: saying out loud that the people
// in the demo are invented, at the first moment a reader sees them.
export const HERO = {
  heading: "One prioritized day, out of every system you work in",
  lede:
    "The Booth reads the tools that already own your work, merges what is live into a single day prioritized against the hours you actually have, and writes every decision back where it came from.",
  primaryCta: "Request access",
  secondaryCta: "Sign in",
  shotAlt:
    "The Booth’s Today view: a standing-routine column on the left, the day’s prioritized cards in the centre each tagged with the workstream it came from and carrying Done, Not today, and Won’t do buttons, and a Coming up column on the right.",
  shotCaption:
    "Today, in the demo instance. Every person, organization, and message in it is invented.",
};

// ─── How it works ────────────────────────────────────────────────
// Three moves, in the order they happen. This is the "broad overview"
// a reader needs before any individual surface means anything.
//
// `tint` is the hue the card is filled with, and these three cards are
// where the page's whole palette is introduced. They sit side by side, so
// a reader meets green, blue, and orange once, together, before any of
// the three turns up again as a wash further down.
export const MOVES = [
  {
    tint: "green",
    title: "It reads the systems that already own the work",
    body: "Nothing is re-entered. Mail, a calendar, a pipeline file, a content board, and a dependency map are read where they live, and each stays the system of record for its own work.",
  },
  {
    tint: "blue",
    title: "It builds one day and puts it in order",
    body: "Every workstream is interleaved so no day is all one kind of work, meetings come off the top as fixed points, and what is left is sized against the hours you actually have rather than stacked into a list nobody could finish.",
  },
  {
    tint: "orange",
    title: "A decision is written back, and says where it landed",
    body: "Done, not today, and won’t do each propagate into the system that owns the record, and return a receipt naming every file written and every system skipped with the reason.",
  },
];

// The words around the three cards. `closer` is the paragraph under
// them, and it is the page's central claim rather than a summary: the
// third move is the one most tools skip, and this is where the page
// says why that is hard.
export const HOW_IT_WORKS = {
  heading: "Three moves, and the day is real",
  lede:
    "There is no inbox to keep clean and no board to groom. The work stays where it is; what the Booth owns is the order.",
  // Prefixed to the card's number. The counter is not decoration —
  // each move is only possible once the one before it has happened,
  // and the number is what lets a reader hold that across three cards.
  stepPrefix: "Step",
  closer:
    "That third move is the one most tools skip. Every card is a projection of some other system’s record, so “done” has nowhere to live on the card itself. One write path takes the decision and propagates it, then returns a receipt naming what it wrote and what it could not. Some decisions genuinely cannot propagate—those say so on the receipt rather than diverging quietly.",
  ctaLead: "Access is issued by hand, usually the same day.",
};

// ─── The surfaces ────────────────────────────────────────────────
// Four views, each with the capture that proves it, laid out two-up:
// the claim on the left and the screen it is a claim about on the
// right. `shot` is the basename of a pair in /public/booth-shots.
//
// `tint` is the hue of the wash behind the row. Blue and orange take two
// rows each; the third green on the page lands on the pipeline, which is
// the row carrying the strongest claim the product makes.
//
// `rule` is optional and is where a design decision lives that only
// makes sense against the surface it governs. These used to be their
// own section at the foot of the page, which separated every rule from
// the thing it was a rule about and asked the reader to hold four
// screens in their head to understand three constraints.
//
// `cta` is the button that closes the row. Every one of them opens the
// same mail composer, and the label is what changes, because each row
// has just made a different argument and the button is the end of that
// argument rather than a repeat of the last one. `close` marks the row
// that also closes the section: it takes the primary treatment, which
// is the section's own call to action moved inside the colour instead
// of standing in the gap underneath it.
export type Surface = {
  name: string;
  tint: "green" | "blue" | "orange";
  shot: string;
  what: string;
  how: string;
  caption: string;
  rule?: string;
  cta: string;
  close?: boolean;
};

export const SURFACES: Surface[] = [
  {
    name: "Today",
    tint: "blue",
    shot: "today",
    what: "The merged day, and the only view that answers what to do now.",
    how: "Each card carries the workstream it came from and the decision buttons that write it back. Habits sit outside the budget until one is genuinely late, and anything with a clock on it is converted into your own timezone exactly once.",
    caption: "Today, with the day’s fixed points at the top and the budget already spent against them.",
    cta: "See a day assembled",
  },
  {
    name: "The week",
    tint: "orange",
    shot: "calendar",
    what: "Where everything sits, which is a different question from what is next.",
    how: "Recurring work is stored as rules and expanded on read, never written into days—so extending the schedule is not a migration, and a habit skipped on Tuesday is skipped on Tuesday only. Moving something here is a real write, with the same refusals the command line enforces.",
    caption: "The week. Dragging a card takes the day, because a card’s position is its date.",
    cta: "See a week in place",
  },
  {
    name: "The pipeline",
    tint: "green",
    shot: "pipeline",
    what: "Opportunities, meetings, people, and the routes into an organization.",
    how: "It reads the mailbox. A loss notice closes an opportunity, a reply closes the card that asked for it and records everybody who was on the thread, and a prioritized list of who might introduce you is built out of what the file already knows rather than out of a connection degree.",
    caption: "The pipeline, grouped by stage. Stage names come from a settings file, not the code.",
    rule: "It writes to your records without being asked, and shows its work. Every automated change logs what it replaced, the words it was read out of, and which run made it, with an undo on the record it touched—because the risk that matters is not who made the change, it is whether it can be taken back.",
    cta: "See it write back",
  },
  {
    name: "The map",
    tint: "blue",
    shot: "backlog",
    what: "Every open initiative across every project, in one dependency graph.",
    how: "Rows are workstreams and columns are depth, so the first column is everything that can be started today. It is the planning surface the other three draw work from.",
    caption: "The dependency map. The first column is what is unblocked right now.",
    cta: "See it running",
    close: true,
  },
];

// The words that open the four rows.
export const SURFACES_INTRO = {
  heading: "Four views over one set of records",
  lede:
    "Not four tools. One day, one week, one pipeline, and one map, all reading the same records—which is why a decision taken on any of them means the same thing on the others.",
};

// ─── One engine, any vocabulary ──────────────────────────────────
// Read out of the two profiles that ship in booth/vocabulary.json.
// Both columns are real configurations, and neither belongs to a
// customer: the left is the installation this site runs, the right is
// the demo anybody can be let into. Naming a client here would be a
// claim about who is using it rather than about what it does.
//
// The engine key each pair shares used to be a third column. It was
// the truest column on the page and the wrong one to show: a reader
// who does not write software has no use for `stage.prospects`, and
// putting it first made a claim about flexibility read as a claim
// about configuration files. What replaced it is the same row label in
// plain language, because two columns of bare words is a list of
// synonyms — the reader has to be told what the thing IS before two
// names for it mean anything.
export const VOCABULARY = [
  { of: "The thing you are pursuing", a: "Role", b: "Opportunity" },
  { of: "Early interest, nothing committed", a: "Prospects", b: "Shortlisted" },
  { of: "You have made your move", a: "Applied", b: "Proposed" },
  { of: "A live conversation", a: "Interviewing", b: "In progress" },
  { of: "Both sides have agreed", a: "Offer", b: "Agreement" },
  { of: "A warm route in", a: "Referral", b: "Introduction" },
];

// The prose beside the table, and the table's own labels. This is the
// commercial argument on the page: the claim is that a word is a
// setting, and two shipped configurations side by side are the proof.
//
// `columns` are the three table headings, in order, and they have to
// stay in step with the three keys on each row above — `of`, `a`, `b`.
// `caption` is read by a screen reader in place of the table and is
// not printed on the page.
export const VOCABULARY_COPY = {
  heading: "Every word on these screens is a setting",
  lede:
    "Nothing here is hard-coded to one kind of business. What you call a deal, a stage, a meeting, an introduction—each of them is a setting, so the same system runs a sales desk, an admissions office, or a development team without being rebuilt.",
  body: [
    "Two configurations ship with it, and both are running today. One is set up for a job search. The other is the demo—the same build, dressed as a partnerships desk, with every organization and person in it invented. Same software, same screens, a different list of words. Nothing was forked and nothing was rebuilt.",
    "That is the part worth a buyer’s attention. A CRM that fits an admissions funnel, a development office, or a two-person agency is not a different product—it is the same system and a list somebody wrote in an afternoon.",
  ],
  ctaLead:
    "Setting an instance up in a team’s own words is scoped work; rates are on the consulting page.",
  columns: ["What it is", "A job search", "The demo"],
  caption:
    "The same records under two shipped configurations: what each thing is, and the word each configuration uses for it.",
};

// ─── Getting in ──────────────────────────────────────────────────
// The trust close as well as the access route. `rule` is the last
// doubt a reader has before asking for a login — what the automated
// jobs behind these surfaces are allowed to reach — so it is printed
// against the ask rather than in a section of its own.
export const ACCESS = {
  heading: "Ask for a login",
  body:
    "Logins are issued one at a time, so the demo stays something shown deliberately rather than a link that ends up indexed. Say who you are and what you want to see, and a username and a password come back, usually the same day.",
  rule:
    "On the question every reader eventually asks: two of the jobs behind these surfaces can search the web, and both are denied the data folder outright. What they legitimately need is copied into a separate directory whose one rule is that everything in it is safe to read beside the internet. There is no exception list, because an exception is where the next sensitive file quietly becomes readable.",
  primaryCta: "Request access",
  secondaryCta: "Book 30 minutes",
  signInHeading: "Already have one?",
  signInBody: "Sign in with the username and password you were sent.",
};
