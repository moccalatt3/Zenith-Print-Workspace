const db = require("../config/db");

const BankAccount = {
  // Get all bank accounts - FIXED untuk promise-based
  getAll: async () => {
    try {
      const query = "SELECT * FROM bank_accounts ORDER BY created_at DESC";
      console.log("🟢 Executing query:", query);

      const [results] = await db.execute(query);
      console.log("🟢 Query results:", results);
      return results;
    } catch (err) {
      console.error("🔴 Database error:", err);
      throw err;
    }
  },

  // Get bank account by ID
  getById: async (id) => {
    try {
      const query = "SELECT * FROM bank_accounts WHERE id = ?";
      const [results] = await db.execute(query, [id]);
      return results[0];
    } catch (err) {
      console.error("🔴 Database error in getById:", err);
      throw err;
    }
  },

  // Create new bank account
  create: async (bankData) => {
    try {
      const query = `
        INSERT INTO bank_accounts 
        (bank_name, account_number, account_holder) 
        VALUES (?, ?, ?)
      `;
      const values = [
        bankData.bank_name,
        bankData.account_number,
        bankData.account_holder,
      ];

      console.log("🟢 Creating bank account:", values);

      const [results] = await db.execute(query, values);
      return { id: results.insertId, ...bankData };
    } catch (err) {
      console.error("🔴 Database error on create:", err);
      throw err;
    }
  },

  // Update bank account
  update: async (id, bankData) => {
    try {
      const query = `
        UPDATE bank_accounts 
        SET bank_name = ?, account_number = ?, account_holder = ?
        WHERE id = ?
      `;
      const values = [
        bankData.bank_name,
        bankData.account_number,
        bankData.account_holder,
        id,
      ];

      const [results] = await db.execute(query, values);
      return results;
    } catch (err) {
      console.error("🔴 Database error on update:", err);
      throw err;
    }
  },

  // Delete bank account
  delete: async (id) => {
    try {
      const query = "DELETE FROM bank_accounts WHERE id = ?";
      const [results] = await db.execute(query, [id]);
      return results;
    } catch (err) {
      console.error("🔴 Database error on delete:", err);
      throw err;
    }
  },
};

module.exports = BankAccount;
