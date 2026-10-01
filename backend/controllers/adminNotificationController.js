// backend/controllers/adminNotificationController.js
const notificationService = require("../services/notificationService");

const adminNotificationController = {
  // Get admin notifications with pagination
  async getAdminNotifications(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 10, search = "" } = req.query;

      console.log(
        "🔔 [ADMIN CONTROLLER] Getting ADMIN notifications for admin:",
        {
          adminId,
          page,
          limit,
          search,
        }
      );

      const result =
        await notificationService.getAdminNotificationsWithPagination(adminId, {
          page: parseInt(page),
          limit: parseInt(limit),
          search,
          userType: "admin",
        });

      const unreadCount = await notificationService.getAdminUnreadCount(
        adminId
      );

      console.log(
        "🔔 [ADMIN CONTROLLER] Sending ADMIN notifications response:",
        {
          notificationsCount: result.notifications.length,
          unreadCount,
          total: result.total,
          pagination: result.pagination,
        }
      );

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          unreadCount,
          total: result.total,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Error getting admin notifications:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil notifikasi admin",
        error: error.message,
      });
    }
  },

  // Get admin unread count
  async getAdminUnreadCount(req, res) {
    try {
      const adminId = req.user.id;
      const count = await notificationService.getAdminUnreadCount(adminId);

      console.log("🔔 [ADMIN CONTROLLER] Admin unread count:", {
        adminId,
        count,
      });

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("❌ Error getting admin unread count:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil jumlah notifikasi belum dibaca admin",
        error: error.message,
      });
    }
  },

  // Mark admin notification as read
  async markAdminAsRead(req, res) {
    try {
      const adminId = req.user.id;
      const { id } = req.params;

      console.log("🔔 [ADMIN CONTROLLER] Marking ADMIN notification as read:", {
        notificationId: id,
        adminId,
      });

      const success = await notificationService.markAdminNotificationAsRead(
        id,
        adminId
      );

      if (success) {
        res.json({
          success: true,
          message: "Notifikasi admin ditandai sebagai sudah dibaca",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Notifikasi admin tidak ditemukan",
        });
      }
    } catch (error) {
      console.error("❌ Error marking admin notification as read:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menandai notifikasi admin sebagai dibaca",
        error: error.message,
      });
    }
  },

  // Mark all admin notifications as read - DIPERBAIKI
  async markAllAdminAsRead(req, res) {
    try {
      const adminId = req.user.id;

      console.log(
        "🔔 [ADMIN CONTROLLER] Marking all ADMIN notifications as read for admin:",
        adminId
      );

      const count = await notificationService.markAllAdminAsRead(adminId);

      res.json({
        success: true,
        message: `${count} notifikasi admin ditandai sebagai sudah dibaca`,
        data: { count },
      });
    } catch (error) {
      console.error("❌ Error marking all admin notifications as read:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menandai semua notifikasi admin sebagai dibaca",
        error: error.message,
      });
    }
  },

  // Delete admin notification
  async deleteAdminNotification(req, res) {
    try {
      const adminId = req.user.id;
      const { id } = req.params;

      console.log("🔔 [ADMIN CONTROLLER] Deleting ADMIN notification:", {
        notificationId: id,
        adminId,
      });

      const success = await notificationService.deleteAdminNotification(
        id,
        adminId
      );

      if (success) {
        res.json({
          success: true,
          message: "Notifikasi admin berhasil dihapus",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Notifikasi admin tidak ditemukan",
        });
      }
    } catch (error) {
      console.error("❌ Error deleting admin notification:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus notifikasi admin",
        error: error.message,
      });
    }
  },

  // DELETE ALL ADMIN NOTIFICATIONS - ENDPOINT BARU
  async deleteAllAdminNotifications(req, res) {
    try {
      const adminId = req.user.id;

      console.log(
        "🔔 [ADMIN CONTROLLER] Deleting ALL ADMIN notifications for admin:",
        adminId
      );

      const count = await notificationService.deleteAllAdminNotifications(
        adminId
      );

      res.json({
        success: true,
        message: `${count} notifikasi admin berhasil dihapus`,
        data: { count },
      });
    } catch (error) {
      console.error("❌ Error deleting all admin notifications:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus semua notifikasi admin",
        error: error.message,
      });
    }
  },
};

module.exports = adminNotificationController;
