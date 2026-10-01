import api from "./api";

const popupService = {
  getPopupSettings: async () => {
    try {
      console.log("🔄 Fetching popup settings from API...");
      const response = await api.get("/popup/settings");
      console.log("📡 API Response:", response);

      // Return the entire response data
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching popup settings:", error);
      // Return consistent fallback structure
      return {
        success: false,
        data: {
          interval_minutes: 120,
          is_active: true,
          delay_seconds: 5,
          show_only_with_discount: true,
        },
      };
    }
  },

  updatePopupSettings: async (settings) => {
    try {
      console.log("🔄 Updating popup settings:", settings);
      const response = await api.put("/popup/settings", settings);
      console.log("📡 Update response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating popup settings:", error);
      throw error;
    }
  },
};

export default popupService;
