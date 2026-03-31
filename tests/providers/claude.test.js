import { describe, it, expect } from 'vitest';
import { claudeProvider, parseChatsResponse, getChatsWithRawDates } from '../../src/providers/claude.js';

describe('claudeProvider', () => {
  it('has correct id and baseUrl', () => {
    expect(claudeProvider.id).toBe('claude');
    expect(claudeProvider.baseUrl).toBe('https://claude.ai');
    expect(claudeProvider.displayName).toBe('Claude');
  });

  describe('buildFetchOptions.getOrganizations', () => {
    it('returns correct url and options', () => {
      const { url, options } = claudeProvider.buildFetchOptions.getOrganizations();
      expect(url).toBe('https://claude.ai/api/organizations');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('include');
    });
  });

  describe('buildFetchOptions.getChats', () => {
    it('returns correct url with params', () => {
      const { url, options } = claudeProvider.buildFetchOptions.getChats('org-123', 0, 50);
      expect(url).toContain('https://claude.ai/api/organizations/org-123/chat_conversations');
      expect(url).toContain('limit=50');
      expect(url).toContain('offset=0');
      expect(url).toContain('consistency=eventual');
      expect(options.method).toBe('GET');
    });

    it('uses default limit of 100', () => {
      const { url } = claudeProvider.buildFetchOptions.getChats('org-123');
      expect(url).toContain('limit=100');
      expect(url).toContain('offset=0');
    });

    it('throws on invalid orgId', () => {
      expect(() => claudeProvider.buildFetchOptions.getChats('invalid org!')).toThrow('Invalid organization ID');
      expect(() => claudeProvider.buildFetchOptions.getChats('')).toThrow('Invalid organization ID');
      expect(() => claudeProvider.buildFetchOptions.getChats(null)).toThrow('Invalid organization ID');
    });

    it('accepts valid orgId characters', () => {
      expect(() => claudeProvider.buildFetchOptions.getChats('abc-123_XYZ')).not.toThrow();
    });
  });

  describe('buildFetchOptions.deleteChats', () => {
    it('returns correct url and body', () => {
      const ids = ['chat-1', 'chat-2'];
      const { url, options } = claudeProvider.buildFetchOptions.deleteChats('org-123', ids);
      expect(url).toBe('https://claude.ai/api/organizations/org-123/chat_conversations/delete_many');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({ conversation_uuids: ids });
    });

    it('throws on invalid orgId', () => {
      expect(() => claudeProvider.buildFetchOptions.deleteChats('bad org!', [])).toThrow('Invalid organization ID');
    });
  });
});

