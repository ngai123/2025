import api from "../axios";

const userService = {
  register: async (payload) => {
    const { data } = await api.post("/users/register", payload);
    // Store JWT token after successful registration
    if (data?.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }
    return data;
  },

  login: async (credentials) => {
    const { data } = await api.post("/users/login", credentials);
    // If backend later adds JWTs, store them here
    if (data?.access_token) {
      localStorage.setItem("access_token", data.access_token);
    }
    return data;
  },

  getById: async (userId) => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },

  list: async ({ skip = 0, limit = 100 } = {}) => {
    const { data } = await api.get("/users", { params: { skip, limit } });
    return data;
  },

  update: async (userId, payload) => {
    const { data } = await api.put(`/users/${userId}`, payload);
    return data;
  },

  delete: async (userId) => {
    const { data } = await api.delete(`/users/${userId}`);
    return data;
  },

  changePassword: async (userId, payload) => {
    const { data } = await api.post(`/users/${userId}/change-password`, payload);
    return data; // { success, message }
  },
  blockUser: async (blockedId) => {
    const { data } = await api.post(`/users/block/${blockedId}`);
    return data;
  },
};

export default userService;