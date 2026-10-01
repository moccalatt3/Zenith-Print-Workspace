// services/userPricingService.js - SESUAIKAN DENGAN BASEURL ANDA
import api from "./api";

const userPricingService = {
  // Get pricing configuration - PAKAI ROUTE USER
  async getConfig() {
    try {
      const response = await api.get("/user/pricing-config"); // ← AKAN MENJADI: http://localhost:4000/api/user/pricing-config
      console.log("📊 User pricing config response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error getting user pricing config:", error);
      // Fallback ke default values
      return {
        success: true,
        data: {
          shippingRatePerKg: 500000,
          taxRate: 20,
          packingCost: 10000,
          localShippingRatePerKg: 30000,
          overheadPercentage: 25,
          profitPercentage: 150,
          finalPriceDiscount: 15,
        },
      };
    }
  },

  // Calculate pricing - PAKAI ROUTE USER
  async calculatePricing(data) {
    try {
      console.log("🧮 User calculate pricing request:", data);
      const response = await api.post("/user/calculate-pricing", data); // ← AKAN MENJADI: http://localhost:4000/api/user/calculate-pricing
      console.log("📊 User calculate pricing response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error calculating user pricing:", error);
      throw error;
    }
  },
};

export default userPricingService;
