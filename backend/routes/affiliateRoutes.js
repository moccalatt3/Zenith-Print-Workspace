const express = require("express");
const router = express.Router();
const affiliateController = require("../controllers/affiliateController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// =============================================
// ✅ ROUTES UNTUK AFFILIATE SETTINGS & CLEANUP
// =============================================

// Get affiliate settings
router.get("/settings", requireAdmin, affiliateController.getAffiliateSettings);

// Update affiliate settings
router.put(
  "/settings",
  requireAdmin,
  affiliateController.updateAffiliateSettings
);

// Get cleanup job info
router.get(
  "/cleanup/job-info",
  requireAdmin,
  affiliateController.getCleanupJobInfo
);

// Manual cleanup expired relationships
router.post(
  "/cleanup/manual",
  requireAdmin,
  affiliateController.manualCleanupExpiredRelationships
);

// Update all expiry dates
router.post(
  "/cleanup/update-expiry-dates",
  requireAdmin,
  affiliateController.updateAllExpiryDates
);

// =============================================
// ✅ ROUTES UNTUK AFFILIATE MANAGEMENT
// =============================================

// Get all affiliates with pagination
router.get(
  "/paginated",
  requireAdmin,
  affiliateController.getAllAffiliatesPaginated
);

// Get all affiliates
router.get("/", requireAdmin, affiliateController.getAllAffiliates);

// Get affiliate by ID
router.get("/:id", requireAdmin, affiliateController.getAffiliateById);

// Create new affiliate
router.post("/", requireAdmin, affiliateController.createAffiliate);

// Update affiliate
router.put("/:id", requireAdmin, affiliateController.updateAffiliate);

// Delete affiliate
router.delete("/:id", requireAdmin, affiliateController.deleteAffiliate);

// Get performance stats
router.get(
  "/stats/performance",
  requireAdmin,
  affiliateController.getPerformanceStats
);

// Withdraw commission
router.post(
  "/:id/withdraw",
  requireAdmin,
  affiliateController.withdrawCommission
);

// Get affiliate relationships
router.get(
  "/:id/relationships",
  requireAdmin,
  affiliateController.getAffiliateRelationships
);

// =============================================
// ✅ ROUTES UNTUK USER (AFFILIATE CODE)
// =============================================

// Validate affiliate code (for users)
router.post(
  "/validate-code",
  requireAuth,
  affiliateController.validateAffiliateCode
);

// =============================================
// ✅ ROUTES UNTUK DEBUGGING
// =============================================

// Debug user affiliate data
router.get(
  "/debug/user-data",
  requireAdmin,
  affiliateController.debugUserAffiliateData
);

module.exports = router;
