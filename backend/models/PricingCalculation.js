const db = require("../config/db");

class PricingCalculation {
  // Save pricing calculation
  static async saveCalculation(calculationData) {
    try {
      const query = `
        INSERT INTO pricing_calculations (
          user_id, material_id, unit_price, weight, volume, quantity,
          shipping_cost, tax_amount, packing_cost, local_shipping_cost,
          subtotal, overhead_amount, profit_amount, final_price,
          applied_discounts, calculation_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Pastikan tidak ada yang undefined, gunakan null untuk nilai kosong
      const values = [
        calculationData.userId || null,
        calculationData.materialId || null,
        calculationData.unitPrice || 0,
        calculationData.weight || 0,
        calculationData.volume || 0,
        calculationData.quantity || 1,
        calculationData.shippingCost || 0,
        calculationData.taxAmount || 0,
        calculationData.packingCost || 0,
        calculationData.localShippingCost || 0,
        calculationData.subtotal || 0,
        calculationData.overheadAmount || 0,
        calculationData.profitAmount || 0,
        calculationData.finalPrice || 0,
        JSON.stringify(calculationData.appliedDiscounts || []),
        JSON.stringify(calculationData.calculationData || {}),
      ];

      const [result] = await db.execute(query, values);
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Get calculation history
  static async getHistory(userId = null, limit = 10) {
    try {
      let query = `
        SELECT pc.*, m.name as material_name, u.name as user_name
        FROM pricing_calculations pc
        LEFT JOIN materials m ON pc.material_id = m.id
        LEFT JOIN users u ON pc.user_id = u.id
      `;
      const values = [];

      if (userId) {
        query += " WHERE pc.user_id = ?";
        values.push(userId);
      }

      query += " ORDER BY pc.created_at DESC LIMIT ?";
      values.push(limit);

      const [rows] = await db.execute(query, values);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PricingCalculation;
