const Log = require("../models/Log");
const db = require("../config/db");

// Helper function untuk parse JSON dengan error handling
const safeJsonParse = (jsonString) => {
  if (!jsonString) return null;

  try {
    // Jika sudah object, return langsung
    if (typeof jsonString === "object") {
      return jsonString;
    }

    // Jika string, parse
    if (typeof jsonString === "string") {
      return JSON.parse(jsonString);
    }

    return null;
  } catch (error) {
    console.error("❌ JSON parsing error:", error);
    console.error("📄 Problematic JSON string:", jsonString);
    return null;
  }
};

exports.getAllLogs = async (req, res) => {
  let connection;
  try {
    console.log("📨 GET /admin/logs - Query:", req.query);

    const {
      page = 1,
      limit = 100,
      search = "",
      action_type = "",
      resource_type = "",
      start_date = "",
      end_date = "",
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const offset = (pageNum - 1) * limitNum;

    console.log("🔍 [LOG CONTROLLER] Pagination params:", {
      page: pageNum,
      limit: limitNum,
      offset,
      search,
      action_type,
      resource_type,
      start_date,
      end_date,
    });

    // Base query - SAMA PERSIS seperti getAllHistory
    let query = `
      SELECT 
        l.*,
        COALESCE(u.name, 'System') as user_name,
        COALESCE(u.email, 'N/A') as user_email
      FROM admin_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add filters - SAMA PERSIS seperti getAllHistory
    if (search && search.trim() !== "") {
      query += ` AND (l.description LIKE ? OR l.resource_type LIKE ? OR l.action_type LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
      console.log("🔍 Search filter applied:", search);
    }

    if (action_type && action_type.trim() !== "") {
      query += ` AND l.action_type = ?`;
      queryParams.push(action_type.trim());
      console.log("🔍 Action type filter applied:", action_type);
    }

    if (resource_type && resource_type.trim() !== "") {
      query += ` AND l.resource_type = ?`;
      queryParams.push(resource_type.trim());
      console.log("🔍 Resource type filter applied:", resource_type);
    }

    if (start_date && start_date.trim() !== "") {
      query += ` AND DATE(l.created_at) >= ?`;
      queryParams.push(start_date.trim());
      console.log("🔍 Start date filter applied:", start_date);
    }

    if (end_date && end_date.trim() !== "") {
      query += ` AND DATE(l.created_at) <= ?`;
      queryParams.push(end_date.trim());
      console.log("🔍 End date filter applied:", end_date);
    }

    // Add sorting
    query += ` ORDER BY l.created_at DESC`;

    // ✅ GUNAKAN PATTERN YANG SAMA DENGAN getAllHistory: LIMIT dan OFFSET langsung di query
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    console.log("🔍 Final query:", query);
    console.log("📋 Query params:", queryParams);

    // Get connection from pool
    connection = await db.getConnection();

    // Execute main query
    const [logs] = await connection.execute(query, queryParams);
    console.log(`✅ Found ${logs.length} logs`);

    // Get total count for pagination - SAMA PERSIS seperti getAllHistory
    let countQuery = `
      SELECT COUNT(*) as total
      FROM admin_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;

    const countParams = [];

    if (search && search.trim() !== "") {
      countQuery += ` AND (l.description LIKE ? OR l.resource_type LIKE ? OR l.action_type LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (action_type && action_type.trim() !== "") {
      countQuery += ` AND l.action_type = ?`;
      countParams.push(action_type.trim());
    }

    if (resource_type && resource_type.trim() !== "") {
      countQuery += ` AND l.resource_type = ?`;
      countParams.push(resource_type.trim());
    }

    if (start_date && start_date.trim() !== "") {
      countQuery += ` AND DATE(l.created_at) >= ?`;
      countParams.push(start_date.trim());
    }

    if (end_date && end_date.trim() !== "") {
      countQuery += ` AND DATE(l.created_at) <= ?`;
      countParams.push(end_date.trim());
    }

    console.log("🔍 Count query:", countQuery);
    console.log("📋 Count params:", countParams);

    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total || 0;

    console.log(`📊 Total logs: ${total}`);

    // Format response data dengan safe JSON parsing
    const formattedLogs = logs.map((log) => {
      return {
        id: log.id,
        user_id: log.user_id,
        user_name: log.user_name,
        user_email: log.user_email,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        description: log.description,
        old_values: safeJsonParse(log.old_values),
        new_values: safeJsonParse(log.new_values),
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      };
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    console.log("📄 Pagination info:", {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    });

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
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
    console.error("❌ Error in getAllLogs:", error);
    console.error("💥 Error details:", {
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
    });

    // Fallback query dengan pattern yang sama
    try {
      console.log("🔄 Trying fallback query with working pattern...");

      const fallbackQuery = `
        SELECT 
          l.id,
          l.user_id,
          l.action_type,
          l.resource_type,
          l.resource_id,
          l.description,
          l.ip_address,
          l.user_agent,
          l.created_at,
          COALESCE(u.name, 'System') as user_name,
          COALESCE(u.email, 'N/A') as user_email
        FROM admin_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC 
        LIMIT 50 OFFSET 0
      `;

      const [fallbackLogs] = await connection.execute(fallbackQuery);

      // Get total count untuk fallback
      const [fallbackCount] = await connection.execute(`
        SELECT COUNT(*) as total FROM admin_logs
      `);
      const fallbackTotal = fallbackCount[0].total || 0;

      const fallbackFormatted = fallbackLogs.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.user_name,
        user_email: log.user_email,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        description: log.description,
        old_values: null,
        new_values: null,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      }));

      res.json({
        success: true,
        data: {
          logs: fallbackFormatted,
          pagination: {
            currentPage: 1,
            totalPages: Math.ceil(fallbackTotal / 50),
            totalItems: fallbackTotal,
            itemsPerPage: 50,
            hasNext: fallbackTotal > 50,
            hasPrev: false,
          },
          note: "Data menggunakan fallback query",
        },
      });
    } catch (fallbackError) {
      console.error("❌ Fallback query juga error:", fallbackError);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data logs: " + error.message,
        debug:
          process.env.NODE_ENV === "development"
            ? {
                originalError: error.message,
                fallbackError: fallbackError.message,
              }
            : undefined,
      });
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
// Reset all logs data - FIXED VERSION
exports.resetAllLogs = async (req, res) => {
  let connection;
  try {
    console.log("🗑️  Request to reset all logs data");

    // Validasi: hanya boleh di production dengan konfirmasi khusus
    if (process.env.NODE_ENV === 'production') {
      const { confirmation } = req.body;
      
      if (!confirmation || confirmation !== 'RESET_ALL_LOGS_CONFIRM') {
        return res.status(400).json({
          success: false,
          message: "Konfirmasi reset diperlukan untuk environment production"
        });
      }
    }

    connection = await db.getConnection();

    // Mulai transaction
    await connection.beginTransaction();

    try {
      // 1. Backup logs ke table backup (jalankan query terpisah)
      const createBackupQuery = `CREATE TABLE IF NOT EXISTS admin_logs_backup LIKE admin_logs`;
      await connection.execute(createBackupQuery);
      console.log("✅ Backup table created/verified");

      const backupQuery = `INSERT INTO admin_logs_backup SELECT * FROM admin_logs`;
      const [backupResult] = await connection.execute(backupQuery);
      console.log(`✅ ${backupResult.affectedRows} logs backed up to admin_logs_backup`);

      // 2. Reset/truncate logs table
      const resetQuery = `TRUNCATE TABLE admin_logs`;
      await connection.execute(resetQuery);
      console.log("✅ Logs table truncated");
      
      // Commit transaction
      await connection.commit();

      console.log("✅ All logs data has been reset successfully");

      res.json({
        success: true,
        message: "Semua data logs berhasil direset",
        data: {
          resetAt: new Date().toISOString(),
          backupTable: "admin_logs_backup",
          backedUpRows: backupResult.affectedRows
        }
      });

    } catch (transactionError) {
      // Rollback jika ada error di transaction
      await connection.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error("❌ Error resetting logs:", error);
    
    let errorMessage = "Gagal mereset data logs";
    if (error.sqlMessage) {
      errorMessage += ": " + error.sqlMessage;
    } else {
      errorMessage += ": " + error.message;
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// logController.js - Tambahkan function ini saja

// Reset all logs data - SIMPLE VERSION
exports.resetAllLogs = async (req, res) => {
  let connection;
  try {
    console.log("🗑️  Request to reset all logs data");

    // Validasi konfirmasi untuk production
    if (process.env.NODE_ENV === 'production') {
      const { confirmation } = req.body;
      
      if (!confirmation || confirmation !== 'RESET_ALL_LOGS_CONFIRM') {
        return res.status(400).json({
          success: false,
          message: "Konfirmasi reset diperlukan untuk environment production"
        });
      }
    }

    connection = await db.getConnection();

    // Simple reset - langsung TRUNCATE tanpa backup
    const resetQuery = `TRUNCATE TABLE admin_logs`;
    await connection.execute(resetQuery);

    console.log("✅ All logs data has been reset successfully");

    res.json({
      success: true,
      message: "Semua data logs berhasil direset",
      data: {
        resetAt: new Date().toISOString(),
        note: "Data logs telah dikosongkan"
      }
    });

  } catch (error) {
    console.error("❌ Error resetting logs:", error);
    
    let errorMessage = "Gagal mereset data logs";
    if (error.sqlMessage) {
      errorMessage += ": " + error.sqlMessage;
    } else {
      errorMessage += ": " + error.message;
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
// Get log statistics - FIXED VERSION
exports.getLogStats = async (req, res) => {
  let connection;
  try {
    console.log("📊 Getting log stats...");

    // Query untuk statistik yang lebih komprehensif
    const statsQuery = `
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_type LIKE '%created%' OR action_type = 'created' THEN 1 END) as total_created,
        COUNT(CASE WHEN action_type LIKE '%updated%' OR action_type = 'updated' THEN 1 END) as total_updated,
        COUNT(CASE WHEN action_type LIKE '%deleted%' OR action_type = 'deleted' THEN 1 END) as total_deleted,
        COUNT(CASE WHEN action_type LIKE '%danger%' OR action_type = 'danger' THEN 1 END) as danger_activities,
        COUNT(CASE WHEN resource_type = 'material' THEN 1 END) as material_activities,
        COUNT(CASE WHEN resource_type = 'order' THEN 1 END) as order_activities,
        COUNT(CASE WHEN resource_type = 'user' THEN 1 END) as user_activities,
        COUNT(CASE WHEN resource_type = 'bank' THEN 1 END) as bank_activities,
        COUNT(CASE WHEN resource_type = 'affiliate' THEN 1 END) as affiliate_activities,
        COUNT(CASE WHEN resource_type = 'payment' THEN 1 END) as payment_activities
      FROM admin_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    connection = await db.getConnection();
    const [stats] = await connection.execute(statsQuery);

    console.log("✅ Log stats:", stats[0]);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("❌ Error getting log stats:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik logs",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get logs by resource
exports.getLogsByResource = async (req, res) => {
  let connection;
  try {
    const { resource_type, resource_id } = req.params;

    const query = `
      SELECT 
        l.*,
        COALESCE(u.name, 'System') as user_name,
        COALESCE(u.email, 'N/A') as user_email
      FROM admin_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.resource_type = ? AND l.resource_id = ?
      ORDER BY l.created_at DESC
    `;

    connection = await db.getConnection();
    const [logs] = await connection.execute(query, [
      resource_type,
      resource_id,
    ]);

    // Format dengan safe JSON parsing
    const formattedLogs = logs.map((log) => ({
      ...log,
      old_values: safeJsonParse(log.old_values),
      new_values: safeJsonParse(log.new_values),
    }));

    res.json({
      success: true,
      data: formattedLogs,
    });
  } catch (error) {
    console.error("Error getting resource logs:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil logs resource",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get filter options for logs
exports.getFilterOptions = async (req, res) => {
  let connection;
  try {
    console.log("🔍 Getting log filter options...");

    // Get unique action types
    const [actionTypes] = await db.execute(`
      SELECT DISTINCT action_type 
      FROM admin_logs 
      WHERE action_type IS NOT NULL 
      ORDER BY action_type
    `);

    // Get unique resource types
    const [resourceTypes] = await db.execute(`
      SELECT DISTINCT resource_type 
      FROM admin_logs 
      WHERE resource_type IS NOT NULL 
      ORDER BY resource_type
    `);

    const filterOptions = {
      action_types: actionTypes.map((row) => row.action_type),
      resource_types: resourceTypes.map((row) => row.resource_type),
    };

    console.log("✅ Filter options:", filterOptions);

    res.json({
      success: true,
      data: filterOptions,
    });
  } catch (error) {
    console.error("❌ Error getting filter options:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil opsi filter",
    });
  }
};

// Debug endpoint untuk check data logs
exports.getLogsDebug = async (req, res) => {
  let connection;
  try {
    console.log("🐛 DEBUG: Getting logs with raw data...");

    const query = `
      SELECT 
        id,
        action_type,
        resource_type,
        description,
        old_values,
        new_values,
        created_at
      FROM admin_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    connection = await db.getConnection();
    const [logs] = await connection.execute(query);

    // Return raw data untuk debugging
    const debugLogs = logs.map((log) => ({
      id: log.id,
      action_type: log.action_type,
      resource_type: log.resource_type,
      description: log.description,
      old_values_raw: log.old_values,
      old_values_type: typeof log.old_values,
      new_values_raw: log.new_values,
      new_values_type: typeof log.new_values,
      created_at: log.created_at,
    }));

    console.log("🐛 DEBUG Logs sample:", debugLogs);

    res.json({
      success: true,
      data: debugLogs,
    });
  } catch (error) {
    console.error("❌ DEBUG Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data debug logs",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
