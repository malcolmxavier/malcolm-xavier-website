// ─────────────────────────────────────────────────────────────────
// Custom ESLint rule: typographic-glyphs
//
// Enforces one site-wide convention for reader-facing prose: every special
// character is written as its real Unicode glyph — never as an HTML entity
// (&apos;, &mdash;, &hellip;) and never as an ASCII stand-in (a straight
// apostrophe, "--" for an em dash, "..." for an ellipsis, "(c)" for ©).
//
// WHY a custom rule. The stock React rule (react/no-unescaped-entities) does
// the OPPOSITE of what we want: it pushes authors to escape a straight quote
// INTO an entity, and it only looks at JSX text — never at prose that lives in
// an attribute (alt, title, aria-label) or in a metadata string (the
// description/title fields that render into <meta> tags and search results).
// This rule closes those gaps and applies the convention to ALL special
// characters generically, not just apostrophes.
//
// WHAT it deliberately leaves alone:
//   • Code-ish elements (<Code>, <pre>, <kbd>, …). Their content is technical —
//     CLI flags like --noEmit, version ranges like ">=22", literal header
//     values — where ASCII is correct. We skip them entirely.
//   • Straight quotes sitting in JSX *text*. react/no-unescaped-entities
//     already owns those (and the genuine JSX hazards > and }), so we don't
//     double-report; we only police straight quotes inside attribute and
//     object-property prose, which that rule never sees.
//   • Entities that have no prose-glyph equivalent and are sometimes load-
//     bearing: &amp;, &lt;, &gt;, &nbsp;. Banning those would be wrong.
// ─────────────────────────────────────────────────────────────────

// Named HTML entities that map 1:1 to a single unambiguous glyph. These are
// autofixable — there is exactly one right answer for each.
const ENTITY_GLYPH = {
  "&apos;": "’", // apostrophe / right single quote
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&rarr;": "→",
  "&larr;": "←",
  "&harr;": "↔",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&ge;": "≥",
  "&le;": "≤",
  "&times;": "×",
  "&deg;": "°",
  "&hearts;": "♥",
  "&star;": "★",
};

// Numeric character references (decimal and hex) for the same prose glyphs,
// so &#8217; / &#x2019; are caught alongside the named &rsquo;.
const NUMERIC_GLYPH = {
  39: "’", // &#39;  straight-apostrophe code point → curl it
  8217: "’",
  8216: "‘",
  8220: "“",
  8221: "”",
  8212: "—",
  8211: "–",
  8230: "…",
  8594: "→",
  8804: "≤",
  8805: "≥",
  215: "×",
};

// Double-quote entities resolve to a curly double quote; the OPEN vs CLOSE
// direction is decided by what precedes them (see chooseQuoteGlyph).
const DOUBLE_QUOTE_ENTITIES = new Set(["&quot;", "&#34;", "&#x22;"]);

// Curly-quote pairs, plus the heuristic that picks open vs. close. A quote that
// hugs the end of a word or closing punctuation is a CLOSING quote; otherwise
// it opens one. This resolves apostrophes (always word-hugging → ’), quotation
// pairs ('low volume' → ‘low volume’), and the rare leading quote correctly for
// everything in this corpus. Elision apostrophes ('90s, 'em) are the known
// blind spot — they'd open instead of close — but none occur here.
const SINGLE_QUOTES = { open: "‘", close: "’" };
const DOUBLE_QUOTES = { open: "“", close: "”" };
function chooseQuoteGlyph(prevChar, pair) {
  return /[A-Za-z0-9.,!?%)\]]/.test(prevChar ?? " ") ? pair.close : pair.open;
}

// JSX attribute names whose value is human-readable prose. Straight quotes,
// entities, and ASCII stand-ins inside these are policed; every other
// attribute (className, href, id, role, …) is ignored.
const PROSE_ATTRS = new Set([
  "alt",
  "title",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "placeholder",
  "label",
  "description",
  "subtitle",
  "caption",
  "note",
  "eyebrow",
  "heading",
  "headline",
  "kicker",
  "summary",
  "tooltip",
  "lede",
  "hero",
]);

// Object-property keys whose string value is prose. This is what reaches the
// metadata objects (export const metadata = { title, description }, the nested
// openGraph / twitter blocks) and component prop-config objects that an
// attribute-only rule would miss.
const PROSE_KEYS = new Set([
  "title",
  "description",
  "subtitle",
  "caption",
  "label",
  "alt",
  "ariaLabel",
  "summary",
  "eyebrow",
  "kicker",
  "headline",
  "hero",
  "lede",
  "note",
  "heading",
]);

