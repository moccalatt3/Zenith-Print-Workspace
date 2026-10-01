// backend/services/notificationService.js
const db = require("../config/db");

/**
 * Format currency helper
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const notificationService = {
  /**
   * Buat notifikasi untuk user
   */
  async createUserNotification(
    userId,
    title,
    message,
    type,
    relatedData = null
  ) {
    try {
      console.log(`🔔 Creating user notification for user ${userId}: ${title}`);

      const [result] = await db.execute(
        `INSERT INTO notifications (
          user_id, user_type, order_id, payment_id, affiliate_id, title, message, notification_type, 
          action_url, related_data, is_admin_notification
        ) VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          relatedData?.order_id || null,
          relatedData?.payment_id || null,
          relatedData?.affiliate_id || null,
          title,
          message,
          type,
          relatedData?.action_url || null,
          relatedData ? JSON.stringify(relatedData) : null,
          false,
        ]
      );

      console.log(`✅ User notification created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error("❌ Error creating user notification:", error);
      throw error;
    }
  },

  /**
   * Buat notifikasi untuk admin
   */
  async createAdminNotification(title, message, type, relatedData = null) {
    try {
      console.log(`🔔 Creating admin notification: ${title}`);

      // ✅ PERBAIKAN: Pastikan action_url mengarah ke admin
      let actionUrl = relatedData?.action_url || null;
      if (actionUrl && !actionUrl.startsWith("/admin")) {
        // Jika action_url tidak mengarah ke admin, ubah ke admin
        actionUrl = `/admin${actionUrl}`;
      }

      const [result] = await db.execute(
        `INSERT INTO notifications (
        user_type, order_id, payment_id, affiliate_id, title, message, notification_type, 
        action_url, related_data, is_admin_notification
      ) VALUES ('admin', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          relatedData?.order_id || null,
          relatedData?.payment_id || null,
          relatedData?.affiliate_id || null,
          title,
          message,
          type,
          actionUrl, // ✅ GUNAKAN actionUrl YANG SUDAH DIPERBAIKI
          relatedData ? JSON.stringify(relatedData) : null,
          true,
        ]
      );

      console.log(`✅ Admin notification created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error("❌ Error creating admin notification:", error);
      throw error;
    }
  },

  /**
   * Buat notifikasi untuk affiliate
   */
  async createAffiliateNotification(
    affiliateId,
    title,
    message,
    type,
    relatedData = null
  ) {
    try {
      console.log(
        `🔔 Creating affiliate notification for affiliate ${affiliateId}: ${title}`
      );

      const [result] = await db.execute(
        `INSERT INTO notifications (
          user_id, user_type, order_id, payment_id, affiliate_id, title, message, notification_type, 
          action_url, related_data, is_admin_notification
        ) VALUES (?, 'affiliate', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          affiliateId,
          relatedData?.order_id || null,
          relatedData?.payment_id || null,
          affiliateId,
          title,
          message,
          type,
          relatedData?.action_url || null,
          relatedData ? JSON.stringify(relatedData) : null,
          false,
        ]
      );

      console.log(
        `✅ Affiliate notification created with ID: ${result.insertId}`
      );
      return result.insertId;
    } catch (error) {
      console.error("❌ Error creating affiliate notification:", error);
      throw error;
    }
  },

  /**
   * Notifikasi order baru untuk admin dan user
   */
  async notifyNewOrder(order, userType) {
    try {
      console.log("🔔 [DEBUG] notifyNewOrder called with:", {
        order,
        userType,
      });

      const { id, order_number, total_amount, user_id, affiliate_id } = order;

      // Notifikasi untuk ADMIN
      await this.createAdminNotification(
        "Pesanan Baru",
        `Pesanan baru #${order_number} dengan total ${formatCurrency(
          total_amount
        )}`,
        "order_created",
        {
          action_url: `/admin/orders/${id}`,
          order_id: id,
          affiliate_id: affiliate_id,
          order_number: order_number,
          total_amount: total_amount,
        }
      );

      // Notifikasi untuk USER
      let userMessage = "";
      if (userType === "company") {
        userMessage = `Pesanan #${order_number} berhasil dibuat. Menunggu approval billing internal.`;
      } else {
        userMessage = `Pesanan #${order_number} berhasil dibuat. Silakan lanjutkan pembayaran.`;
      }

      await this.createUserNotification(
        user_id,
        "Pesanan Berhasil Dibuat",
        userMessage,
        "order_created",
        {
          action_url: `/orders/${id}`,
          order_id: id,
          affiliate_id: affiliate_id,
          order_number: order_number,
        }
      );

      // Notifikasi untuk AFFILIATE jika ada
      if (affiliate_id) {
        await this.createAffiliateNotification(
          affiliate_id,
          "Referral Baru",
          `Ada pesanan baru dari referral Anda: #${order_number}`,
          "commission_earned",
          {
            action_url: `/affiliate/commissions`,
            order_id: id,
            affiliate_id: affiliate_id,
            order_number: order_number,
          }
        );
      }

      console.log(`✅ All notifications created for order #${order_number}`);
    } catch (error) {
      console.error("❌ Error in notifyNewOrder:", error);
    }
  },

  /**
   * Notifikasi perubahan status order
   */
  async notifyOrderStatusChange(order, oldStatus, newStatus, changedBy) {
    try {
      const { id, order_number, user_id, affiliate_id } = order;

      const statusMessages = {
        waiting_payment: "Menunggu Pembayaran",
        payment_review: "Pembayaran Sedang Ditinjau",
        processing: "Sedang Diproses",
        completed: "Selesai",
        cancelled: "Dibatalkan",
        pending_billing: "Menunggu Approval Billing",
      };

      // Notifikasi untuk USER
      await this.createUserNotification(
        user_id,
        "Status Pesanan Diperbarui",
        `Pesanan #${order_number} sekarang: ${
          statusMessages[newStatus] || newStatus
        }`,
        "order_status_updated",
        {
          action_url: `/orders/${id}`,
          order_id: id,
          affiliate_id: affiliate_id,
          order_number: order_number,
          old_status: oldStatus,
          new_status: newStatus,
        }
      );

      // Notifikasi khusus untuk admin jika status bermasalah
      if (newStatus === "cancelled" || newStatus === "problem") {
        await this.createAdminNotification(
          "Peringatan Status Pesanan",
          `Pesanan #${order_number} status: ${
            statusMessages[newStatus] || newStatus
          }`,
          "order_status_updated",
          {
            action_url: `/admin/orders/${id}`,
            order_id: id,
            affiliate_id: affiliate_id,
            order_number: order_number,
            priority: "high",
          }
        );
      }

      console.log(
        `✅ Status change notifications created for order #${order_number}`
      );
    } catch (error) {
      console.error("❌ Error in notifyOrderStatusChange:", error);
    }
  },

  /**
   * Notifikasi untuk verifikasi pembayaran
   */
  async notifyPaymentVerification(payment, order, action) {
    try {
      console.log("🔔 [DEBUG] notifyPaymentVerification called with:", {
        payment,
        order,
        action,
      });

      const { id, transaction_number, amount, payment_type, order_id } =
        payment;
      const { order_number, user_id, affiliate_id } = order;

      if (action === "verified") {
        // Notifikasi untuk USER - Pembayaran diverifikasi
        await this.createUserNotification(
          user_id,
          "Pembayaran Diverifikasi",
          `Pembayaran sebesar ${formatCurrency(
            amount
          )} untuk order #${order_number} telah diverifikasi dan order akan diproses`,
          "payment_verified",
          {
            action_url: `/orders/${order_id}`,
            order_id: order_id,
            payment_id: id,
            affiliate_id: affiliate_id,
            amount: amount,
          }
        );

        // Notifikasi untuk ADMIN - Konfirmasi verifikasi
        await this.createAdminNotification(
          "Pembayaran Telah Diverifikasi",
          `Pembayaran ${transaction_number} untuk order #${order_number} telah diverifikasi`,
          "payment_verified",
          {
            action_url: `/admin/orders/${order_id}`,
            order_id: order_id,
            payment_id: id,
            affiliate_id: affiliate_id,
          }
        );

        // Notifikasi untuk AFFILIATE jika ada
        if (affiliate_id) {
          await this.createAffiliateNotification(
            affiliate_id,
            "Komisi Siap Dicairkan",
            `Komisi dari order #${order_number} sudah siap dicairkan setelah pembayaran diverifikasi`,
            "commission_earned",
            {
              action_url: `/affiliate/commissions`,
              order_id: order_id,
              payment_id: id,
              affiliate_id: affiliate_id,
            }
          );
        }
      } else if (action === "rejected") {
        // Notifikasi untuk USER - Pembayaran ditolak
        await this.createUserNotification(
          user_id,
          "Pembayaran Ditolak",
          `Pembayaran sebesar ${formatCurrency(
            amount
          )} untuk order #${order_number} ditolak. Silakan periksa dan upload ulang bukti pembayaran`,
          "payment_rejected",
          {
            action_url: `/orders/${order_id}/payment`,
            order_id: order_id,
            payment_id: id,
            affiliate_id: affiliate_id,
            amount: amount,
          }
        );

        // Notifikasi untuk ADMIN - Konfirmasi penolakan
        await this.createAdminNotification(
          "Pembayaran Ditolak",
          `Pembayaran ${transaction_number} untuk order #${order_number} telah ditolak`,
          "payment_rejected",
          {
            action_url: `/admin/payments/${id}`,
            order_id: order_id,
            payment_id: id,
            affiliate_id: affiliate_id,
          }
        );
      }

      console.log(
        `✅ Payment ${action} notifications created for transaction ${transaction_number}`
      );
    } catch (error) {
      console.error(`❌ Error in notifyPaymentVerification:`, error);
    }
  },

  /**
   * Notifikasi untuk komisi affiliate
   */
  async notifyAffiliateCommission(affiliateId, order, commissionAmount) {
    try {
      const { order_number, id: order_id, affiliate_id } = order;

      await this.createAffiliateNotification(
        affiliateId,
        "Komisi Baru",
        `Anda mendapatkan komisi ${formatCurrency(
          commissionAmount
        )} dari order #${order_number}`,
        "commission_earned",
        {
          action_url: `/affiliate/commissions`,
          order_id: order_id,
          affiliate_id: affiliate_id,
          order_number: order_number,
          commission_amount: commissionAmount,
        }
      );

      console.log(
        `✅ Commission notification created for affiliate ${affiliateId}`
      );
    } catch (error) {
      console.error("❌ Error in notifyAffiliateCommission:", error);
    }
  },

  /**
   * Get user notifications with pagination - UNTUK CUSTOMER
   */
  async getUserNotificationsWithPagination(
    userId,
    userType = "customer",
    filters = {}
  ) {
    try {
      const { page = 1, limit = 10, search = "" } = filters;

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      console.log("🔔 [SERVICE] Getting USER notifications with pagination:", {
        userId,
        userType,
        page: pageNum,
        limit: limitNum,
        search,
      });

      // Base query dengan filter user_id dan user_type
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = ? AND user_type = ?
      `;
      const values = [userId, userType];

      // Add search filter
      if (search && search.trim() !== "") {
        query += " AND (title LIKE ? OR message LIKE ?)";
        const searchTerm = `%${search.trim()}%`;
        values.push(searchTerm, searchTerm);
      }

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total FROM notifications 
        WHERE user_id = ? AND user_type = ?
      `;
      const countValues = [userId, userType];

      if (search && search.trim() !== "") {
        countQuery += " AND (title LIKE ? OR message LIKE ?)";
        const searchTerm = `%${search.trim()}%`;
        countValues.push(searchTerm, searchTerm);
      }

      const [countResult] = await db.execute(countQuery, countValues);
      const total = countResult[0]?.total || 0;

      // Add pagination to main query
      query += " ORDER BY created_at DESC, id DESC";
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      const [notifications] = await db.execute(query, values);

      const totalPages = Math.ceil(total / limitNum) || 1;

      console.log(
        `✅ Found ${notifications.length} USER notifications for user ${userId} out of ${total}`
      );

      return {
        notifications,
        total: total,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error getting user notifications with pagination:",
        error
      );
      throw error;
    }
  },

  /**
   * Get admin notifications with pagination - UNTUK ADMIN
   * ✅ PERBAIKAN: Ambil semua notifikasi dengan user_type = 'admin' tanpa filter user_id
   */
  async getAdminNotificationsWithPagination(adminId, options = {}) {
    try {
      const { page = 1, limit = 10, search = "", userType = "admin" } = options;
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      console.log("🔔 [SERVICE] Getting ADMIN notifications with pagination:", {
        adminId,
        page: pageNum,
        limit: limitNum,
        search,
        userType,
        offset,
      });

      // ✅ PERBAIKAN: Hanya filter berdasarkan user_type = 'admin', tanpa user_id
      let query = `
        SELECT * FROM notifications 
        WHERE user_type = ?
      `;
      const values = [userType];

      // Add search filter
      if (search && search.trim() !== "") {
        query += " AND (title LIKE ? OR message LIKE ?)";
        const searchTerm = `%${search.trim()}%`;
        values.push(searchTerm, searchTerm);
      }

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total FROM notifications 
        WHERE user_type = ?
      `;
      const countValues = [userType];

      if (search && search.trim() !== "") {
        countQuery += " AND (title LIKE ? OR message LIKE ?)";
        const searchTerm = `%${search.trim()}%`;
        countValues.push(searchTerm, searchTerm);
      }

      console.log("🔍 [DEBUG] Admin Count Query:", countQuery);
      console.log("🔍 [DEBUG] Admin Count Values:", countValues);

      const [countResult] = await db.execute(countQuery, countValues);
      const total = countResult[0]?.total || 0;

      // Add pagination to main query
      query += " ORDER BY created_at DESC, id DESC";
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      console.log("🔍 [DEBUG] Admin Main Query:", query);
      console.log("🔍 [DEBUG] Admin Main Values:", values);

      const [notifications] = await db.execute(query, values);

      const totalPages = Math.ceil(total / limitNum) || 1;

      console.log(
        `✅ Found ${notifications.length} ADMIN notifications out of ${total}`
      );

      // Debug: Tampilkan notifikasi yang ditemukan
      if (notifications.length > 0) {
        console.log(
          "📋 ADMIN Notifications found:",
          notifications.slice(0, 3).map((n) => ({
            id: n.id,
            user_id: n.user_id,
            user_type: n.user_type,
            title: n.title,
            message: n.message,
            notification_type: n.notification_type,
            is_read: n.is_read,
          }))
        );
      }

      return {
        notifications,
        total: total,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error getting admin notifications with pagination:",
        error
      );
      throw error;
    }
  },

  /**
   * Get notifications for user - UNTUK CUSTOMER
   */
  async getUserNotifications(userId, userType = "customer") {
    try {
      console.log("🔔 [SERVICE] Getting notifications for logged in user:", {
        userId,
        userType,
      });

      const query = `
        SELECT * FROM notifications 
        WHERE user_id = ? AND user_type = ?
        ORDER BY created_at DESC
      `;

      const [notifications] = await db.execute(query, [userId, userType]);

      console.log(
        `✅ Found ${notifications.length} notifications for user ${userId}`
      );

      return notifications;
    } catch (error) {
      console.error("❌ Error getting user notifications:", error);
      throw error;
    }
  },

  /**
   * Mark notification as read - UNTUK CUSTOMER
   */
  async markAsRead(notificationId, userId) {
    try {
      console.log("🔔 [SERVICE] Marking USER notification as read:", {
        notificationId,
        userId,
      });

      const [result] = await db.execute(
        `UPDATE notifications SET is_read = TRUE 
         WHERE id = ? AND user_id = ? AND user_type = 'customer'`,
        [notificationId, userId]
      );

      const success = result.affectedRows > 0;
      console.log(`✅ Mark as read result: ${success ? "SUCCESS" : "FAILED"}`);

      return success;
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      throw error;
    }
  },

  /**
   * Mark admin notification as read - UNTUK ADMIN
   * ✅ PERBAIKAN: Update berdasarkan id saja (karena admin notifications tidak punya user_id)
   */
  async markAdminNotificationAsRead(notificationId, adminId) {
    try {
      console.log("🔔 [SERVICE] Marking ADMIN notification as read:", {
        notificationId,
        adminId,
      });

      const [result] = await db.execute(
        `UPDATE notifications SET is_read = TRUE 
         WHERE id = ? AND user_type = 'admin'`,
        [notificationId]
      );

      const success = result.affectedRows > 0;
      console.log(
        `✅ Mark admin as read result: ${success ? "SUCCESS" : "FAILED"}`
      );

      return success;
    } catch (error) {
      console.error("❌ Error marking admin notification as read:", error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read for user - UNTUK CUSTOMER
   */
  async markAllAsRead(userId, userType = "customer") {
    try {
      console.log("🔔 [SERVICE] Marking all as read for USER:", userId);

      const [result] = await db.execute(
        `UPDATE notifications SET is_read = TRUE 
         WHERE user_id = ? AND user_type = ? AND is_read = FALSE`,
        [userId, userType]
      );

      console.log(
        `✅ Marked ${result.affectedRows} USER notifications as read for user ${userId}`
      );
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      throw error;
    }
  },

  /**
   * Mark all admin notifications as read - UNTUK ADMIN
   * ✅ PERBAIKAN: Update semua notifikasi admin tanpa filter user_id
   */
  async markAllAdminAsRead(adminId) {
    try {
      console.log("🔔 [SERVICE] Marking all as read for ADMIN:", adminId);

      const [result] = await db.execute(
        `UPDATE notifications SET is_read = TRUE 
         WHERE user_type = 'admin' AND is_read = FALSE`,
        []
      );

      console.log(
        `✅ Marked ${result.affectedRows} ADMIN notifications as read`
      );
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Error marking all admin notifications as read:", error);
      throw error;
    }
  },

  /**
   * Delete notification - UNTUK CUSTOMER
   */
  async deleteNotification(notificationId, userId) {
    try {
      console.log("🔔 [SERVICE] Deleting USER notification:", {
        notificationId,
        userId,
      });

      const [result] = await db.execute(
        `DELETE FROM notifications 
         WHERE id = ? AND user_id = ? AND user_type = 'customer'`,
        [notificationId, userId]
      );

      const success = result.affectedRows > 0;
      console.log(
        `✅ Delete USER notification result: ${success ? "SUCCESS" : "FAILED"}`
      );

      return success;
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
      throw error;
    }
  },

  /**
   * Delete admin notification - UNTUK ADMIN
   * ✅ PERBAIKAN: Hapus berdasarkan id saja (karena admin notifications tidak punya user_id)
   */
  async deleteAdminNotification(notificationId, adminId) {
    try {
      console.log("🔔 [SERVICE] Deleting ADMIN notification:", {
        notificationId,
        adminId,
      });

      const [result] = await db.execute(
        `DELETE FROM notifications 
         WHERE id = ? AND user_type = 'admin'`,
        [notificationId]
      );

      const success = result.affectedRows > 0;
      console.log(
        `✅ Delete ADMIN notification result: ${success ? "SUCCESS" : "FAILED"}`
      );

      return success;
    } catch (error) {
      console.error("❌ Error deleting admin notification:", error);
      throw error;
    }
  },

  /**
   * Get unread notification count - UNTUK CUSTOMER
   */
  async getUnreadCount(userId, userType = "customer") {
    try {
      console.log("🔔 [SERVICE] Getting unread count for USER:", {
        userId,
        userType,
      });

      const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND user_type = ? AND is_read = FALSE`,
        [userId, userType]
      );

      const count = result[0]?.count || 0;
      console.log(`✅ Unread count for USER ${userId}: ${count}`);
      return count;
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      throw error;
    }
  },

  /**
   * Get admin unread notification count - UNTUK ADMIN
   * ✅ PERBAIKAN: Hitung semua notifikasi admin yang belum dibaca
   */
  async getAdminUnreadCount(adminId) {
    try {
      console.log("🔔 [SERVICE] Getting unread count for ADMIN:", {
        adminId,
      });

      const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_type = 'admin' AND is_read = FALSE`,
        []
      );

      const count = result[0]?.count || 0;
      console.log(`✅ Unread count for ADMIN: ${count}`);
      return count;
    } catch (error) {
      console.error("❌ Error getting admin unread count:", error);
      throw error;
    }
  },

  async deleteAllAdminNotifications(adminId) {
    try {
      console.log(
        "🔔 [SERVICE] Deleting ALL ADMIN notifications for admin:",
        adminId
      );

      const [result] = await db.execute(
        `DELETE FROM notifications 
       WHERE user_type = 'admin'`,
        []
      );

      console.log(`✅ Deleted ${result.affectedRows} ADMIN notifications`);
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Error deleting all admin notifications:", error);
      throw error;
    }
  },
};

module.exports = notificationService;
