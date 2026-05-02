# tokens—design system source of truth

JSON files in this tree (`Brand/`, `Alias/`, `Mapped/`, `Responsive/`) are the
**single source of truth** for design tokens: colors, typography, spacing,
breakpoints, sub-brand aliases.

`app/globals.css` is **generated output** from `scripts/build-tokens.mjs`. The
`prebuild` npm script runs the builder before every Next.js build, so committed
CSS stays in sync.

## Editing rules

- To change a token value: edit the JSON in this tree.
- To add a new token: add it to the relevant JSON file, then run
  `npm run tokens:build` to regenerate `app/globals.css`.
- **Never edit `app/globals.css` directly** to add or change a token. The
  next prebuild will overwrite your edit silently.

The sub-brand alias layer (`Alias/`) is where per-cluster tokens get bound.
When wiring a new sub-brand (e.g. `data-subbrand="film"`), add a JSON file
in `Alias/` rather than appending CSS rules elsewhere.

## Known gotcha

`var(--text-action)` resolves incorrectly inside `[data-subbrand]` scopes.
Use `var(--primary-default)` directly for sub-brand accent colors in inline
styles.
