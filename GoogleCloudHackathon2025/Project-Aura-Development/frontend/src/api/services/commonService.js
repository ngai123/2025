import api from "../axios";

/**
 * Service for common/shared API operations.
 * Fetches catalog data like interests, languages, prompts, etc.
 */
const commonService = {
  /**
   * Get all available interests
   */
  getInterests: async () => {
    const { data } = await api.get("/common/interests");
    return data;
  },

  /**
   * Get all available languages
   */
  getLanguages: async () => {
    const { data } = await api.get("/common/languages");
    return data;
  },

  /**
   * Get all available prompts
   */
  getPrompts: async () => {
    const { data } = await api.get("/common/prompts");
    return data;
  },

  /**
   * Get all available goals
   */
  getGoals: async () => {
    const { data } = await api.get("/common/goals");
    return data;
  },

  /**
   * Get all education options
   */
  getEducation: async () => {
    const { data } = await api.get("/common/education");
    return data;
  },

  /**
   * Get all employment options
   */
  getEmployment: async () => {
    const { data } = await api.get("/common/employment");
    return data;
  },

  /**
   * Get all industry options
   */
  getIndustries: async () => {
    const { data } = await api.get("/common/industries");
    return data;
  },

  /**
   * Get all relationship status options
   */
  getRelationshipStatuses: async () => {
    const { data } = await api.get("/common/relationship-statuses");
    return data;
  },
};

export default commonService;
