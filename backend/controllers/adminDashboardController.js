const db = require("../config/db");

// Helper function to format time ago - dipindahkan ke luar class agar bisa diakses
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
}

const adminDashboardController = {
  // Get revenue and orders data with date filter
  async getRevenueOrdersData(req, res) {
    let connection;
    try {
      const { period = "1" } = req.query;

      console.log("📊 Getting revenue and orders data for period:", period);

      const months = parseInt(period);
      if (![1, 3, 6, 12].includes(months)) {
        return res.status(400).json({
          success: false,
          message: "Periode tidak valid. Gunakan: 1, 3, 6, atau 12 bulan",
        });
      }

      connection = await db.getConnection();

      // ✅ PERBAIKAN: Query untuk data revenue dan orders per bulan - SESUAI STRUKTUR BARU
      const query = `
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        DATE_FORMAT(created_at, '%Y-%m') as month_key,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        AND order_status != 'cancelled'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month_key ASC
    `;

      console.log("🔍 Executing revenue query with period:", months);
      const [results] = await connection.execute(query, [months]);

      console.log(`✅ Found ${results.length} months of data`);

      // Format data untuk chart
      const chartData = results.map((row) => ({
        name: row.month,
        revenue: parseFloat(row.revenue) || 0,
        orders: parseInt(row.orders) || 0,
      }));

      res.json({
        success: true,
        data: chartData,
      });
    } catch (error) {
      console.error("❌ Error getting revenue data:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data revenue: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get order status statistics - SESUAI STATUS BARU
  async getOrderStatusData(req, res) {
    let connection;
    try {
      const { period = "1" } = req.query;

      console.log("📊 Getting order status data for period:", period);

      const months = parseInt(period);
      connection = await db.getConnection();

      // Query untuk status order sesuai struktur baru
      const query = `
        SELECT 
          order_status,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH) AND order_status != 'cancelled')), 1) as percentage
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
          AND order_status != 'cancelled'
        GROUP BY order_status
        ORDER BY count DESC
      `;

      console.log("🔍 Executing order status query");
      const [results] = await connection.execute(query, [months, months]);

      console.log(`✅ Found ${results.length} order statuses`);

      // Mapping status dan warna sesuai struktur baru
      const statusConfig = {
        under_review: { name: "Under Review", color: "#3B82F6" },
        waiting_payment: { name: "Waiting Payment", color: "#F59E0B" },
        payment_received: { name: "Payment Received", color: "#8B5CF6" },
        printing: { name: "Printing", color: "#7C3AED" },
        final_touchup: { name: "Final Touchup", color: "#EC4899" },
        ready_to_ship: { name: "Ready to Ship", color: "#14B8A6" },
        completed: { name: "Completed", color: "#10B981" },
        cancelled: { name: "Cancelled", color: "#EF4444" },
      };

      const statusData = results.map((row) => {
        const config = statusConfig[row.order_status] || {
          name: row.order_status,
          color: "#6B7280",
        };

        return {
          name: config.name,
          value: parseFloat(row.percentage) || 0,
          count: parseInt(row.count) || 0,
          color: config.color,
        };
      });

      // Jika tidak ada data, berikan default
      if (statusData.length === 0) {
        statusData.push({
          name: "No Data",
          value: 100,
          count: 0,
          color: "#6B7280",
        });
      }

      res.json({
        success: true,
        data: statusData,
      });
    } catch (error) {
      console.error("❌ Error getting order status data:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data status order: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get dashboard overview statistics - SESUAI STRUKTUR BARU
  async getDashboardOverview(req, res) {
    let connection;
    try {
      const { period = "1" } = req.query;

      console.log("📊 Getting dashboard overview for period:", period);

      const months = parseInt(period);
      connection = await db.getConnection();

      // ✅ PERBAIKAN: Query untuk overview statistics - SESUAI STATUS BARU
      const query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        -- PENDING ORDERS: under_review dan waiting_payment
        SUM(CASE WHEN order_status IN ('under_review', 'waiting_payment') THEN 1 ELSE 0 END) as pending_orders,
        -- PROCESSING ORDERS: payment_received, printing, final_touchup, ready_to_ship
        SUM(CASE WHEN order_status IN ('payment_received', 'printing', 'final_touchup', 'ready_to_ship') THEN 1 ELSE 0 END) as processing_orders,
        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        -- TOTAL CUSTOMERS: ambil dari table users (semua user dengan role customer)
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        -- Data untuk menghitung perubahan revenue
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN total_amount ELSE 0 END), 0) as last_month_revenue,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN total_amount ELSE 0 END), 0) as previous_month_revenue,
        -- Data untuk menghitung perubahan orders
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as last_month_orders,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as previous_month_orders,
        -- Data untuk menghitung perubahan pending orders
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) AND order_status IN ('under_review', 'waiting_payment') THEN 1 ELSE 0 END) as last_month_pending,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) AND order_status IN ('under_review', 'waiting_payment') THEN 1 ELSE 0 END) as previous_month_pending,
        -- Data untuk menghitung perubahan customers
        (SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as last_month_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)) as previous_month_customers
      FROM orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        AND order_status != 'cancelled'
    `;

      console.log("🔍 Executing overview query");
      const [results] = await connection.execute(query, [months]);

      const stats = results[0];

      // Calculate percentage changes
      const revenueChange =
        stats.previous_month_revenue > 0
          ? ((stats.last_month_revenue - stats.previous_month_revenue) /
              stats.previous_month_revenue) *
            100
          : stats.last_month_revenue > 0
          ? 100
          : 0;

      const ordersChange =
        stats.previous_month_orders > 0
          ? ((stats.last_month_orders - stats.previous_month_orders) /
              stats.previous_month_orders) *
            100
          : stats.last_month_orders > 0
          ? 100
          : 0;

      const pendingChange =
        stats.previous_month_pending > 0
          ? ((stats.last_month_pending - stats.previous_month_pending) /
              stats.previous_month_pending) *
            100
          : stats.last_month_pending > 0
          ? 100
          : 0;

      const customersChange =
        stats.previous_month_customers > 0
          ? ((stats.last_month_customers - stats.previous_month_customers) /
              stats.previous_month_customers) *
            100
          : stats.last_month_customers > 0
          ? 100
          : 0;

      const overviewData = {
        total_orders: parseInt(stats.total_orders) || 0,
        completed_orders: parseInt(stats.completed_orders) || 0,
        pending_orders: parseInt(stats.pending_orders) || 0,
        processing_orders: parseInt(stats.processing_orders) || 0,
        cancelled_orders: parseInt(stats.cancelled_orders) || 0,
        total_revenue: parseFloat(stats.total_revenue) || 0,
        total_customers: parseInt(stats.total_customers) || 0,
        average_order_value: parseFloat(stats.average_order_value) || 0,
        revenue_change: parseFloat(revenueChange.toFixed(1)) || 0,
        orders_change: parseFloat(ordersChange.toFixed(1)) || 0,
        pending_change: parseFloat(pendingChange.toFixed(1)) || 0,
        customers_change: parseFloat(customersChange.toFixed(1)) || 0,
      };

      console.log("✅ Overview data:", overviewData);

      res.json({
        success: true,
        data: overviewData,
      });
    } catch (error) {
      console.error("❌ Error getting dashboard overview:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data overview: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get recent orders for dashboard - SESUAI STRUKTUR BARU
  async getRecentOrders(req, res) {
    let connection;
    try {
      connection = await db.getConnection();

      // ✅ PERBAIKAN: Query recent orders - SESUAI STRUKTUR BARU
      const query = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.created_at,
        u.name as customer_name,
        u.email as customer_email,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT GROUP_CONCAT(material_name) FROM order_items WHERE order_id = o.id) as materials
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.order_status != 'cancelled'
      ORDER BY o.created_at DESC
      LIMIT 7
    `;

      console.log("🔍 Getting recent orders");
      const [orders] = await connection.execute(query);

      const recentOrders = orders.map((order) => ({
        id: order.order_number,
        customer: order.customer_name || order.customer_email,
        amount: `Rp ${(parseFloat(order.total_amount) || 0).toLocaleString(
          "id-ID"
        )}`,
        status: order.order_status,
        time: formatTimeAgo(order.created_at),
        material: order.materials ? order.materials.split(",")[0] : "N/A",
      }));

      res.json({
        success: true,
        data: recentOrders,
      });
    } catch (error) {
      console.error("❌ Error getting recent orders:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data order terbaru: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Helper function tetap disimpan untuk kompatibilitas jika ada yang memanggil sebagai method
  formatTimeAgo(dateString) {
    return formatTimeAgo(dateString);
  },
};

module.exports = adminDashboardController;
