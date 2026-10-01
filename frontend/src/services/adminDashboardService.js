import api from "./api";

const adminDashboardService = {
  // Get revenue and orders data
  async getRevenueOrdersData(period = "1") {
    try {
      const response = await api.get(
        `/admin/dashboard/revenue-orders?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting revenue data:", error);
      throw error.response?.data || { message: "Gagal mengambil data revenue" };
    }
  },

  // Get order status data
  async getOrderStatusData(period = "1") {
    try {
      const response = await api.get(
        `/admin/dashboard/order-status?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting order status data:", error);
      throw (
        error.response?.data || { message: "Gagal mengambil data status order" }
      );
    }
  },

  // Get dashboard overview
  async getDashboardOverview(period = "1") {
    try {
      const response = await api.get(
        `/admin/dashboard/overview?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting dashboard overview:", error);
      throw (
        error.response?.data || { message: "Gagal mengambil data overview" }
      );
    }
  },

  // Get recent orders
  async getRecentOrders() {
    try {
      const response = await api.get("/admin/dashboard/recent-orders");
      return response.data;
    } catch (error) {
      console.error("Error getting recent orders:", error);
      throw (
        error.response?.data || {
          message: "Gagal mengambil data order terbaru",
        }
      );
    }
  },
};

export default adminDashboardService;
