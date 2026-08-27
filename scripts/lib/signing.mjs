/**
 * Diagnoses the 1Password signing setup and returns actionable instructions.
 *
 * Split out from the release script (and kept free of side effects) because "signing is
 * broken" has several distinct causes that need different fixes, and telling someone to
 * run `op signin` when no account is configured at all just wastes their time.
 *
 * Command execution is injected so this is unit-testable without the op CLI present.
 */

/**
 * @typedef {{status: number, out: string, err: string}} CmdResult
 * @typedef {{
 *   version: () => CmdResult,
 *   accountList: () => CmdResult,
 *   whoami: () => CmdResult,
 *   read: (ref: string) => CmdResult
 * }} Runners
 */

/** @returns {{ok: true, ref: string} | {ok: false, title: string, steps: string[]}} */
export function diagnoseSigning(ref, runners, opts = {}) {
  const { platform = process.platform, hasDesktopApp = false } = opts;
  const isMac = platform === 'darwin';

  if (!ref) {
    return {
      ok: false,
      title: 'OP_SIGNING_KEY_REF is not set, so the CRX cannot be signed.',
      steps: [
        'cp .env.example .env',
        'Open 1Password, right-click the signing key field -> "Copy Secret Reference"',
        'Paste it into .env as OP_SIGNING_KEY_REF="op://<vault>/<item>/private key"',
        'Or pass --no-sign to release without a CRX.'
      ]
    };
  }

  if (!ref.startsWith('op://')) {
    return {
      ok: false,
      title: `OP_SIGNING_KEY_REF must be a 1Password secret reference starting with "op://" (got "${ref}").`,
      steps: [
        'In 1Password, right-click the signing key field -> "Copy Secret Reference"',
        'It should look like: op://<vault>/<item>/private key'
      ]
    };
  }

  const version = runners.version();
  if (version.status !== 0) {
    return {
      ok: false,
      title: 'The 1Password CLI (op) is not installed, so the signing key cannot be read.',
      steps: [
        isMac ? 'brew install 1password-cli' : 'See https://developer.1password.com/docs/cli/get-started/',
        'Then re-run: yarn release',
        'Or pass --no-sign to release without a CRX.'
      ]
    };
  }

  // `whoami` is the authority on "can op be used right now" — with the desktop app
  // integration the CLI may be perfectly usable even if `account list` looks unhelpful.
  // The account list is consulted only to explain WHY whoami failed, because "never
  // connected" and "locked" need different fixes.
  const whoami = runners.whoami();
  if (whoami.status !== 0) {
    const accounts = runners.accountList();
    const neverConnected = accounts.status !== 0
      || accounts.out.trim() === ''
      || accounts.out.trim() === '[]';

    if (neverConnected) {
      const steps = [];
      if (isMac && hasDesktopApp) {
        steps.push(
          'Enable the desktop integration (recommended — unlocks with Touch ID, no session to expire):',
          '  1Password app -> Settings -> Developer -> "Integrate with 1Password CLI"',
          '  Then open a new terminal tab and re-run.'
        );
      }
      steps.push(
        'Or connect the CLI manually:',
        '  op account add --address my.1password.com --email <your-email>',
        '  eval $(op signin)',
        'Verify with: op whoami'
      );
      return {
        ok: false,
        title: 'No 1Password account is connected to the CLI.',
        steps
      };
    }

    return {
      ok: false,
      title: 'The 1Password CLI has an account but is locked or signed out.',
      steps: [
        isMac && hasDesktopApp
          ? 'Unlock the 1Password desktop app, then re-run (biometric unlock covers the CLI)'
          : 'eval $(op signin)',
        'Verify with: op whoami',
        `(${(whoami.err || 'op whoami failed').split('\n')[0]})`
      ]
    };
  }

  // Resolve now, discarding the value, so a typo fails before anything is bumped.
  const read = runners.read(ref);
  if (read.status !== 0) {
    return {
      ok: false,
      title: `OP_SIGNING_KEY_REF does not resolve: ${ref}`,
      steps: [
        (read.err || '').trim().split('\n')[0] || 'op read failed',
        'Check the vault and item names, or re-copy the secret reference from 1Password',
        'List candidates with: op item list --format=table'
      ]
    };
  }

  return { ok: true, ref };
}

/** Builds real runners around a spawn function (kept injectable for tests). */
export function makeOpRunners(spawnSync, cwd) {
  const call = (args) => {
    const r = spawnSync('op', args, { cwd, encoding: 'utf8' });
    if (r.error) return { status: 127, out: '', err: r.error.message };
    return { status: r.status ?? 1, out: r.stdout || '', err: r.stderr || '' };
  };
  return {
    version: () => call(['--version']),
    accountList: () => call(['account', 'list', '--format=json']),
    whoami: () => call(['whoami']),
    read: (ref) => call(['read', ref])
  };
}

/** Formats a failed diagnosis for the terminal. */
export function formatSigningFailure(diag) {
  // Always indent by 2, so steps written with leading spaces nest visibly under their parent.
  return [diag.title, '', ...diag.steps.map((s) => `  ${s}`)].join('\n');
}
