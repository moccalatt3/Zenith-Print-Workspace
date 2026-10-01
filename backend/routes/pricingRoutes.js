// routes/pricingRoutes.js
const express = require("express");
const pricingController = require("../controllers/pricingController");
const { uploadDiscount } = require("../middleware/uploadMiddleware"); // ✅ IMPORT MIDDLEWARE

const router = express.Router();

// Pricing Configuration Routes
router.get("/config", pricingController.getConfig);
router.put("/config", pricingController.updateConfig);

// Pricing Calculation Routes
// router.post("/calculate", pricingController.calculatePricing);
// router.get("/calculations/history", pricingController.getCalculationHistory);

// Pricing Rules Routes - SEMUA ROUTES DISKON
router.get("/rules", pricingController.getPricingRules);
router.post("/rules", uploadDiscount, pricingController.createPricingRule); // ✅ TAMBAH MIDDLEWARE
router.put("/rules/:id", uploadDiscount, pricingController.updatePricingRule); // ✅ TAMBAH MIDDLEWARE
router.delete("/rules/:id", pricingController.deletePricingRule);
router.patch("/rules/:id/toggle", pricingController.togglePricingRuleStatus);

module.exports = router;
