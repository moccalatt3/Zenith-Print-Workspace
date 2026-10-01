import api from "./api";

const adminOrderService = {
  getAllOrders: async (params = {}) => {
    try {
      // Set default values
      const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        status: "",
        payment_status: "",
        user_type: "",
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
      if (finalParams.payment_status && finalParams.payment_status !== "all") {
        queryParams.append("payment_status", finalParams.payment_status);
      }
      if (finalParams.user_type && finalParams.user_type !== "all") {
        queryParams.append("user_type", finalParams.user_type);
      }

      const queryString = queryParams.toString();
      const url = `/admin/orders?${queryString}`;

      console.log("🔍 [ORDER SERVICE] Fetching orders with params:", {
        url,
        finalParams,
      });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("❌ [ORDER SERVICE] Error fetching orders:", error);
      throw error.response?.data || { message: "Gagal mengambil data orders" };
    }
  },

  // Get order detail by ID
  getOrderDetail: async (orderId) => {
    try {
      const response = await api.get(`/admin/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal mengambil detail order" };
    }
  },

  // Update order status - ✅ DIPERBAIKI: tambahkan parameter admin_notes
  updateOrderStatus: async (orderId, statusData) => {
    try {
      // ✅ PERBAIKAN: Pastikan mengirim admin_notes jika ada
      const dataToSend = {
        status: statusData.status,
        notes: statusData.notes || null,
        admin_notes: statusData.admin_notes || null, // ✅ TAMBAHKAN INI
      };

      console.log("📤 [ORDER SERVICE] Sending status update:", dataToSend);

      const response = await api.put(
        `/admin/orders/${orderId}/status`,
        dataToSend
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal update status order" };
    }
  },

  // Update payment status - ✅ DIPERBAIKI: tambahkan parameter admin_notes
  updatePaymentStatus: async (orderId, paymentData) => {
    try {
      // ✅ PERBAIKAN: Pastikan mengirim admin_notes jika ada
      const dataToSend = {
        payment_status: paymentData.payment_status,
        notes: paymentData.notes || null,
        admin_notes: paymentData.admin_notes || null, // ✅ TAMBAHKAN INI
      };

      console.log("📤 [ORDER SERVICE] Sending payment update:", dataToSend);

      const response = await api.put(
        `/admin/orders/${orderId}/payment-status`,
        dataToSend
      );
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal update status pembayaran" }
      );
    }
  },

  // ✅ FUNCTION BARU: Update hanya admin notes
  updateAdminNotes: async (orderId, data) => {
    try {
      const response = await api.put(
        `/admin/orders/${orderId}/admin-notes`,
        data
      );
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal memperbarui catatan admin" }
      );
    }
  },

  // Delete order
  deleteOrder: async (orderId) => {
    try {
      const response = await api.delete(`/admin/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Gagal menghapus order" };
    }
  },

  // Get orders statistics
  getOrderStats: async () => {
    try {
      const response = await api.get("/admin/orders/stats");
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Gagal mengambil statistik orders" }
      );
    }
  },

  async deleteOrder(orderId) {
    try {
      const response = await api.delete(`/admin/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  updateCustomerPassword: async (customerId, passwordData) => {
    try {
      const response = await api.put(
        `/admin/customers/${customerId}/password`,
        passwordData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};


export default adminOrderService;
