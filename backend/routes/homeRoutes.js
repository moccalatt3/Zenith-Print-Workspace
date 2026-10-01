const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const { uploadSlide } = require("../middleware/uploadMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware"); // PERBAIKAN: Import requireAdmin

// Public routes
router.get("/slides", homeController.getHeroSlides);
router.get("/stats", homeController.getSiteStats);
router.get("/content", homeController.getHomeContent); // Get all home content
router.get("/discount/active", homeController.getActiveDiscount);

// Admin routes untuk mengelola slides - PERBAIKAN: Gunakan requireAdmin
router.get("/admin/slides", requireAdmin, homeController.getAllSlides);
router.post(
  "/admin/slides",
  requireAdmin,
  uploadSlide,
  homeController.createHeroSlide
);
router.put(
  "/admin/slides/:id",
  requireAdmin,
  uploadSlide,
  homeController.updateHeroSlide
);
router.delete(
  "/admin/slides/:id",
  requireAdmin,
  homeController.deleteHeroSlide
);

// Admin routes untuk site stats - PERBAIKAN: Gunakan requireAdmin
router.put("/admin/stats", requireAdmin, homeController.updateSiteStats);

module.exports = router;
