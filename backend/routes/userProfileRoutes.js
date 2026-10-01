const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const userProfileController = require("../controllers/userProfileController");

const router = express.Router();

router.get("/profile", requireAuth, userProfileController.getProfile);
router.put("/profile", requireAuth, userProfileController.updateProfile);
router.put(
  "/change-password",
  requireAuth,
  userProfileController.changePassword
);
router.get("/activity", requireAuth, userProfileController.getActivity);

module.exports = router;
