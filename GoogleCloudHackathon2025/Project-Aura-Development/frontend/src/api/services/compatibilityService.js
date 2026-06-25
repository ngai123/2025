import api from "../axios";

/**
 * Service for profile compatibility analysis.
 * Uses AI to generate compatibility insights between two users.
 */
const compatibilityService = {
  /**
   * Get compatibility summary between current user and target profile.
   * @param {number} currentUserId - ID of the user viewing the profile
   * @param {number} targetUserId - ID of the profile being viewed
   * @returns {Promise<{summary: string, shared_interests: string[], compatibility_highlights: string[], same_goal: boolean}>}
   */
  getCompatibilitySummary: async (currentUserId, targetUserId) => {
    const { data } = await api.get(
      `/compatibility/compare/${currentUserId}/${targetUserId}`
    );
    return data;
  },
};

export default compatibilityService;
