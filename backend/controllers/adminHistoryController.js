const db = require("../config/db");
const ExcelJS = require("exceljs");

// Helper functions di luar object controller
function formatPaymentStatus(status) {
  const statusMap = {
    paid: "LUNAS",
    pending: "MENUNGGU",
    failed: "GAGAL",
    completed: "SELESAI",
  };
  return statusMap[status] || status;
}

function formatOrderStatus(status) {
  const statusMap = {
    completed: "SELESAI",
    cancelled: "DIBATALKAN",
  };
  return statusMap[status] || status;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const adminHistoryController = {
  async exportSingleHistoryToExcel(req, res) {
    let connection;
    try {
      const { historyId } = req.params;

      console.log("📊 Starting Excel export for single history:", historyId);

      connection = await db.getConnection();

      // Query untuk mendapatkan data riwayat spesifik
      const [history] = await connection.execute(
        `
      SELECT 
        oh.order_number,
        oh.customer_name,
        oh.customer_email,
        oh.user_type,
        oh.total_amount,
        oh.payment_status,
        oh.order_status,
        oh.item_count,
        oh.materials,
        oh.completed_at,
        oh.original_created_at,
        oh.archived_at
      FROM order_history oh
      WHERE oh.id = ?
    `,
        [historyId]
      );

      if (history.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Riwayat tidak ditemukan",
        });
      }

      const record = history[0];

      console.log(`✅ Found 1 record for Excel export`);

      // Create new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Laporan ${record.order_number}`);

      // Add title
      worksheet.mergeCells("A1:C1");
      worksheet.getCell(
        "A1"
      ).value = `LAPORAN TRANSAKSI - ${record.order_number}`;
      worksheet.getCell("A1").font = { bold: true, size: 16 };
      worksheet.getCell("A1").alignment = { horizontal: "center" };

      // Add order details section
      worksheet.addRow([]); // Empty row

      // Section header
      worksheet.mergeCells("A3:C3");
      worksheet.getCell("A3").value = "DETAIL ORDER";
      worksheet.getCell("A3").font = { bold: true, size: 14 };
      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF25912" },
      };
      worksheet.getCell("A3").font = { bold: true, color: { argb: "FFFFFF" } };
      worksheet.getCell("A3").alignment = { horizontal: "center" };

      // Order details
      worksheet.addRow(["Nomor Order", ":", record.order_number]);
      worksheet.addRow(["Customer", ":", record.customer_name]);
      worksheet.addRow(["Email", ":", record.customer_email]);
      worksheet.addRow([
        "Tipe User",
        ":",
        record.user_type === "individual" ? "Individual" : "Company",
      ]);
      worksheet.addRow([
        "Total Amount",
        ":",
        formatCurrency(record.total_amount),
      ]);
      worksheet.addRow([
        "Status Pembayaran",
        ":",
        formatPaymentStatus(record.payment_status),
      ]);
      worksheet.addRow([
        "Status Order",
        ":",
        formatOrderStatus(record.order_status),
      ]);
      worksheet.addRow(["Jumlah Items", ":", record.item_count]);
      worksheet.addRow(["Materials", ":", record.materials || "-"]);
      worksheet.addRow([
        "Tanggal Order",
        ":",
        record.original_created_at
          ? new Date(record.original_created_at).toLocaleDateString("id-ID")
          : "-",
      ]);
      worksheet.addRow([
        "Tanggal Selesai",
        ":",
        record.completed_at
          ? new Date(record.completed_at).toLocaleDateString("id-ID")
          : "-",
      ]);
      worksheet.addRow([
        "Tanggal Diarsip",
        ":",
        record.archived_at
          ? new Date(record.archived_at).toLocaleDateString("id-ID")
          : "-",
      ]);

      // Add summary section
      worksheet.addRow([]); // Empty row

      // Summary header
      worksheet.mergeCells("A16:C16");
      worksheet.getCell("A16").value = "RINGKASAN";
      worksheet.getCell("A16").font = { bold: true, size: 14 };
      worksheet.getCell("A16").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF25912" },
      };
      worksheet.getCell("A16").font = { bold: true, color: { argb: "FFFFFF" } };
      worksheet.getCell("A16").alignment = { horizontal: "center" };

      // Summary details
      worksheet.addRow(["Total Items", ":", record.item_count]);
      worksheet.addRow([
        "Total Amount",
        ":",
        formatCurrency(record.total_amount),
      ]);
      worksheet.addRow(["Status", ":", formatOrderStatus(record.order_status)]);

      // Add footer with generated date
      worksheet.addRow([]); // Empty row
      worksheet.mergeCells("A20:C20");
      worksheet.getCell(
        "A20"
      ).value = `Generated on: ${new Date().toLocaleString("id-ID")}`;
      worksheet.getCell("A20").font = { italic: true };
      worksheet.getCell("A20").alignment = { horizontal: "center" };

      // Style the details rows
      for (let i = 4; i <= 14; i++) {
        const row = worksheet.getRow(i);
        if (i % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }
      }

      // Style the summary rows
      for (let i = 17; i <= 19; i++) {
        const row = worksheet.getRow(i);
        row.font = { bold: true };
        if (i % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F0F0" },
          };
        }
      }

      // Set column widths
      worksheet.getColumn("A").width = 20;
      worksheet.getColumn("B").width = 5;
      worksheet.getColumn("C").width = 30;

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="laporan-${record.order_number}.xlsx"`
      );

      // Write to response
      await workbook.xlsx.write(res);

      console.log(
        `✅ Single Excel export completed successfully for ${record.order_number}`
      );
    } catch (error) {
      console.error("❌ Error exporting single to Excel:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengekspor data ke Excel: " + error.message,
      });
    } finally {
      if (connection) connection.release();
    }
  },

  async moveCompletedToHistory(req, res) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      console.log("🔄 Starting MOVE process for completed orders...");

      // Cari orders yang completed - TAMBAH company_name di SELECT
      const [completedOrders] = await connection.execute(
        `SELECT 
      o.id,
      o.order_number,
      o.user_id,
      o.user_type,
      o.total_amount,
      o.payment_status,
      o.order_status,
      o.status_updated_at,
      o.created_at,
      o.updated_at,
      u.name as customer_name,
      u.email as customer_email,
      u.company_name 
     FROM orders o 
     LEFT JOIN users u ON o.user_id = u.id 
     WHERE o.order_status = 'completed'
     AND o.id NOT IN (SELECT order_id FROM order_history)`
      );

      console.log(
        `📦 Found ${completedOrders.length} completed orders to move`
      );

      if (completedOrders.length === 0) {
        await connection.commit();
        return res.json({
          success: true,
          message: "Tidak ada order completed yang perlu dipindahkan",
          data: {
            movedCount: 0,
            totalFound: 0,
            movedOrders: [],
          },
        });
      }

      let movedCount = 0;
      const movedOrderNumbers = [];
      const failedOrders = [];

      for (const order of completedOrders) {
        let historyId = null;
        try {
          console.log(
            `\n🔄 Processing order: ${order.order_number} (ID: ${order.id})`
          );

          // 1. Get semua data terkait order
          console.log(`   📋 Gathering all order data...`);

          // Get order items
          const [items] = await connection.execute(
            `SELECT * FROM order_items WHERE order_id = ?`,
            [order.id]
          );
          console.log(`   📦 Found ${items.length} order items`);

          // Get payment transactions
          const [payments] = await connection.execute(
            `SELECT * FROM payment_transactions WHERE order_id = ?`,
            [order.id]
          );
          console.log(`   💳 Found ${payments.length} payment transactions`);

          // Get status history
          const [statusHistory] = await connection.execute(
            `SELECT * FROM order_status_history WHERE order_id = ?`,
            [order.id]
          );
          console.log(
            `   📊 Found ${statusHistory.length} status history records`
          );

          // 2. Insert ke order_history - TAMBAH company_name di INSERT
          console.log(`   💾 Inserting into order_history...`);
          const [historyResult] = await connection.execute(
            `INSERT INTO order_history (
          order_id, order_number, user_id, user_type, company_name,
          customer_name, customer_email, total_amount, payment_status, order_status,
          item_count, materials, completed_at, original_created_at, original_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              order.id,
              order.order_number,
              order.user_id,
              order.user_type,
              order.company_name,
              order.customer_name,
              order.customer_email,
              order.total_amount,
              order.payment_status,
              order.order_status,
              items.length,
              items.map((item) => item.material_name).join(", "),
              order.status_updated_at,
              order.created_at,
              order.updated_at,
            ]
          );

          historyId = historyResult.insertId;
          console.log(`   ✅ History record created with ID: ${historyId}`);

          // 3. Insert items ke order_history_items - HANYA KOLOM YANG ADA DI TABEL
          console.log(
            `   💾 Inserting ${items.length} items into order_history_items...`
          );
          for (const item of items) {
            await connection.execute(
              `INSERT INTO order_history_items (
            history_id, order_item_id, file_name, original_file_name,
            file_size, material_name, quantity, volume, weight, dimensions,
            unit_price, total_price, item_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                historyId,
                item.id,
                item.file_name,
                item.original_file_name,
                item.file_size,
                item.material_name,
                item.quantity,
                item.volume,
                item.weight,
                item.dimensions,
                item.unit_price,
                item.total_price,
                item.item_status,
              ]
            );
          }
          console.log(`   ✅ ${items.length} items moved to history`);

          // 4. VERIFIKASI data sudah masuk sebelum menghapus
          console.log(`   🔍 Verifying data in order_history...`);
          const [verifyHistory] = await connection.execute(
            `SELECT id, order_number, company_name FROM order_history WHERE id = ?`,
            [historyId]
          );

          if (verifyHistory.length === 0) {
            throw new Error(`Data tidak masuk ke order_history!`);
          }
          console.log(
            `   ✅ Verified: ${verifyHistory[0].order_number} in order_history, company: ${verifyHistory[0].company_name}`
          );

          // 5. HAPUS DATA DARI TABEL ASLI dengan urutan yang benar
          console.log(
            `   🗑️ Starting deletion process from original tables...`
          );

          // Hapus payment transactions
          if (payments.length > 0) {
            const [deletePaymentsResult] = await connection.execute(
              `DELETE FROM payment_transactions WHERE order_id = ?`,
              [order.id]
            );
            console.log(
              `   🗑️ Deleted ${deletePaymentsResult.affectedRows} payment transactions`
            );
          }

          // Hapus status history
          if (statusHistory.length > 0) {
            const [deleteStatusResult] = await connection.execute(
              `DELETE FROM order_status_history WHERE order_id = ?`,
              [order.id]
            );
            console.log(
              `   🗑️ Deleted ${deleteStatusResult.affectedRows} status history records`
            );
          }

          // Hapus order items
          const [deleteItemsResult] = await connection.execute(
            `DELETE FROM order_items WHERE order_id = ?`,
            [order.id]
          );
          console.log(
            `   🗑️ Deleted ${deleteItemsResult.affectedRows} order items`
          );

          // Hapus order
          const [deleteOrderResult] = await connection.execute(
            `DELETE FROM orders WHERE id = ?`,
            [order.id]
          );

          if (deleteOrderResult.affectedRows === 1) {
            // 6. VERIFIKASI FINAL - data masih ada di history setelah delete
            console.log(`   🔍 Final verification after delete...`);
            const [finalVerify] = await connection.execute(
              `SELECT id, order_number, company_name FROM order_history WHERE id = ?`,
              [historyId]
            );

            if (finalVerify.length === 0) {
              throw new Error(`Data hilang dari order_history setelah delete!`);
            }

            movedCount++;
            movedOrderNumbers.push(order.order_number);
            console.log(
              `   ✅ SUCCESS: Order ${order.order_number} COMPLETELY MOVED to history (Company: ${order.company_name})`
            );
          } else {
            throw new Error(`Gagal menghapus order dari tabel orders`);
          }
        } catch (orderError) {
          console.error(
            `   ❌ FAILED to move order ${order.order_number}:`,
            orderError.message
          );
          failedOrders.push({
            orderNumber: order.order_number,
            error: orderError.message,
          });

          // Cleanup: jika historyId sudah dibuat, hapus record yang gagal
          if (historyId) {
            try {
              await connection.execute(
                `DELETE FROM order_history_items WHERE history_id = ?`,
                [historyId]
              );
              await connection.execute(
                `DELETE FROM order_history WHERE id = ?`,
                [historyId]
              );
              console.log(
                `   🧹 Cleaned up failed history record: ${historyId}`
              );
            } catch (cleanupError) {
              console.error(
                `   ❌ Failed to cleanup history record: ${cleanupError.message}`
              );
            }
          }

          // Rollback transaction untuk order ini saja, lanjut ke order berikutnya
          await connection.rollback();
          await connection.beginTransaction();
        }
      }

      await connection.commit();
      console.log(`\n🎉 TRANSACTION COMMITTED - Move process completed`);

      // FINAL VERIFICATION
      console.log(`🔍 Final state verification...`);
      const [finalHistoryCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM order_history`
      );
      const [finalOrdersCount] = await connection.execute(
        `SELECT COUNT(*) as count FROM orders WHERE order_status = 'completed'`
      );

      console.log(
        `📊 Final order_history count: ${finalHistoryCount[0].count}`
      );
      console.log(
        `📊 Final completed orders count: ${finalOrdersCount[0].count}`
      );

      console.log(`✅ Successfully MOVED: ${movedCount} orders`);
      console.log(`❌ Failed: ${failedOrders.length} orders`);

      if (movedOrderNumbers.length > 0) {
        console.log(`📋 Successfully moved orders:`, movedOrderNumbers);
      }
      if (failedOrders.length > 0) {
        console.log(`📋 Failed orders:`, failedOrders);
      }

      let message = `Berhasil memindahkan ${movedCount} order completed ke riwayat. `;
      message += `Data telah dihapus dari halaman Orders dan tersedia di Riwayat.`;

      if (failedOrders.length > 0) {
        message += ` ${failedOrders.length} order gagal dipindahkan.`;
      }

      res.json({
        success: true,
        message: message,
        data: {
          movedCount,
          totalFound: completedOrders.length,
          failedCount: failedOrders.length,
          movedOrders: movedOrderNumbers,
          failedOrders: failedOrders,
          finalHistoryCount: finalHistoryCount[0].count,
          finalOrdersCount: finalOrdersCount[0].count,
        },
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("❌ CRITICAL Error in moveCompletedToHistory:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memindahkan order ke riwayat: " + error.message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } finally {
      if (connection) connection.release();
    }
  },
  // Get semua riwayat - SESUAI STRUKTUR TABEL YANG ADA
  async getAllHistory(req, res) {
    let connection;
    try {
      const { page = 1, limit = 10, search = "", user_type = "" } = req.query;

      console.log("📥 Query parameters:", {
        page,
        limit,
        search,
        user_type,
      });

      // Convert page and limit to numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Base query - TAMBAH company_name di SELECT
      let query = `
      SELECT 
        id,
        order_id,
        order_number,
        user_id,
        user_type,
        company_name,
        customer_name,
        customer_email,
        total_amount,
        payment_status,
        order_status,
        item_count,
        materials,
        completed_at,
        original_created_at,
        original_updated_at,
        archived_at
      FROM order_history
      WHERE 1=1
    `;

      const queryParams = [];

      // Add filters - TAMBAH company_name di search
      if (search && search.trim() !== "") {
        query += ` AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR company_name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (user_type && user_type !== "all" && user_type.trim() !== "") {
        query += ` AND user_type = ?`;
        queryParams.push(user_type.trim());
      }

      // Add sorting
      query += ` ORDER BY archived_at DESC`;

      // Add pagination
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      console.log("🔍 Final query:", query);
      console.log("📋 Query params:", queryParams);

      // Get connection from pool
      connection = await db.getConnection();

      // Execute main query
      const [history] = await connection.execute(query, queryParams);
      console.log(`✅ Found ${history.length} history records`);

      // Get total count for pagination - TAMBAH company_name di search
      let countQuery = `
      SELECT COUNT(*) as total
      FROM order_history
      WHERE 1=1
    `;

      const countParams = [];

      if (search && search.trim() !== "") {
        countQuery += ` AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR company_name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (user_type && user_type !== "all" && user_type.trim() !== "") {
        countQuery += ` AND user_type = ?`;
        countParams.push(user_type.trim());
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total || 0;

      console.log(`📊 Total history records: ${total}`);

      // Get items untuk setiap history record
      const historyWithItems = [];
      for (const record of history) {
        try {
          const [items] = await connection.execute(
            `SELECT 
            id,
            history_id,
            order_item_id,
            file_name,
            original_file_name,
            file_size,
            material_name,
            quantity,
            volume,
            weight,
            dimensions,
            unit_price,
            total_price,
            item_status
           FROM order_history_items WHERE history_id = ?`,
            [record.id]
          );
          historyWithItems.push({
            ...record,
            items: items || [],
          });
        } catch (error) {
          console.error(`Error getting items for history ${record.id}:`, error);
          historyWithItems.push({
            ...record,
            items: [],
          });
        }
      }

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        success: true,
        data: {
          history: historyWithItems,
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
      console.error("❌ Error getting history:", error);
      console.error("💥 Error details:", {
        message: error.message,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
      });

      // Fallback query jika masih error
      try {
        console.log("🔄 Trying fallback query...");
        const [fallbackHistory] = await db.execute(
          "SELECT * FROM order_history ORDER BY archived_at DESC LIMIT 10"
        );

        const fallbackFormatted = fallbackHistory.map((record) => ({
          ...record,
          items: [],
        }));

        res.json({
          success: true,
          data: {
            history: fallbackFormatted,
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
          message: "Gagal mengambil data riwayat: " + error.message,
        });
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get statistik riwayat
  async getHistoryStats(req, res) {
    try {
      console.log("📊 Getting history statistics...");

      // Total orders in history
      const [totalResult] = await db.execute(
        "SELECT COUNT(*) as total FROM order_history"
      );

      // Company vs Individual orders
      const [typeResult] = await db.execute(
        `SELECT 
          user_type,
          COUNT(*) as count 
         FROM order_history 
         GROUP BY user_type`
      );

      // Total revenue
      const [revenueResult] = await db.execute(
        "SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM order_history"
      );

      // Recent archives
      const [recentResult] = await db.execute(
        "SELECT COUNT(*) as recent FROM order_history WHERE archived_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
      );

      const individualCount =
        typeResult.find((t) => t.user_type === "individual")?.count || 0;
      const companyCount =
        typeResult.find((t) => t.user_type === "company")?.count || 0;

      const stats = {
        total_orders: parseInt(totalResult[0]?.total) || 0,
        individual_orders: parseInt(individualCount),
        company_orders: parseInt(companyCount),
        total_revenue: parseFloat(revenueResult[0]?.total_revenue) || 0,
        recent_archives: parseInt(recentResult[0]?.recent) || 0,
      };

      console.log("✅ History stats:", stats);

      res.json({
        success: true,
        data: {
          overview: stats,
        },
      });
    } catch (error) {
      console.error("❌ Error getting history stats:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil statistik riwayat: " + error.message,
      });
    }
  },

  // Hapus dari riwayat
  async deleteFromHistory(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { historyId } = req.params;

      console.log("🗑️ Deleting from history:", historyId);

      // Validasi historyId
      if (!historyId || isNaN(parseInt(historyId))) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "History ID tidak valid",
        });
      }

      const historyIdNum = parseInt(historyId);

      // Check if history exists
      const [history] = await connection.execute(
        "SELECT id, order_number FROM order_history WHERE id = ?",
        [historyIdNum]
      );

      if (history.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Riwayat tidak ditemukan",
        });
      }

      const orderNumber = history[0].order_number;

      // Delete items first
      await connection.execute(
        "DELETE FROM order_history_items WHERE history_id = ?",
        [historyIdNum]
      );

      // Delete history
      const [deleteResult] = await connection.execute(
        "DELETE FROM order_history WHERE id = ?",
        [historyIdNum]
      );

      if (deleteResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Gagal menghapus riwayat",
        });
      }

      await connection.commit();

      console.log("✅ History deleted successfully:", orderNumber);

      res.json({
        success: true,
        message: `Riwayat order ${orderNumber} berhasil dihapus permanen`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error deleting from history:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus riwayat: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  async exportHistoryToExcel(req, res) {
    let connection;
    try {
      console.log("📊 Starting Excel export for history...");

      connection = await db.getConnection();

      // Query untuk mendapatkan semua data riwayat - HAPUS total_quantity dan items_total_price
      const [history] = await connection.execute(`
      SELECT 
        oh.order_number,
        oh.customer_name,
        oh.customer_email,
        oh.user_type,
        oh.total_amount,
        oh.payment_status,
        oh.order_status,
        oh.item_count,
        oh.materials,
        oh.completed_at,
        oh.original_created_at,
        oh.archived_at
      FROM order_history oh
      ORDER BY oh.archived_at DESC
    `);

      console.log(`✅ Found ${history.length} records for Excel export`);

      // Create new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Riwayat Transaksi");

      // Set column headers - HAPUS kolom total_quantity dan items_total_price
      worksheet.columns = [
        { header: "No. Order", key: "order_number", width: 20 },
        { header: "Nama Customer", key: "customer_name", width: 25 },
        { header: "Email", key: "customer_email", width: 30 },
        { header: "Tipe User", key: "user_type", width: 15 },
        { header: "Total Amount", key: "total_amount", width: 15 },
        { header: "Status Pembayaran", key: "payment_status", width: 20 },
        { header: "Status Order", key: "order_status", width: 20 },
        { header: "Jumlah Items", key: "item_count", width: 15 },
        { header: "Materials", key: "materials", width: 30 },
        { header: "Tanggal Selesai", key: "completed_at", width: 20 },
        { header: "Tanggal Order", key: "original_created_at", width: 20 },
        { header: "Tanggal Diarsip", key: "archived_at", width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF25912" }, // Orange color
      };

      // Add data rows - HAPUS total_quantity dan items_total_price
      history.forEach((record, index) => {
        const row = worksheet.addRow({
          order_number: record.order_number,
          customer_name: record.customer_name,
          customer_email: record.customer_email,
          user_type:
            record.user_type === "individual" ? "Individual" : "Company",
          total_amount: parseFloat(record.total_amount || 0),
          payment_status: formatPaymentStatus(record.payment_status),
          order_status: formatOrderStatus(record.order_status),
          item_count: parseInt(record.item_count || 0),
          materials: record.materials || "-",
          completed_at: record.completed_at
            ? new Date(record.completed_at).toLocaleDateString("id-ID")
            : "-",
          original_created_at: record.original_created_at
            ? new Date(record.original_created_at).toLocaleDateString("id-ID")
            : "-",
          archived_at: record.archived_at
            ? new Date(record.archived_at).toLocaleDateString("id-ID")
            : "-",
        });

        // Alternate row colors for better readability
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }
      });

      // Format currency columns - HANYA total_amount saja
      worksheet.getColumn("total_amount").numFmt = "#,##0";

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="riwayat-transaksi-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`
      );

      // Write to response
      await workbook.xlsx.write(res);

      console.log(
        `✅ Excel export completed successfully. ${history.length} records exported.`
      );
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengekspor data ke Excel: " + error.message,
      });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = adminHistoryController;
