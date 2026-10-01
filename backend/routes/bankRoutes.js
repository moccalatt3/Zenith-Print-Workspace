const express = require("express");
const router = express.Router();
const bankController = require("../controllers/bankController");

// Bank account routes
router.get("/accounts", bankController.getAllBanks);
router.post("/accounts", bankController.createBank);
router.put("/accounts/:id", bankController.updateBank);
router.delete("/accounts/:id", bankController.deleteBank);

module.exports = router;
