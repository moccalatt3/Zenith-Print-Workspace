// backend/routes/userRoutes.js
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const materialController = require("../controllers/materialController");
const pricingController = require("../controllers/pricingController");
const userController = require("../controllers/userController");
const notificationController = require("../controllers/notificationController"); // ✅ NOTIFICATION CONTROLLER

const router = express.Router();

// Semua route di sini membutuhkan authentication (tapi tidak harus admin)
router.use(requireAuth);

// ==========================================
// 📦 MATERIAL ROUTES (READ ONLY UNTUK USER)
// ==========================================
router.get("/materials", materialController.getAllMaterials);

// ==========================================
// 💰 PRICING ROUTES
// ==========================================

// ✅ FIXED: pastikan "this" di pricingController tetap mengarah ke instance class-nya
router.post(
  "/calculate-pricing",
  pricingController.calculatePricing.bind(pricingController)
);

// Get pricing config untuk user (READ ONLY)
router.get("/pricing-config", pricingController.getConfig);

// ==========================================
// 👥 USER AFFILIATE DATA
// ==========================================
router.get("/affiliate-data", userController.getUserAffiliateData);

// ==========================================
// 🔔 NOTIFICATION ROUTES - SUDAH DIPERBAIKI
// ==========================================
router.get("/notifications", notificationController.getUserNotifications);
router.get(
  "/notifications/unread-count",
  notificationController.getUnreadCount
);
// ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
router.put("/notifications/:id/read", notificationController.markAsRead);
// ✅ DIUBAH DARI PATCH KE PUT (SESUAI DENGAN CORS CONFIG)
router.put("/notifications/read-all", notificationController.markAllAsRead);
router.delete("/notifications/:id", notificationController.deleteNotification);

module.exports = router;
