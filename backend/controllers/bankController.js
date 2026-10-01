const BankAccount = require("../models/BankAccount");
const Log = require("../models/Log");

const bankController = {
  // Get all bank accounts
  getAllBanks: async (req, res) => {
    try {
      console.log("🟢 Fetching all bank accounts from controller...");
      const banks = await BankAccount.getAll();

      console.log("🟢 Banks data:", banks);

      res.json({
        success: true,
        data: banks,
      });
    } catch (error) {
      console.error("🔴 Controller error in getAllBanks:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data bank: " + error.message,
      });
    }
  },

  // Create new bank account
  createBank: async (req, res) => {
    try {
      const { bank_name, account_number, account_holder } = req.body;
      console.log("🟢 Creating bank with data:", {
        bank_name,
        account_number,
        account_holder,
      });

      // Validation
      if (!bank_name || !account_number || !account_holder) {
        return res.status(400).json({
          success: false,
          message: "Nama bank, nomor rekening, dan atas nama wajib diisi",
        });
      }

      const newBank = await BankAccount.create({
        bank_name,
        account_number,
        account_holder,
      });

      // Log action
      try {
        await Log.create({
          user_id: req.user?.id || null,
          action_type: "created",
          resource_type: "bank_account",
          resource_id: newBank.id,
          description: `Membuat akun bank baru: ${bank_name} - ${account_holder}`,
          new_values: {
            bank_name,
            account_number,
            account_holder,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for bank creation");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      res.json({
        success: true,
        message: "Bank account berhasil dibuat",
        data: newBank,
      });
    } catch (error) {
      console.error("🔴 Controller error in createBank:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat bank account: " + error.message,
      });
    }
  },

  // Update bank account
  updateBank: async (req, res) => {
    try {
      const { id } = req.params;
      const { bank_name, account_number, account_holder } = req.body;

      // Validation
      if (!bank_name || !account_number || !account_holder) {
        return res.status(400).json({
          success: false,
          message: "Nama bank, nomor rekening, dan atas nama wajib diisi",
        });
      }

      // Get old data for logging
      const oldBank = await BankAccount.getById(id);
      if (!oldBank) {
        return res.status(404).json({
          success: false,
          message: "Bank account tidak ditemukan",
        });
      }

      await BankAccount.update(id, {
        bank_name,
        account_number,
        account_holder,
      });

      // Log action
      try {
        await Log.create({
          user_id: req.user?.id || null,
          action_type: "updated",
          resource_type: "bank_account",
          resource_id: id,
          description: `Memperbarui akun bank: ${bank_name} - ${account_holder}`,
          old_values: {
            bank_name: oldBank.bank_name,
            account_number: oldBank.account_number,
            account_holder: oldBank.account_holder,
          },
          new_values: {
            bank_name,
            account_number,
            account_holder,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for bank update");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      res.json({
        success: true,
        message: "Bank account berhasil diperbarui",
      });
    } catch (error) {
      console.error("🔴 Controller error in updateBank:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui bank account: " + error.message,
      });
    }
  },

  // Delete bank account
  deleteBank: async (req, res) => {
    try {
      const { id } = req.params;

      // Get data for logging before deletion
      const bankToDelete = await BankAccount.getById(id);
      if (!bankToDelete) {
        return res.status(404).json({
          success: false,
          message: "Bank account tidak ditemukan",
        });
      }

      await BankAccount.delete(id);

      // Log action
      try {
        await Log.create({
          user_id: req.user?.id || null,
          action_type: "deleted",
          resource_type: "bank_account",
          resource_id: id,
          description: `Menghapus akun bank: ${bankToDelete.bank_name} - ${bankToDelete.account_holder}`,
          old_values: {
            bank_name: bankToDelete.bank_name,
            account_number: bankToDelete.account_number,
            account_holder: bankToDelete.account_holder,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for bank deletion");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      res.json({
        success: true,
        message: "Bank account berhasil dihapus",
      });
    } catch (error) {
      console.error("🔴 Controller error in deleteBank:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus bank account: " + error.message,
      });
    }
  },
};

module.exports = bankController;
