const db = require("../config/db");

class PricingConfig {
  // Get current pricing configuration
  static async getCurrentConfig() {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1"
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Create or update pricing configuration
  static async updateConfig(configData) {
    try {
      const currentConfig = await this.getCurrentConfig();

      if (currentConfig) {
        // Update existing config
        const query = `
          UPDATE pricing_config SET 
            shipping_rate_per_kg = ?,
            tax_rate = ?,
            packing_cost = ?,
            local_shipping_rate_per_kg = ?,
            overhead_percentage = ?,
            profit_percentage = ?,
            final_price_discount = ?,
            volume_to_cm3 = ?,
            gram_to_kg = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const values = [
          configData.shippingRatePerKg,
          configData.taxRate,
          configData.packingCost,
          configData.localShippingRatePerKg,
          configData.overheadPercentage,
          configData.profitPercentage,
          configData.finalPriceDiscount,
          configData.volumeToCM3,
          configData.gramToKg,
          currentConfig.id,
        ];

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
      } else {
        // Create new config
        const query = `
          INSERT INTO pricing_config (
            shipping_rate_per_kg, tax_rate, packing_cost, local_shipping_rate_per_kg,
            overhead_percentage, profit_percentage, final_price_discount,
            volume_to_cm3, gram_to_kg
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          configData.shippingRatePerKg,
          configData.taxRate,
          configData.packingCost,
          configData.localShippingRatePerKg,
          configData.overheadPercentage,
          configData.profitPercentage,
          configData.finalPriceDiscount,
          configData.volumeToCM3,
          configData.gramToKg,
        ];

        const [result] = await db.execute(query, values);
        return result.insertId;
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PricingConfig;
