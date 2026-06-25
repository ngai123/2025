import api from "../axios";

const chatService = {
  /**
   * Get enriched chat list for inbox
   * @param {number} userId - Current user ID
   * @returns {Promise<Array>} List of chats with user details
   */
  getChatList: async (userId) => {
    const { data } = await api.get(`/messages/chats/list/${userId}`);
    return data;
  },

  /**
   * Get full conversation with messages
   * @param {number} sessionId - Chat session ID
   * @param {number} userId - Current user ID
   * @returns {Promise<Object>} Conversation data with messages
   */
  getConversation: async (sessionId, userId) => {
    const { data } = await api.get(`/messages/conversation/${sessionId}/${userId}`);
    return data;
  },

  /**
   * Mark messages as read
   * @param {number} sessionId - Chat session ID
   * @param {number} userId - Current user ID
   * @returns {Promise<Object>} Success response
   */
  markAsRead: async (sessionId, userId) => {
    const { data } = await api.post("/messages/mark-read", {
      session_id: sessionId,
      user_id: userId,
    });
    return data;
  },

  /**
   * Block user in chat
   * @param {number} sessionId - Chat session ID
   * @param {number} userId - Current user ID (blocker)
   * @returns {Promise<Object>} Success response
   */
  blockUser: async (sessionId, userId) => {
    const { data} = await api.post(`/messages/block/${sessionId}/${userId}`);
    return data;
  },

  /**
   * Unmatch a chat - both users can view history but cannot send messages
   * @param {number} sessionId - Chat session ID
   * @param {number} userId - Current user ID
   * @returns {Promise<Object>} Success response
   */
  unmatchChat: async (sessionId, userId) => {
    const { data } = await api.post(`/messages/unmatch/${sessionId}/${userId}`);
    return data;
  },

  /**
   * Send a new message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  sendMessage: async (messageData) => {
    const { data } = await api.post("/messages/", messageData);
    return data;
  },

  /**
   * Upload an image attachment to a message
   * @param {number} messageId - Message ID to attach the image to
   * @param {FormData} formData - FormData containing the image file
   * @returns {Promise<Object>} Attachment response with URL
   */
  uploadMessageAttachment: async (messageId, formData) => {
    const { data } = await api.post(
      `/messages/${messageId}/attachments/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return data;
  },

  /**
   * Delete a message
   * @param {number} messageId - Message ID to delete
   * @returns {Promise<Object>} Success response
   */
  deleteMessage: async (messageId, deletingUserId) => {
    const { data } = await api.delete(`/messages/${messageId}`, {
      params: { deleting_user_id: deletingUserId },
    });
    return data;
  },

  /**
   * ✨ NEW: Edit a message
   * @param {number} messageId - Message ID to edit
   * @param {string} newContent - New message content
   * @returns {Promise<Object>} Updated message
   */
  editMessage: async (messageId, newContent) => {
    const { data } = await api.put(`/messages/${messageId}`, {
      content: newContent,
    });
    return data;
  },
    /**
   * ✨ NEW: Get AI-generated message suggestions
   * @param {number} sessionId - Chat session ID
   * @param {number} userId - Current user ID
   * @param {number} limit - Number of suggestions (1-5, default 3)
   * @returns {Promise<Object>} AI suggestions response
   */
  getAISuggestions: async (sessionId, userId, limit = 3) => {
    const { data } = await api.post("/messages/ai/suggestions", {
      session_id: sessionId,
      user_id: userId,
      limit: limit,
    });
    return data;
  },

  getChatSession: async (sessionId) => {
    const { data } = await api.get(`/messages/sessions/${sessionId}`);
    return data;
  },

  checkMatchSession: async (likerId, likedId) => {
    const { data } = await api.get(`/matches/check_match/${likerId}/${likedId}`);
    return data;
  },
  aiChat: async (sessionId, userId, prompt) => {
    const { data } = await api.post('/messages/ai/chat', {
      session_id: sessionId,
      user_id: userId,
      prompt: prompt,
    });
    return data;
  },
  getAIMemory: async (sessionId) => {
    const { data } = await api.get(`/ai/memory/${sessionId}`);
    return data;
  },

  // ============= MESSAGE REACTIONS =============

  /**
   * Add a reaction to a message
   * @param {number} messageId - Message ID
   * @param {number} userId - User ID
   * @param {string} emoji - Emoji character
   * @returns {Promise<Object>} Reaction result
   */
  addReaction: async (messageId, userId, emoji) => {
    const { data } = await api.post("/messages/reactions", {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
    });
    return data;
  },

  /**
   * Remove a reaction from a message
   * @param {number} messageId - Message ID
   * @param {number} userId - User ID
   * @param {string} emoji - Emoji character
   * @returns {Promise<Object>} Success response
   */
  removeReaction: async (messageId, userId, emoji) => {
    const { data } = await api.delete("/messages/reactions", {
      params: { message_id: messageId, user_id: userId, emoji: emoji },
    });
    return data;
  },

  /**
   * Get all reactions for a message
   * @param {number} messageId - Message ID
   * @returns {Promise<Array>} List of reactions grouped by emoji
   */
  getReactions: async (messageId) => {
    const { data } = await api.get(`/messages/reactions/${messageId}`);
    return data;
  },
};

export default chatService;