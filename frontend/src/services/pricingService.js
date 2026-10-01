import api from "./api";

const pricingService = {
  // Get pricing configuration
  async getConfig() {
    try {
      const response = await api.get("/admin/pricing/config");
      return response.data;
    } catch (error) {
      console.error("❌ Error getting pricing config:", error);
      throw error;
    }
  },

  // Update pricing configuration
  async updateConfig(configData) {
    try {
      const response = await api.put("/admin/pricing/config", configData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating pricing config:", error);
      throw error;
    }
  },

  // Get pricing rules with pagination - UPDATE INI
  async getPricingRules(filters = {}) {
    try {
      const params = new URLSearchParams();

      // ✅ SELALU kirim page dan limit
      params.append("page", (filters.page || 1).toString());
      params.append("limit", (filters.limit || 10).toString());

      if (filters.search) {
        params.append("search", filters.search);
      }

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }

      console.log("📋 Fetching pricing rules with params:", params.toString());

      const response = await api.get(
        `/admin/pricing/rules?${params.toString()}`
      );

      console.log("📋 Pricing rules response:", response.data);

      return response.data;
    } catch (error) {
      console.error("❌ Error fetching pricing rules:", error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || "Gagal mengambil data diskon",
        };
      }
      throw error;
    }
  },

  async createPricingRule(ruleData) {
    try {
      console.log("➕ Creating pricing rule:", ruleData);

      const response = await api.post("/admin/pricing/rules", ruleData, {
        headers: {
          "Content-Type": "multipart/form-data", // ✅ TAMBAHKAN INI
        },
      });

      console.log("➕ Create pricing rule response:", response.data);

      return response.data;
    } catch (error) {
      console.error("❌ Error creating pricing rule:", error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || "Gagal menambahkan diskon",
        };
      }
      throw error;
    }
  },

  // Update pricing rule - PERBAIKI INI
  async updatePricingRule(id, ruleData) {
    try {
      console.log(`✏️ Updating pricing rule ${id}:`, ruleData);

      const response = await api.put(`/admin/pricing/rules/${id}`, ruleData, {
        headers: {
          "Content-Type": "multipart/form-data", // ✅ TAMBAHKAN INI
        },
      });

      console.log(`✏️ Update pricing rule response:`, response.data);

      return response.data;
    } catch (error) {
      console.error(`❌ Error updating pricing rule ${id}:`, error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || "Gagal memperbarui diskon",
        };
      }
      throw error;
    }
  },

  // Delete pricing rule - PERBAIKI INI
  async deletePricingRule(id) {
    try {
      console.log(`🗑️ Deleting pricing rule ${id}`);

      const response = await api.delete(`/admin/pricing/rules/${id}`);

      console.log(`🗑️ Delete pricing rule response:`, response.data);

      return response.data;
    } catch (error) {
      console.error(`❌ Error deleting pricing rule ${id}:`, error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || "Gagal menghapus diskon",
        };
      }
      throw error;
    }
  },

  // Toggle pricing rule status - PERBAIKI INI
  togglePricingRuleStatus: async (id) => {
    try {
      console.log(`🔄 Service: Toggling rule ${id}`);
      const response = await api.patch(`/admin/pricing/rules/${id}/toggle`);
      console.log(`🔄 Service: Toggle response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Service: Error toggling rule ${id}:`, error);
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || "Gagal mengubah status diskon",
        };
      }
      throw error;
    }
  },

  // Calculate pricing
  async calculatePricing(calculationData) {
    try {
      console.log("📤 Sending calculation data to backend:", calculationData);
      const response = await api.post(
        "/admin/pricing/calculate",
        calculationData
      );
      console.log("📥 Backend response:", response.data);

      // Pastikan response memiliki format yang konsisten
      if (response.data && response.data.success !== undefined) {
        return response.data;
      } else {
        // Jika backend tidak return format {success, data}, kita wrap manual
        return {
          success: true,
          data: response.data,
        };
      }
    } catch (error) {
      console.error("❌ Error in calculatePricing service:", error);

      // Return format error yang konsisten
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error:
            error.response.data?.error ||
            error.response.data?.message ||
            "Server error",
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          error: "No response from server",
        };
      } else {
        // Something else happened
        return {
          success: false,
          error: error.message,
        };
      }
    }
  },

  // Get calculation history
  async getCalculationHistory(limit = 10) {
    try {
      const response = await api.get(
        `/admin/pricing/calculations/history?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error getting calculation history:", error);
      throw error;
    }
  },
};

export default pricingService;
