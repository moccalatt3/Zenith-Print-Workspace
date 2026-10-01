import api from "./api";

const materialService = {
  // ✅ GET ALL MATERIALS WITH PAGINATION (FIXED)
  getAllMaterialsWithPagination: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        status: "",
      };

      // Merge dengan params yang diberikan
      const finalParams = { ...defaultParams, ...params };

      // Build query parameters
      const queryParams = new URLSearchParams();

      // ✅ FIX: Selalu kirim page dan limit, bahkan jika tidak diubah
      queryParams.append("page", finalParams.page.toString());
      queryParams.append("limit", finalParams.limit.toString());

      if (finalParams.search) {
        queryParams.append("search", finalParams.search);
      }
      if (finalParams.status && finalParams.status !== "all") {
        queryParams.append("status", finalParams.status);
      }

      const queryString = queryParams.toString();
      const url = `/materials?${queryString}`;

      console.log("🔍 [MATERIAL SERVICE] Fetching materials with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ [MATERIAL SERVICE] Error fetching materials:", error);
      throw (
        error.response?.data || { message: "Gagal mengambil data materials" }
      );
    }
  },

  // ✅ GET ALL MATERIALS WITHOUT PAGINATION (untuk kompatibilitas)
  getAllMaterials: async () => {
    try {
      const response = await api.get("/materials/all");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data materials" }
      );
    }
  },

  // ✅ GET MATERIAL BY ID
  getMaterialById: async (id) => {
    try {
      const response = await api.get(`/materials/${id}`);
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data material" }
      );
    }
  },

  // ✅ CREATE MATERIAL
  createMaterial: async (materialData) => {
    try {
      const response = await api.post("/materials", materialData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error in createMaterial service:", error);
      throw error.response?.data || { message: "Gagal menambahkan material" };
    }
  },

  // ✅ UPDATE MATERIAL
  updateMaterial: async (id, materialData) => {
    try {
      const response = await api.put(`/materials/${id}`, materialData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error in updateMaterial service:", error);
      throw error.response?.data || { message: "Gagal memperbarui material" };
    }
  },

  // ✅ DELETE MATERIAL
  deleteMaterial: async (id) => {
    try {
      const response = await api.delete(`/materials/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menghapus material" };
    }
  },

  // ✅ GET MATERIAL STATS
  getMaterialStats: async () => {
    try {
      const response = await api.get("/materials/stats/summary");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || {
          message: "Gagal mengambil statistik materials",
        }
      );
    }
  },
};

export default materialService;