// Elements whose children are technical, not prose. Text inside these is
// exempt from every check.
const CODE_ELEMENTS = new Set([
  "Code",
  "code",
  "pre",
  "Pre",
  "kbd",
  "Kbd",
  "samp",
  "Samp",
  "var",
]);

// ── Shared scanners ───────────────────────────────────────────────
// Each scanner walks a chunk of source text and reports problems by ABSOLUTE
// source offset, so the caller can map a hit to a precise editor location and
// an autofix range. `baseOffset` is where `text` starts in the file.

/**
 * Find every banned HTML entity (named or numeric) in `text`.
 * Returns { start, end, message, fix } records, offsets absolute.
 */
function scanEntities(text, baseOffset) {
  const hits = [];
  // Matches a named entity (&word;) or a numeric one (&#123; / &#x1F;).
  const re = /&(?:#x?[0-9a-f]+|[a-z]+);/gi;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const lower = raw.toLowerCase();
    const start = baseOffset + m.index;
    const end = start + raw.length;
    if (ENTITY_GLYPH[lower]) {
      hits.push({ start, end, glyph: ENTITY_GLYPH[lower], raw });
      continue;
    }
    // Numeric reference → look up the code point.
    const num = /^&#x/i.test(raw)
      ? parseInt(raw.slice(3, -1), 16)
      : /^&#/.test(raw)
        ? parseInt(raw.slice(2, -1), 10)
        : NaN;
    if (Number.isFinite(num) && NUMERIC_GLYPH[num]) {
      hits.push({ start, end, glyph: NUMERIC_GLYPH[num], raw });
      continue;
    }
    if (DOUBLE_QUOTE_ENTITIES.has(lower)) {
      // A double-quote entity → a curly double quote, direction from context.
      const glyph = chooseQuoteGlyph(text[m.index - 1], DOUBLE_QUOTES);
      hits.push({ start, end, glyph, raw, kind: "doublequote" });
    }
    // Any other entity (&amp;, &lt;, &nbsp;, …) is intentionally ignored.
  }
  return hits;
}

/**
 * Find ASCII stand-ins (… — © ™ ®) written the long way. Conservative on
 * dashes: only a SPACED " -- " or "---" is flagged, so a CLI flag like
 * --noEmit (which is never spaced that way, and usually lives in <Code>) is
 * never mistaken for an em dash.
 */
function scanAsciiStandins(text, baseOffset) {
  const hits = [];
  const patterns = [
    // Three or more dots → ellipsis (autofixable).
    { re: /\.{3,}/g, glyph: "…", label: "an ellipsis (…)" },
    // Spaced double hyphen → em/en dash. Direction is the author's call, so
    // report only.
    { re: /(?<=\s)---?(?=\s)/g, glyph: null, label: "an em dash (—) or en dash (–)" },
    // (c) / (tm) / (r) → © ™ ® (autofixable).
    { re: /\((?:c|C)\)/g, glyph: "©", label: "© (copyright)" },
    { re: /\((?:tm|TM)\)/g, glyph: "™", label: "™ (trademark)" },
    { re: /\((?:r|R)\)/g, glyph: "®", label: "® (registered)" },
  ];
  for (const { re, glyph, label } of patterns) {
    let m;
    while ((m = re.exec(text))) {
      const start = baseOffset + m.index;
      hits.push({ start, end: start + m[0].length, glyph, raw: m[0], label });
    }
  }
  return hits;
}

/**
 * Find straight apostrophes and straight double quotes inside a quoted string
 * literal's INTERIOR (delimiters excluded, escaped chars skipped). Used for
 * attribute and object-property prose only — JSX text straight quotes are left
 * to react/no-unescaped-entities.
 */
function scanStraightQuotesInLiteral(raw, baseOffset) {
  const hits = [];
  const delim = raw[0]; // the opening ' or " — never flag the delimiters
  for (let i = 1; i < raw.length - 1; i++) {
    const ch = raw[i];
    if (raw[i - 1] === "\\") continue; // escaped char, skip
    if (ch === delim) continue; // a same-as-delimiter quote can't appear unescaped
    if (ch === "'") {
      const glyph = chooseQuoteGlyph(raw[i - 1], SINGLE_QUOTES);
      hits.push({ start: baseOffset + i, end: baseOffset + i + 1, glyph, raw: ch, kind: "singlequote" });
    } else if (ch === '"') {
      const glyph = chooseQuoteGlyph(raw[i - 1], DOUBLE_QUOTES);
      hits.push({ start: baseOffset + i, end: baseOffset + i + 1, glyph, raw: ch, kind: "doublequote" });
    }
  }
  return hits;
}

