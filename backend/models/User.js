const db = require("../config/db");
const bcrypt = require("bcryptjs");

class User {
  // Get user by ID
  static async getById(id) {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, email, role, status, user_type, referral_code, affiliate_id, created_at FROM users WHERE id = ?",
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error in User.getById:", error);
      throw error;
    }
  }

  // Get user by email
  static async getByEmail(email) {
    try {
      const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      return rows[0];
    } catch (error) {
      console.error("Error in User.getByEmail:", error);
      throw error;
    }
  }

  // Create new user - PERBAIKI INI
  static async create(userData) {
    const {
      name,
      email,
      password,
      role = "customer",
      status = "active",
      user_type = "individual",
      referral_code = null,
      affiliate_id = null,
    } = userData;

    try {
      console.log("Creating user with data:", {
        name,
        email,
        user_type,
        affiliate_id,
      });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      const [result] = await db.execute(
        `INSERT INTO users (name, email, password, role, status, user_type, referral_code, affiliate_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email,
          hashedPassword,
          role,
          status,
          user_type,
          referral_code,
          affiliate_id,
        ]
      );

      console.log("User created with ID:", result.insertId);
      return this.getById(result.insertId);
    } catch (error) {
      console.error("Error in User.create:", error);
      console.error("SQL Error details:", error.sql, error.sqlMessage);
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const [rows] = await db.execute("SELECT id FROM users WHERE email = ?", [
        email,
      ]);
      return rows.length > 0;
    } catch (error) {
      console.error("Error in User.emailExists:", error);
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    const { name, email, status, user_type } = userData;

    try {
      await db.execute(
        `UPDATE users 
         SET name = ?, email = ?, status = ?, user_type = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, email, status, user_type, id]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Get user by referral code (for affiliates)
  static async getByReferralCode(referralCode) {
    try {
      const [rows] = await db.execute(
        "SELECT id, name, email FROM users WHERE referral_code = ?",
        [referralCode]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ✅ METHOD BARU: Cek affiliate_id user
  static async findById(userId) {
    try {
      const [rows] = await db.execute(
        "SELECT id, affiliate_id FROM users WHERE id = ?",
        [userId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error in User.findById:", error);
      return null;
    }
  }
}

module.exports = User;
