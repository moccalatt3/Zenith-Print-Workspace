const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const adminDashboardController = require("../controllers/adminDashboardController");

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// Dashboard routes
router.get("/revenue-orders", adminDashboardController.getRevenueOrdersData);
router.get("/order-status", adminDashboardController.getOrderStatusData);
router.get("/overview", adminDashboardController.getDashboardOverview);
router.get("/recent-orders", adminDashboardController.getRecentOrders);

module.exports = router;
