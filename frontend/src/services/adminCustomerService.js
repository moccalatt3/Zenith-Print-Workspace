import api from "./api";

const adminCustomerService = {
  getAllCustomers: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        status: "",
        user_type: "",
        sortBy: "recent",
      };

      // Merge dengan params yang diberikan
      const finalParams = { ...defaultParams, ...params };

      // Build query parameters
      const queryParams = new URLSearchParams();

      // ✅ FIX: Selalu kirim page dan limit
      queryParams.append("page", finalParams.page.toString());
      queryParams.append("limit", finalParams.limit.toString());

      if (finalParams.search) {
        queryParams.append("search", finalParams.search);
      }
      if (finalParams.status && finalParams.status !== "all") {
        queryParams.append("status", finalParams.status);
      }
      if (finalParams.user_type && finalParams.user_type !== "all") {
        queryParams.append("user_type", finalParams.user_type);
      }
      if (finalParams.sortBy) {
        queryParams.append("sortBy", finalParams.sortBy);
      }

      const queryString = queryParams.toString();
      const url = `/admin/customers?${queryString}`;

      console.log("🔍 [CUSTOMER SERVICE] Fetching customers with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ [CUSTOMER SERVICE] Error fetching customers:", error);
      throw (
        error.response?.data || { message: "Gagal mengambil data customers" }
      );
    }
  },

  // Get customer detail by ID
  getCustomerDetail: async (customerId) => {
    try {
      console.log("🔍 Getting customer detail for:", customerId);
      const response = await api.get(`/admin/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error getting customer detail:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil detail customer";
      throw { message: errorMessage };
    }
  },

  // Update customer status
  updateCustomerStatus: async (customerId, statusData) => {
    try {
      console.log("🔄 Updating customer status:", { customerId, statusData });
      const response = await api.put(
        `/admin/customers/${customerId}/status`,
        statusData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error updating customer status:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal update status customer";
      throw { message: errorMessage };
    }
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    try {
      console.log("🗑️ Deleting customer:", customerId);
      const response = await api.delete(`/admin/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting customer:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal menghapus customer";
      throw { message: errorMessage };
    }
  },

  updateCustomerPassword: async (customerId, passwordData) => {
    try {
      console.log("🔐 Updating customer password:", {
        customerId,
        passwordData,
      });

      const response = await api.put(
        `/admin/customers/${customerId}/password`,
        passwordData
      );

      console.log("✅ Password updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating customer password:", error);

      // Error handling yang sama seperti function lainnya
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengupdate password customer";
      throw { message: errorMessage };
    }
  },
  // Get customer statistics
  getCustomerStats: async () => {
    try {
      console.log("📊 Getting customer statistics...");
      const response = await api.get("/admin/customers/stats");
      console.log("✅ Customer stats received:", response.data.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error getting customer stats:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil statistik customers";
      throw { message: errorMessage };
    }
  },
};

export default adminCustomerService;
