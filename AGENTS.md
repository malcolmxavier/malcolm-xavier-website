<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:regression-checks -->
# Catch regressions during the change, not in the next audit

Don't rely on the next audit to surface regressions in code you just wrote. The 2026-04-28 audit-closeout review found that 49% of substantive findings were regressions in code we'd just written — the biggest clusters all catchable in under two minutes during the change. The cost of catching at audit time is roughly 5–10x the cost of catching at change time.

Before declaring a non-trivial change done, run the failure-mode checks that match the change shape:

1. **New scripts or automation.** Exercise at least one error path alongside the happy path. Common ones: rate-limit / 5xx, network failure, missing file, empty input, concurrent invocation. If the script kills processes or spawns children, verify cleanup with `pgrep` or `ps` after exit.

2. **UI changes.** Open the affected route at the breakpoints the change targets — typically 375 / 768 / 1024+. For color or contrast changes, force the affected theme via DevTools and run axe-core CLI against the route. For semantic/ARIA changes, run axe and tab through with the keyboard.

3. **Shared logic (CSS cascade rules, schemas, design tokens, lib helpers).** Grep for every consumer of the affected token / type / function and confirm each still behaves correctly under the same conditions that prompted the fix. Don't trust that a system-wide override fans out automatically.

When a check can't run (no rendered surface yet, no test runner, no fixture covering the case), surface it as a "couldn't verify" entry in the same commit message so it lands on the next audit's punch list rather than disappearing into trust.
<!-- END:regression-checks -->

<!-- BEGIN:audit-the-class -->
# When fixing a class of bug, audit the whole class

A bug rarely lives alone. When you find one instance of a pattern (a contrast failure, a heading-skip, a missing landmark, a stale token binding), the same pattern almost always exists elsewhere in the codebase. Fix the trigger, then audit every consumer of the same abstraction before declaring done.

The 2026-04-28 audit-closeout review found 6 pre-existing issues the first pass missed — 5 of the 6 were variations on a single failure mode: we audited the trigger, not the family. The `--text-action` contrast fix landed for the components we'd noticed but missed PaginationButton (`--primary-default` directly) and `--border-focus` (`--primary-700` chain) — sibling bugs in the same family.

Every time you fix a bug, run a 60-second class-audit before closing it out:

1. **Name the abstraction.** "This bug is an instance of <X>." (CSS variable consumer, JSX pattern, ARIA attribute, schema field, route handler shape, etc.)

2. **Grep for the abstraction.** The class is concrete enough to search for. CSS tokens: search `app/globals.css` for `var(--X)` consumers. Component patterns: search `components/`. ARIA roles: search for the literal.

3. **Verify each site behaves correctly under the same conditions that broke the first instance.** Same theme, same sub-brand, same viewport, same input shape.

4. **Re-run automated tooling after each fix, not in a batch.** axe-core, tsc, etc. Each fix can unhide new content for the next pass.

5. **"Couldn't verify" is a budget, not a backstop.** When a verification is deferred, check whether the deferral is genuinely outside your control or whether it's 5–15 min of tooling setup. The audit's `cv-axe-blocked` was a chromedriver version mismatch — a single command would have unblocked it. The verification was always going to happen; deferring it just delayed the discoveries.

Most "instances of X" sets are fewer than 10 items, so the class-audit is cheap. It dramatically reduces the audit-time discovery rate.
<!-- END:audit-the-class -->

