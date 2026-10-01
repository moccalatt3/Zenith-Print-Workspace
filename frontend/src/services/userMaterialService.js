import api from "./api";

const userMaterialService = {
  // Get all materials - GUNAKAN USER ENDPOINT
  getAllMaterials: async () => {
    try {
      const response = await api.get("/user/materials"); // ✅ User endpoint
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil data materials" }
      );
    }
  },
};

export default userMaterialService;
