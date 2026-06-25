import api from "../axios";

const profileService = {
  create: async (payload) => {
    const { data } = await api.post("/profiles/", payload);
    return data;
  },

  get: async (userId) => {
    const { data } = await api.get(`/profiles/${userId}`);
    return data;
  },

  update: async (userId, payload) => {
    const { data } = await api.put(`/profiles/${userId}`, payload);
    return data;
  },

  getPictures: async (userId) => {
    const { data } = await api.get(`/profiles/${userId}/pictures`);
    return data;
  },

  addPicture: async (userId, payload) => {
    const body = { ...payload, user_id: userId };
    const { data } = await api.post(`/profiles/${userId}/pictures`, body);
    return data;
  },

  deletePicture: async (pictureId) => {
    const { data } = await api.delete(`/profiles/pictures/${pictureId}`);
    return data; // { success, message }
  },

  getEmergencyContacts: async () => {
    const { data } = await api.get(`/profile/me/emergency-contacts`);
    return data;
  },

  addEmergencyContact: async (payload) => {
    const { data } = await api.post(`/profile/me/emergency-contacts`, payload);
    return data;
  },

  deleteEmergencyContact: async (contactId) => {
    const { data} = await api.delete(`/profile/me/emergency-contacts/${contactId}`);
    return data; // { success, message }
  },

  getPreferences: async (userId) => {
    const { data } = await api.get(`/profiles/${userId}/preferences`);
    return data;
  },

  updatePreferences: async (userId, payload) => {
    const { data } = await api.put(`/profiles/${userId}/preferences`, payload);
    return data;
  },

  uploadPicture: async (file, category = "profile") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    const { data } = await api.post(`/profile/me/pictures`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  getMyPictures: async () => {
    const { data } = await api.get(`/profile/me/pictures`);
    return data; // [{ id, image_url, category, upload_date }]
  },

  deleteMyPicture: async (pictureId) => {
    const { data } = await api.delete(`/profile/me/pictures/${pictureId}`);
    return data; // { success, message }
  }
};

export default profileService;