describe('parseChatsResponse', () => {
  it('parses array response', () => {
    const body = [
      { uuid: 'c1', name: 'Chat 1', updated_at: '2025-01-01T00:00:00Z', starred: false },
      { uuid: 'c2', name: 'Chat 2', updated_at: '2025-06-15T00:00:00Z', is_starred: true }
    ];
    const { chats, hasMore } = parseChatsResponse(body, 100);
    expect(chats).toHaveLength(2);
    expect(chats[0].id).toBe('c1');
    expect(chats[0].name).toBe('Chat 1');
    expect(chats[0].starred).toBe(false);
    expect(chats[1].id).toBe('c2');
    expect(chats[1].starred).toBe(true);
    expect(hasMore).toBe(false);
  });

  it('parses JSON string body', () => {
    const body = JSON.stringify([
      { uuid: 'c1', name: 'Test', updated_at: '2025-01-01T00:00:00Z' }
    ]);
    const { chats } = parseChatsResponse(body);
    expect(chats).toHaveLength(1);
    expect(chats[0].id).toBe('c1');
  });

  it('handles nested response formats', () => {
    const body = { chat_conversations: [{ uuid: 'c1', name: 'Test', updated_at: '2025-01-01T00:00:00Z' }] };
    const { chats } = parseChatsResponse(body);
    expect(chats).toHaveLength(1);
  });

  it('uses fallback id field', () => {
    const body = [{ id: 'fallback-id', name: 'Test', created_at: '2025-01-01T00:00:00Z' }];
    const { chats } = parseChatsResponse(body);
    expect(chats[0].id).toBe('fallback-id');
  });

  it('filters out entries without id', () => {
    const body = [{ name: 'No ID' }, { uuid: 'c1', name: 'Has ID', updated_at: '2025-01-01T00:00:00Z' }];
    const { chats } = parseChatsResponse(body);
    expect(chats).toHaveLength(1);
    expect(chats[0].id).toBe('c1');
  });

  it('hasMore is true when chats.length >= limit', () => {
    const body = Array.from({ length: 10 }, (_, i) => ({
      uuid: `c${i}`, name: `Chat ${i}`, updated_at: '2025-01-01T00:00:00Z'
    }));
    const { hasMore } = parseChatsResponse(body, 10);
    expect(hasMore).toBe(true);
  });

  it('hasMore is false when chats.length < limit', () => {
    const body = [{ uuid: 'c1', name: 'Test', updated_at: '2025-01-01T00:00:00Z' }];
    const { hasMore } = parseChatsResponse(body, 100);
    expect(hasMore).toBe(false);
  });

  it('parses timestamps correctly', () => {
    const ts = '2025-06-15T12:30:00Z';
    const expected = new Date(ts).getTime();
    const body = [{ uuid: 'c1', updated_at: ts }];
    const { chats } = parseChatsResponse(body);
    expect(chats[0].createdAt).toBe(expected);
  });

  it('handles numeric timestamps', () => {
    const ts = 1718450000000;
    const body = [{ uuid: 'c1', updated_at: ts }];
    const { chats } = parseChatsResponse(body);
    expect(chats[0].createdAt).toBe(ts);
  });

  it('returns 0 for missing timestamp', () => {
    const body = [{ uuid: 'c1' }];
    const { chats } = parseChatsResponse(body);
    expect(chats[0].createdAt).toBe(0);
  });

  it('prefers updated_at over created_at', () => {
    const body = [{
      uuid: 'c1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z'
    }];
    const { chats } = parseChatsResponse(body);
    expect(chats[0].createdAt).toBe(new Date('2025-06-01T00:00:00Z').getTime());
  });

  it('detects starred via multiple field names', () => {
    const cases = [
      { uuid: 'c1', starred: true },
      { uuid: 'c2', is_starred: true },
      { uuid: 'c3', pinned: true },
      { uuid: 'c4', is_pinned: true },
      { uuid: 'c5', starred: false, is_starred: false }
    ];
    const { chats } = parseChatsResponse(cases);
    expect(chats[0].starred).toBe(true);
    expect(chats[1].starred).toBe(true);
    expect(chats[2].starred).toBe(true);
    expect(chats[3].starred).toBe(true);
    expect(chats[4].starred).toBe(false);
  });
});

describe('getChatsWithRawDates', () => {
  it('returns raw date fields for debugging', () => {
    const body = [{
      uuid: 'c1', name: 'Test',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
      starred: true
    }];
    const { chats, hasMore } = getChatsWithRawDates(body);
    expect(chats).toHaveLength(1);
    expect(chats[0].id).toBe('c1');
    expect(chats[0].created_at).toBe('2025-01-01T00:00:00Z');
    expect(chats[0].updated_at).toBe('2025-06-01T00:00:00Z');
    expect(chats[0].keyUsed).toBe('updated_at');
    expect(chats[0].dateUsed).toBe('2025-06-01T00:00:00Z');
    expect(chats[0].starred).toBe(true);
    expect(hasMore).toBe(false);
  });

  it('parses JSON string body', () => {
    const body = JSON.stringify([{ uuid: 'c1', created_at: '2025-01-01T00:00:00Z' }]);
    const { chats } = getChatsWithRawDates(body);
    expect(chats).toHaveLength(1);
    expect(chats[0].keyUsed).toBe('created_at');
  });

  it('handles nested response formats', () => {
    const body = { conversations: [{ uuid: 'c1', updatedAt: '2025-06-01T00:00:00Z' }] };
    const { chats } = getChatsWithRawDates(body);
    expect(chats).toHaveLength(1);
    expect(chats[0].keyUsed).toBe('updatedAt');
  });

  it('filters entries without id', () => {
    const body = [{ name: 'No ID' }, { uuid: 'c1', created_at: '2025-01-01T00:00:00Z' }];
    const { chats } = getChatsWithRawDates(body);
    expect(chats).toHaveLength(1);
  });

  it('hasMore based on 50 threshold', () => {
    const body = Array.from({ length: 50 }, (_, i) => ({
      uuid: `c${i}`, created_at: '2025-01-01T00:00:00Z'
    }));
    const { hasMore } = getChatsWithRawDates(body, 100);
    expect(hasMore).toBe(true);
  });

  it('reports nextCursor from response', () => {
    const body = { chats: [{ uuid: 'c1', created_at: '2025-01-01T00:00:00Z' }], next_cursor: 'abc' };
    const { nextCursor } = getChatsWithRawDates(body);
    expect(nextCursor).toBe('abc');
  });
});
