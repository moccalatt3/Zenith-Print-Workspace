const db = require("../config/db");

class Material {
  // Get all materials with pagination - FIXED: gunakan template literals untuk LIMIT/OFFSET
  static async getAllWithPagination(params = {}) {
    let connection;
    try {
      connection = await db.getConnection(); // Gunakan getConnection() untuk consistency

      const { page = 1, limit = 10, search = "", status = "" } = params;

      console.log("🔍 [MATERIAL MODEL] Query params:", {
        page,
        limit,
        search,
        status,
      });

      let whereConditions = [];
      let queryParams = [];

      // Build search condition
      if (search) {
        whereConditions.push("(name LIKE ? OR description LIKE ?)");
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Build status condition
      if (status && status !== "all") {
        whereConditions.push("status = ?");
        queryParams.push(status);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Calculate actual offset - FIXED: gunakan template literals
      const actualOffset = (page - 1) * limit;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(actualOffset);

      console.log("🔍 [MATERIAL MODEL] Pagination:", {
        limit: limitNum,
        offset: offsetNum,
      });

      // FIXED: Gunakan template literals untuk LIMIT dan OFFSET seperti di project lain
      const paginationClause = `LIMIT ${limitNum} OFFSET ${offsetNum}`;

      // Get paginated data
      const [rows] = await connection.execute(
        `SELECT * FROM materials 
         ${whereClause}
         ORDER BY name 
         ${paginationClause}`,
        queryParams // Hanya kirim queryParams untuk WHERE clause
      );

      // Get total count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM materials ${whereClause}`,
        queryParams
      );

      const total = countRows[0].total;
      const totalPages = Math.ceil(total / limitNum);

      return {
        materials: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("❌ [MATERIAL MODEL] Error:", error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Get all materials (without pagination - untuk kompatibilitas)
  static async getAll() {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.execute(`
        SELECT * FROM materials 
        WHERE status = 'active' 
        ORDER BY name
      `);
      return rows;
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Get material by ID
  static async getById(id) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.execute(
        "SELECT * FROM materials WHERE id = ?",
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Create new material
  static async create(materialData) {
    let connection;
    try {
      connection = await db.getConnection();

      const {
        name,
        description,
        density,
        price_per_gram,
        image_url,
        status = "active",
      } = materialData;

      const [result] = await connection.execute(
        `INSERT INTO materials 
         (name, description, density, price_per_gram, image_url, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, density, price_per_gram, image_url, status]
      );

      return this.getById(result.insertId);
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Update material
  static async update(id, materialData) {
    let connection;
    try {
      connection = await db.getConnection();

      const { name, description, density, price_per_gram, image_url, status } =
        materialData;

      await connection.execute(
        `UPDATE materials 
         SET name = ?, description = ?, 
             density = ?, price_per_gram = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, description, density, price_per_gram, image_url, status, id]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Delete material
  static async delete(id) {
    let connection;
    try {
      connection = await db.getConnection();
      const [result] = await connection.execute(
        "DELETE FROM materials WHERE id = ?",
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  // Get material statistics
  static async getStats() {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await db.execute(`
        SELECT 
          COUNT(*) as total_materials,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_materials
        FROM materials
      `);
      return rows[0];
    } catch (error) {
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = Material;
