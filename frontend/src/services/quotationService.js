import api from "./api";

const quotationService = {
  // ✅ Download quotation PDF
  async downloadQuotation(orderId) {
    try {
      console.log(`📥 Downloading quotation for order: ${orderId}`);
      const response = await api.get(`/quotation/${orderId}/pdf`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      console.error("❌ Error downloading quotation:", error);
      throw error;
    }
  },

  // ✅ Preview quotation PDF
  async previewQuotation(orderId) {
    try {
      console.log(`👀 Previewing quotation for order: ${orderId}`);
      const response = await api.get(`/quotation/${orderId}/preview`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      console.error("❌ Error previewing quotation:", error);
      throw error;
    }
  },
};

export default quotationService;
