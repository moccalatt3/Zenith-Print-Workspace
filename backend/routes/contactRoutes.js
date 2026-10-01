const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const { requireAdmin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", contactController.getContactInfo);
router.get("/faqs", contactController.getFAQs);

// Admin routes untuk mengelola contact info
router.get("/admin/all", requireAdmin, contactController.getAllContactInfo);
router.post("/admin", requireAdmin, contactController.createContactInfo);
router.put("/admin/:id", requireAdmin, contactController.updateContactInfo); // <- Ini yang penting
router.delete("/admin/:id", requireAdmin, contactController.deleteContactInfo);

module.exports = router;
