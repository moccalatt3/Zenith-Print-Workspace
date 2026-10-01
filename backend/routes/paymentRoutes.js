// paymentRoutes.js - GUBAH BAGIAN INI
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");
const { uploadPaymentProof } = require("../middleware/uploadMiddleware"); 

const router = express.Router();

router.use(requireAuth);

router.post(
  "/upload-proof",
  uploadPaymentProof, // ✅ LANGSUNG PAKAI MIDDLEWARE BARU
  paymentController.uploadPaymentProof
);

router.get("/user-payments", paymentController.getUserPayments);

module.exports = router;
