/**
 * Release script — builds the extension and publishes a GitHub release.
 *
 * Usage: yarn release
 *
 * Steps:
 *   1. Verify git working tree is clean
 *   2. Read version from manifest.json
 *   3. Confirm the tag doesn't already exist on the remote
 *   4. Run yarn build
 *   5. gh release create vX.Y.Z with the zip attached (auto-generates release notes)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.exit(r.status);
  }
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

// 1. Clean working tree
const gitStatus = capture('git', ['status', '--porcelain']);
if (gitStatus) {
  die('Working tree is not clean. Commit or stash changes first.');
}

// 2. Version from manifest
const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const { version } = manifest;
if (!version) die('manifest.json is missing a version field.');

const tag = `v${version}`;
const zipName = `ai-chat-history-auto-delete-${version}.zip`;
const zipPath = path.join(ROOT, 'release', zipName);

console.log(`Preparing release ${tag}...`);

// 3. Check tag doesn't already exist on remote
const remoteTag = capture('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
if (remoteTag) {
  die(`Tag ${tag} already exists on origin. Bump the version in manifest.json first.`);
}

// Also check locally
const localTag = capture('git', ['tag', '-l', tag]);
if (localTag) {
  die(`Tag ${tag} already exists locally. Delete it or bump the version in manifest.json.`);
}

// 4. Build
console.log('\nBuilding extension...');
run('yarn', ['build']);

if (!fs.existsSync(zipPath)) {
  die(`Expected zip not found after build: ${zipPath}`);
}

// 5. Create GitHub release (gh creates the tag on the remote at current HEAD)
console.log(`\nCreating GitHub release ${tag}...`);
run('gh', [
  'release', 'create', tag,
  zipPath,
  '--title', tag,
  '--generate-notes'
]);

console.log(`\nDone. Release ${tag} published.`);
