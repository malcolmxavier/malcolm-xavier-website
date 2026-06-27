import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import typographicGlyphs from "./eslint-rules/typographic-glyphs.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Treat underscore-prefixed names as intentionally unused. Lets us
  // destructure to discard fields without falling back to clunky
  // `void _foo;` patterns (cleaned up per l-button-void-pattern from
  // the 2026-04-29 /full-review).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Local rule: reader-facing prose uses real Unicode glyphs, never HTML
  // entities or ASCII stand-ins. Covers JSX text, prose attributes, and prose
  // object-properties (incl. page metadata). See eslint-rules/typographic-glyphs.mjs.
  {
    plugins: { local: { rules: { "typographic-glyphs": typographicGlyphs } } },
    rules: { "local/typographic-glyphs": "error" },
  },
]);

export default eslintConfig;
