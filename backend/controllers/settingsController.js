const db = require("../config/db");
const bcrypt = require("bcryptjs");

const settingsController = {
  // Get admin profile
  async getAdminProfile(req, res) {
    try {
      const adminId = req.user.id;

      const [user] = await db.execute(
        `SELECT id, name, email, role, status, user_type, created_at 
         FROM users 
         WHERE id = ? AND role = 'admin'`,
        [adminId]
      );

      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin tidak ditemukan",
        });
      }

      res.json({
        success: true,
        data: user[0],
      });
    } catch (error) {
      console.error("Error getting admin profile:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data profil",
      });
    }
  },

  // Update admin profile
  async updateProfile(req, res) {
    try {
      const adminId = req.user.id;
      const { name, email } = req.body;

      // Check if email already exists for other users
      const [existingUser] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, adminId]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email sudah digunakan oleh user lain",
        });
      }

      // Update profile
      await db.execute(
        "UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'admin'",
        [name, email, adminId]
      );

      res.json({
        success: true,
        message: "Profil berhasil diperbarui",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui profil",
      });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const adminId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get current password
      const [user] = await db.execute(
        "SELECT password FROM users WHERE id = ? AND role = 'admin'",
        [adminId]
      );

      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin tidak ditemukan",
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user[0].password
      );

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Password saat ini tidak valid",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.execute(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hashedPassword, adminId]
      );

      res.json({
        success: true,
        message: "Password berhasil diubah",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengubah password",
      });
    }
  },

  async resetData(req, res) {
    try {
      const adminId = req.user.id;

      // Start transaction
      await db.execute("START TRANSACTION");

      try {
        // Non-aktifkan foreign key checks untuk menghindari constraint error
        await db.execute("SET FOREIGN_KEY_CHECKS = 0");

        // Hapus data dari SEMUA tables secara berurutan (perhatikan dependencies)
        await db.execute("DELETE FROM order_histori_items");
        await db.execute("DELETE FROM order_history");
        await db.execute("DELETE FROM order_status_history");
        await db.execute("DELETE FROM order_items");
        await db.execute("DELETE FROM payment_transactions");
        await db.execute("DELETE FROM pricing_calculations");
        await db.execute("DELETE FROM orders");
        await db.execute("DELETE FROM notifications");
        await db.execute("DELETE FROM admin_logs");
        await db.execute("DELETE FROM password_resets");
        await db.execute("DELETE FROM site_stats");

        // Reset tables yang perlu di-reset values-nya
        await db.execute("DELETE FROM refferals");
        await db.execute("DELETE FROM affiliate_settings");
        await db.execute(
          "UPDATE affiliates SET total_referrals = 0, active_referrals = 0, total_earnings = 0, pending_earnings = 0"
        );

        // Hapus data content/configuration (opsional, sesuaikan kebutuhan)
        await db.execute("DELETE FROM hero_slides");
        await db.execute("DELETE FROM popup_settings");
        await db.execute("DELETE FROM contact_info");
        await db.execute("DELETE FROM bank_accounts");
        await db.execute("DELETE FROM materials");
        await db.execute("DELETE FROM pricing_rules");
        await db.execute("DELETE FROM pricing_config");

        // Hapus semua users KECUALI admin
        await db.execute("DELETE FROM users WHERE role != 'admin'");

        // Aktifkan kembali foreign key checks
        await db.execute("SET FOREIGN_KEY_CHECKS = 1");

        // Commit transaction
        await db.execute("COMMIT");

        res.json({
          success: true,
          message:
            "SEMUA data berhasil direset. Hanya user admin yang tersisa di sistem.",
        });
      } catch (error) {
        await db.execute("ROLLBACK");
        await db.execute("SET FOREIGN_KEY_CHECKS = 1"); // Pastikan di-enable kembali
        throw error;
      }
    } catch (error) {
      console.error("Error resetting data:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mereset data: " + error.message,
      });
    }
  },
};

module.exports = settingsController;
