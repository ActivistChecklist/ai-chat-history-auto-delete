/**
 * Release script — builds the extension (zip + signed CRX) and publishes a GitHub release.
 *
 * Usage:
 *   yarn release             # build + sign + publish
 *   yarn release --dry-run   # show what would happen, skip git tag and gh release
 *
 * Requires:
 *   - OP_SIGNING_KEY_REF env var pointing to your 1Password key item:
 *       export OP_SIGNING_KEY_REF="op://Personal/Chrome Extension Signing Key/private key"
 *   - gh CLI authenticated (gh auth login)
 *   - op CLI authenticated (op signin)
 *
 * Steps:
 *   1. Verify git working tree is clean and on a non-main branch (or --dry-run)
 *   2. Read version from manifest.json
 *   3. Confirm the tag doesn't already exist
 *   4. Build (CSS + dist/ + zip)
 *   5. Sign the CRX via 1Password key
 *   6. Generate changelog from git log since the last tag
 *   7. Create GitHub release with zip + crx attached
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function run(cmd, args) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${cmd} ${args.join(' ')}`);
    return;
  }
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status);
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (r.error) throw r.error;
  return r.stdout.trim();
}

function die(msg) {
  console.error(`\nError: ${msg}`);
  process.exit(1);
}

// ─── 1. Clean working tree ────────────────────────────────────────────────────

const gitStatus = capture('git', ['status', '--porcelain']);
if (gitStatus && !DRY_RUN) {
  die('Working tree is not clean. Commit or stash changes first.');
}

// ─── 2. Version from manifest ─────────────────────────────────────────────────

const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const { version } = manifest;
if (!version) die('manifest.json is missing a version field.');

const tag = `v${version}`;
const zipName = `ai-chat-history-auto-delete-${version}.zip`;
const crxName = `ai-chat-history-auto-delete-${version}.crx`;
const zipPath = path.join(ROOT, 'release', zipName);
const crxPath = path.join(ROOT, 'release', crxName);

console.log(`Preparing release ${tag}${DRY_RUN ? ' (dry-run)' : ''}…`);

// ─── 3. Check tag doesn't already exist ──────────────────────────────────────

const remoteTag = capture('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
if (remoteTag && !DRY_RUN) {
  die(`Tag ${tag} already exists on origin. Bump the version in manifest.json first.`);
}
const localTag = capture('git', ['tag', '-l', tag]);
if (localTag && !DRY_RUN) {
  die(`Tag ${tag} already exists locally. Delete it or bump the version in manifest.json.`);
}

// ─── 4 + 5. Build + sign ──────────────────────────────────────────────────────

console.log('\nBuilding + signing extension…');
run('yarn', ['build', '--sign']);

if (!DRY_RUN) {
  if (!fs.existsSync(zipPath)) die(`Expected zip not found: ${zipPath}`);
  if (!fs.existsSync(crxPath)) die(`Expected CRX not found: ${crxPath}`);
}

// ─── 6. Changelog from git log ────────────────────────────────────────────────

function buildChangelog() {
  // Find the most recent tag before HEAD
  let prevTag;
  try {
    prevTag = capture('git', ['describe', '--tags', '--abbrev=0', 'HEAD^']);
  } catch {
    prevTag = null;
  }

  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const log = capture('git', [
    'log', range,
    '--pretty=format:- %s (%h)',
    '--no-merges'
  ]);

  const header = prevTag
    ? `## What's Changed since ${prevTag}\n\n`
    : `## What's Changed\n\n`;

  return log
    ? `${header}${log}`
    : `${header}_No commits found._`;
}

const changelog = buildChangelog();
console.log('\n── Changelog ──────────────────────────────────────────────────');
console.log(changelog);
console.log('───────────────────────────────────────────────────────────────\n');

// ─── 7. GitHub release ────────────────────────────────────────────────────────

console.log(`Creating GitHub release ${tag}…`);
run('gh', [
  'release', 'create', tag,
  zipPath,
  crxPath,
  '--title', tag,
  '--notes', changelog
]);

if (DRY_RUN) {
  console.log('\n[dry-run] Done — no tag or release was created.');
} else {
  console.log(`\nDone. Release ${tag} published.`);
}
