import api from "./api";

const paymentService = {
  // Upload payment proof - PERBAIKI UNTUK HANDLE DISKON
  async uploadPaymentProof(paymentData) {
    try {
      const formData = new FormData();

      // ✅ GUNAKAN FIELD NAME 'payment_proof' (SESUAI DENGAN BACKEND)
      if (paymentData.paymentProof) {
        formData.append("payment_proof", paymentData.paymentProof);
      }

      // ✅ APPEND DATA LAINNYA - HAPUS paymentType
      formData.append("orderId", paymentData.orderId);
      formData.append("amount", paymentData.amount);
      formData.append(
        "payment_method",
        paymentData.paymentMethod || "transfer"
      );
      formData.append("bankName", paymentData.bankName || "");
      formData.append("accountNumber", paymentData.accountNumber || "");
      formData.append("accountHolder", paymentData.accountHolder || "");

      // ✅ TAMBAHKAN INFORMASI DISKON JIKA ADA
      if (paymentData.discountAmount) {
        formData.append("discountAmount", paymentData.discountAmount);
      }
      if (paymentData.originalAmount) {
        formData.append("originalAmount", paymentData.originalAmount);
      }

      console.log("📤 Uploading payment proof with data:", {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        discountAmount: paymentData.discountAmount,
        originalAmount: paymentData.originalAmount,
      });

      const response = await api.post("/user/payments/upload-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error uploading payment proof:", error);

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error("Gagal upload bukti pembayaran. Silakan coba lagi.");
      }
    }
  },

  // Get user payments
  async getUserPayments() {
    try {
      const response = await api.get("/user/payments/user-payments");
      return response.data;
    } catch (error) {
      console.error("Error getting user payments:", error);
      throw error;
    }
  },
};

export default paymentService;
