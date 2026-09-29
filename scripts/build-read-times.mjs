// ─────────────────────────────────────────────────────────────────
// build-read-times.mjs — counts the prose in every long-form page and
// writes lib/content/read-times.generated.ts.
//
// Run: npm run readtimes:build   (also runs as part of npm run build)
//
// WHY THIS EXISTS. Until 2026-09-28 every "N min read" on the site was
// a hand-typed integer: six on the case-study pages, three on the
// research modules, and none at all on the essays. Nine numbers, each
// guessed once and never revisited, on pages that get edited. Two of
// the nine were materially wrong — the privacy-law paper claimed 30
// minutes for 10,000 words of prose, which is 333 words a minute, or
// skimming rather than reading.
//
// WHY THE AST AND NOT A REGEX. These are TSX components, not Markdown,
// and this codebase comments heavily — several essay modules carry more
// words of comment than of prose. Counting the file's text would have
// been wildly wrong. Parsing solves it for free: TypeScript treats
// comments as trivia rather than nodes, so a walk over JsxText nodes
// sees the prose a reader sees and nothing else.
// ─────────────────────────────────────────────────────────────────

import ts from "typescript";
import { readFileSync, writeFileSync, globSync, mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";

// 225 words a minute. The usual range quoted for adult readers on
// general prose is 200–250; 225 sits in the middle and is deliberately
// not tuned to reproduce the old hand-set numbers, which is what would
// turn this script into a way of dressing up the same guesses.
const WORDS_PER_MINUTE = 225;

// Footnote bodies are excluded, and this is the one editorial judgment
// in the file. A footnote is followed when a reader wants it, not read
// in sequence, so counting a bibliography at reading speed inflates a
// paper by minutes nobody spends. `FnItem` is the footnote row in
// components/reading/Footnotes.tsx. Nothing else is excluded: the stat
// cards, evidence cards, and iteration cards on a case study ARE read,
// so they count.
const SKIP_INSIDE = new Set(["FnItem"]);

// PROSE IN PROPS. Walking JsxText alone counts the words between tags
// and misses every word a component takes as a prop — and on a case
// study that is a lot of reading: the beat titles and headlines, the
// eyebrow / big / caption on every Stat, the title on every
// EvidenceCard and IterationCard, the pull-quote attributions, and
// all 44 BeatSummary lists. Measured across the six studies on
// 2026-09-28: 2,739 words, which is 17% of the cluster's prose, none
// of it counted. The comment above claiming the stat and evidence
// cards "ARE read, so they count" was therefore true of intent and
// false of behaviour.
//
// It has to be an allowlist rather than "every string prop", because
// most props are not prose: className, id, href, cols, variant, and
// the tone / as / roman flags would all be counted as reading.
//
// `label` and `alt` are deliberately OUT. Both are accessible names
// rather than running text — BeatSummary's `label` is an aria-label
// that never renders — and a reading time is an estimate for somebody
// reading the page, not a total of every string in it.
const PROSE_ATTRS = new Set([
  "title",
  "headline",
  "eyebrow",
  "caption",
  "big",
  "lens",
  "name",
  "metric",
  "threshold",
  "kicker",
  "attribution",
  "points",
  "claudeTag",
]);

// A "word" has to carry a letter or digit, so punctuation sitting on
// its own (a stray · or →) is not counted as reading.
const countWords = (text) =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;

/** Count the words a reader actually reads in one .tsx module. */
function proseWords(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  let words = 0;
  const visit = (node, skipping) => {
    let skipHere = skipping;
    const tag = ts.isJsxElement(node)
      ? node.openingElement.tagName.getText(source)
      : ts.isJsxSelfClosingElement(node)
        ? node.tagName.getText(source)
        : undefined;
    if (tag && SKIP_INSIDE.has(tag)) skipHere = true;

    if (!skipHere && node.kind === ts.SyntaxKind.JsxText) {
      words += countWords(node.getText(source));
    }

    // Prose passed as a prop. Only STRING literals are counted here:
    // when an attribute holds JSX instead — `headline={<>Volume <Emph>
    // rose</Emph>.</>}` — its text is JsxText that the walk below
    // reaches on its own, and counting it here as well would double it.
    //
    // The whole initializer is searched rather than just its top level,
    // so a list of strings (`points={["…", "…"]}`) and a row of them
    // inside an object both count. A prop handed an identifier
    // (`rows={rows}`) still does not: resolving a binding is a
    // different job from reading a file, and the one case of it in the
    // cluster is a metrics table of numbers and two-word labels.
    if (
      !skipHere &&
      ts.isJsxAttribute(node) &&
      node.initializer &&
      PROSE_ATTRS.has(node.name.getText(source))
    ) {
      const collect = (n) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
          words += countWords(n.text);
        }
        ts.forEachChild(n, collect);
      };
      collect(node.initializer);
    }

    ts.forEachChild(node, (child) => visit(child, skipHere));
  };
  visit(source, false);
  return words;
}

