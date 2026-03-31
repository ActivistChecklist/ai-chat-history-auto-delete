import { describe, it, expect } from 'vitest';
import { PROVIDERS, PROVIDER_LIST } from '../../src/providers/registry.js';
import { claudeProvider } from '../../src/providers/claude.js';

describe('registry', () => {
  it('PROVIDERS contains claude', () => {
    expect(PROVIDERS).toHaveProperty('claude');
    expect(PROVIDERS.claude).toBe(claudeProvider);
  });

  it('PROVIDER_LIST has claude entry with required fields', () => {
    expect(PROVIDER_LIST).toHaveLength(1);
    const claude = PROVIDER_LIST[0];
    expect(claude.id).toBe('claude');
    expect(claude.displayName).toBe('Claude');
    expect(claude.domain).toBe('claude.ai');
  });
});