// ── Rule definition ───────────────────────────────────────────────
/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Reader-facing prose must use real Unicode glyphs, not HTML entities or ASCII stand-ins.",
    },
    fixable: "code",
    schema: [],
    messages: {
      entity:
        "Use the Unicode glyph “{{glyph}}” in prose, not the HTML entity {{raw}}.",
      quoteEntity:
        "Use a curly quote ({{glyph}}) in prose, not the HTML entity {{raw}}.",
      standin: "Use {{label}} in prose, not the ASCII stand-in “{{raw}}”.",
      straightSingleQuote:
        "Use a curly quote ({{glyph}}) in prose, not a straight single quote.",
      straightDoubleQuote:
        "Use a curly quote ({{glyph}}) in prose, not a straight double quote.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    // Emit a single hit record as an ESLint report, wiring up the autofix when
    // the hit carries an unambiguous replacement glyph.
    function report(hit) {
      const loc = {
        start: sourceCode.getLocFromIndex(hit.start),
        end: sourceCode.getLocFromIndex(hit.end),
      };
      let messageId, data;
      if (hit.label) {
        // An ASCII stand-in (… — © ™ ®).
        messageId = "standin";
        data = { label: hit.label, raw: hit.raw };
      } else if (hit.kind === "singlequote") {
        messageId = "straightSingleQuote";
        data = { glyph: hit.glyph };
      } else if (hit.kind === "doublequote") {
        // Either a straight " or a double-quote entity (&quot;).
        messageId = hit.raw.startsWith("&") ? "quoteEntity" : "straightDoubleQuote";
        data = { glyph: hit.glyph, raw: hit.raw };
      } else {
        // A named/numeric entity with a single glyph (&mdash;, &hellip;, …).
        messageId = "entity";
        data = { glyph: hit.glyph, raw: hit.raw };
      }
      context.report({
        loc,
        messageId,
        data,
        fix: hit.glyph
          ? (fixer) => fixer.replaceTextRange([hit.start, hit.end], hit.glyph)
          : null,
      });
    }

    // Is this JSX text nested directly inside a code-ish element? If so, skip.
    function insideCodeElement(node) {
      const parent = node.parent;
      if (parent && parent.type === "JSXElement") {
        const name = parent.openingElement?.name;
        if (name && name.type === "JSXIdentifier" && CODE_ELEMENTS.has(name.name)) {
          return true;
        }
      }
      return false;
    }

    return {
      // JSX text children — the bulk of rendered prose.
      JSXText(node) {
        if (insideCodeElement(node)) return;
        const text = sourceCode.getText(node); // raw source (entities intact)
        const base = node.range[0];
        for (const hit of scanEntities(text, base)) report(hit);
        for (const hit of scanAsciiStandins(text, base)) report(hit);
        // straight quotes in JSX text are react/no-unescaped-entities' job.
      },

      // Prose-bearing JSX attributes: alt, title, aria-label, caption, ….
      JSXAttribute(node) {
        const name = node.name?.name;
        if (typeof name !== "string" || !PROSE_ATTRS.has(name)) return;
        // Value is either a string literal or {"a string literal"}.
        let lit = null;
        if (node.value?.type === "Literal" && typeof node.value.value === "string") {
          lit = node.value;
        } else if (
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression?.type === "Literal" &&
          typeof node.value.expression.value === "string"
        ) {
          lit = node.value.expression;
        }
        if (!lit) return;
        const raw = sourceCode.getText(lit);
        const base = lit.range[0];
        for (const hit of scanEntities(raw, base)) report(hit);
        for (const hit of scanAsciiStandins(raw, base)) report(hit);
        for (const hit of scanStraightQuotesInLiteral(raw, base)) report(hit);
      },

      // Object-property prose: metadata { title, description }, nested
      // openGraph / twitter blocks, component prop-config objects.
      Property(node) {
        if (node.computed || node.value?.type !== "Literal") return;
        if (typeof node.value.value !== "string") return;
        const key =
          node.key.type === "Identifier"
            ? node.key.name
            : node.key.type === "Literal"
              ? node.key.value
              : null;
        if (typeof key !== "string" || !PROSE_KEYS.has(key)) return;
        const raw = sourceCode.getText(node.value);
        const base = node.value.range[0];
        for (const hit of scanEntities(raw, base)) report(hit);
        for (const hit of scanAsciiStandins(raw, base)) report(hit);
        for (const hit of scanStraightQuotesInLiteral(raw, base)) report(hit);
      },
    };
  },
};

export default rule;
