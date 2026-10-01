import api from "./api";

const userAffiliateService = {
  // Ambil data affiliate milik user login
  getAffiliateData: async () => {
    try {
      const response = await api.get("/user/affiliate-data");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || {
          message: "Gagal mengambil data affiliate user",
        }
      );
    }
  },

  validateAffiliateCode: async (affiliateCode) => {
    try {
      console.log("🔄 [SERVICE] Validating affiliate code:", affiliateCode);

      const response = await api.post("/affiliate/validate-code", {
        affiliateCode,
      });

      console.log("✅ [SERVICE] Validation response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [SERVICE] Validation error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Return object instead of throwing error
      return (
        error.response?.data || {
          success: false,
          message: "Gagal memvalidasi kode affiliate",
        }
      );
    }
  },

  // ✅ CEK STATUS AFFILIATE USER
  checkUserAffiliateStatus: async () => {
    try {
      const response = await api.get("/user/affiliate-status");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || {
          success: false,
          message: "Gagal memeriksa status affiliate user",
        }
      );
    }
  },
};

export default userAffiliateService;
