import api from "../axios";

const messageService = {
  // Chat sessions
  createSession: async (payload) => {
    const { data } = await api.post("/messages/sessions", payload);
    return data;
  },

  getSession: async (sessionId) => {
    const { data } = await api.get(`/messages/sessions/${sessionId}`);
    return data;
  },

  getSessionsByUser: async (userId) => {
    const { data } = await api.get(`/messages/sessions/user/${userId}`);
    return data;
  },

  addParticipant: async (sessionId, userId, role = "MEMBER") => {
    const { data } = await api.post(`/messages/sessions/${sessionId}/participants`, null, {
      params: { user_id: userId, role },
    });
    return data; // { success, message }
  },

  // Messages
  sendMessage: async (payload) => {
    const { data } = await api.post("/messages", payload);
    return data;
  },

  getMessage: async (messageId) => {
    const { data } = await api.get(`/messages/${messageId}`);
    return data;
  },

  getChatMessages: async (sessionId, { skip = 0, limit = 50 } = {}) => {
    const { data } = await api.get(`/messages/session/${sessionId}`, {
      params: { skip, limit },
    });
    return data;
  },

  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data; // { success, message }
  },

  // Attachments
  addAttachment: async (payload) => {
    const { data } = await api.post("/messages/attachments", payload);
    return data;
  },
};

export default messageService;