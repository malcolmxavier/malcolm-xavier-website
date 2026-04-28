// scripts/build-tokens.mjs
//
// Reads the Tokens Studio multi-file export at _design/tokens/ and emits
// app/globals.css. The generated CSS is grouped by tier:
//
//   1. Tailwind import + @theme block (wires our tokens into Tailwind 4 utilities)
//   2. Brand primitives (color ramps, font-family, font-weight, scale)
//   3. Default alias for non-sub-brand pages (Landing/Resume/About/Contact/CV)
//   4. Per-sub-brand aliases at [data-subbrand="X"]
//   5. Mapped/light at :root, Mapped/dark at [data-theme="dark"]
//   6. Responsive type scale via media queries
//
// Run:  npm run tokens:build

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TOKENS_DIR = join(ROOT, "_design", "tokens");
const OUTPUT = join(ROOT, "app", "globals.css");

// ─────────────────────────────────────────────────────────────────────
// 1. Load all token sets in metadata-declared order
// ─────────────────────────────────────────────────────────────────────

// Schema for the Tokens Studio multi-file export's metadata file.
// We only validate the shape we depend on — adding new metadata
// fields upstream won't fail the build.
const MetadataSchema = z.object({
  tokenSetOrder: z.array(z.string()).min(1),
});

// A single token leaf has $value (primitive or {ref}) and $type. We
// don't enforce $type per leaf (it varies by token kind), but we do
// require $value to exist if $value is the discriminator.
const TokenLeafSchema = z.object({
  $value: z.union([z.string(), z.number()]),
  $type: z.string().optional(),
});

// Validate metadata up-front — fail loud if the export is malformed
// rather than silently emitting garbage CSS that breaks at runtime.
const metadata = MetadataSchema.parse(
  JSON.parse(readFileSync(join(TOKENS_DIR, "$metadata.json"), "utf-8")),
);
const setOrder = metadata.tokenSetOrder;

const sets = {};
for (const name of setOrder) {
  const filePath = join(TOKENS_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    console.warn(`  (skipping missing set: ${name})`);
    sets[name] = {};
    continue;
  }
  sets[name] = JSON.parse(readFileSync(filePath, "utf-8"));
}

// ─────────────────────────────────────────────────────────────────────
// 2. Helpers — walk, lookup, resolve, format
// ─────────────────────────────────────────────────────────────────────

// Yield [pathSegments, tokenObject] for every leaf token in a tree.
function* walkLeaves(obj, path = []) {
  if (!obj || typeof obj !== "object") return;
  if ("$value" in obj) {
    yield [path, obj];
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    yield* walkLeaves(value, [...path, key]);
  }
}

// Find a token in a single set by dot-separated reference path.
function findInSet(set, refPath) {
  let cur = set;
  for (const seg of refPath) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[seg];
  }
  return cur && "$value" in cur ? cur : null;
}

// Track unresolved references so the script can fail at the end
// rather than silently emitting broken `var(...)` chains. Same key
// appearing multiple times only counts once.
const unresolvedRefs = new Set();

// Resolve a $value across a chain of token sets (most-specific last).
// Returns the final primitive (string or number).
function resolveValue(value, scopeChain) {
  if (typeof value !== "string" || !value.startsWith("{")) return value;
  const refPath = value.slice(1, -1).split(".");
  for (let i = scopeChain.length - 1; i >= 0; i--) {
    const found = findInSet(sets[scopeChain[i]], refPath);
    if (found) return resolveValue(found.$value, scopeChain);
  }
  unresolvedRefs.add(`${value} in [${scopeChain.join(", ")}]`);
  return value;
}

// Convert path segments to a CSS variable name.
// ["green", "500"] → "--green-500"
// ["font-family", "DM Sans"] → "--font-family-dm-sans"
// ["text", "action-hover"] → "--text-action-hover"
function cssVar(path) {
  return (
    "--" +
    path
      .map((seg) =>
        String(seg).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      )
      .join("-")
  );
}

