/**
 * .env loading with conflict reporting.
 *
 * Node's process.loadEnvFile() does NOT override variables already present in the
 * environment — the shell wins. That is the conventional precedence, but it fails
 * silently: an old `export OP_SIGNING_KEY_REF=...` in ~/.zshrc quietly beats the value
 * in .env, and the only symptom is a confusing error from a downstream tool.
 *
 * So load the file, then report any key where the two disagree.
 */

import fs from 'node:fs';

/** Minimal .env parser: KEY=value, optional quotes, # comments, blank lines. */
export function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text).split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

/**
 * Compares a parsed .env against the current environment.
 * @returns {{key: string, shell: string, file: string}[]} keys whose values disagree
 */
export function findEnvConflicts(fileVars, env) {
  const conflicts = [];
  for (const [key, file] of Object.entries(fileVars)) {
    const shell = env[key];
    if (shell !== undefined && shell !== file) {
      conflicts.push({ key, shell, file });
    }
  }
  return conflicts;
}

/**
 * Loads `envPath` into process.env (shell values still win) and returns any conflicts.
 * @returns {{loaded: boolean, conflicts: {key: string, shell: string, file: string}[]}}
 */
export function loadEnvFileWithReport(envPath, env = process.env) {
  if (!fs.existsSync(envPath)) return { loaded: false, conflicts: [] };
  const fileVars = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const conflicts = findEnvConflicts(fileVars, env);
  process.loadEnvFile(envPath);
  return { loaded: true, conflicts };
}

/** Human-readable warning for one conflict. */
export function formatEnvConflict({ key, shell, file }) {
  return [
    `${key} is set in BOTH your shell and .env, and they differ.`,
    '  The shell value wins, so .env is being ignored for this key:',
    `    shell: ${shell}`,
    `    .env:  ${file}`,
    `  Fix: remove or update the export (try: grep -rn ${key} ~/.zshrc ~/.zprofile)`
  ].join('\n');
}
