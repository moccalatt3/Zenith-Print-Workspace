const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const { uploadMaterial } = require("../middleware/uploadMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

// 📦 Public routes
router.get("/", materialController.getAllMaterialsWithPagination); // ✅ UPDATED: dengan pagination
router.get("/all", materialController.getAllMaterials); // ✅ NEW: endpoint tanpa pagination (untuk kompatibilitas)
router.get("/:id", materialController.getMaterialById);
router.get("/stats/summary", materialController.getMaterialStats);

// 🛠️ Admin routes (dilindungi requireAdmin)
router.post(
  "/",
  requireAdmin,
  uploadMaterial,
  materialController.createMaterial
);
router.put(
  "/:id",
  requireAdmin,
  uploadMaterial,
  materialController.updateMaterial
);
router.delete("/:id", requireAdmin, materialController.deleteMaterial);

module.exports = router;
