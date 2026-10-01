const express = require("express");
const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");
const affiliateRoutes = require("./affiliateRoutes");
const materialRoutes = require("./materialRoutes");
const pricingRoutes = require("./pricingRoutes");
const adminOrderController = require("../controllers/adminOrderController");
const adminDashboardController = require("../controllers/adminDashboardController");
const settingsController = require("../controllers/settingsController");
const adminNotificationController = require("../controllers/adminNotificationController");
const adminHistoryController = require("../controllers/adminHistoryController");

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// ==========================================
// 🔔 ADMIN NOTIFICATION ROUTES - SUDAH DIPERBAIKI
// ==========================================
router.get("/notifications", adminNotificationController.getAdminNotifications);
router.get(
  "/notifications/unread-count",
  adminNotificationController.getAdminUnreadCount
);
// ✅ DIUBAH DARI PATCH KE PUT (KARENA CORS HANYA ALLOW GET, POST, PUT, DELETE)
router.put(
  "/notifications/:id/read",
  adminNotificationController.markAdminAsRead
);
// ✅ DIUBAH DARI PATCH KE PUT (KARENA CORS HANYA ALLOW GET, POST, PUT, DELETE)
router.put(
  "/notifications/read-all",
  adminNotificationController.markAllAdminAsRead
);
router.delete(
  "/notifications/:id",
  adminNotificationController.deleteAdminNotification
);
// ✅ ROUTE BARU: HAPUS SEMUA NOTIFIKASI ADMIN
router.delete(
  "/notifications",
  adminNotificationController.deleteAllAdminNotifications
);

// Dashboard route - basic
router.get("/dashboard", (req, res) => {
  res.json({
    success: true,
    message: "Selamat datang di dashboard admin",
    data: {
      user: req.user,
    },
  });
});

// Dashboard routes - tambahkan route dashboard yang baru
router.get(
  "/dashboard/revenue-orders",
  adminDashboardController.getRevenueOrdersData
);
router.get(
  "/dashboard/order-status",
  adminDashboardController.getOrderStatusData
);
router.get(
  "/dashboard/overview",
  adminDashboardController.getDashboardOverview
);
router.get(
  "/dashboard/recent-orders",
  adminDashboardController.getRecentOrders
);

// Use affiliate routes
router.use("/affiliates", affiliateRoutes);

// Use material routes
router.use("/materials", materialRoutes);

// Use pricing routes
router.use("/pricing", pricingRoutes);

// Order routes
router.get("/orders", adminOrderController.getAllOrders);
router.get("/orders/stats", adminOrderController.getOrderStats);
router.get("/orders/:orderId", adminOrderController.getOrderDetail);
router.put("/orders/:orderId/status", adminOrderController.updateOrderStatus);
router.put(
  "/orders/:orderId/payment-status",
  adminOrderController.updatePaymentStatus
);
router.put(
  "/orders/:orderId/admin-notes",
  adminOrderController.updateAdminNotes
); 

router.delete("/orders/:orderId", adminOrderController.deleteOrder);

// Settings routes
router.get("/settings/profile", settingsController.getAdminProfile);
router.put("/settings/profile", settingsController.updateProfile);
router.put("/settings/password", settingsController.changePassword);
router.delete("/settings/reset-data", settingsController.resetData);

// History routes
router.get("/history", adminHistoryController.getAllHistory);
router.get("/history/stats", adminHistoryController.getHistoryStats);
router.post(
  "/history/move-completed",
  adminHistoryController.moveCompletedToHistory
);
router.delete("/history/:historyId", adminHistoryController.deleteFromHistory);
router.get(
  "/history/export-excel",
  adminHistoryController.exportHistoryToExcel
);

router.get(
  "/history/:historyId/export-excel",
  adminHistoryController.exportSingleHistoryToExcel
);

module.exports = router;
