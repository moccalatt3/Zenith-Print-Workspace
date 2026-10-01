const db = require("../config/db");

class PricingRule {
  // Get all pricing rules
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT * FROM pricing_rules 
        WHERE 1=1
      `;
      const values = [];

      if (filters.search) {
        query += " AND (name LIKE ? OR description LIKE ?)";
        values.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.status && filters.status !== "all") {
        if (filters.status === "active") {
          query += " AND is_active = true";
        } else if (filters.status === "inactive") {
          query += " AND is_active = false";
        }
      }

      query += " ORDER BY created_at DESC";

      const [rows] = await db.execute(query, values);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all pricing rules with pagination
  static async getAllWithPagination(filters = {}) {
    try {
      const { page = 1, limit = 10, search = "", status = "" } = filters;

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      let query = `
      SELECT * FROM pricing_rules 
      WHERE 1=1
    `;
      const values = [];

      if (search) {
        query += " AND (name LIKE ? OR description LIKE ?)";
        values.push(`%${search}%`, `%${search}%`);
      }

      if (status && status !== "all") {
        if (status === "active") {
          query += " AND is_active = true";
        } else if (status === "inactive") {
          query += " AND is_active = false";
        }
      }

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM pricing_rules WHERE 1=1`;
      const countValues = [...values];

      if (search) {
        countQuery += " AND (name LIKE ? OR description LIKE ?)";
      }

      if (status && status !== "all") {
        if (status === "active") {
          countQuery += " AND is_active = true";
        } else if (status === "inactive") {
          countQuery += " AND is_active = false";
        }
      }

      const [countResult] = await db.execute(countQuery, countValues);
      const total = countResult[0].total || 0;

      // Add pagination to main query
      query += " ORDER BY created_at DESC";
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      const [rows] = await db.execute(query, values);

      const totalPages = Math.ceil(total / limitNum) || 1;

