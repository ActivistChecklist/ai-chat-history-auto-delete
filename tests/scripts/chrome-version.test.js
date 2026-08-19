import { describe, it, expect } from 'vitest';
import { validateChromeVersion, assertChromeVersion } from '../../scripts/lib/chrome-version.mjs';

describe('validateChromeVersion', () => {
  it.each(['1', '1.2', '1.2.3', '1.2.3.4', '0.0.1', '65535.65535.65535.65535'])(
    'accepts %s', (v) => expect(validateChromeVersion(v).ok).toBe(true)
  );

  // The whole reason this exists: semver allows these, Chrome does not.
  it.each(['1.1.0-beta.1', '1.0.0-rc1', '1.0.0+build5', '1.0.0-alpha+001'])(
    'rejects semver prerelease/build %s', (v) => {
      const r = validateChromeVersion(v);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/prerelease/);
    }
  );

  it('rejects more than four parts', () => {
    expect(validateChromeVersion('1.2.3.4.5')).toMatchObject({ ok: false });
  });

  it('rejects parts above 65535', () => {
    expect(validateChromeVersion('65536').ok).toBe(false);
    expect(validateChromeVersion('1.65536.0').ok).toBe(false);
  });

  it('rejects leading zeros but allows a bare zero part', () => {
    expect(validateChromeVersion('01.2.3').ok).toBe(false);
    expect(validateChromeVersion('1.0.3').ok).toBe(true);
  });

  it('rejects all-zero versions', () => {
    expect(validateChromeVersion('0').ok).toBe(false);
    expect(validateChromeVersion('0.0.0.0').ok).toBe(false);
  });

  it.each(['v1.0.0', '1..2', '1.2.', '', 'abc', ' 1.0.0'])(
    'rejects malformed %s', (v) => expect(validateChromeVersion(v).ok).toBe(false)
  );

  it('rejects non-strings', () => {
    expect(validateChromeVersion(undefined).ok).toBe(false);
    expect(validateChromeVersion(100).ok).toBe(false);
  });
});

describe('assertChromeVersion', () => {
  it('throws naming the source file', () => {
    expect(() => assertChromeVersion('1.0.0-beta', 'manifest.json')).toThrow(/manifest\.json/);
  });

  it('stays silent for a valid version', () => {
    expect(() => assertChromeVersion('2.1.0')).not.toThrow();
  });
});
