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
// Safe in CI: exits 0 silently if this isn't a git repo (e.g.
// Vercel's build environment, which doesn't always carry a full git
// working tree).
//
// Worktree-safe: the hooks directory is resolved by asking git, not by
// assuming ".git" is a directory. In a linked worktree, ".git" is a
// *file* pointing at the shared common dir, and hooks live in that
// common dir — so a hard-coded ".git/hooks" path would fail there.
// ─────────────────────────────────────────────────────────────────

import {
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";

const SOURCE_DIR = resolve("scripts/git-hooks");

// Ask git itself where hooks belong. `git rev-parse --git-path hooks`
// returns the correct path in every checkout shape: a normal clone, a
// linked worktree (resolves to the shared common dir's hooks), and a
// submodule. If git isn't available or this isn't a repo — e.g. a
// shallow CI / Vercel build environment — there's nothing to install,
// so exit 0 silently.
let TARGET_DIR;
try {
  TARGET_DIR = resolve(
    execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim(),
  );
} catch {
  process.exit(0);
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`✗ Hook source dir not found: ${SOURCE_DIR}`);
  process.exit(1);
}

// A freshly initialized repo may not have a hooks directory yet; create
// it so the first write doesn't fail.
mkdirSync(TARGET_DIR, { recursive: true });

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
