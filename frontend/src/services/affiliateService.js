import api from "./api";

const affiliateService = {
  // Get all affiliates with pagination
  getAllAffiliatesPaginated: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        status: "",
        sortBy: "recent",
      };

      // Merge dengan params yang diberikan
      const finalParams = { ...defaultParams, ...params };

      // Build query parameters
      const queryParams = new URLSearchParams();

      // ✅ Selalu kirim page dan limit
      queryParams.append("page", finalParams.page.toString());
      queryParams.append("limit", finalParams.limit.toString());

      if (finalParams.search) {
        queryParams.append("search", finalParams.search);
      }
      if (finalParams.status && finalParams.status !== "all") {
        queryParams.append("status", finalParams.status);
      }
      if (finalParams.sortBy) {
        queryParams.append("sortBy", finalParams.sortBy);
      }

      const queryString = queryParams.toString();
      const url = `/admin/affiliates/paginated?${queryString}`;

      console.log("🔍 [AFFILIATE SERVICE] Fetching affiliates with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ [AFFILIATE SERVICE] Error fetching affiliates:", error);
      throw (
        error.response?.data || { message: "Gagal mengambil data affiliates" }
      );
    }
  },

  // Get all affiliates (existing - keep for compatibility)
  getAllAffiliates: async () => {
    try {
      const response = await api.get("/admin/affiliates");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data affiliates" }
      );
    }
  },

  // Get affiliate by ID
  getAffiliateById: async (id) => {
    try {
      const response = await api.get(`/admin/affiliates/${id}`);
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data affiliate" }
      );
    }
  },

  // Create new affiliate
  createAffiliate: async (affiliateData) => {
    try {
      const response = await api.post("/admin/affiliates", affiliateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menambahkan affiliate" };
    }
  },

  // Update affiliate
  updateAffiliate: async (id, affiliateData) => {
    try {
      const response = await api.put(`/admin/affiliates/${id}`, affiliateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal memperbarui affiliate" };
    }
  },

  // Delete affiliate
  deleteAffiliate: async (id) => {
    try {
      const response = await api.delete(`/admin/affiliates/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menghapus affiliate" };
    }
  },

  // Get performance stats
  getPerformanceStats: async () => {
    try {
      const response = await api.get("/admin/affiliates/stats/performance");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal mengambil statistik" };
    }
  },

  withdrawCommission: async (id) => {
    try {
      const response = await api.post(`/admin/affiliates/${id}/withdraw`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal mencairkan komisi" };
    }
  },

  // ✅ GET AFFILIATE SETTINGS (UPDATE)
  getAffiliateSettings: async () => {
    try {
      const response = await api.get("/admin/affiliates/settings");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data pengaturan" }
      );
    }
  },

  // ✅ UPDATE AFFILIATE SETTINGS (UPDATE)
  updateAffiliateSettings: async (settingsData) => {
    try {
      const response = await api.put(
        "/admin/affiliates/settings",
        settingsData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal memperbarui pengaturan" };
    }
  },

  // ✅ FUNGSI BARU: Get cleanup job info
  getCleanupJobInfo: async () => {
    try {
      const response = await api.get("/admin/affiliates/cleanup/job-info");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil info cleanup job" }
      );
    }
  },

  // ✅ FUNGSI BARU: Manual cleanup
  manualCleanup: async () => {
    try {
      const response = await api.post("/admin/affiliates/cleanup/manual");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menjalankan cleanup" };
    }
  },

  // ✅ FUNGSI BARU: Update all expiry dates
  updateAllExpiryDates: async () => {
    try {
      const response = await api.post(
        "/admin/affiliates/cleanup/update-expiry-dates"
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal update expiry dates" };
    }
  },

  // Validate affiliate code
  validateAffiliateCode: async (affiliateCode) => {
    try {
      const response = await api.post("/admin/affiliates/validate-code", {
        affiliateCode,
      });
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal memvalidasi kode affiliate" }
      );
    }
  },

  // Get affiliate relationships
  getAffiliateRelationships: async (id) => {
    try {
      const response = await api.get(`/admin/affiliates/${id}/relationships`);
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || {
          message: "Gagal mengambil data relationships",
        }
      );
    }
  },

  // Debug user data
  debugUserAffiliateData: async (email) => {
    try {
      const response = await api.get(
        `/admin/affiliates/debug/user-data?email=${email}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal debug data user" };
    }
  },
};

export default affiliateService;
