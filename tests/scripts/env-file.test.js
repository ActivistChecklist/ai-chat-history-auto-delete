import { describe, it, expect } from 'vitest';
import { parseEnvFile, findEnvConflicts, formatEnvConflict } from '../../scripts/lib/env-file.mjs';

describe('parseEnvFile', () => {
  it('reads KEY=value with and without quotes', () => {
    expect(parseEnvFile('A=1\nB="two"\nC=\'three\'')).toEqual({ A: '1', B: 'two', C: 'three' });
  });

  it('keeps spaces and slashes inside a quoted value', () => {
    const ref = 'op://Activist Checklist/Some - Item Name/private key';
    expect(parseEnvFile(`OP_SIGNING_KEY_REF="${ref}"`).OP_SIGNING_KEY_REF).toBe(ref);
  });

  it('skips comments, blanks and malformed lines', () => {
    expect(parseEnvFile('# note\n\nBAD LINE\nA=1\n  # indented\n')).toEqual({ A: '1' });
  });

  it('treats a commented-out assignment as absent', () => {
    expect(parseEnvFile('# OP_ACCOUNT=""')).toEqual({});
  });

  it('handles an empty value', () => {
    expect(parseEnvFile('A=\nB=""')).toEqual({ A: '', B: '' });
  });
});

describe('findEnvConflicts', () => {
  // The bug this exists for: a stale `export OP_SIGNING_KEY_REF=...` in ~/.zshrc silently
  // beat .env, and the only symptom was a confusing "isn't an item in the vault" error.
  it('reports a key set in both places with different values', () => {
    const conflicts = findEnvConflicts(
      { OP_SIGNING_KEY_REF: 'op://V/Long Item Name/private key' },
      { OP_SIGNING_KEY_REF: 'op://V/Short Item/private key' }
    );
    expect(conflicts).toEqual([{
      key: 'OP_SIGNING_KEY_REF',
      shell: 'op://V/Short Item/private key',
      file: 'op://V/Long Item Name/private key'
    }]);
  });

  it('is silent when the values agree', () => {
    expect(findEnvConflicts({ A: 'same' }, { A: 'same' })).toEqual([]);
  });

  it('is silent when the shell does not set the key at all', () => {
    expect(findEnvConflicts({ A: 'x' }, {})).toEqual([]);
  });

  it('does not treat an empty shell value as absent', () => {
    expect(findEnvConflicts({ A: 'x' }, { A: '' })).toHaveLength(1);
  });
});

describe('formatEnvConflict', () => {
  it('shows both values and how to find the export', () => {
    const out = formatEnvConflict({ key: 'OP_SIGNING_KEY_REF', shell: 'a', file: 'b' });
    expect(out).toMatch(/shell: a/);
    expect(out).toMatch(/\.env:\s+b/);
    expect(out).toMatch(/shell value wins/);
    expect(out).toMatch(/~\/\.zshrc/);
  });
});
