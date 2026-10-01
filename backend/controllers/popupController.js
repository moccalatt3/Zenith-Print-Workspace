const db = require("../config/db");

const popupController = {
  // Get popup settings
  getPopupSettings: async (req, res) => {
    try {
      const [settings] = await db.execute(
        "SELECT * FROM popup_settings WHERE name = ?",
        ["discount_popup"]
      );

      if (settings.length === 0) {
        // Return default settings jika tidak ada
        return res.json({
          success: true,
          data: {
            id: null,
            name: "discount_popup",
            interval_minutes: 120,
            is_active: true,
            delay_seconds: 5,
            show_only_with_discount: true,
            created_at: null,
            updated_at: null,
          },
        });
      }

      res.json({
        success: true,
        data: settings[0],
      });
    } catch (error) {
      console.error("Error fetching popup settings:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data popup settings",
      });
    }
  },

  // Update popup settings
  updatePopupSettings: async (req, res) => {
    try {
      const {
        interval_minutes,
        is_active,
        delay_seconds,
        show_only_with_discount,
      } = req.body;

      // Cek apakah settings sudah ada
      const [existingSettings] = await db.execute(
        "SELECT * FROM popup_settings WHERE name = ?",
        ["discount_popup"]
      );

      if (existingSettings.length > 0) {
        // Update existing
        await db.execute(
          `UPDATE popup_settings 
           SET interval_minutes = ?, is_active = ?, delay_seconds = ?, show_only_with_discount = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE name = ?`,
          [
            interval_minutes,
            is_active,
            delay_seconds,
            show_only_with_discount,
            "discount_popup",
          ]
        );
      } else {
        // Insert new
        await db.execute(
          `INSERT INTO popup_settings (name, interval_minutes, is_active, delay_seconds, show_only_with_discount) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            "discount_popup",
            interval_minutes,
            is_active,
            delay_seconds,
            show_only_with_discount,
          ]
        );
      }

      res.json({
        success: true,
        message: "Popup settings berhasil disimpan",
      });
    } catch (error) {
      console.error("Error updating popup settings:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menyimpan popup settings",
      });
    }
  },
};

module.exports = popupController;