      return {
        rules: rows,
        total: total,
        currentPage: pageNum,
        totalPages: totalPages,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      };
    } catch (error) {
      throw error;
    }
  }
  // Get pricing rule by ID
  static async getById(id) {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM pricing_rules WHERE id = ?",
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async create(ruleData) {
    try {
      const query = `
      INSERT INTO pricing_rules (
        name, type, value, description, image_url, is_active, min_order_amount,
        max_discount_amount, start_date, end_date, usage_limit, applicable_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        ruleData.name,
        ruleData.type,
        ruleData.value,
        ruleData.description,
        ruleData.imageUrl, // PASTIKAN imageUrl disimpan
        ruleData.isActive,
        ruleData.minOrderAmount || 0,
        ruleData.maxDiscountAmount || null,
        ruleData.startDate || null,
        ruleData.endDate || null,
        ruleData.usageLimit || null,
        ruleData.applicableTo || "all",
      ];

      console.log("💾 Saving to database with image_url:", ruleData.imageUrl);

      const [result] = await db.execute(query, values);
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Update pricing rule
  static async update(id, ruleData) {
    try {
      const query = `
      UPDATE pricing_rules SET 
        name = ?, type = ?, value = ?, description = ?, image_url = ?, is_active = ?,
        min_order_amount = ?, max_discount_amount = ?, start_date = ?,
        end_date = ?, usage_limit = ?, applicable_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

      const values = [
        ruleData.name,
        ruleData.type,
        ruleData.value,
        ruleData.description,
        ruleData.imageUrl, // PASTIKAN imageUrl disimpan
        ruleData.isActive,
        ruleData.minOrderAmount || 0,
        ruleData.maxDiscountAmount || null,
        ruleData.startDate || null,
        ruleData.endDate || null,
        ruleData.usageLimit || null,
        ruleData.applicableTo || "all",
        id,
      ];

      console.log("💾 Updating database with image_url:", ruleData.imageUrl);

      const [result] = await db.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete pricing rule
  static async delete(id) {
    try {
      const [result] = await db.execute(
        "DELETE FROM pricing_rules WHERE id = ?",
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Toggle rule status
  static async toggleStatus(id) {
    try {
      const [result] = await db.execute(
        "UPDATE pricing_rules SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`❌ Error in PricingRule.toggleStatus ${id}:`, error);
      throw error;
    }
  }

  // Get active pricing rules
  static async getActiveRules() {
    try {
      const [rows] = await db.execute(`
        SELECT * FROM pricing_rules 
        WHERE is_active = true 
        AND (start_date IS NULL OR start_date <= CURDATE())
        AND (end_date IS NULL OR end_date >= CURDATE())
        AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY value DESC
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Di pricingrule.js - fungsi getActiveByCode
  static async getActiveByCode(code) {
    try {
      console.log(
        `🔍 [PricingRule] Searching for active rule by name/code: "${code}"`
      );

      const query = `
      SELECT * FROM pricing_rules 
      WHERE name = ? 
      AND is_active = 1 
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
      LIMIT 1
    `;

      const [rows] = await db.execute(query, [code]);

      if (rows.length > 0) {
        console.log(`✅ [PricingRule] Found active rule:`, {
          id: rows[0].id,
          name: rows[0].name,
          type: rows[0].type,
          value: rows[0].value,
          is_active: rows[0].is_active,
          min_order_amount: rows[0].min_order_amount,
          max_discount_amount: rows[0].max_discount_amount,
          used_count: rows[0].used_count,
          usage_limit: rows[0].usage_limit,
        });
        return rows[0];
      } else {
        console.log(`❌ [PricingRule] No active rule found for: "${code}"`);

        // Debug: Check if rule exists but inactive
        const [allRules] = await db.execute(
          "SELECT name, is_active FROM pricing_rules WHERE name = ?",
          [code]
        );
        if (allRules.length > 0) {
          console.log(
            `ℹ️ [PricingRule] Rule exists but inactive/expired:`,
            allRules[0]
          );
        }

        return null;
      }
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error getting active pricing rule:",
        error
      );
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Increment usage count
  static async incrementUsage(id) {
    try {
      console.log(`🔢 [PricingRule] Incrementing usage for rule ID: ${id}`);

      const query = `
        UPDATE pricing_rules 
        SET used_count = used_count + 1, updated_at = NOW()
        WHERE id = ?
      `;

      const [result] = await db.execute(query, [id]);

      if (result.affectedRows > 0) {
        console.log(
          `✅ [PricingRule] Successfully incremented usage for rule ID: ${id}`
        );
        return true;
      } else {
        console.log(
          `❌ [PricingRule] Failed to increment usage for rule ID: ${id}`
        );
        return false;
      }
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error incrementing pricing rule usage:",
        error
      );
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Validate discount rule
  static async validateDiscountRule(code, orderAmount = 0) {
    try {
      console.log(
        `🎫 [PricingRule] Validating discount rule: ${code}, Order Amount: ${orderAmount}`
      );

      const rule = await this.getActiveByCode(code);

      if (!rule) {
        return {
          isValid: false,
          message: "Kode diskon tidak ditemukan atau tidak aktif",
        };
      }

      // Check minimum order amount
      if (rule.min_order_amount && orderAmount < rule.min_order_amount) {
        return {
          isValid: false,
          message: `Minimum order Rp ${rule.min_order_amount.toLocaleString(
            "id-ID"
          )} untuk menggunakan kode ini`,
        };
      }

      // Check usage limit
      if (rule.usage_limit && rule.used_count >= rule.usage_limit) {
        return {
          isValid: false,
          message: "Kode diskon sudah mencapai batas penggunaan",
        };
      }

      // Check date validity
      const now = new Date();
      if (rule.start_date && new Date(rule.start_date) > now) {
        return {
          isValid: false,
          message: "Kode diskon belum berlaku",
        };
      }

      if (rule.end_date && new Date(rule.end_date) < now) {
        return {
          isValid: false,
          message: "Kode diskon sudah kedaluwarsa",
        };
      }

      console.log(
        `✅ [PricingRule] Discount rule validation successful: ${code}`
      );
      return {
        isValid: true,
        message: "Kode diskon valid",
        rule: rule,
      };
    } catch (error) {
      console.error("❌ [PricingRule] Error validating discount rule:", error);
      return {
        isValid: false,
        message: "Terjadi kesalahan saat memvalidasi kode diskon",
      };
    }
  }

  // ✅ FUNGSI BARU: Calculate discount amount
  static calculateDiscountAmount(rule, orderAmount) {
    try {
      console.log(`🧮 [PricingRule] Calculating discount for rule:`, {
        name: rule.name,
        type: rule.type,
        value: rule.value,
        max_discount_amount: rule.max_discount_amount,
        orderAmount: orderAmount,
      });

      let discountAmount = 0;

      if (rule.type === "percentage") {
        // Calculate percentage discount
        discountAmount = orderAmount * (rule.value / 100);

        // Apply max discount amount if specified
        if (
          rule.max_discount_amount &&
          discountAmount > rule.max_discount_amount
        ) {
          console.log(
            `📏 [PricingRule] Applying max discount limit: ${rule.max_discount_amount}`
          );
          discountAmount = rule.max_discount_amount;
        }
      } else if (rule.type === "fixed") {
        // Fixed amount discount
        discountAmount = rule.value;

        // Ensure discount doesn't exceed order amount
        if (discountAmount > orderAmount) {
          console.log(
            `⚠️ [PricingRule] Discount exceeds order amount, adjusting to order amount`
          );
          discountAmount = orderAmount;
        }
      }

      console.log(
        `✅ [PricingRule] Calculated discount amount: ${discountAmount}`
      );
      return discountAmount;
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error calculating discount amount:",
        error
      );
      return 0;
    }
  }

  // ✅ FUNGSI BARU: Get discount rules for user type
  static async getRulesForUserType(userType = "individual") {
    try {
      console.log(`👤 [PricingRule] Getting rules for user type: ${userType}`);

      const query = `
        SELECT * FROM pricing_rules 
        WHERE is_active = true 
        AND (applicable_to = 'all' OR applicable_to = ?)
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY 
          CASE applicable_to 
            WHEN ? THEN 0 
            ELSE 1 
          END,
          value DESC
      `;

      const [rows] = await db.execute(query, [userType, userType]);

      console.log(
        `✅ [PricingRule] Found ${rows.length} rules for user type: ${userType}`
      );
      return rows;
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error getting rules for user type:",
        error
      );
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Apply discount and track usage
  static async applyDiscount(code, orderAmount, orderId = null) {
    try {
      console.log(
        `🎯 [PricingRule] Applying discount: ${code}, Amount: ${orderAmount}, Order: ${orderId}`
      );

      // Validate the discount rule
      const validation = await this.validateDiscountRule(code, orderAmount);

      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      const rule = validation.rule;

      // Calculate discount amount
      const discountAmount = this.calculateDiscountAmount(rule, orderAmount);

      // Increment usage count
      await this.incrementUsage(rule.id);

      console.log(`✅ [PricingRule] Successfully applied discount:`, {
        code: code,
        ruleId: rule.id,
        discountAmount: discountAmount,
        finalAmount: orderAmount - discountAmount,
      });

      return {
        success: true,
        discountAmount: discountAmount,
        finalAmount: orderAmount - discountAmount,
        rule: {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          value: rule.value,
          description: rule.description,
        },
      };
    } catch (error) {
      console.error("❌ [PricingRule] Error applying discount:", error);
      return {
        success: false,
        message: "Terjadi kesalahan saat menerapkan diskon",
      };
    }
  }

  // ✅ FUNGSI BARU: Get rule statistics
  static async getRuleStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_rules,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_rules,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_rules,
          SUM(used_count) as total_usage,
          AVG(value) as average_discount_value
        FROM pricing_rules
      `;

      const [rows] = await db.execute(query);
      return rows[0] || null;
    } catch (error) {
      console.error("❌ [PricingRule] Error getting rule statistics:", error);
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Search rules with advanced filters
  static async searchRules(filters = {}) {
    try {
      let query = `
        SELECT * FROM pricing_rules 
        WHERE 1=1
      `;
      const values = [];

      // Search by name or description
      if (filters.search) {
        query += " AND (name LIKE ? OR description LIKE ?)";
        values.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Filter by status
      if (filters.status && filters.status !== "all") {
        if (filters.status === "active") {
          query += " AND is_active = true";
        } else if (filters.status === "inactive") {
          query += " AND is_active = false";
        }
      }

      // Filter by type
      if (filters.type && filters.type !== "all") {
        query += " AND type = ?";
        values.push(filters.type);
      }

      // Filter by applicable_to
      if (filters.applicableTo && filters.applicableTo !== "all") {
        query += " AND applicable_to = ?";
        values.push(filters.applicableTo);
      }

      // Filter by date range
      if (filters.startDate) {
        query += " AND (start_date IS NULL OR start_date >= ?)";
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        query += " AND (end_date IS NULL OR end_date <= ?)";
        values.push(filters.endDate);
      }

      // Order by
      query += " ORDER BY ";
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case "name":
            query += "name";
            break;
          case "value":
            query += "value";
            break;
          case "created_at":
            query += "created_at";
            break;
          case "used_count":
            query += "used_count";
            break;
          default:
            query += "created_at";
        }

        query += filters.sortOrder === "asc" ? " ASC" : " DESC";
      } else {
        query += "created_at DESC";
      }

      console.log(`🔍 [PricingRule] Executing search query:`, {
        query,
        values,
      });
      const [rows] = await db.execute(query, values);

      console.log(`✅ [PricingRule] Search found ${rows.length} rules`);
      return rows;
    } catch (error) {
      console.error("❌ [PricingRule] Error searching rules:", error);
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Bulk update rule status
  static async bulkUpdateStatus(ids, isActive) {
    try {
      if (!ids || ids.length === 0) {
        throw new Error("No IDs provided for bulk update");
      }

      const placeholders = ids.map(() => "?").join(",");
      const query = `
        UPDATE pricing_rules 
        SET is_active = ?, updated_at = NOW()
        WHERE id IN (${placeholders})
      `;

      const values = [isActive, ...ids];
      const [result] = await db.execute(query, values);

      console.log(
        `✅ [PricingRule] Bulk updated ${result.affectedRows} rules to active: ${isActive}`
      );
      return result.affectedRows;
    } catch (error) {
      console.error("❌ [PricingRule] Error in bulk update status:", error);
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Check rule expiration and deactivate expired rules
  static async deactivateExpiredRules() {
    try {
      const query = `
        UPDATE pricing_rules 
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true 
        AND end_date IS NOT NULL 
        AND end_date < NOW()
      `;

      const [result] = await db.execute(query);

      if (result.affectedRows > 0) {
        console.log(
          `✅ [PricingRule] Deactivated ${result.affectedRows} expired rules`
        );
      } else {
        console.log(`ℹ️ [PricingRule] No expired rules to deactivate`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error deactivating expired rules:",
        error
      );
      throw error;
    }
  }

  static async getAllActiveDiscounts(orderAmount = 0) {
    try {
      console.log(
        `🔍 [PricingRule] Getting ALL active discounts for order amount: ${orderAmount}`
      );

      const query = `
      SELECT * FROM pricing_rules 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (min_order_amount IS NULL OR min_order_amount <= ?)
      ORDER BY 
        type DESC, -- Fixed amount first
        value DESC
    `;

      const [rows] = await db.execute(query, [orderAmount]);

      console.log(
        `✅ [PricingRule] Found ${rows.length} active discounts eligible for order amount ${orderAmount}`
      );

      // Log detail setiap diskon
      rows.forEach((rule) => {
        console.log(
          `📋 Discount: ${rule.name} | Type: ${rule.type} | Value: ${rule.value} | Min Order: ${rule.min_order_amount}`
        );
      });

      return rows;
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error getting all active discounts:",
        error
      );
      throw error;
    }
  }

  // ✅ FUNGSI BARU: Get discounts by referral code (jika perlu logika khusus)
  static async getDiscountsByReferral(referralCode) {
    try {
      console.log(
        `🔍 [PricingRule] Getting discounts for referral code: ${referralCode}`
      );

      // Untuk sekarang, kita kembalikan semua diskon aktif
      // Di masa depan bisa ditambahkan logika khusus berdasarkan referral code
      const allDiscounts = await this.getAllActiveDiscounts();

      console.log(
        `✅ [PricingRule] Returning ${allDiscounts.length} discounts for referral code`
      );
      return allDiscounts;
    } catch (error) {
      console.error(
        "❌ [PricingRule] Error getting discounts by referral:",
        error
      );
      throw error;
    }
  }
}

module.exports = PricingRule;
