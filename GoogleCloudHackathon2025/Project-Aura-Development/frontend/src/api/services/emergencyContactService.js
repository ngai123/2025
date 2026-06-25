import api from '../axios';

const emergencyContactService = {
  /**
   * Get all emergency contacts for the current user
   * @returns {Promise<Array>} Array of emergency contacts
   */
  getEmergencyContacts: async () => {
    const { data } = await api.get('/profile/me/emergency-contacts');
    return data;
  },

  /**
   * Add a new emergency contact
   * Maximum 2 emergency contacts allowed per user
   * @param {Object} contactData - Contact data
   * @param {string} contactData.contact_name - Contact name
   * @param {string} contactData.contact_phone - Contact phone (E.164 format recommended)
   * @param {string} [contactData.country_id] - Optional country ID
   * @returns {Promise<Object>} Created contact
   */
  addEmergencyContact: async (contactData) => {
    const { data } = await api.post('/profile/me/emergency-contacts', contactData);
    return data;
  },

  /**
   * Create or update the primary emergency contact
   * If a contact exists, updates it. Otherwise, creates a new one.
   * Use this for single emergency contact management (Settings page)
   * @param {Object} contactData - Contact data
   * @param {string} contactData.contact_name - Contact name
   * @param {string} contactData.contact_phone - Contact phone
   * @param {string} [contactData.country_id] - Optional country ID
   * @returns {Promise<Object>} Contact data
   */
  upsertEmergencyContact: async (contactData) => {
    const { data } = await api.put('/profile/me/emergency-contact', contactData);
    return data;
  },

  /**
   * Delete an emergency contact
   * @param {number} contactId - Contact ID to delete
   * @returns {Promise<Object>} Success response
   */
  deleteEmergencyContact: async (contactId) => {
    const { data } = await api.delete(`/profile/me/emergency-contacts/${contactId}`);
    return data;
  },
};

export default emergencyContactService;
