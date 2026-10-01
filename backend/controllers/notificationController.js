const notificationService = require("../services/notificationService");

const notificationController = {
  // ✅ GET USER NOTIFICATIONS WITH PAGINATION
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const userType = "customer";

      // ✅ AMBIL PARAMETER PAGINATION DARI QUERY
      const { page = 1, limit = 10, search = "", filter = "all" } = req.query;

      console.log("🔔 [CONTROLLER] Getting notifications with pagination:", {
        userId,
        userType,
        page,
        limit,
        search,
        filter,
      });

      const result =
        await notificationService.getUserNotificationsWithPagination(
          userId,
          userType,
          {
            page,
            limit,
            search,
          }
        );

      const unreadCount = await notificationService.getUnreadCount(
        userId,
        userType
      );

      console.log("🔔 [CONTROLLER] Sending paginated response:", {
        totalNotifications: result.total,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        unreadCount,
        userId,
      });

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          unreadCount,
          total: result.total,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("❌ Error getting user notifications:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil notifikasi",
        error: error.message,
      });
    }
  },

  // ✅ GET UNREAD COUNT - ONLY FOR LOGGED IN USER
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(
        userId,
        "customer"
      );

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil jumlah notifikasi belum dibaca",
        error: error.message,
      });
    }
  },

  // ✅ MARK AS READ - WITH OWNERSHIP VERIFICATION
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      console.log("🔔 [CONTROLLER] User marking notification as read:", {
        userId,
        notificationId: id,
      });

      const success = await notificationService.markAsRead(id, userId);

      if (success) {
        res.json({
          success: true,
          message: "Notifikasi ditandai sebagai sudah dibaca",
        });
      } else {
        res.status(403).json({
          success: false,
          message: "Notifikasi tidak ditemukan atau tidak memiliki akses",
        });
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menandai notifikasi sebagai dibaca",
        error: error.message,
      });
    }
  },

  // ✅ MARK ALL AS READ - ONLY FOR LOGGED IN USER
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      console.log("🔔 [CONTROLLER] User marking all as read:", userId);

      const count = await notificationService.markAllAsRead(userId, "customer");

      res.json({
        success: true,
        message: `${count} notifikasi ditandai sebagai sudah dibaca`,
        data: { count },
      });
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menandai semua notifikasi sebagai dibaca",
        error: error.message,
      });
    }
  },

  // ✅ DELETE NOTIFICATION - WITH OWNERSHIP VERIFICATION
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      console.log("🔔 [CONTROLLER] User deleting notification:", {
        userId,
        notificationId: id,
      });

      const success = await notificationService.deleteNotification(id, userId);

      if (success) {
        res.json({
          success: true,
          message: "Notifikasi berhasil dihapus",
        });
      } else {
        res.status(403).json({
          success: false,
          message: "Notifikasi tidak ditemukan atau tidak memiliki akses",
        });
      }
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus notifikasi",
        error: error.message,
      });
    }
  },
};

module.exports = notificationController;
