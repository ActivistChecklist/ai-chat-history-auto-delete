import { describe, it, expect } from 'vitest';
import { diagnoseSigning, formatSigningFailure } from '../../scripts/lib/signing.mjs';

const ok = (out = '') => ({ status: 0, out, err: '' });
const fail = (err = 'boom') => ({ status: 1, out: '', err });

/** Happy-path runners; override individual ones per test. */
function runners(over = {}) {
  return {
    version: () => ok('2.34.0'),
    accountList: () => ok('[{"url":"my.1password.com"}]'),
    whoami: () => ok('user'),
    read: () => ok('-----BEGIN PRIVATE KEY-----'),
    ...over
  };
}

const REF = 'op://Vault/Item/private key';

describe('diagnoseSigning', () => {
  it('passes when every check succeeds', () => {
    expect(diagnoseSigning(REF, runners())).toEqual({ ok: true, ref: REF });
  });

  it('flags a missing reference and points at .env.example', () => {
    const d = diagnoseSigning(undefined, runners());
    expect(d.ok).toBe(false);
    expect(d.title).toMatch(/not set/);
    expect(d.steps.join('\n')).toMatch(/\.env\.example/);
  });

  it('flags a reference that is not an op:// URI', () => {
    const d = diagnoseSigning('/tmp/key.pem', runners());
    expect(d.ok).toBe(false);
    expect(d.title).toMatch(/op:\/\//);
  });

  it('flags op not being installed, with a platform-appropriate fix', () => {
    const d = diagnoseSigning(REF, runners({ version: () => fail('ENOENT') }), {
      platform: 'darwin'
    });
    expect(d.title).toMatch(/not installed/);
    expect(d.steps.join('\n')).toMatch(/brew install 1password-cli/);
  });

  it('does not suggest brew on non-mac', () => {
    const d = diagnoseSigning(REF, runners({ version: () => fail() }), { platform: 'linux' });
    expect(d.steps.join('\n')).not.toMatch(/brew/);
    expect(d.steps.join('\n')).toMatch(/developer\.1password\.com/);
  });

  // whoami is authoritative: with desktop-app integration the CLI can be perfectly
  // usable even when `account list` is unhelpful, so an empty list must not fail on its own.
  it.each([ok(''), ok('[]'), fail()])(
    'passes on an unhelpful account list when whoami succeeds',
    (accountList) => {
      expect(diagnoseSigning(REF, runners({ accountList: () => accountList })).ok).toBe(true);
    }
  );

  // The case that actually bit: telling someone to run `op signin` when the CLI was
  // never connected sends them down the wrong path.
  it.each([ok(''), ok('[]'), fail()])(
    'reports "not connected" when whoami fails and no account is listed',
    (accountList) => {
      const d = diagnoseSigning(REF, runners({
        whoami: () => fail('account is not signed in'),
        accountList: () => accountList
      }));
      expect(d.ok).toBe(false);
      expect(d.title).toMatch(/No 1Password account is connected/);
      expect(d.steps.join('\n')).toMatch(/op account add/);
    }
  );

  it('recommends the desktop integration only when the app is present on mac', () => {
    const notConnected = { whoami: () => fail(), accountList: () => ok('[]') };
    const withApp = diagnoseSigning(REF, runners(notConnected), {
      platform: 'darwin',
      hasDesktopApp: true
    });
    expect(withApp.steps.join('\n')).toMatch(/Integrate with 1Password CLI/);

    const withoutApp = diagnoseSigning(REF, runners(notConnected), {
      platform: 'darwin',
      hasDesktopApp: false
    });
    expect(withoutApp.steps.join('\n')).not.toMatch(/Integrate with 1Password CLI/);
  });

  it('distinguishes a locked account from an absent one', () => {
    const d = diagnoseSigning(REF, runners({
      whoami: () => fail('not signed in'),
      accountList: () => ok('[{"url":"my.1password.com"}]')
    }), {
      platform: 'darwin',
      hasDesktopApp: true
    });
    expect(d.title).toMatch(/locked or signed out/);
    expect(d.steps.join('\n')).toMatch(/Unlock the 1Password desktop app/);
  });

  it('falls back to op signin when there is no desktop app', () => {
    const d = diagnoseSigning(REF, runners({
      whoami: () => fail(),
      accountList: () => ok('[{"url":"my.1password.com"}]')
    }), { hasDesktopApp: false });
    expect(d.steps.join('\n')).toMatch(/op signin/);
  });

  it('flags an unresolvable reference and surfaces op stderr', () => {
    const d = diagnoseSigning(REF, runners({ read: () => fail('item "Item" not found') }));
    expect(d.title).toMatch(/does not resolve/);
    expect(d.steps.join('\n')).toMatch(/item "Item" not found/);
  });

  it('never includes the resolved key material in its result', () => {
    const secret = '-----BEGIN PRIVATE KEY-----MIIEvQ';
    const d = diagnoseSigning(REF, runners({ read: () => ok(secret) }));
    expect(JSON.stringify(d)).not.toContain('BEGIN PRIVATE KEY');
  });
});

describe('formatSigningFailure', () => {
  it('indents steps and nests sub-steps under their parent', () => {
    const out = formatSigningFailure({
      ok: false,
      title: 'Broken',
      steps: ['Do this:', '  sub-step', 'Then this']
    });
    const lines = out.split('\n');
    expect(lines[0]).toBe('Broken');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('  Do this:');
    expect(lines[3]).toBe('    sub-step');
    expect(lines[4]).toBe('  Then this');
  });
});
