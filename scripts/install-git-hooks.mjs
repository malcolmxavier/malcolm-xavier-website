// ─────────────────────────────────────────────────────────────────
// install-git-hooks.mjs
//
// Installs git hooks tracked in scripts/git-hooks/ into .git/hooks/.
// Runs automatically via the `prepare` npm lifecycle (after every
// `npm install`), so fresh clones pick up the hooks without a
// separate setup step. Can also be invoked manually:
//
//   npm run hooks:install         # install or update
//   npm run hooks:install -- --force   # overwrite existing hooks
//
// Idempotent: re-runs are silent no-ops if the installed hook
// already matches the tracked source. Hooks that already exist with
// different content are skipped (with a warning) unless --force is
// passed, so an unrelated user-added hook never gets clobbered by an
// `npm install` side effect.
//
// Safe in CI: exits 0 silently if .git/ isn't a directory (e.g.
// Vercel's build environment, which doesn't always carry a full git
// working tree).
// ─────────────────────────────────────────────────────────────────

import {
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";

const GIT_DIR = resolve(".git");
const SOURCE_DIR = resolve("scripts/git-hooks");
const TARGET_DIR = resolve(".git/hooks");

// CI / shallow-clone environments may have no .git/ — nothing to do.
if (!existsSync(GIT_DIR)) {
  process.exit(0);
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`✗ Hook source dir not found: ${SOURCE_DIR}`);
  process.exit(1);
}

const FORCE = process.argv.includes("--force");
const hooks = readdirSync(SOURCE_DIR);

for (const hook of hooks) {
  const sourcePath = join(SOURCE_DIR, hook);
  const targetPath = join(TARGET_DIR, hook);
  const content = readFileSync(sourcePath, "utf8");

  // If the same content is already installed, skip silently. This is
  // the common case after the first install — every subsequent `npm
  // install` is a no-op, which keeps the lifecycle quiet.
  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath, "utf8");
    if (existing === content) {
      continue;
    }
    // Existing hook differs — could be a user's custom one. Warn but
    // don't fail; let the user run --force when they're ready.
    if (!FORCE) {
      console.warn(
        `⚠ Existing ${hook} hook differs from scripts/git-hooks/${hook}; skipping.`,
      );
      console.warn(`  Run \`npm run hooks:install -- --force\` to overwrite.`);
      continue;
    }
  }

  writeFileSync(targetPath, content, { mode: 0o755 });
  chmodSync(targetPath, 0o755);
  console.log(`✓ Installed ${hook} hook`);
}
