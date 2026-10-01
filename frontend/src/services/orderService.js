import api from "./api";

const orderService = {
  // ✅ Upload file 3D
  async uploadModels(formData) {
    try {
      const response = await api.post("/orders/upload-model", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get user's uploaded files
  async getUserFiles() {
    try {
      const response = await api.get("/orders/user-files");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Create new order
  async createOrder(orderData) {
    try {
      const response = await api.post("/orders/create", orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get user orders
  async getUserOrders(filters = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      // ✅ SELALU kirim page dan limit
      params.append("page", (filters.page || 1).toString());
      params.append("limit", (filters.limit || 10).toString());

      if (filters.search) {
        params.append("search", filters.search);
      }

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }

      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy);
      }

      const response = await api.get(
        `/orders/user-orders?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order detail
  async getOrderDetail(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order by order number
  async getOrderByNumber(orderNumber) {
    try {
      const response = await api.get(`/orders/number/${orderNumber}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Update order status (for admin)
  async updateOrderStatus(orderId, statusData) {
    try {
      const response = await api.put(`/orders/${orderId}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Cancel order
  async cancelOrder(orderId, cancelReason) {
    try {
      const response = await api.put(`/orders/${orderId}/cancel`, {
        cancelReason,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get orders for admin
  async getAllOrders(filters = {}) {
    try {
      const response = await api.get("/orders", { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order statistics
  async getOrderStats() {
    try {
      const response = await api.get("/orders/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Download file
  async downloadFile(fileUrl) {
    try {
      const response = await api.get(fileUrl, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order status history
  async getOrderStatusHistory(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/status-history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Add admin notes to order
  async addAdminNotes(orderId, notes) {
    try {
      const response = await api.put(`/orders/${orderId}/admin-notes`, {
        adminNotes: notes,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Update estimated completion date
  async updateEstimatedDate(orderId, estimatedDate) {
    try {
      const response = await api.put(`/orders/${orderId}/estimated-date`, {
        estimatedCompletionDate: estimatedDate,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get orders by status
  async getOrdersByStatus(status) {
    try {
      const response = await api.get(`/orders/status/${status}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get active orders (yang belum complete)
  async getActiveOrders() {
    try {
      const response = await api.get("/orders/active/user");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order status
  async getOrderStatus(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/status`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async uploadPaymentProof(orderId, paymentData) {
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("amount", paymentData.amount);
      formData.append("payment_method", paymentData.paymentMethod);
      formData.append("payment_proof", paymentData.paymentProof);
      formData.append("paymentType", "full_payment"); // ✅ SELALU FULL PAYMENT

      const response = await api.post("/user/payments/upload-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async addFilesToOrder(orderId, filesData) {
    try {
      const response = await api.post(
        `/orders/${orderId}/add-files`,
        filesData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ Get order files
  async getOrderFiles(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/files`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteOrder(orderId) {
    try {
      const response = await api.delete(`/orders/${orderId}/delete`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
};

export default orderService;
