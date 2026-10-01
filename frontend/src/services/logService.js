import api from "./api";

const logService = {
  // Get all logs with filters - FIXED PARAMETER NAMES
  getAllLogs: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 100,
        search: "",
        action_type: "",
        resource_type: "",
        start_date: "",
        end_date: "",
      };

      // Merge dengan params yang diberikan
      const finalParams = { ...defaultParams, ...params };

      // Build query parameters - GUNAKAN NAMA YANG SAMA DENGAN CONTROLLER
      const queryParams = new URLSearchParams();

      // ✅ FIX: Selalu kirim page dan limit
      queryParams.append("page", finalParams.page.toString());
      queryParams.append("limit", finalParams.limit.toString());

      // ✅ FIX: Gunakan nama parameter yang sama dengan controller
      if (finalParams.search && finalParams.search.trim() !== "") {
        queryParams.append("search", finalParams.search.trim());
      }
      if (finalParams.action_type && finalParams.action_type.trim() !== "") {
        queryParams.append("action_type", finalParams.action_type.trim());
      }
      if (
        finalParams.resource_type &&
        finalParams.resource_type.trim() !== ""
      ) {
        queryParams.append("resource_type", finalParams.resource_type.trim());
      }
      if (finalParams.start_date && finalParams.start_date.trim() !== "") {
        queryParams.append("start_date", finalParams.start_date.trim());
      }
      if (finalParams.end_date && finalParams.end_date.trim() !== "") {
        queryParams.append("end_date", finalParams.end_date.trim());
      }

      const queryString = queryParams.toString();
      const url = `/admin/logs?${queryString}`;

      console.log("🔍 [LOG SERVICE] Fetching logs with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);

      console.log("✅ [LOG SERVICE] Response received:", {
        success: response.data.success,
        dataLength: response.data.data?.logs?.length || 0,
        pagination: response.data.data?.pagination,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch logs");
      }

      return response.data;
    } catch (error) {
      console.error("❌ [LOG SERVICE] Error fetching logs:", error);

      // Extract meaningful error message
      let errorMessage = "Gagal mengambil data logs";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },

  // Get log statistics
  getLogStats: async () => {
    try {
      console.log("📊 Getting log statistics...");
      const response = await api.get("/admin/logs/stats");

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch log stats");
      }

      console.log("✅ Log stats received:", response.data.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error getting log stats:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil statistik logs";
      throw new Error(errorMessage);
    }
  },

  // Get logs by resource
  getLogsByResource: async (resource_type, resource_id) => {
    try {
      console.log("🔍 Getting logs by resource:", {
        resource_type,
        resource_id,
      });
      const response = await api.get(
        `/admin/logs/resource/${resource_type}/${resource_id}`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch resource logs"
        );
      }

      return response.data;
    } catch (error) {
      console.error("❌ Error getting resource logs:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil logs resource";
      throw new Error(errorMessage);
    }
  },

  // Get filter options
  getFilterOptions: async () => {
    try {
      console.log("🔍 Getting log filter options...");
      const response = await api.get("/admin/logs/filter-options");

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch filter options"
        );
      }

      return response.data;
    } catch (error) {
      console.error("❌ Error getting filter options:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil opsi filter";
      throw new Error(errorMessage);
    }
  },

  // Debug logs
  getLogsDebug: async () => {
    try {
      console.log("🐛 Getting debug logs...");
      const response = await api.get("/admin/logs/debug");
      return response.data;
    } catch (error) {
      console.error("❌ Error getting debug logs:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengambil debug logs";
      throw new Error(errorMessage);
    }
  },

  resetAllLogs: async (confirmation = null) => {
    try {
      console.log("🗑️  Requesting to reset all logs...");

      const payload = {};
      if (confirmation) {
        payload.confirmation = confirmation;
      }

      const response = await api.delete("/admin/logs/reset", { data: payload });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to reset logs");
      }

      console.log("✅ Logs reset successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error resetting logs:", error);

      let errorMessage = "Gagal mereset data logs";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  },
};

export default logService;
