import api from "./api";

const adminSettingsService = {
  // Get admin profile
  async getProfile() {
    try {
      const response = await api.get("/admin/settings/profile");
      return response.data;
    } catch (error) {
      console.error("Error getting profile:", error);
      throw error.response?.data || { message: "Gagal mengambil data profil" };
    }
  },

  // Update profile
  async updateProfile(profileData) {
    try {
      const response = await api.put("/admin/settings/profile", profileData);
      return response.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error.response?.data || { message: "Gagal memperbarui profil" };
    }
  },

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await api.put("/admin/settings/password", passwordData);
      return response.data;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error.response?.data || { message: "Gagal mengubah password" };
    }
  },

  // Reset all data
  async resetData() {
    try {
      const response = await api.delete("/admin/settings/reset-data");
      return response.data;
    } catch (error) {
      console.error("Error resetting data:", error);
      throw error.response?.data || { message: "Gagal mereset data" };
    }
  },
};

export default adminSettingsService;
