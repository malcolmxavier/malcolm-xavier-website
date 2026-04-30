# malxavi.com

[Malcolm Xavier](https://malxavi.com) — portfolio site, monthly music drops, occasional case studies.

Five MVP pages (Landing, Resume, About, Contact, Music), two case studies, one editorial voice.

## Stack

- **Framework:** Next.js 16 (App Router, React 19), TypeScript, Tailwind 4
- **Hosting:** Vercel — Fluid Compute, Web Analytics, Speed Insights
- **Fonts:** Instrument Serif + DM Sans (recruiter cluster), Roboto Slab + Roboto Mono (sub-brand)
- **Theming:** `next-themes` for light / dark, `[data-subbrand]` for cluster identity
- **Data:** Spotify Web API for `/music`, snapshot-backed for resilience
- **Tokens:** generated from JSON in `_design/tokens/` via `scripts/build-tokens.mjs`

## How it was built

Mostly with [Claude Code](https://claude.com/claude-code) in a directed workflow — I make the architecture, voice, and design calls; Claude executes and pushes back. The long version lives in the meta case study at [malxavi.com/case-studies/building-this-site](https://malxavi.com/case-studies/building-this-site).

A few mechanics worth a poke if you're curious:

- **Token system** — hue families in `_design/tokens/Brand/`, sub-brand aliases in `_design/tokens/Alias/`, mode resolutions in `_design/tokens/Mapped/`. Generated CSS is a build artifact; never hand-edit `app/globals.css`.
- **Spotify pipeline** — live fetch with a graceful snapshot fallback in `lib/feeds/spotify.ts`. Rate-limit-aware via per-endpoint buckets, plus a `/api/spotify/health` diagnostic and `npm run music:refresh` to capture a fresh fixture.
- **Case-study primitives** — extracted to `components/case-study/` so the second one shipped as a content-only file.

## Running it locally

```bash
npm install
npm run dev
```

`/music` runs in offline-snapshot mode by default; see `lib/feeds/spotify.ts` for the env vars needed for live mode.

## License

Source is mine. Borrow patterns; don't borrow pages.
