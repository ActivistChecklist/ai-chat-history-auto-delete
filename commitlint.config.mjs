/**
 * Conventional Commits enforcement (via the .husky/commit-msg hook).
 *
 * The point of this hook is the *type prefix*, because that is what drives the version
 * bump in `yarn release`:
 *   fix:              -> patch  (1.0.0 -> 1.0.1)
 *   feat:             -> minor  (1.0.0 -> 1.1.0)
 *   BREAKING CHANGE:  -> major  (1.0.0 -> 2.0.0)   (footer, or `feat!:` / `fix!:`)
 *
 * Other types (chore, docs, refactor, test, build, ci, perf, style, revert) do not bump
 * on their own; see `.versionrc.json` for which appear in the changelog.
 *
 * Prose style is deliberately NOT policed. This repo's history is sentence-case
 * ("Add proper store button"), and forcing lower-case subjects would reject that for no
 * functional gain. Only SHOUTING is blocked.
 *
 * Merge, revert, fixup! and squash! commits are exempt via commitlint's default ignores.
 *
 * Named .mjs so Node does not warn about module type on every commit.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Sentence-case subjects are fine; the default config rejects them.
    'subject-case': [2, 'never', ['upper-case']],
    // Chrome Web Store review notes are long; don't fight over the body.
    'body-max-line-length': [0],
    'header-max-length': [2, 'always', 100]
  }
};
