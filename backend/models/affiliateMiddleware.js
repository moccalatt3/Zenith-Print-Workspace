// File: backend/middleware/affiliateMiddleware.js
const db = require("../config/db");

// Middleware untuk check & reset expired affiliate real-time
async function checkExpiredAffiliate(req, res, next) {
  if (!req.user || !req.user.id) return next();

  try {
    const [users] = await db.execute(
      `SELECT id, affiliate_id, affiliate_expiry_date 
       FROM users 
       WHERE id = ? AND affiliate_expiry_date IS NOT NULL 
       AND affiliate_expiry_date < NOW()`,
      [req.user.id]
    );

    if (users.length > 0) {
      // Reset expired affiliate
      await db.execute(
        `UPDATE users 
         SET affiliate_id = NULL, affiliate_joined_at = NULL, 
             affiliate_expiry_date = NULL, updated_at = NOW()
         WHERE id = ?`,
        [req.user.id]
      );

      console.log(`🔄 Reset expired affiliate for user ${req.user.id}`);
    }

    next();
  } catch (error) {
    console.error("Error in affiliate middleware:", error);
    next();
  }
}

module.exports = { checkExpiredAffiliate };
