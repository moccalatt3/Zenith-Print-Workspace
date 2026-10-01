// controllers/userController.js
const db = require("../config/db");

const userController = {
  async getUserAffiliateData(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      const [userData] = await db.execute(
        `SELECT u.id, u.affiliate_id, u.referral_code,
                a.name as affiliate_name, 
                a.referral_code as affiliate_referral_code,
                a.commission_rate,
                a.total_earnings,
                a.pending_earnings
         FROM users u 
         LEFT JOIN affiliates a ON u.affiliate_id = a.id 
         WHERE u.id = ?`,
        [userId]
      );

      if (userData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      const user = userData[0];

      res.json({
        success: true,
        data: {
          hasAffiliate: !!user.affiliate_id,
          affiliateId: user.affiliate_id,
          affiliateName: user.affiliate_name,
          referralCode: user.affiliate_referral_code,
          commissionRate: user.commission_rate,
          totalEarnings: user.total_earnings,
          pendingEarnings: user.pending_earnings,
        },
      });
    } catch (error) {
      console.error("Error getting user affiliate data:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data affiliate",
      });
    }
  },
};

module.exports = userController;
