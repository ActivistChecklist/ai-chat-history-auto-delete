/**
 * Generic provider interface for LLM chat history deletion.
 * Implement this for each chat provider.
 */
export const ProviderInterface = {
  id: '',
  displayName: '',
  baseUrl: '',
  /**
   * Load a page of chats.
   * @param {string|null} cursor - Pagination cursor, null for first page
   * @returns {Promise<{chats: Array<{id: string, name?: string, createdAt: number}>, hasMore: boolean}>}
   */
  async loadChatsPage(_cursor) {},
  /**
   * Delete chats by ID.
   * @param {string[]} ids - Chat IDs to delete
   * @returns {Promise<{deleted: number, errors?: Array<{id: string, error: string}>}>}
   */
  async deleteChats(_ids) {}
};
