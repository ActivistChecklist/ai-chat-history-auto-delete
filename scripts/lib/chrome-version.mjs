/**
 * Chrome extension version validation.
 *
 * Chrome versions are NOT semver. From the manifest docs, `version` must be one to
 * four dot-separated integers, each 0–65535, with no leading zeros, and not all zero.
 * That means semver's pre-release and build syntax is illegal here:
 *
 *   1.2.3          ok
 *   1.2.3.4        ok
 *   1.2.3-beta.1   REJECTED — the Web Store will not accept it
 *   1.2.3+build5   REJECTED
 *   01.2.3         REJECTED — leading zero
 *
 * So `yarn release` may bump major/minor/patch, but never a prerelease.
 */

export const CHROME_VERSION_RULES =
  'one to four dot-separated integers, each 0–65535, no leading zeros, not all zero ' +
  '(e.g. 1, 1.2, 1.2.3, 1.2.3.4) — semver prerelease/build suffixes are not allowed';

/**
 * @param {unknown} version
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function validateChromeVersion(version) {
  if (typeof version !== 'string' || version.length === 0) {
    return { ok: false, error: 'version must be a non-empty string' };
  }

  if (/[-+]/.test(version)) {
    return {
      ok: false,
      error: `"${version}" looks like a semver prerelease/build version; Chrome allows only ${CHROME_VERSION_RULES}`
    };
  }

  const parts = version.split('.');
  if (parts.length < 1 || parts.length > 4) {
    return { ok: false, error: `"${version}" has ${parts.length} parts; Chrome allows 1 to 4` };
  }

  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return { ok: false, error: `"${version}" contains a non-integer part ("${part}")` };
    }
    if (part.length > 1 && part.startsWith('0')) {
      return { ok: false, error: `"${version}" has a leading zero in "${part}"` };
    }
    if (Number(part) > 65535) {
      return { ok: false, error: `"${version}" has part "${part}" above the 65535 maximum` };
    }
  }

  if (parts.every((p) => Number(p) === 0)) {
    return { ok: false, error: `"${version}" cannot be all zeros` };
  }

  return { ok: true };
}

/** Throws with an actionable message. Used by the build and release scripts. */
export function assertChromeVersion(version, source = 'manifest.json') {
  const result = validateChromeVersion(version);
  if (!result.ok) {
    throw new Error(`Invalid extension version in ${source}: ${result.error}`);
  }
}
