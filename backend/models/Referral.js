const db = require("../config/db");

class Referral {
  // Get all referrals
  static async getAll() {
    try {
      const [rows] = await db.execute(`
        SELECT r.*, 
               a.name as affiliate_name, 
               a.email as affiliate_email,
               o.order_number,
               u.name as referred_user_name,
               u.email as referred_user_email
        FROM referrals r
        LEFT JOIN affiliates a ON r.affiliate_id = a.id
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN users u ON r.referred_user_id = u.id
        ORDER BY r.created_at DESC
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get referrals by affiliate ID - DIPERBAIKI dengan data user yang lengkap
  static async getByAffiliateId(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          r.*, 
          o.order_number, 
          u.name as referred_user_name,
          u.email as referred_user_email,
          u.affiliate_joined_at,
          u.affiliate_expiry_date,
          u.created_at as user_created_at
         FROM referrals r
         LEFT JOIN orders o ON r.order_id = o.id
         LEFT JOIN users u ON r.referred_user_id = u.id
         WHERE r.affiliate_id = ? 
         ORDER BY r.created_at DESC`,
        [affiliateId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get referral by ID
  static async getById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                a.name as affiliate_name, 
                a.email as affiliate_email,
                o.order_number,
                o.total_amount,
                u.name as referred_user_name,
                u.email as referred_user_email,
                u.affiliate_joined_at,
                u.affiliate_expiry_date
         FROM referrals r
         LEFT JOIN affiliates a ON r.affiliate_id = a.id
         LEFT JOIN orders o ON r.order_id = o.id
         LEFT JOIN users u ON r.referred_user_id = u.id
         WHERE r.id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new referral - METHOD BARU DENGAN ORDER ID
  static async createWithOrder(referralData) {
    const {
      affiliate_id,
      referred_user_id,
      order_id,
      referral_code,
      commission_earned,
      status = "completed",
    } = referralData;

    try {
      const [result] = await db.execute(
        `INSERT INTO referrals (
          affiliate_id, 
          referred_user_id, 
          order_id,
          referral_code, 
          commission_earned, 
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          affiliate_id,
          referred_user_id,
          order_id,
          referral_code,
          commission_earned,
          status,
        ]
      );

      return this.getById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Update referral status
  static async updateStatus(id, status, commission_earned = 0) {
    try {
      await db.execute(
        "UPDATE referrals SET status = ?, commission_earned = ? WHERE id = ?",
        [status, commission_earned, id]
      );

      return this.getById(id);
    } catch (error) {
      throw error;
    }
  }

  // Delete referral
  static async delete(id) {
    try {
      const [result] = await db.execute("DELETE FROM referrals WHERE id = ?", [
        id,
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get referral statistics by affiliate - DIPERBAIKI dengan filter yang lebih baik
  static async getStatsByAffiliate(affiliateId) {
    try {
      const [rows] = await db.execute(
        `
        SELECT 
          COUNT(*) as total_referrals,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_referrals,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_referrals,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_referrals,
          COALESCE(SUM(commission_earned), 0) as total_commission
        FROM referrals 
        WHERE affiliate_id = ?
      `,
        [affiliateId]
      );

      return {
        total_referrals: parseInt(rows[0].total_referrals) || 0,
        active_referrals: parseInt(rows[0].active_referrals) || 0,
        completed_referrals: parseInt(rows[0].completed_referrals) || 0,
        pending_referrals: parseInt(rows[0].pending_referrals) || 0,
        total_commission: parseFloat(rows[0].total_commission) || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  // METHOD BARU: Get pending earnings by affiliate
  static async getPendingEarningsByAffiliate(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT COALESCE(SUM(commission_earned), 0) as total_pending 
         FROM referrals 
         WHERE affiliate_id = ? AND status = 'pending'`,
        [affiliateId]
      );

      return parseFloat(rows[0]?.total_pending) || 0;
    } catch (error) {
      console.error("Error getting pending earnings:", error);
      return 0;
    }
  }

  // METHOD BARU: Get completed earnings by affiliate
  static async getCompletedEarningsByAffiliate(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT COALESCE(SUM(commission_earned), 0) as total_completed 
         FROM referrals 
         WHERE affiliate_id = ? AND status = 'completed'`,
        [affiliateId]
      );

      return parseFloat(rows[0]?.total_completed) || 0;
    } catch (error) {
      console.error("Error getting completed earnings:", error);
      return 0;
    }
  }

  // METHOD BARU: Update affiliate stats in affiliates table
  static async updateAffiliateStats(affiliateId) {
    try {
      const stats = await this.getStatsByAffiliate(affiliateId);
      const pendingEarnings = await this.getPendingEarningsByAffiliate(
        affiliateId
      );
      const completedEarnings = await this.getCompletedEarningsByAffiliate(
        affiliateId
      );

      await db.execute(
        `UPDATE affiliates 
         SET total_referrals = ?, 
             active_referrals = ?, 
             completed_referrals = ?,
             total_earnings = ?, 
             pending_earnings = ?
         WHERE id = ?`,
        [
          stats.total_referrals,
          stats.active_referrals,
          stats.completed_referrals,
          completedEarnings,
          pendingEarnings,
          affiliateId,
        ]
      );

      return true;
    } catch (error) {
      console.error("Error updating affiliate stats:", error);
      return false;
    }
  }

  // METHOD BARU: Get referral by order ID
  static async getByOrderId(orderId) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, a.name as affiliate_name
         FROM referrals r
         LEFT JOIN affiliates a ON r.affiliate_id = a.id
         WHERE r.order_id = ?`,
        [orderId]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // METHOD BARU: Check if referral already exists for order
  static async existsForOrder(orderId) {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM referrals WHERE order_id = ?`,
        [orderId]
      );
      return parseInt(rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // METHOD BARU: Update pending referrals to completed
  static async updatePendingToCompleted(affiliateId) {
    try {
      const [result] = await db.execute(
        `UPDATE referrals 
         SET status = 'completed' 
         WHERE affiliate_id = ? AND status = 'pending'`,
        [affiliateId]
      );

      console.log(
        `✅ Updated ${result.affectedRows} referrals from pending to completed for affiliate ${affiliateId}`
      );
      return result.affectedRows;
    } catch (error) {
      console.error("Error updating referral status:", error);
      throw error;
    }
  }

  // METHOD BARU: Get referrals dengan informasi user yang lengkap untuk perhitungan expiry
  static async getReferralsWithDetailedUserInfo(affiliateId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
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
         ORDER BY r.created_at DESC`,
        [affiliateId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // METHOD BARU: Debug referral data
  static async debugReferralData(affiliateId) {
    try {
      const [referrals] = await db.execute(
        `SELECT 
          id, 
          referred_user_id, 
          referred_email,
          order_id, 
          commission_earned, 
          status,
          created_at
         FROM referrals 
         WHERE affiliate_id = ?`,
        [affiliateId]
      );

      const userIds = referrals
        .map((r) => r.referred_user_id)
        .filter((id) => id);

      const [users] = await db.execute(
        `SELECT 
          id, 
          email, 
          name, 
          affiliate_joined_at, 
          affiliate_expiry_date,
          created_at
         FROM users 
         WHERE id IN (?)`,
        [userIds.length > 0 ? userIds : [0]]
      );

      return { referrals, users };
    } catch (error) {
      console.error("Debug error:", error);
      throw error;
    }
  }
}

module.exports = Referral;
