import api from "./api";

const adminHistoryService = {
  // Get semua riwayat
  getAllHistory: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        user_type: "all",
      };

      // Merge dengan params yang diberikan
      const finalParams = { ...defaultParams, ...params };

      // Build query parameters - SAMA PERSIS seperti di adminOrderService
      const queryParams = new URLSearchParams();

      // ✅ FIX: Selalu kirim page dan limit
      queryParams.append("page", finalParams.page.toString());
      queryParams.append("limit", finalParams.limit.toString());

      if (finalParams.search) {
        queryParams.append("search", finalParams.search);
      }
      if (finalParams.user_type && finalParams.user_type !== "all") {
        queryParams.append("user_type", finalParams.user_type);
      }

      const queryString = queryParams.toString();
      const url = `/admin/history?${queryString}`;

      console.log("🔍 [HISTORY SERVICE] Fetching history with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ [HISTORY SERVICE] Error fetching history:", error);
      throw error.response?.data || { message: "Gagal mengambil data riwayat" };
    }
  },

  // Get statistik riwayat
  getHistoryStats: async () => {
    try {
      const response = await api.get("/admin/history/stats");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil statistik riwayat" }
      );
    }
  },

  moveCompletedToHistory: async () => {
    try {
      console.log("🚀 [HISTORY SERVICE] Calling move completed to history API");
      const response = await api.post("/admin/history/move-completed");
      console.log(
        "✅ [HISTORY SERVICE] Move completed response:",
        response.data
      );

      if (response.data && response.data.data) {
        console.log(
          `📊 [HISTORY SERVICE] Moved ${response.data.data.movedCount} orders`
        );
      }

      return response.data;
    } catch (error) {
      console.error("❌ [HISTORY SERVICE] Error moving to history:", error);

      // Return detailed error message
      if (error.response?.data) {
        console.error(
          "📋 [HISTORY SERVICE] Error details:",
          error.response.data
        );
        throw error.response.data;
      } else if (error.message) {
        throw { message: error.message };
      } else {
        throw { message: "Gagal memindahkan order ke riwayat" };
      }
    }
  },

  // Hapus dari riwayat
  deleteFromHistory: async (historyId) => {
    try {
      const response = await api.delete(`/admin/history/${historyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menghapus riwayat" };
    }
  },

  exportHistoryToExcel: async () => {
    try {
      console.log("📊 [HISTORY SERVICE] Exporting history to Excel...");
      const response = await api.get("/admin/history/export-excel", {
        responseType: "blob", // Penting untuk menerima file binary
      });

      // Create blob URL untuk download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `riwayat-transaksi-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("✅ [HISTORY SERVICE] Excel export completed");
      return { success: true, message: "Export berhasil" };
    } catch (error) {
      console.error("❌ [HISTORY SERVICE] Error exporting to Excel:", error);

      if (error.response?.data instanceof Blob) {
        // Handle error response yang berupa blob
        const errorText = await error.response.data.text();
        const errorData = JSON.parse(errorText);
        throw errorData;
      }

      throw (
        error.response?.data || { message: "Gagal mengekspor data ke Excel" }
      );
    }
  },
  exportSingleHistoryToExcel: async (historyId) => {
    try {
      console.log(
        "📥 [HISTORY SERVICE] Exporting single history to Excel:",
        historyId
      );

      const response = await api.get(
        `/admin/history/${historyId}/export-excel`,
        {
          responseType: "blob",
        }
      );

      // Create blob URL untuk download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan-${historyId}-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("✅ [HISTORY SERVICE] Single Excel export completed");
      return { success: true, message: "Download berhasil" };
    } catch (error) {
      console.error(
        "❌ [HISTORY SERVICE] Error exporting single to Excel:",
        error
      );

      if (error.response?.data instanceof Blob) {
        const errorText = await error.response.data.text();
        const errorData = JSON.parse(errorText);
        throw errorData;
      }

      throw error.response?.data || { message: "Gagal mengunduh laporan" };
    }
  },
};

export default adminHistoryService;