/** Never below one minute: "0 min read" is not a useful thing to tell
 *  somebody, and a page that short does not need the label at all. */
const minutes = (words) => Math.max(1, Math.round(words / WORDS_PER_MINUTE));

// Keys are derived from the PATH alone, never by importing the module —
// an essay module pulls in React components, so evaluating one here
// would mean running the app to count its words. Essay and research
// slugs are their filenames; a case study's slug is its directory.
const sources = [
  ...globSync("app/essays/_essays/*.tsx").map((f) => ["essay", basename(f, ".tsx"), f]),
  ...globSync("app/research/_research/*.tsx").map((f) => ["research", basename(f, ".tsx"), f]),
  ...globSync("app/case-studies/*/page.tsx").map((f) => ["case-study", basename(dirname(f)), f]),
];

const entries = sources
  .map(([kind, slug, file]) => ({ kind, slug, file, words: proseWords(file) }))
  .sort((a, b) => (a.kind === b.kind ? a.slug.localeCompare(b.slug) : a.kind.localeCompare(b.kind)));

const lines = [
  "// ─────────────────────────────────────────────────────────────────",
  "// GENERATED by scripts/build-read-times.mjs — do NOT edit by hand.",
  "//",
  "// Prose word counts and reading times for every long-form page,",
  "// counted from the JSX text of each module. Regenerate with:",
  "//   npm run readtimes:build",
  "//",
  "// A missing entry is caught by lib/content/read-times.test.ts rather",
  "// than by a page quietly rendering no reading time.",
  "// ─────────────────────────────────────────────────────────────────",
  "",
  'export type ReadTimeKind = "essay" | "research" | "case-study";',
  "",
  "export type ReadTimeEntry = {",
  "  /** Words of prose a reader reads, footnote bodies excluded. */",
  "  words: number;",
  "  /** Those words at 225 words per minute, floored at 1. */",
  "  minutes: number;",
  "};",
  "",
  "export const WORDS_PER_MINUTE = " + WORDS_PER_MINUTE + ";",
  "",
  "export const READ_TIMES: Record<",
  "  ReadTimeKind,",
  "  Record<string, ReadTimeEntry>",
  "> = {",
];
for (const kind of ["case-study", "essay", "research"]) {
  lines.push(`  "${kind}": {`);
  for (const e of entries.filter((x) => x.kind === kind)) {
    lines.push(`    "${e.slug}": { words: ${e.words}, minutes: ${minutes(e.words)} },`);
  }
  lines.push("  },");
}
lines.push("};", "");

mkdirSync("lib/content", { recursive: true });
writeFileSync("lib/content/read-times.generated.ts", lines.join("\n"));

console.log(`✓ Wrote lib/content/read-times.generated.ts (${entries.length} pages)`);
for (const e of entries) {
  console.log(`   ${String(minutes(e.words)).padStart(3)} min  ${String(e.words).padStart(5)} words  ${e.kind}/${e.slug}`);
}
