import api from "./api";
import { authService } from "./authService";

const notificationService = {
  // GET ADMIN NOTIFICATIONS
  async getAdminNotifications(filters = {}) {
    try {
      const user = authService.getCurrentUser();

      console.log(
        "🔔 [FRONTEND] Getting ADMIN notifications with pagination:",
        {
          userId: user?.id,
          role: user?.role,
          filters,
        }
      );

      const params = new URLSearchParams();
      params.append("page", (filters.page || 1).toString());
      params.append("limit", (filters.limit || 10).toString());

      if (filters.search) {
        params.append("search", filters.search);
      }

      if (filters.filter && filters.filter !== "all") {
        params.append("filter", filters.filter);
      }

      const endpoint = "/admin/notifications";
      const response = await api.get(`${endpoint}?${params.toString()}`);

      console.log("🔔 [FRONTEND] ADMIN Notifications paginated response:", {
        success: response.data.success,
        count: response.data.data?.notifications?.length || 0,
        total: response.data.data?.total || 0,
        unreadCount: response.data.data?.unreadCount || 0,
        pagination: response.data.pagination,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error getting admin notifications:", error);
      throw error;
    }
  },

  // MARK AS READ - ADMIN
  async markAdminAsRead(notificationId) {
    try {
      console.log(
        "🔔 [FRONTEND] Marking ADMIN notification as read:",
        notificationId
      );

      // ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
      const response = await api.put(
        `/admin/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error marking ADMIN notification as read:", error);
      throw error;
    }
  },

  // MARK ALL AS READ - ADMIN
  async markAllAdminAsRead() {
    try {
      console.log("🔔 [FRONTEND] Marking all ADMIN notifications as read");

      // ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
      const response = await api.put("/admin/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("❌ Error marking all ADMIN notifications as read:", error);
      throw error;
    }
  },

  // DELETE NOTIFICATION - ADMIN
  async deleteAdminNotification(notificationId) {
    try {
      console.log("🔔 [FRONTEND] Deleting ADMIN notification:", notificationId);

      const response = await api.delete(
        `/admin/notifications/${notificationId}`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting ADMIN notification:", error);
      throw error;
    }
  },

  // DELETE ALL ADMIN NOTIFICATIONS - METHOD BARU
  async deleteAllAdminNotifications() {
    try {
      console.log("🔔 [FRONTEND] Deleting ALL ADMIN notifications");

      const response = await api.delete("/admin/notifications");
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting ALL ADMIN notifications:", error);
      throw error;
    }
  },

  // GET UNREAD COUNT - ADMIN
  async getAdminUnreadCount() {
    try {
      console.log("🔔 [FRONTEND] Getting ADMIN unread count");

      const response = await api.get("/admin/notifications/unread-count");
      return response.data;
    } catch (error) {
      console.error("❌ Error getting ADMIN unread count:", error);
      throw error;
    }
  },

  // METHOD UNTUK CUSTOMER (tetap ada)
  async getUserNotifications(filters = {}) {
    try {
      const user = authService.getCurrentUser();
      const params = new URLSearchParams();
      params.append("page", (filters.page || 1).toString());
      params.append("limit", (filters.limit || 10).toString());

      if (filters.search) {
        params.append("search", filters.search);
      }

      if (filters.filter && filters.filter !== "all") {
        params.append("filter", filters.filter);
      }

      const endpoint = "/user/notifications";
      const response = await api.get(`${endpoint}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error getting user notifications:", error);
      throw error;
    }
  },

  async markAsRead(notificationId) {
    try {
      // ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
      const response = await api.put(
        `/user/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error marking USER notification as read:", error);
      throw error;
    }
  },

  async markAllAsRead() {
    try {
      // ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
      const response = await api.put("/user/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("❌ Error marking all USER notifications as read:", error);
      throw error;
    }
  },

  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(
        `/user/notifications/${notificationId}`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting USER notification:", error);
      throw error;
    }
  },

  async getUnreadCount() {
    try {
      const response = await api.get("/user/notifications/unread-count");
      return response.data;
    } catch (error) {
      console.error("❌ Error getting USER unread count:", error);
      throw error;
    }
  },
};

export default notificationService;