// Map Brand-layer font-family token names to the Next.js font CSS
// variables (set by next/font/google in app/layout.tsx). When the
// parser emits a Brand-level font-family token, it points to the
// hashed Next.js variable rather than the bare font name — otherwise
// the browser would look for a system font called "DM Sans" (which
// doesn't exist on most machines) instead of using the loaded font.
const NEXT_FONT_MAP = {
  "DM Sans": "var(--font-dm-sans)",
  "Roboto Slab": "var(--font-roboto-slab)",
  "Roboto Mono": "var(--font-roboto-mono)",
  "Instrument Serif": "var(--font-instrument-serif)",
};

// Format a resolved value for CSS output.
function format(value, type) {
  if (type === "number") return `${value}px`;
  if (type === "text") {
    // Font-family names — map to Next.js variables when known.
    if (NEXT_FONT_MAP[value]) return NEXT_FONT_MAP[value];
    return /\s/.test(value) ? `"${value}"` : value;
  }
  return String(value);
}

// For alias-tier color tokens that reference a Brand color, prefer
// emitting `var(--brand-name)` over the resolved hex. This keeps the
// CSS cascade live so theme/sub-brand swaps work via custom-property
// inheritance instead of hard-coded values.
function emitAliasValue(token, scopeChain) {
  const v = token.$value;
  if (typeof v === "string" && v.startsWith("{")) {
    const refPath = v.slice(1, -1).split(".");
    return `var(${cssVar(refPath)})`;
  }
  return format(resolveValue(v, scopeChain), token.$type);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Build CSS
// ─────────────────────────────────────────────────────────────────────

const out = [];

out.push("/* ──────────────────────────────────────────────────────────");
out.push("   Generated from _design/tokens/ — do NOT edit by hand.");
out.push("   Source: Tokens Studio multi-file export.");
out.push("   Regenerate:  npm run tokens:build");
out.push("   ────────────────────────────────────────────────────────── */");
out.push("");
out.push('@import "tailwindcss";');
out.push("");

// ─── Brand: primitive tokens ────────────────────────────────────────
out.push("/* ─── Brand: primitive tokens (color ramps, fonts, scale) ─── */");
out.push(":root {");
const brandSet = "Brand/Mode 1";
for (const [path, token] of walkLeaves(sets[brandSet])) {
  // Brand tokens are always primitives (no refs to resolve).
  const value = format(token.$value, token.$type);
  out.push(`  ${cssVar(path)}: ${value};`);
}
out.push("}");
out.push("");

// ─── Default alias (non-sub-brand pages: Landing/Resume/About/Contact/CV) ─
// Synthesized: primary/neutral both bind to grey; status colors use
// conventional families (red/green/yellow/blue).
out.push("/* ─── Default alias (Landing/Resume/About/Contact/CV) ─────── */");
out.push(":root {");
const defaultBindings = {
  primary: "grey",
  neutral: "grey",
  error: "red",
  success: "green",
  warning: "yellow",
  information: "blue",
};
for (const [semantic, brand] of Object.entries(defaultBindings)) {
  for (const stop of ["50", "100", "200", "300", "400", "500", "600", "700", "800"]) {
    out.push(`  --${semantic}-${stop}: var(--${brand}-${stop});`);
  }
  out.push(`  --${semantic}-default: var(--${brand}-500);`);
}
// --neutral-white / --neutral-black anchor the semantic mappings at
// :root (--text-body, --text-heading, --surface-page, etc.). Sub-brand
// alias blocks define them via Alias/<subbrand>.json, but the recruiter
// cluster has no alias file, so without these two lines the semantic
// chain invalidates silently on Landing/Resume/About/Contact/CV — pages
// rendered correctly only by browser canvas defaults. Per-sub-brand
// values still win via cascade.
out.push(`  --neutral-white: var(--foundation-white);`);
out.push(`  --neutral-black: var(--foundation-black);`);
// Default fonts for the recruiter cluster (Landing/Resume/About/Contact/CV):
//   - Display (primary): Instrument Serif — editorial, high-contrast, calm
//   - Body (secondary):  DM Sans — clean, scannable, recruiter-familiar
//   - Mono:              Roboto Mono — kicker/dateline/status
// Sub-brand pages override --font-primary and --font-secondary via the
// per-sub-brand alias blocks below to Roboto Mono + Roboto Slab.
out.push(`  --font-primary: var(--font-instrument-serif), Georgia, serif;`);
out.push(`  --font-secondary: var(--font-dm-sans), system-ui, sans-serif;`);
out.push(`  --font-mono: var(--font-roboto-mono), ui-monospace, monospace;`);
out.push("}");
out.push("");

// ─── Per-sub-brand aliases ─────────────────────────────────────────
out.push("/* ─── Per-sub-brand aliases ──────────────────────────────── */");
const aliasSets = setOrder.filter((s) => s.startsWith("Alias/"));
for (const setName of aliasSets) {
  const subbrand = setName.split("/")[1];
  out.push(`[data-subbrand="${subbrand}"] {`);
  for (const [path, token] of walkLeaves(sets[setName])) {
    out.push(`  ${cssVar(path)}: ${emitAliasValue(token, [brandSet, setName])};`);
  }
  out.push("}");
  out.push("");
}

// ─── Mapped: light (default) and dark ───────────────────────────────
out.push("/* ─── Mapped: semantic UI tokens (text/surface/border/icon) ─ */");
function emitMapped(setName, selector) {
  out.push(`${selector} {`);
  for (const [path, token] of walkLeaves(sets[setName])) {
    // Mapped values reference alias tokens (e.g. {primary.default}).
    // We want CSS-var indirection so the active alias at any [data-subbrand]
    // can swap them at runtime — same emitAliasValue logic.
    out.push(`  ${cssVar(path)}: ${emitAliasValue(token, [brandSet, setName])};`);
  }
  out.push("}");
  out.push("");
}
emitMapped("Mapped/light", ":root");
emitMapped("Mapped/dark", '[data-theme="dark"]');

// ─── AA-safe override for the recruiter cluster's action chain ─────
// Recruiter pages have --primary-default = --grey-500 (#cdd1cd). Any
// text token chained off --primary-default (--text-action, footer
// links, MusicShell active states) renders at ~1.5:1 on white, far
// below WCAG 4.5:1. We override the action chain in light mode only —
// dark recruiter (#cdd1cd on #000 ≈ 11:1) already passes — and let
// sub-brand pages re-thread through their own --primary-default below
// so accent colors stay sub-brand-correct.
//
// Specificity: `:root:not([data-theme="dark"])` is (0,1,1), which
// beats the Mapped/light :root rule (0,1,0) emitted above.
out.push("/* ─── AA-safe action chain on the recruiter cluster ───────── */");
out.push(":root:not([data-theme=\"dark\"]) {");
out.push("  --text-action: var(--grey-800);");
out.push("  --text-action-hover: var(--foundation-black);");
out.push("  --icon-action: var(--grey-800);");
out.push("  --icon-action-hover: var(--foundation-black);");
out.push("  --border-action: var(--grey-800);");
out.push("  --border-action-hover: var(--foundation-black);");
out.push("}");
out.push("");
// Sub-brand pages re-bind the action chain to their own --primary-default
// (which the per-sub-brand alias blocks overwrite to a saturated brand
// color). Without this, the literal grey-800 set above would inherit
// into sub-brand subtrees and kill accent links.
out.push("[data-subbrand] {");
out.push("  --text-action: var(--primary-default);");
out.push("  --text-action-hover: var(--primary-600);");
out.push("  --icon-action: var(--primary-default);");
out.push("  --icon-action-hover: var(--primary-600);");
out.push("  --border-action: var(--primary-default);");
out.push("  --border-action-hover: var(--primary-600);");
out.push("}");
out.push("");
// Dark-mode counterpart for sub-brand pages. --primary-default is
// the 500 stop, which fails AA on black for several sub-brands —
// purple-500 on #000 = 2.7:1 (caught by axe on /music's kicker
// during the 2026-04-28 audit), blue-500 = 2.4:1 — so we rebind to
// the 300 stop in dark mode, where every sub-brand color clears
// 4.5:1. Hover bumps to 200 (always >9:1 on black). Specificity
// (0,2,0) beats the (0,1,0) [data-subbrand] rule above; the
// [data-theme="dark"] selector also has to come AFTER it in source
// order to win on equal-specificity ties for non-action tokens.
out.push("[data-theme=\"dark\"][data-subbrand], [data-theme=\"dark\"] [data-subbrand] {");
out.push("  --text-action: var(--primary-300);");
out.push("  --text-action-hover: var(--primary-200);");
out.push("  --icon-action: var(--primary-300);");
out.push("  --icon-action-hover: var(--primary-200);");
out.push("  --border-action: var(--primary-300);");
out.push("  --border-action-hover: var(--primary-200);");
out.push("}");
out.push("");

// ─── Responsive type scale ─────────────────────────────────────────
out.push("/* ─── Responsive type scale (h1-h6, p-lg/md/sm/xs) ─────────── */");
// Desktop is the default at :root; tablet & mobile override via @media.
function emitResponsive(setName, selector) {
  out.push(`${selector} {`);
  for (const [path, token] of walkLeaves(sets[setName])) {
    // Skip device-size — it's a Figma frame value, not useful as a CSS var.
    if (path[0] === "device-size") continue;
    out.push(
      `  ${cssVar(path)}: ${format(resolveValue(token.$value, [brandSet, setName]), token.$type)};`,
    );
  }
  out.push("}");
  out.push("");
}
emitResponsive("Responsive/desktop", ":root");
out.push("@media (max-width: 1024px) {");
out.push("  /* Tablet overrides */");
emitResponsive("Responsive/tablet", "  :root");
out.push("}");
out.push("");
out.push("@media (max-width: 640px) {");
out.push("  /* Mobile overrides */");
emitResponsive("Responsive/mobile", "  :root");
out.push("}");
out.push("");

// ─── Tailwind 4 @theme: expose select tokens as utility classes ─────
// This makes `bg-primary-500`, `text-text-body`, `font-display`, etc.
// available as Tailwind utilities.
out.push("/* ─── Tailwind 4 theme bridge ─────────────────────────────── */");
out.push("@theme inline {");
// Color families (so bg-green-500, text-orange-700, etc. work)
const families = ["green", "blue", "grey", "orange", "pink", "purple", "red", "yellow"];
for (const fam of families) {
  for (const stop of ["50", "100", "200", "300", "400", "500", "600", "700", "800"]) {
    out.push(`  --color-${fam}-${stop}: var(--${fam}-${stop});`);
  }
}
// Semantic palettes (bg-primary-500, etc.)
const semantic = ["primary", "neutral", "error", "success", "warning", "information"];
for (const s of semantic) {
  for (const stop of ["50", "100", "200", "300", "400", "500", "600", "700", "800"]) {
    out.push(`  --color-${s}-${stop}: var(--${s}-${stop});`);
  }
  out.push(`  --color-${s}-default: var(--${s}-default);`);
}
// Surface / text / border / icon (semantic UI roles)
out.push(`  --color-bg-page: var(--surface-page);`);
out.push(`  --color-bg-default: var(--surface-default);`);
out.push(`  --color-text-body: var(--text-body);`);
out.push(`  --color-text-heading: var(--text-heading);`);
out.push(`  --color-text-caption: var(--text-caption);`);
out.push(`  --color-text-action: var(--text-action);`);
out.push(`  --color-border-default: var(--border-default);`);
// Fonts
out.push(`  --font-sans: var(--font-secondary);`);
out.push(`  --font-display: var(--font-primary);`);
out.push(`  --font-mono: var(--font-mono);`);
out.push("}");
out.push("");

// ─── Base body styles ──────────────────────────────────────────────
out.push("/* ─── Base ────────────────────────────────────────────────── */");
out.push("html, body { margin: 0; padding: 0; }");
out.push("* { box-sizing: border-box; }");
out.push("body {");
out.push("  font-family: var(--font-secondary), system-ui, sans-serif;");
out.push("  background: var(--surface-page);");
out.push("  color: var(--text-body);");
out.push("  min-height: 100vh;");
out.push("}");
out.push("");

// Bail before writing if any token references couldn't be resolved.
// A broken `{ref}` would emit as a literal "var(--..)" pointing at a
// non-existent custom property, which renders as `transparent` /
// `currentColor` and silently degrades the design. Better to fail
// the build than to ship broken styles.
if (unresolvedRefs.size > 0) {
  console.error(
    `\n✗ build-tokens: ${unresolvedRefs.size} unresolved reference(s):`,
  );
  for (const ref of unresolvedRefs) console.error(`  • ${ref}`);
  process.exit(1);
}

writeFileSync(OUTPUT, out.join("\n"));
console.log(`✓ Wrote ${OUTPUT} (${out.length} lines)`);
