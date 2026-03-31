/**
 * Claude.ai provider - uses reverse-engineered API from discovery.
 * Update endpoints/parsing based on discovery logs.
 */

export const claudeProvider = {
  id: 'claude',
  displayName: 'Claude',
  baseUrl: 'https://claude.ai',

  buildFetchOptions: {
    getOrganizations: () => ({
      url: 'https://claude.ai/api/organizations',
      options: { method: 'GET', credentials: 'include' }
    }),
    getChats: (orgId, offset = 0, limit = 100) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(String(orgId ?? ''))) {
        throw new Error('Invalid organization ID');
      }
      const url = new URL(`https://claude.ai/api/organizations/${orgId}/chat_conversations`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('consistency', 'eventual');
      return { url: url.toString(), options: { method: 'GET', credentials: 'include' } };
    },
    deleteChats: (orgId, chatIds) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(String(orgId ?? ''))) {
        throw new Error('Invalid organization ID');
      }
      return {
        url: `https://claude.ai/api/organizations/${orgId}/chat_conversations/delete_many`,
        options: {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_uuids: chatIds })
        }
      };
    }
  }
};

/**
 * Parse Claude API responses - response is array directly.
 */
export function parseChatsResponse(body, limit = 30) {
  const data = typeof body === 'string' ? JSON.parse(body) : body;
  const chats = Array.isArray(data) ? data : (data.chat_conversations ?? data.conversations ?? data.items ?? data.chats ?? []);
  return {
    chats: chats.map((c) => ({
      id: c.uuid ?? c.id,
      name: c.name ?? c.title ?? null,
      createdAt: parseTimestamp(c.updated_at ?? c.updatedAt ?? c.created_at ?? c.createdAt),
      starred: !!(c.starred ?? c.is_starred ?? c.pinned ?? c.is_pinned)
    })).filter((c) => c.id),
    hasMore: chats.length >= limit
  };
}

/**
 * Extract raw date info from chat objects for debug - shows created_at vs updated_at.
 */
export function getChatsWithRawDates(body, limit = 100) {
  const data = typeof body === 'string' ? JSON.parse(body) : body;
  const raw = Array.isArray(data) ? data : (data.chat_conversations ?? data.conversations ?? data.items ?? data.chats ?? []);
  const chats = raw.map((c) => {
    const dateUsed = c.updated_at ?? c.updatedAt ?? c.created_at ?? c.createdAt;
    const keyUsed = c.updated_at != null ? 'updated_at' : c.updatedAt != null ? 'updatedAt' : c.created_at != null ? 'created_at' : c.createdAt != null ? 'createdAt' : null;
    return {
      id: c.uuid ?? c.id,
      name: c.name ?? c.title ?? null,
      created_at: c.created_at ?? null,
      createdAt: c.createdAt ?? null,
      updated_at: c.updated_at ?? null,
      updatedAt: c.updatedAt ?? null,
      dateUsed,
      keyUsed,
      starred: !!(c.starred ?? c.is_starred ?? c.pinned ?? c.is_pinned)
    };
  }).filter((c) => c.id);
  const hasMore = raw.length >= Math.min(limit, 50);
  const nextCursor = data?.last_id ?? data?.lastId ?? data?.next_cursor ?? data?.nextCursor ?? data?.cursor;
  return { chats, hasMore, nextCursor };
}

function parseTimestamp(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  return new Date(ts).getTime();
}
