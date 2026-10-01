const db = require("../config/db");

class Log {
  // Create new log - FIXED JSON stringify
  static async create(logData) {
    let connection;
    try {
      const {
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
        old_values = null,
        new_values = null,
        ip_address = null,
        user_agent = null,
      } = logData;

      const query = `
        INSERT INTO admin_logs 
        (user_id, action_type, resource_type, resource_id, description, old_values, new_values, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      console.log("📝 Creating log:", {
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
      });

      // Helper function untuk safe JSON stringify
      const safeStringify = (data) => {
        if (!data) return null;
        try {
          return JSON.stringify(data);
        } catch (error) {
          console.error("❌ JSON stringify error:", error);
          return JSON.stringify({ error: "Invalid JSON data" });
        }
      };

      connection = await db.getConnection();

      const [result] = await connection.execute(query, [
        user_id,
        action_type,
        resource_type,
        resource_id,
        description,
        safeStringify(old_values),
        safeStringify(new_values),
        ip_address,
        user_agent,
      ]);

      console.log("✅ Log created with ID:", result.insertId);
      return result.insertId;
    } catch (error) {
      console.error("❌ Error creating log:", error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get all logs with pagination - SIMPLIFIED VERSION
  static async getAllWithPagination(filters = {}) {
    let connection;
    try {
      const {
        page = 1,
        limit = 100,
        search = "",
        action_type = "",
        resource_type = "",
        start_date = "",
        end_date = "",
      } = filters;

      console.log("🔍 Log filters received:", filters);

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 100;
      const offset = (pageNum - 1) * limitNum;

      let query = `
        SELECT 
          l.*,
          COALESCE(u.name, 'System') as user_name,
          COALESCE(u.email, 'N/A') as user_email
        FROM admin_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (search) {
        query += ` AND (l.description LIKE ? OR l.resource_type LIKE ? OR l.action_type LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (action_type) {
        query += ` AND l.action_type = ?`;
        params.push(action_type);
      }

      if (resource_type) {
        query += ` AND l.resource_type = ?`;
        params.push(resource_type);
      }

      if (start_date) {
        query += ` AND DATE(l.created_at) >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND DATE(l.created_at) <= ?`;
        params.push(end_date);
      }

      query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);

      console.log("📄 Data query:", query);
      console.log("📄 Data params:", params);

      connection = await db.getConnection();
      const [logs] = await connection.execute(query, params);

      // Count query
      let countQuery = `
        SELECT COUNT(*) as total
        FROM admin_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
      `;

      const countParams = [];

      if (search) {
        countQuery += ` AND (l.description LIKE ? OR l.resource_type LIKE ? OR l.action_type LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (action_type) {
        countQuery += ` AND l.action_type = ?`;
        countParams.push(action_type);
      }

      if (resource_type) {
        countQuery += ` AND l.resource_type = ?`;
        countParams.push(resource_type);
      }

      if (start_date) {
        countQuery += ` AND DATE(l.created_at) >= ?`;
        countParams.push(start_date);
      }

      if (end_date) {
        countQuery += ` AND DATE(l.created_at) <= ?`;
        countParams.push(end_date);
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;

      console.log("✅ Logs fetched:", logs.length, "Total:", total);

      return {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error("❌ Error getting logs with pagination:", error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get logs by resource
  static async getByResource(resource_type, resource_id) {
    let connection;
    try {
      const query = `
        SELECT l.*, COALESCE(u.name, 'System') as user_name, COALESCE(u.email, 'N/A') as user_email
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
      return logs;
    } catch (error) {
      console.error("Error getting logs by resource:", error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = Log;
