const db = require("../config/db");
const bcrypt = require("bcryptjs");

const userProfileController = {
  // Get user profile data
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      const [users] = await db.execute(
        `SELECT 
        id, name, email, phone, address, role, status, user_type, company_name,
        affiliate_id, created_at 
      FROM users 
      WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      const user = users[0];

      // Get user statistics
      const [orderStats] = await db.execute(
        `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN order_status IN ('payment_received', 'printing', 'final_touchup', 'ready_to_ship') THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN order_status IN ('under_review', 'waiting_payment') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM orders 
      WHERE user_id = ?`,
        [userId]
      );

      const stats = orderStats[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            address: user.address || "",
            role: user.role,
            user_type: user.user_type,
            company_name: user.company_name || "",
            created_at: user.created_at,
          },
          statistics: {
            total_orders: stats.total_orders || 0,
            completed_orders: stats.completed_orders || 0,
            processing_orders: stats.processing_orders || 0,
            pending_orders: stats.pending_orders || 0,
          },
        },
      });
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data profil",
      });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      const { name, email, phone, address, companyName } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Nama dan email harus diisi",
        });
      }

      // Validasi format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Format email tidak valid",
        });
      }

      // Cek apakah email sudah digunakan oleh user lain
      const [existingUsers] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email sudah digunakan oleh user lain",
        });
      }

      // Get current user data untuk cek user_type
      const [currentUsers] = await db.execute(
        "SELECT user_type FROM users WHERE id = ?",
        [userId]
      );

      if (currentUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      const currentUser = currentUsers[0];

      // Prepare update data
      let updateQuery = `UPDATE users 
         SET name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP`;
      let queryParams = [name, email, phone, address];

      // Hanya update company_name jika user_type = 'company'
      if (currentUser.user_type === "company") {
        updateQuery += `, company_name = ?`;
        queryParams.push(companyName || null);
      }

      updateQuery += ` WHERE id = ?`;
      queryParams.push(userId);

      await db.execute(updateQuery, queryParams);

      // Get updated user data
      const [users] = await db.execute(
        `SELECT id, name, email, phone, address, role, user_type, company_name, created_at 
       FROM users WHERE id = ?`,
        [userId]
      );

      const updatedUser = users[0];

      res.json({
        success: true,
        message: "Profil berhasil diperbarui",
        data: {
          user: updatedUser,
        },
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
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Password saat ini dan password baru harus diisi",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password baru minimal 6 karakter",
        });
      }

      // Get current password from database
      const [users] = await db.execute(
        "SELECT password FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      const user = users[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
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
        [hashedPassword, userId]
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

  // Get user activity (recent orders)
  async getActivity(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      const [orders] = await db.execute(
        `SELECT 
          o.id, o.order_number, o.total_amount, o.order_status, o.payment_status,
          o.created_at,
          COUNT(oi.id) as item_count,
          GROUP_CONCAT(DISTINCT oi.material_name) as materials
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 10`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          orders: orders,
        },
      });
    } catch (error) {
      console.error("Error getting user activity:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data aktivitas",
      });
    }
  },
};

module.exports = userProfileController;
