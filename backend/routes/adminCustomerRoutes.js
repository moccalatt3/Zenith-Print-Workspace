const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const adminCustomerController = require("../controllers/adminCustomerController");

const router = express.Router();

// Semua route membutuhkan authentication dan role admin
router.use(requireAuth, requireAdmin);

// Get all customers dengan filter
router.get("/", adminCustomerController.getAllCustomers);

// Get customer statistics
router.get("/stats", adminCustomerController.getCustomerStats);

// Get customer detail
router.get("/:customerId", adminCustomerController.getCustomerDetail);

// Update customer status
router.put("/:customerId/status", adminCustomerController.updateCustomerStatus);

// ✅ TAMBAHKAN INI - Update customer password
router.put(
  "/:customerId/password",
  adminCustomerController.updateCustomerPassword
);

// Delete customer
router.delete("/:customerId", adminCustomerController.deleteCustomer);

module.exports = router;
