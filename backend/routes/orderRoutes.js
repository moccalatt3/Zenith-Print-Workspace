// orderRoutes.js
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");
const { uploadModel } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(requireAuth);

// ✅ PASTIKAN INI ADA
router.post(
  "/upload-model", // ❗PERHATIAN: INI "upload-model" BUKAN "upload-models"
  uploadModel.array("models", 10),
  orderController.uploadModelFiles
);

router.get("/user-files", orderController.getUserFiles); // ✅ JIKA ADA
router.post("/create", orderController.createOrder);
router.get("/user-orders", orderController.getUserOrders); // ✅ INI YANG PENTING
router.get("/:orderId", orderController.getOrderDetail);

router.get("/active/user", orderController.getUserActiveOrders);
router.get("/number/:orderNumber", orderController.getOrderByNumber);
router.get("/:orderId/status", orderController.getOrderStatus);
router.get("/status/:status", orderController.getOrdersByStatus);

router.delete("/:orderId/delete", orderController.deleteUserOrder);

module.exports = router;
