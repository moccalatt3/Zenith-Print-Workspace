const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token tidak tersedia.",
    });
  }

  try {
    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );

    // ✅ PERBAIKI: Normalize user object
    req.user = {
      id: verified.id || verified.userId, // Support both formats
      userId: verified.userId || verified.id,
      role: verified.role,
    };

    console.log("🔐 Auth successful for user:", req.user.id);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({
      success: false,
      message: "Token tidak valid atau expired.",
    });
  }
};

// ✅ MIDDLEWARE BARU: Real-time expired affiliate check
const checkExpiredAffiliate = async (req, res, next) => {
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
};

const requireAuth = (req, res, next) => {
  authenticateToken(req, res, next);
};

const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Hanya admin yang bisa mengakses.",
      });
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
  checkExpiredAffiliate,
};
