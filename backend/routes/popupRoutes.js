const express = require("express");
const router = express.Router();
const popupController = require("../controllers/popupController");

// Get popup settings
router.get("/settings", popupController.getPopupSettings);

// Update popup settings
router.put("/settings", popupController.updatePopupSettings);

module.exports = router;
