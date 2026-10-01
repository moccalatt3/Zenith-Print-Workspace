const db = require("../config/db");
const bcrypt = require("bcryptjs"); 

const adminCustomerController = {
  async getAllCustomers(req, res) {
    let connection;
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        user_type = "",
        sortBy = "recent",
      } = req.query;

      console.log("📥 Query parameters:", {
        page,
        limit,
        search,
        status,
        user_type,
        sortBy,
      });

      // Convert page and limit to numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Base query - DENGAN LIMIT dan OFFSET - TAMBAH company_name
      let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.user_type,
        u.company_name, 
        u.referral_code,
        u.affiliate_id,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
    `;

      const queryParams = [];

      // Add filters
      if (search && search.trim() !== "") {
        query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (status && status !== "all" && status.trim() !== "") {
        query += ` AND u.status = ?`;
        queryParams.push(status.trim());
      }

      if (user_type && user_type !== "all" && user_type.trim() !== "") {
        query += ` AND u.user_type = ?`;
        queryParams.push(user_type.trim());
      }

      // Group by user
      query += ` GROUP BY u.id`;

      // Sorting
      switch (sortBy) {
        case "name":
          query += ` ORDER BY u.name ASC`;
          break;
        case "orders":
          query += ` ORDER BY total_orders DESC`;
          break;
        case "spent":
          query += ` ORDER BY total_spent DESC`;
          break;
        case "recent":
        default:
          query += ` ORDER BY u.created_at DESC`;
          break;
      }

      // Add pagination
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      console.log("🔍 Final query:", query);
      console.log("📋 Query params:", queryParams);

      // Get connection from pool
      connection = await db.getConnection();

      // Execute main query
      const [customers] = await connection.execute(query, queryParams);
      console.log(`✅ Found ${customers.length} customers`);

      // Get total count for pagination
      let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE u.role = 'customer'
    `;

      const countParams = [];

      if (search && search.trim() !== "") {
        countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (status && status !== "all" && status.trim() !== "") {
        countQuery += ` AND u.status = ?`;
        countParams.push(status.trim());
      }

      if (user_type && user_type !== "all" && user_type.trim() !== "") {
        countQuery += ` AND u.user_type = ?`;
        countParams.push(user_type.trim());
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total || 0;

      console.log(`📊 Total customers: ${total}`);

      // Format response - DENGAN pagination
      const formattedCustomers = customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: "-",
        company:
          customer.company_name ||
          (customer.user_type === "company"
            ? "Company Customer"
            : "Individual"),
        address: "-",
        joinDate: customer.created_at,
        totalOrders: customer.total_orders || 0,
        totalSpent: parseFloat(customer.total_spent) || 0,
        lastOrder: customer.last_order_date || customer.created_at,
        status: customer.status || "active",
        userType: customer.user_type || "individual",
        role: customer.role,
        referralCode: customer.referral_code,
        affiliateId: customer.affiliate_id,
        companyName: customer.company_name || null, 
      }));

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        success: true,
        data: {
          customers: formattedCustomers,
          pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalItems: total,
            itemsPerPage: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error getting customers:", error);
      console.error("💥 Error details:", {
        message: error.message,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
      });

      // Fallback query jika masih error
      try {
        console.log("🔄 Trying fallback query...");
        const [fallbackCustomers] = await db.execute(
          "SELECT id, name, email, role, status, user_type, company_name, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 10"
        );

        const fallbackFormatted = fallbackCustomers.map((cust) => ({
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: "-",
          company:
            cust.company_name ||
            (cust.user_type === "company" ? "Company Customer" : "Individual"),
          address: "-",
          joinDate: cust.created_at,
          totalOrders: 0,
          totalSpent: 0,
          lastOrder: cust.created_at,
          status: cust.status || "active",
          userType: cust.user_type || "individual",
          role: cust.role,
          referralCode: null,
          affiliateId: null,
          companyName: cust.company_name || null, 
        }));

        res.json({
          success: true,
          data: {
            customers: fallbackFormatted,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: fallbackFormatted.length,
              itemsPerPage: 10,
              hasNext: false,
              hasPrev: false,
            },
            note: "Data menggunakan fallback query",
          },
        });
      } catch (fallbackError) {
        console.error("❌ Fallback query juga error:", fallbackError);
        res.status(500).json({
          success: false,
          message: "Gagal mengambil data customers: " + error.message,
        });
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get customer statistics - JAGA YANG INI SUDAH BAGUS
  async getCustomerStats(req, res) {
    try {
      console.log("📊 Getting customer statistics...");

      // Total customers
      const [totalResult] = await db.execute(
        "SELECT COUNT(*) as total FROM users WHERE role = 'customer'"
      );

      // Active customers
      const [activeResult] = await db.execute(
        "SELECT COUNT(*) as active FROM users WHERE role = 'customer' AND status = 'active'"
      );

      // Customer types
      const [typeResult] = await db.execute(
        `SELECT 
          user_type,
          COUNT(*) as count 
         FROM users 
         WHERE role = 'customer' 
         GROUP BY user_type`
      );

      // Total orders and revenue from customers
      const [orderStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_revenue
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE u.role = 'customer'
      `);

      const individualCount =
        typeResult.find((t) => t.user_type === "individual")?.count || 0;
      const companyCount =
        typeResult.find((t) => t.user_type === "company")?.count || 0;

      const stats = {
        total_customers: parseInt(totalResult[0]?.total) || 0,
        active_customers: parseInt(activeResult[0]?.active) || 0,
        individual_customers: parseInt(individualCount),
        company_customers: parseInt(companyCount),
        total_orders: parseInt(orderStats[0]?.total_orders) || 0,
        total_revenue: parseFloat(orderStats[0]?.total_revenue) || 0,
      };

      console.log("✅ Customer stats:", stats);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Error getting customer stats:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil statistik customers: " + error.message,
      });
    }
  },

  // Get customer detail
  async getCustomerDetail(req, res) {
    try {
      const { customerId } = req.params;

      console.log("🔍 Getting customer detail for:", customerId);

      // Validasi customerId
      if (!customerId || isNaN(parseInt(customerId))) {
        return res.status(400).json({
          success: false,
          message: "Customer ID tidak valid",
        });
      }

      // Query sederhana tanpa JOIN kompleks - TAMBAH company_name
      const [customers] = await db.execute(
        "SELECT id, name, email, role, status, user_type, company_name, referral_code, affiliate_id, created_at FROM users WHERE id = ? AND role = 'customer'",
        [parseInt(customerId)]
      );

      if (customers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer tidak ditemukan",
        });
      }

      const customer = customers[0];

      // Get order stats terpisah
      const [orderStats] = await db.execute(
        `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_spent,
        MAX(created_at) as last_order_date
      FROM orders 
      WHERE user_id = ?
    `,
        [parseInt(customerId)]
      );

      // Get recent orders
      const [orders] = await db.execute(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
        [parseInt(customerId)]
      );

      const responseData = {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: customer.role,
          status: customer.status,
          userType: customer.user_type,
          companyName: customer.company_name,
          referralCode: customer.referral_code,
          affiliateId: customer.affiliate_id,
          joinDate: customer.created_at,
          totalOrders: parseInt(orderStats[0]?.total_orders) || 0,
          totalSpent: parseFloat(orderStats[0]?.total_spent) || 0,
          lastOrder: orderStats[0]?.last_order_date,
        },
        recentOrders: orders || [],
      };

      console.log("✅ Customer detail found:", responseData.customer.name);

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      console.error("❌ Error getting customer detail:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil detail customer: " + error.message,
      });
    }
  },
  // Update customer status
  async updateCustomerStatus(req, res) {
    try {
      const { customerId } = req.params;
      const { status, reason } = req.body;

      console.log("🔄 Updating customer status:", {
        customerId,
        status,
        reason,
      });

      if (!["active", "inactive", "banned"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status tidak valid",
        });
      }

      // Validasi customerId
      if (!customerId || isNaN(parseInt(customerId))) {
        return res.status(400).json({
          success: false,
          message: "Customer ID tidak valid",
        });
      }

      const [result] = await db.execute(
        "UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'customer'",
        [status, parseInt(customerId)]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer tidak ditemukan",
        });
      }

      console.log("✅ Customer status updated successfully");

      res.json({
        success: true,
        message: `Status customer berhasil diubah menjadi ${status}`,
      });
    } catch (error) {
      console.error("❌ Error updating customer status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengupdate status customer: " + error.message,
      });
    }
  },

  // Update customer password
  async updateCustomerPassword(req, res) {
    let connection;
    try {
      const { customerId } = req.params;
      const { new_password, confirm_password } = req.body;

      console.log("🔐 Updating customer password:", {
        customerId,
        new_password: new_password ? "***" : "undefined",
        confirm_password: confirm_password ? "***" : "undefined",
      });

      // Validasi input
      if (!new_password || !confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Password baru dan konfirmasi password harus diisi",
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password minimal 6 karakter",
        });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Password dan konfirmasi password tidak cocok",
        });
      }

      // Validasi customerId
      if (!customerId || isNaN(parseInt(customerId))) {
        return res.status(400).json({
          success: false,
          message: "Customer ID tidak valid",
        });
      }

      const customerIdNum = parseInt(customerId);

      // Check if customer exists
      const [customers] = await db.execute(
        "SELECT id, name FROM users WHERE id = ? AND role = 'customer'",
        [customerIdNum]
      );

      if (customers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer tidak ditemukan",
        });
      }

      // ✅ HASH PASSWORD DENGAN BCRYPT
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      console.log("🔐 Password hashed successfully");

      // Update password dengan password yang sudah di-hash
      const [result] = await db.execute(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hashedPassword, customerIdNum]
      );

      if (result.affectedRows === 0) {
        return res.status(500).json({
          success: false,
          message: "Gagal mengupdate password",
        });
      }

      console.log("✅ Customer password updated successfully");

      res.json({
        success: true,
        message: "Password berhasil diupdate",
      });
    } catch (error) {
      console.error("❌ Error updating customer password:", error);

      // Handle bcrypt error khusus
      if (error.message.includes("bcrypt")) {
        return res.status(500).json({
          success: false,
          message: "Error dalam proses enkripsi password",
        });
      }

      res.status(500).json({
        success: false,
        message: "Gagal mengupdate password: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Delete customer
  async deleteCustomer(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { customerId } = req.params;

      console.log("🗑️ Deleting customer:", customerId);

      // Validasi customerId
      if (!customerId || isNaN(parseInt(customerId))) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Customer ID tidak valid",
        });
      }

      const customerIdNum = parseInt(customerId);

      // Check if customer exists
      const [customers] = await connection.execute(
        "SELECT id, name FROM users WHERE id = ? AND role = 'customer'",
        [customerIdNum]
      );

      if (customers.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Customer tidak ditemukan",
        });
      }

      const customerName = customers[0].name;

      // Check if customer has orders
      const [orders] = await connection.execute(
        "SELECT id FROM orders WHERE user_id = ?",
        [customerIdNum]
      );

      if (orders.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus customer "${customerName}" karena memiliki ${orders.length} order`,
        });
      }

      // Delete customer
      const [deleteResult] = await connection.execute(
        "DELETE FROM users WHERE id = ?",
        [customerIdNum]
      );

      if (deleteResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Gagal menghapus customer",
        });
      }

      await connection.commit();

      console.log("✅ Customer deleted successfully:", customerName);

      res.json({
        success: true,
        message: `Customer "${customerName}" berhasil dihapus`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error deleting customer:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus customer: " + error.message,
      });
    } finally {
      connection.release();
    }
  },
};

module.exports = adminCustomerController;
