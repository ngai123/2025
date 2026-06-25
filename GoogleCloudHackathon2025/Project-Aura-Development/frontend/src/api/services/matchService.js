import api from "../axios";

const matchService = {
  likeOrDislike: async (payload) => {
    // payload: { like_user_id, l_user_id, status: "LIKE" | "DISLIKE" }
    const { data } = await api.post("/matches/like", payload);
    return data;
  },

  getUserMatches: async (userId) => {
    const { data } = await api.get(`/matches/user/${userId}`);
    return data; // List<UserResponse>
  },

  checkIfMatched: async (user1Id, user2Id) => {
    const { data } = await api.get(`/matches/check/${user1Id}/${user2Id}`);
    return data; // { success, message }
  },

  getUsersWhoLiked: async (userId) => {
    const { data } = await api.get(`/matches/liked-by/${userId}`);
    return data; // number[]
  },

  getUsersLikedBy: async (userId) => {
    const { data } = await api.get(`/matches/liked/${userId}`);
    return data; // number[]
  },

  resetSeenProfiles: async (userId) => {
    const { data } = await api.delete(`/matches/reset-seen/${userId}`);
    return data; // { success, message, reset_count }
  },
};

export default matchService;