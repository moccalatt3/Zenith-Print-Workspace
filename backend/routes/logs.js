const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const { requireAdmin } = require("../middleware/authMiddleware");

// All log routes require authentication and admin role
router.use(requireAdmin);

// Get all logs with pagination and filters
router.get("/", logController.getAllLogs);

// Debug route
router.get("/debug", logController.getLogsDebug);

// Get filter options
router.get("/filter-options", logController.getFilterOptions);

// Get logs by resource
router.get(
  "/resource/:resource_type/:resource_id",
  logController.getLogsByResource
);

// Get log statistics
router.get("/stats", logController.getLogStats);

// Reset all logs data - HANYA INI YANG DIPAKAI
router.delete("/reset", logController.resetAllLogs);

module.exports = router;
