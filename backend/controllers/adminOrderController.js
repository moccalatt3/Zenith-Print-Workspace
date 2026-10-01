const db = require("../config/db");
const path = require("path");
const fs = require("fs");
const Log = require("../models/Log");

const adminOrderController = {
  async getAllOrders(req, res) {
    let connection;
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        payment_status = "",
        user_type = "",
      } = req.query;

      // Build WHERE clause
      let whereClause = "WHERE 1=1";
      const params = [];

      if (search && search.trim() !== "") {
        whereClause += ` AND (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status && status !== "all" && status.trim() !== "") {
        whereClause += ` AND o.order_status = ?`;
        params.push(status);
      }

      if (
        payment_status &&
        payment_status !== "all" &&
        payment_status.trim() !== ""
      ) {
        whereClause += ` AND o.payment_status = ?`;
        params.push(payment_status);
      }

      // ✅ FILTER USER TYPE
      if (user_type && user_type !== "all" && user_type.trim() !== "") {
        whereClause += ` AND o.user_type = ?`;
        params.push(user_type);
      }

      // Convert page and limit to numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Get connection from pool
      connection = await db.getConnection();

      // **GET TOTAL COUNT**
      const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total 
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id 
    ${whereClause}
  `;

      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total || 0;

      // ✅ QUERY UTAMA SESUAI STRUKTUR DATABASE - TAMBAH company_name
      const mainQuery = `
    SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.payment_status,
      o.order_status,
      o.payment_method,
      o.referral_code,
      o.commission_amount,
      o.commission_status,
      o.customer_notes,
      o.admin_notes,
      o.estimated_completion_date,
      o.created_at,
      o.updated_at,
      o.status_updated_at,
      o.user_type,
      u.id as user_id,
      u.name as customer_name,
      u.email as customer_email,
      u.company_name,
      a.name as affiliate_name
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id 
    LEFT JOIN affiliates a ON o.affiliate_id = a.id 
    ${whereClause}
    ORDER BY o.created_at DESC 
    LIMIT ${limitNum} OFFSET ${offset}
  `;

      // Execute main query
      const [orders] = await connection.execute(mainQuery, params);

      // **GET ITEM COUNT DAN MATERIALS UNTUK SETIAP ORDER**
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          try {
            // Get item count and materials for this order
            const [itemResults] = await connection.execute(
              `SELECT 
             COUNT(*) as item_count,
             GROUP_CONCAT(DISTINCT material_name) as materials
           FROM order_items 
           WHERE order_id = ?`,
              [order.id]
            );

            return {
              ...order,
              item_count: itemResults[0]?.item_count || 0,
              materials: itemResults[0]?.materials || "",
            };
          } catch (error) {
            return {
              ...order,
              item_count: 0,
              materials: "",
            };
          }
        })
      );

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        success: true,
        data: {
          orders: ordersWithDetails,
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
      console.error("❌ Error getting orders:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data orders: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
  // Get order detail - VERSION DIPERBAIKI
  async getOrderDetail(req, res) {
    let connection;
    try {
      const { orderId } = req.params;

      console.log("🔍 Getting order detail for:", orderId);

      connection = await db.getConnection();

      // Get order basic info - TAMBAH company_name
      const [orders] = await connection.execute(
        `SELECT 
       o.*,
       u.name as customer_name,
       u.email as customer_email,
       u.company_name,
       a.name as affiliate_name,
       a.commission_rate
     FROM orders o 
     LEFT JOIN users u ON o.user_id = u.id 
     LEFT JOIN affiliates a ON o.affiliate_id = a.id 
     WHERE o.id = ?`,
        [orderId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      // Get order items
      const [items] = await connection.execute(
        `SELECT 
       oi.*,
       m.image_url as material_image
     FROM order_items oi 
     LEFT JOIN materials m ON oi.material_id = m.id 
     WHERE oi.order_id = ?`,
        [orderId]
      );

      // Get payment history
      const [payments] = await connection.execute(
        `SELECT 
       pt.*,
       u.name as verified_by_name
     FROM payment_transactions pt 
     LEFT JOIN users u ON pt.verified_by = u.id 
     WHERE pt.order_id = ? 
     ORDER BY pt.created_at DESC`,
        [orderId]
      );

      // Get status history
      const [statusHistory] = await connection.execute(
        `SELECT 
       osh.*,
       u.name as changed_by_name
     FROM order_status_history osh 
     LEFT JOIN users u ON osh.changed_by = u.id 
     WHERE osh.order_id = ? 
     ORDER BY osh.created_at DESC`,
        [orderId]
      );

      // ✅ PERBAIKAN: FUNGSI GET FULL URL YANG BENAR
      const getFullUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;

        // Gunakan environment variable seperti kode lama yang berhasil
        const baseUrl = process.env.BACKEND_URL || "https://3dprintlabs.co.id/";

        // Pastikan path sudah benar (sekarang sudah include user_id subfolder)
        return `${baseUrl}${path.startsWith("/") ? path : "/" + path}`;
      };

      // Process payments - tambahkan full URL
      const paymentsWithFullUrl = payments.map((payment) => {
        const fullUrl = getFullUrl(payment.payment_proof_url);

        // ✅ DEBUG: Check file existence
        if (payment.payment_proof_url) {
          const physicalPath = path.join(
            __dirname,
            "..",
            payment.payment_proof_url
          );
          const fileExists = fs.existsSync(physicalPath);
          console.log(`📁 Payment ${payment.id} File Check:`, {
            db_url: payment.payment_proof_url,
            physical_path: physicalPath,
            exists: fileExists ? "✅ EXISTS" : "❌ MISSING",
            full_url: fullUrl,
          });
        }

        return {
          ...payment,
          payment_proof_url: fullUrl,
        };
      });

      // Process items - tambahkan full URL
      const itemsWithFullUrl = items.map((item) => ({
        ...item,
        file_url: getFullUrl(item.file_url),
        material_image: getFullUrl(item.material_image),
      }));

      console.log(
        `✅ Found order: ${order.order_number}, user_type: ${order.user_type}, company_name: ${order.company_name}, items: ${items.length}, payments: ${payments.length}`
      );

      res.json({
        success: true,
        data: {
          order,
          items: itemsWithFullUrl,
          payments: paymentsWithFullUrl,
          statusHistory,
        },
      });
    } catch (error) {
      console.error("❌ Error getting order detail:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil detail order: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  async updateOrderStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const { status, notes = null, admin_notes = null } = req.body; // ✅ TAMBAHKAN admin_notes
      const adminId = req.user.id;

      console.log("🔄 Updating order status:", {
        orderId,
        status,
        notes,
        admin_notes, // ✅ TAMBAHKAN INI
        adminId,
      });

      const validStatuses = [
        "under_review",
        "waiting_payment",
        "payment_received",
        "printing",
        "final_touchup",
        "ready_to_ship",
        "completed",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Status order tidak valid. Status yang valid: " +
            validStatuses.join(", "),
        });
      }

      // Get current order data
      const [currentOrder] = await connection.execute(
        "SELECT order_status, user_type, payment_status, order_number, admin_notes FROM orders WHERE id = ?",
        [orderId]
      );

      if (currentOrder.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const oldStatus = currentOrder[0].order_status;
      const userType = currentOrder[0].user_type;
      const paymentStatus = currentOrder[0].payment_status;
      const orderNumber = currentOrder[0].order_number;
      const currentAdminNotes = currentOrder[0].admin_notes;

      console.log(
        `📊 Current order: user_type=${userType}, old_status=${oldStatus}, payment_status=${paymentStatus}`
      );

      // ✅ LOGIC BARU: Auto-sync antara payment_status dan order_status
      let newPaymentStatus = paymentStatus;
      let autoPaymentUpdate = false;
      let autoStatusUpdate = false;

      // 1. Jika status berubah menjadi "printing", set payment_status menjadi "paid"
      if (status === "printing" && paymentStatus !== "paid") {
        newPaymentStatus = "paid";
        autoPaymentUpdate = true;
        console.log(
          "💰 Auto-setting payment_status to 'paid' karena status berubah ke printing"
        );
      }

      // 2. Jika payment_status di-set menjadi "paid", dan status masih under_review/waiting_payment, set status menjadi "printing"
      if (
        status === "printing" &&
        (oldStatus === "under_review" || oldStatus === "waiting_payment")
      ) {
        autoStatusUpdate = true;
        console.log(
          "🔄 Auto-confirming status ke printing karena payment sudah paid"
        );
      }

      // ✅ VALIDASI STATUS TRANSITIONS
      const validTransitions = {
        under_review: ["waiting_payment", "printing", "cancelled"],
        waiting_payment: ["payment_received", "printing", "cancelled"],
        payment_received: ["printing", "cancelled"],
        printing: ["final_touchup", "cancelled"],
        final_touchup: ["ready_to_ship", "cancelled"],
        ready_to_ship: ["completed", "cancelled"],
        completed: [], // Final state
        cancelled: [], // Final state
      };

      // Validasi transisi status
      if (!validTransitions[oldStatus]?.includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Transisi status tidak valid. Dari "${oldStatus}" tidak bisa ke "${status}"`,
        });
      }

      // ✅ SPECIAL HANDLING UNTUK COMPANY ORDER
      if (userType === "company") {
        console.log("🏢 COMPANY ORDER - Special handling");

        // Untuk company order, izinkan langsung dari under_review ke printing
        if (oldStatus === "under_review" && status === "printing") {
          newPaymentStatus = "paid";
          autoPaymentUpdate = true;
          console.log("💰 Company order: Auto-set payment_status to 'paid'");
        }
      }

      // ✅ UPDATE ORDER STATUS DENGAN ADMIN_NOTES
      const timestamp = new Date().toLocaleString("id-ID");
      let adminNote = "";

      // ✅ LOGIC BARU: Gabungkan catatan admin yang lama dan baru
      if (admin_notes) {
        adminNote = `\n[${timestamp}] Admin: ${admin_notes}`;
      } else if (notes) {
        adminNote = `\n[${timestamp}] Status: ${notes}`;
      }

      // Jika ada perubahan payment_status, update kedua field
      if (autoPaymentUpdate) {
        await connection.execute(
          `UPDATE orders 
       SET order_status = ?, 
           payment_status = ?,
           status_updated_at = CURRENT_TIMESTAMP,
           admin_notes = CASE 
             WHEN ? IS NOT NULL AND ? != '' THEN CONCAT(COALESCE(admin_notes, ''), ?)
             ELSE admin_notes
           END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
          [status, newPaymentStatus, adminNote, adminNote, adminNote, orderId]
        );
      } else {
        // Hanya update order_status
        await connection.execute(
          `UPDATE orders 
       SET order_status = ?, 
           status_updated_at = CURRENT_TIMESTAMP,
           admin_notes = CASE 
             WHEN ? IS NOT NULL AND ? != '' THEN CONCAT(COALESCE(admin_notes, ''), ?)
             ELSE admin_notes
           END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
          [status, adminNote, adminNote, adminNote, orderId]
        );
      }

      // ✅ UPDATE ITEM_STATUS BERDASARKAN ORDER_STATUS
      let itemStatus = "pending";
      switch (status) {
        case "waiting_payment":
        case "payment_received":
          itemStatus = "pending";
          break;
        case "printing":
          itemStatus = "printing";
          break;
        case "final_touchup":
          itemStatus = "quality_check";
          break;
        case "ready_to_ship":
          itemStatus = "ready_to_ship";
          break;
        case "completed":
          itemStatus = "completed";
          break;
        case "cancelled":
          itemStatus = "cancelled";
          break;
        default:
          itemStatus = "pending";
      }

      // Update semua item status di order ini
      await connection.execute(
        `UPDATE order_items 
     SET item_status = ?, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE order_id = ?`,
        [itemStatus, orderId]
      );

      // ✅ ADD TO STATUS HISTORY
      let statusNotes = notes || admin_notes;
      if (autoPaymentUpdate) {
        statusNotes =
          notes || admin_notes
            ? `${notes || admin_notes} (Auto: payment_status di-set ke 'paid')`
            : "Auto: payment_status di-set ke 'paid' karena status berubah ke printing";
      }

      await connection.execute(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) 
     VALUES (?, ?, ?, ?, ?)`,
        [orderId, oldStatus, status, adminId, statusNotes]
      );

      // ✅ LOG ACTION
      try {
        await Log.create({
          user_id: adminId,
          action_type: "updated",
          resource_type: "order",
          resource_id: orderId,
          description: `Memperbarui status order ${orderNumber}: ${oldStatus} → ${status}`,
          old_values: {
            order_status: oldStatus,
            payment_status: paymentStatus,
            item_status: "pending",
            admin_notes: currentAdminNotes,
          },
          new_values: {
            order_status: status,
            payment_status: newPaymentStatus,
            item_status: itemStatus,
            user_type: userType,
            admin_notes: adminNote
              ? (currentAdminNotes || "") + adminNote
              : currentAdminNotes,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for order status update");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
      }

      await connection.commit();

      console.log("✅ Order status updated successfully", {
        oldStatus,
        newStatus: status,
        oldPaymentStatus: paymentStatus,
        newPaymentStatus,
        itemStatus,
        userType,
        admin_notes: admin_notes || "No admin notes",
      });

      res.json({
        success: true,
        message:
          "Status order berhasil diperbarui" +
          (autoPaymentUpdate ? " (payment_status auto-update ke 'paid')" : ""),
        data: {
          oldStatus,
          newStatus: status,
          oldPaymentStatus: paymentStatus,
          newPaymentStatus,
          userType,
          itemStatus,
          notes: statusNotes,
          admin_notes: admin_notes,
          autoUpdates: {
            payment: autoPaymentUpdate,
            status: autoStatusUpdate,
          },
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error updating order status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui status order: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  async updatePaymentStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const { payment_status, notes = null, admin_notes = null } = req.body; // ✅ TAMBAHKAN admin_notes
      const adminId = req.user.id;

      console.log("🔄 Updating payment status:", {
        orderId,
        payment_status,
        notes,
        admin_notes, // ✅ TAMBAHKAN INI
        adminId,
      });

      // ✅ Validasi payment status sesuai ENUM di database
      const validStatuses = ["pending", "paid", "completed"];

      if (!validStatuses.includes(payment_status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Status pembayaran tidak valid. Status yang valid: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Get current order data
      const [currentOrder] = await connection.execute(
        "SELECT payment_status, user_type, order_status, order_number, admin_notes FROM orders WHERE id = ?",
        [orderId]
      );

      if (currentOrder.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const oldPaymentStatus = currentOrder[0].payment_status;
      const userType = currentOrder[0].user_type;
      const orderStatus = currentOrder[0].order_status;
      const orderNumber = currentOrder[0].order_number;
      const currentAdminNotes = currentOrder[0].admin_notes;

      console.log(
        `💰 Payment update - user_type: ${userType}, current_status: ${oldPaymentStatus}, order_status: ${orderStatus}`
      );

      // ✅ LOGIC BARU: Auto-sync dengan order_status
      let newOrderStatus = orderStatus;
      let autoStatusUpdate = false;
      let statusUpdateReason = "";

      // 1. Jika payment_status menjadi "paid", dan order_status masih under_review/waiting_payment, set order_status menjadi "printing"
      if (
        payment_status === "paid" &&
        (orderStatus === "under_review" || orderStatus === "waiting_payment")
      ) {
        newOrderStatus = "printing";
        autoStatusUpdate = true;
        statusUpdateReason =
          "Auto-update: Payment verified, langsung ke proses printing";
        console.log(
          "🔄 Auto-update order_status ke 'printing' karena payment menjadi paid"
        );
      }

      // ✅ UPDATE PAYMENT STATUS DENGAN ADMIN_NOTES
      const timestamp = new Date().toLocaleString("id-ID");
      let adminNote = "";

      if (admin_notes) {
        adminNote = `\n[${timestamp}] Payment: ${oldPaymentStatus} → ${payment_status}. Admin: ${admin_notes}`;
      } else if (notes) {
        adminNote = `\n[${timestamp}] Payment: ${oldPaymentStatus} → ${payment_status}. ${notes}`;
      } else {
        adminNote = `\n[${timestamp}] Payment: ${oldPaymentStatus} → ${payment_status}`;
      }

      if (autoStatusUpdate) {
        // Update kedua field: payment_status dan order_status
        await connection.execute(
          `UPDATE orders 
       SET payment_status = ?,
           order_status = ?,
           status_updated_at = CURRENT_TIMESTAMP,
           admin_notes = CASE 
             WHEN ? IS NOT NULL AND ? != '' THEN CONCAT(COALESCE(admin_notes, ''), ?)
             ELSE admin_notes
           END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
          [
            payment_status,
            newOrderStatus,
            adminNote,
            adminNote,
            adminNote,
            orderId,
          ]
        );
      } else {
        // Hanya update payment_status
        await connection.execute(
          `UPDATE orders 
       SET payment_status = ?, 
           admin_notes = CASE 
             WHEN ? IS NOT NULL AND ? != '' THEN CONCAT(COALESCE(admin_notes, ''), ?)
             ELSE admin_notes
           END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
          [payment_status, adminNote, adminNote, adminNote, orderId]
        );
      }

      // ✅ UPDATE ITEM_STATUS JIKA ORDER_STATUS BERUBAH
      if (autoStatusUpdate) {
        let itemStatus = "printing"; // Karena auto-update ke printing

        await connection.execute(
          `UPDATE order_items 
       SET item_status = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = ?`,
          [itemStatus, orderId]
        );

        console.log(`✅ Auto-update item_status ke '${itemStatus}'`);
      }

      // ✅ PAYMENT TRANSACTIONS UPDATE
      if (payment_status === "paid") {
        // Update payment transactions yang waiting_verification menjadi verified
        await connection.execute(
          `UPDATE payment_transactions 
       SET status = 'verified', 
           verified_by = ?, 
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = ? AND status = 'waiting_verification'`,
          [adminId, orderId]
        );

        console.log("✅ Payment transactions updated to verified");
      }

      // ✅ ADD TO STATUS HISTORY
      if (autoStatusUpdate) {
        // Catat perubahan order_status
        await connection.execute(
          `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) 
       VALUES (?, ?, ?, ?, ?)`,
          [orderId, orderStatus, newOrderStatus, adminId, statusUpdateReason]
        );
      }

      // Selalu catat perubahan payment_status
      await connection.execute(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) 
     VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          `payment_${oldPaymentStatus}`,
          `payment_${payment_status}`,
          adminId,
          `Payment status updated${notes ? `: ${notes}` : ""}${
            admin_notes ? ` (Admin: ${admin_notes})` : ""
          }${autoStatusUpdate ? " + auto progress to printing" : ""}`,
        ]
      );

      // ✅ LOG ACTION
      try {
        await Log.create({
          user_id: adminId,
          action_type: "updated",
          resource_type: "order_payment",
          resource_id: orderId,
          description: `Memperbarui status pembayaran order ${orderNumber}: ${oldPaymentStatus} → ${payment_status}`,
          old_values: {
            payment_status: oldPaymentStatus,
            order_status: orderStatus,
            user_type: userType,
            admin_notes: currentAdminNotes,
          },
          new_values: {
            payment_status: payment_status,
            order_status: newOrderStatus,
            user_type: userType,
            admin_notes: adminNote
              ? (currentAdminNotes || "") + adminNote
              : currentAdminNotes,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for payment status update");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
      }

      await connection.commit();

      console.log("✅ Payment status updated successfully", {
        oldPaymentStatus,
        newPaymentStatus: payment_status,
        oldOrderStatus: orderStatus,
        newOrderStatus,
        autoStatusUpdate,
        admin_notes: admin_notes || "No admin notes",
      });

      res.json({
        success: true,
        message:
          "Status pembayaran berhasil diperbarui" +
          (autoStatusUpdate ? " (order_status auto-update ke 'printing')" : ""),
        data: {
          oldPaymentStatus,
          newPaymentStatus: payment_status,
          oldOrderStatus: orderStatus,
          newOrderStatus,
          userType,
          notes,
          admin_notes,
          autoUpdates: {
            status: autoStatusUpdate,
            reason: statusUpdateReason,
          },
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error updating payment status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui status pembayaran: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  async updateAdminNotes(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const { admin_notes } = req.body;
      const adminId = req.user.id;

      console.log("📝 Updating admin notes:", {
        orderId,
        admin_notes,
        adminId,
      });

      // Get current order data
      const [currentOrder] = await connection.execute(
        "SELECT order_number, admin_notes FROM orders WHERE id = ?",
        [orderId]
      );

      if (currentOrder.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const orderNumber = currentOrder[0].order_number;
      const oldAdminNotes = currentOrder[0].admin_notes;

      // Format timestamp dan catatan baru
      const timestamp = new Date().toLocaleString("id-ID");
      const newNote = `\n[${timestamp}] Admin: ${admin_notes}`;

      // Update admin notes dengan menggabungkan yang lama dan baru
      await connection.execute(
        `UPDATE orders 
         SET admin_notes = CONCAT(COALESCE(admin_notes, ''), ?),
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newNote, orderId]
      );

      // ✅ LOG ACTION
      try {
        await Log.create({
          user_id: adminId,
          action_type: "updated",
          resource_type: "order_notes",
          resource_id: orderId,
          description: `Memperbarui catatan admin untuk order ${orderNumber}`,
          old_values: {
            admin_notes: oldAdminNotes,
          },
          new_values: {
            admin_notes: (oldAdminNotes || "") + newNote,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for admin notes update");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
      }

      await connection.commit();

      console.log("✅ Admin notes updated successfully");

      res.json({
        success: true,
        message: "Catatan admin berhasil diperbarui",
        data: {
          orderId,
          orderNumber,
          admin_notes: (oldAdminNotes || "") + newNote,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error updating admin notes:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui catatan admin: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  async deleteOrder(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const adminId = req.user.id;

      console.log("🗑️ Deleting order:", orderId);

      // Check if order exists and get data for logging
      const [order] = await connection.execute(
        "SELECT id, order_status, user_type, order_number, total_amount, customer_notes FROM orders WHERE id = ?",
        [orderId]
      );

      if (order.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const currentStatus = order[0].order_status;
      const userType = order[0].user_type;
      const orderNumber = order[0].order_number;
      const totalAmount = order[0].total_amount;
      const customerNotes = order[0].customer_notes;

      // ✅ VALIDASI BARU: Hanya izinkan delete untuk status completed dan cancelled
      const allowedStatuses = ["completed", "cancelled"];

      if (!allowedStatuses.includes(currentStatus)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus order dengan status "${currentStatus}". Hanya order dengan status "completed" atau "cancelled" yang dapat dihapus.`,
          allowed_statuses: allowedStatuses,
        });
      }

      // Get order items for logging
      const [orderItems] = await connection.execute(
        "SELECT id, material_name, quantity, unit_price FROM order_items WHERE order_id = ?",
        [orderId]
      );

      // Get payment transactions for logging
      const [payments] = await connection.execute(
        "SELECT id, amount, payment_method, status FROM payment_transactions WHERE order_id = ?",
        [orderId]
      );

      // Delete related records first (untuk menghindari constraint violation)
      await connection.execute(
        "DELETE FROM order_status_history WHERE order_id = ?",
        [orderId]
      );
      await connection.execute(
        "DELETE FROM payment_transactions WHERE order_id = ?",
        [orderId]
      );
      await connection.execute("DELETE FROM order_items WHERE order_id = ?", [
        orderId,
      ]);

      // Finally delete the order
      await connection.execute("DELETE FROM orders WHERE id = ?", [orderId]);

      // ✅ LOG ACTION
      try {
        await Log.create({
          user_id: adminId,
          action_type: "deleted",
          resource_type: "order",
          resource_id: orderId,
          description: `Menghapus order ${orderNumber} (${userType}) dengan status ${currentStatus}`,
          old_values: {
            order_number: orderNumber,
            order_status: currentStatus,
            user_type: userType,
            total_amount: totalAmount,
            customer_notes: customerNotes,
            items_count: orderItems.length,
            items: orderItems.map((item) => ({
              material_name: item.material_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            payments_count: payments.length,
            payments: payments.map((payment) => ({
              amount: payment.amount,
              payment_method: payment.payment_method,
              status: payment.status,
            })),
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for order deletion");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
      }

      await connection.commit();

      console.log("✅ Order deleted successfully");

      res.json({
        success: true,
        message: `Order ${orderNumber} berhasil dihapus (Status: ${currentStatus})`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error deleting order:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus order: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  // Get order statistics - SESUAI STRUKTUR DATABASE
  async getOrderStats(req, res) {
    let connection;
    try {
      connection = await db.getConnection();

      // ✅ STATISTICS SESUAI STRUKTUR DATABASE
      const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN user_type = 'company' THEN 1 ELSE 0 END) as company_orders,
        SUM(CASE WHEN user_type = 'individual' THEN 1 ELSE 0 END) as individual_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as completed_payment_orders,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payment_orders,
        SUM(CASE WHEN order_status = 'under_review' THEN 1 ELSE 0 END) as under_review_orders,
        SUM(CASE WHEN order_status = 'waiting_payment' THEN 1 ELSE 0 END) as waiting_payment_orders,
        SUM(CASE WHEN order_status = 'payment_received' THEN 1 ELSE 0 END) as payment_received_orders,
        SUM(CASE WHEN order_status = 'printing' THEN 1 ELSE 0 END) as printing_orders,
        SUM(CASE WHEN order_status = 'final_touchup' THEN 1 ELSE 0 END) as final_touchup_orders,
        SUM(CASE WHEN order_status = 'ready_to_ship' THEN 1 ELSE 0 END) as ready_to_ship_orders,
        SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

      // Format the stats to ensure numbers
      const formattedStats = {
        total_orders: parseInt(stats[0].total_orders) || 0,
        company_orders: parseInt(stats[0].company_orders) || 0,
        individual_orders: parseInt(stats[0].individual_orders) || 0,
        paid_orders: parseInt(stats[0].paid_orders) || 0,
        completed_payment_orders:
          parseInt(stats[0].completed_payment_orders) || 0,
        pending_payment_orders: parseInt(stats[0].pending_payment_orders) || 0,
        under_review_orders: parseInt(stats[0].under_review_orders) || 0,
        waiting_payment_orders: parseInt(stats[0].waiting_payment_orders) || 0,
        payment_received_orders:
          parseInt(stats[0].payment_received_orders) || 0,
        printing_orders: parseInt(stats[0].printing_orders) || 0,
        final_touchup_orders: parseInt(stats[0].final_touchup_orders) || 0,
        ready_to_ship_orders: parseInt(stats[0].ready_to_ship_orders) || 0,
        completed_orders: parseInt(stats[0].completed_orders) || 0,
        cancelled_orders: parseInt(stats[0].cancelled_orders) || 0,
        total_revenue: parseFloat(stats[0].total_revenue) || 0,
        average_order_value: parseFloat(stats[0].average_order_value) || 0,
      };

      console.log("📊 Order stats:", formattedStats);

      res.json({
        success: true,
        data: {
          overview: formattedStats,
        },
      });
    } catch (error) {
      console.error("❌ Error getting order stats:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil statistik orders: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
};

module.exports = adminOrderController;
