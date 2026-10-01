const db = require("../config/db");

class Affiliate {
  // Get all affiliates
  static async getAll() {
    try {
      const [rows] = await db.execute(`
        SELECT 
          id, 
          name, 
          email, 
          phone, 
          referral_code, 
          commission_rate,
          status,
          total_referrals,
          active_referrals,
          total_earnings,
          pending_earnings,
          join_date,
          created_at,
          updated_at
        FROM affiliates 
        ORDER BY created_at DESC
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get affiliate by ID
  static async getById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          id, 
          name, 
          email, 
          phone, 
          referral_code, 
          commission_rate,
          status,
          total_referrals,
          active_referrals,
          total_earnings,
          pending_earnings,
          join_date,
          created_at,
          updated_at
         FROM affiliates WHERE id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get affiliate by email
  static async getByEmail(email) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          id, 
          name, 
          email, 
          phone, 
          referral_code, 
          commission_rate,
          status,
          total_referrals,
          active_referrals,
          total_earnings,
          pending_earnings,
          join_date
         FROM affiliates WHERE email = ?`,
        [email]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get affiliate by referral code
  static async getByReferralCode(referralCode) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          id, 
          name, 
          email, 
          phone, 
          referral_code, 
          commission_rate,
          status,
          total_referrals,
          active_referrals,
          total_earnings,
          pending_earnings,
          join_date
         FROM affiliates WHERE referral_code = ?`,
        [referralCode]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new affiliate
  static async create(affiliateData) {
    const {
      name,
      email,
      phone,
      referral_code,
      commission_rate,
      status = "active",
    } = affiliateData;

    try {
      const [result] = await db.execute(
        `INSERT INTO affiliates 
         (name, email, phone, referral_code, commission_rate, status, join_date) 
         VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [name, email, phone, referral_code, commission_rate, status]
      );

      return this.getById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Update affiliate
  static async update(id, affiliateData) {
    const { name, email, phone, commission_rate, status } = affiliateData;

    try {
      await db.execute(
        `UPDATE affiliates 
         SET name = ?, email = ?, phone = ?, commission_rate = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, email, phone, commission_rate, status, id]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Delete affiliate
  static async delete(id) {
    try {
      const [result] = await db.execute("DELETE FROM affiliates WHERE id = ?", [
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Update affiliate statistics
  static async updateStats(id, stats) {
    const {
      total_referrals = 0,
      active_referrals = 0,
      total_earnings = 0,
      pending_earnings = 0,
    } = stats;

    try {
      await db.execute(
        `UPDATE affiliates 
         SET total_referrals = ?, active_referrals = ?, total_earnings = ?, pending_earnings = ? 
         WHERE id = ?`,
        [
          total_referrals,
          active_referrals,
          total_earnings,
          pending_earnings,
          id,
        ]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Get affiliate performance stats
  static async getPerformanceStats() {
    try {
      const [rows] = await db.execute(`
        SELECT 
          COUNT(*) as total_affiliates,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_affiliates,
          COALESCE(SUM(total_referrals), 0) as total_referrals,
          COALESCE(SUM(total_earnings), 0) as total_earnings,
          COALESCE(SUM(pending_earnings), 0) as total_pending
        FROM affiliates
      `);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update earnings
  static async updateEarnings(id, totalEarnings, pendingEarnings) {
    try {
      await db.execute(
        `UPDATE affiliates 
         SET total_earnings = ?, pending_earnings = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [totalEarnings, pendingEarnings, id]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Get affiliate dengan data earnings untuk withdrawal
  static async getWithdrawalData(id) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          id, 
          name, 
          email,
          total_earnings,
          pending_earnings,
          referral_code
         FROM affiliates WHERE id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ✅ METHOD BARU YANG DIPERBAIKI: Get referrals dengan informasi user yang lengkap
  static async getReferralsWithUserInfo(affiliateId) {
    const query = `
      SELECT 
        r.*, 
        u.id as user_id,
        u.name as user_name, 
        u.email as user_email, 
        u.affiliate_joined_at, 
        u.affiliate_expiry_date,
        u.created_at as user_created_at,
        u.status as user_status
      FROM referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE r.affiliate_id = ?
      ORDER BY r.created_at DESC
    `;

    console.log(`🔍 Query referrals for affiliate ${affiliateId}`);
    const [results] = await db.execute(query, [affiliateId]);

    // Log data untuk debugging
    console.log(
      `📊 Found ${results.length} referrals for affiliate ${affiliateId}`
    );

    results.forEach((ref, index) => {
      console.log(`📋 Referral ${index + 1}:`, {
        id: ref.id,
        referred_email: ref.referred_email,
        user_id: ref.user_id,
        affiliate_joined_at: ref.affiliate_joined_at,
        affiliate_expiry_date: ref.affiliate_expiry_date,
        has_joined: !!ref.affiliate_joined_at,
        user_status: ref.user_status,
      });
    });

    return results;
  }

  // ✅ METHOD BARU: Get active referrals dengan expiry information
  static async getActiveReferralsWithExpiry(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          r.*,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.affiliate_joined_at,
          u.affiliate_expiry_date,
          u.created_at as user_created_at
         FROM referrals r
         LEFT JOIN users u ON r.referred_user_id = u.id
         WHERE r.affiliate_id = ? 
         AND r.status IN ('active', 'pending')
         ORDER BY r.created_at DESC`,
        [affiliateId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
  static async getActiveReferralsFromUsers(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
        id,
        name as user_name,
        email as user_email,
        affiliate_joined_at,
        affiliate_expiry_date,
        created_at as user_created_at,
        status as user_status
       FROM users 
       WHERE affiliate_id = ?
       ORDER BY affiliate_joined_at DESC`,
        [affiliateId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Affiliate;
