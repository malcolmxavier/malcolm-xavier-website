// ─────────────────────────────────────────────────────────────────
// check-typography.mjs — blunt backstop for the typographic-glyph convention.
//
// The convention: reader-facing prose uses real Unicode glyphs, never HTML
// character entities (&apos;, &mdash;, &hellip;, …). The ESLint rule
// (eslint-rules/typographic-glyphs.mjs) enforces this in the contexts an AST
// can see — JSX text, prose attributes, prose object-properties. This script
// is the part the AST can't reach: an HTML entity hiding in a plain string
// literal, a string ARRAY, a tagged-template, or any other shape. Entities are
// unambiguous — they have no legitimate place in shipping prose source — so a
// blunt text grep is a safe, structural backstop the AST rule can't replicate.
//
// It scans reader-facing source (app / components / lib, excluding tests) for
// the banned prose-entity set and fails if any survive. Load-bearing entities
// that have no prose-glyph equivalent (&amp;, &lt;, &gt;, &nbsp;) are allowed.
//
// Escape hatches (for the rare legitimate entity in code, like an HTML escaper
// or an entity DECODER whose job is to consume these strings):
//   • a file-level `// typography-check-ignore-file` comment, or
//   • a per-line `// typography-ok` comment.
//
// Run:  npm run typography:check        (scans the whole tree)
//       node scripts/check-typography.mjs <file> <file> …   (scans a subset)
// ─────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
const EXTENSIONS = [".tsx", ".jsx", ".ts"];

// The banned set: named entities for prose punctuation that each map to a real
// glyph. Deliberately EXCLUDES &amp;, &lt;, &gt;, and &nbsp; — those are
// sometimes the only correct way to write a literal &, <, >, or a non-breaking
// space in JSX, so banning them would be wrong.
const BANNED_NAMED = [
  "apos", "rsquo", "lsquo", "ldquo", "rdquo", "quot",
  "mdash", "ndash", "hellip",
  "rarr", "larr", "harr",
  "copy", "reg", "trade",
  "ge", "le", "times", "deg",
];

// Numeric character references for the same prose glyphs (straight quotes,
// curly quotes, dashes, ellipsis, arrows, math signs). Decimal code points; the
// matcher also accepts the hex form of each.
const BANNED_NUMERIC = new Set([
  34, 39, 215, 8211, 8212, 8216, 8217, 8220, 8221, 8230, 8594, 8804, 8805,
]);

// One regex that finds any entity; we classify each match against the banned
// sets so the allow-listed ones (&amp; etc.) fall through untouched.
const ENTITY_RE = /&(?:#x?[0-9a-f]+|[a-z]+);/gi;
const BANNED_NAMED_SET = new Set(BANNED_NAMED);

// Files whose entity strings are legitimate code (an escaper that PRODUCES
// entities, a decoder that CONSUMES them). Belt-and-suspenders alongside the
// in-file `typography-check-ignore-file` comment.
const EXCLUDE_FILES = new Set([
  "lib/feeds/spotify-utils.ts",
  "app/api/spotify/callback/route.ts",
]);

/** Recursively collect candidate source files under a directory. */
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if (
      EXTENSIONS.some((e) => name.endsWith(e)) &&
      !name.includes(".test.") &&
      !name.includes(".spec.")
    ) {
      out.push(full);
    }
  }
  return out;
}

/** Decode a matched entity to its code point, or null if it isn't numeric. */
function numericCodePoint(raw) {
  if (/^&#x/i.test(raw)) return parseInt(raw.slice(3, -1), 16);
  if (/^&#/.test(raw)) return parseInt(raw.slice(2, -1), 10);
  return null;
}

/** Is this matched entity one we ban in prose? */
function isBanned(raw) {
  const lower = raw.toLowerCase();
  const named = lower.slice(1, -1); // strip & and ;
  if (BANNED_NAMED_SET.has(named)) return true;
  const cp = numericCodePoint(raw);
  return cp != null && BANNED_NUMERIC.has(cp);
}

// Resolve the file list: explicit CLI args (used by the pre-commit hook) or a
// full tree walk.
const argFiles = process.argv.slice(2);
const files = argFiles.length
  ? argFiles.map((f) => join(ROOT, f))
  : SCAN_DIRS.flatMap((d) => {
      const abs = join(ROOT, d);
      try {
        return walk(abs, []);
      } catch {
        return [];
      }
    });

const findings = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  if (EXCLUDE_FILES.has(rel)) continue;
  if (!EXTENSIONS.some((e) => file.endsWith(e))) continue;
  if (file.includes(".test.") || file.includes(".spec.")) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue; // a staged-then-deleted file, etc.
  }
  if (content.includes("typography-check-ignore-file")) continue;
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("typography-ok")) return; // per-line escape hatch
    let m;
    ENTITY_RE.lastIndex = 0;
    while ((m = ENTITY_RE.exec(line))) {
      if (isBanned(m[0])) {
        findings.push({ rel, line: i + 1, col: m.index + 1, raw: m[0] });
      }
    }
  });
}

if (findings.length) {
  console.error(
    `\n✗ Typography check: ${findings.length} HTML entit${findings.length === 1 ? "y" : "ies"} found in reader-facing prose.\n` +
      `  Use the real Unicode glyph instead (’ “ ” — … →), not the entity.\n`,
  );
  for (const f of findings) {
    console.error(`    ${f.rel}:${f.line}:${f.col}  ${f.raw}`);
  }
  console.error(
    `\n  If an entity is legitimately code (an HTML escaper/decoder), add a\n` +
      `  \`// typography-ok\` line comment or \`// typography-check-ignore-file\`.\n`,
  );
  process.exit(1);
}

console.log("✓ Typography check: no banned HTML entities in reader-facing prose.");
