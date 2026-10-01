import api from "./api";

export const profileService = {
  // Get user profile with statistics
  getProfile: async () => {
    try {
      const response = await api.get("/user/profile/profile");
      return response.data;
    } catch (error) {
      console.error("Get profile error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil data profil";
      throw new Error(errorMessage);
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put("/user/profile/profile", profileData);
      return response.data;
    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal memperbarui profil";
      throw new Error(errorMessage);
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.put(
        "/user/profile/change-password",
        passwordData
      );
      return response.data;
    } catch (error) {
      console.error("Change password error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengubah password";
      throw new Error(errorMessage);
    }
  },

  // Get user activity
  getActivity: async () => {
    try {
      const response = await api.get("/user/profile/activity");
      return response.data;
    } catch (error) {
      console.error("Get activity error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil data aktivitas";
      throw new Error(errorMessage);
    }
  },
};

export default profileService;
