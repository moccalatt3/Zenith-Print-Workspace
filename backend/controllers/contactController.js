const db = require("../config/db");
const Log = require("../models/Log");

const contactController = {
  // Get contact information
  async getContactInfo(req, res) {
    try {
      const [contacts] = await db.execute(
        "SELECT * FROM contact_info WHERE is_active = TRUE ORDER BY display_order ASC"
      );
      res.json({ success: true, data: contacts });
    } catch (error) {
      console.error("Error getting contact info:", error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengambil data kontak" });
    }
  },

  // Create new contact info
  async createContactInfo(req, res) {
    let connection;
    try {
      const {
        contact_type,
        title,
        value,
        display_order = 0,
        is_active = true,
      } = req.body;

      // Validasi input
      if (!contact_type || !title || !value) {
        return res.status(400).json({
          success: false,
          message: "Contact type, title, dan value harus diisi",
        });
      }

      connection = await db.getConnection();

      // Insert ke database
      const [result] = await connection.execute(
        "INSERT INTO contact_info (contact_type, title, value, display_order, is_active) VALUES (?, ?, ?, ?, ?)",
        [contact_type, title, value, display_order, is_active]
      );

      const newContactId = result.insertId;

      // Log action
      try {
        await Log.create({
          user_id: req.user?.id || null,
          action_type: "created",
          resource_type: "contact_info",
          resource_id: newContactId,
          description: `Membuat contact info baru: ${title}`,
          new_values: {
            contact_type,
            title,
            value,
            display_order,
            is_active,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for contact creation");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      console.log("✅ Contact info created:", {
        id: newContactId,
        contact_type,
        title,
      });

      res.status(201).json({
        success: true,
        message: "Contact info berhasil dibuat",
        data: {
          id: newContactId,
          contact_type,
          title,
          value,
          display_order,
          is_active,
        },
      });
    } catch (error) {
      console.error("❌ Error creating contact info:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat contact info",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Update contact info
  async updateContactInfo(req, res) {
    let connection;
    try {
      const { id } = req.params;
      const { contact_type, title, value, display_order, is_active } = req.body;

      connection = await db.getConnection();

      // Cek apakah contact info exists dan ambil data lama
      const [contacts] = await connection.execute(
        "SELECT * FROM contact_info WHERE id = ?",
        [id]
      );

      if (contacts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Contact info tidak ditemukan",
        });
      }

      const oldData = contacts[0];

      // Update database
      await connection.execute(
        "UPDATE contact_info SET contact_type = ?, title = ?, value = ?, display_order = ?, is_active = ? WHERE id = ?",
        [contact_type, title, value, display_order, is_active, id]
      );

      // Log action
      try {
        const newData = {
          contact_type,
          title,
          value,
          display_order,
          is_active,
        };

        await Log.create({
          user_id: req.user?.id || null,
          action_type: "updated",
          resource_type: "contact_info",
          resource_id: id,
          description: `Memperbarui contact info: ${title}`,
          old_values: {
            contact_type: oldData.contact_type,
            title: oldData.title,
            value: oldData.value,
            display_order: oldData.display_order,
            is_active: oldData.is_active,
          },
          new_values: newData,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for contact update");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      console.log("✅ Contact info updated:", { id, title });

      res.json({
        success: true,
        message: "Contact info berhasil diupdate",
        data: {
          id: parseInt(id),
          contact_type,
          title,
          value,
          display_order,
          is_active,
        },
      });
    } catch (error) {
      console.error("❌ Error updating contact info:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengupdate contact info",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Delete contact info
  async deleteContactInfo(req, res) {
    let connection;
    try {
      const { id } = req.params;

      connection = await db.getConnection();

      // Cek apakah contact info exists dan ambil data untuk log
      const [contacts] = await connection.execute(
        "SELECT * FROM contact_info WHERE id = ?",
        [id]
      );

      if (contacts.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Contact info tidak ditemukan",
        });
      }

      const contactData = contacts[0];

      // Delete dari database
      await connection.execute("DELETE FROM contact_info WHERE id = ?", [id]);

      // Log action
      try {
        await Log.create({
          user_id: req.user?.id || null,
          action_type: "deleted",
          resource_type: "contact_info",
          resource_id: id,
          description: `Menghapus contact info: ${contactData.title}`,
          old_values: {
            contact_type: contactData.contact_type,
            title: contactData.title,
            value: contactData.value,
            display_order: contactData.display_order,
            is_active: contactData.is_active,
          },
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
        console.log("✅ Log created for contact deletion");
      } catch (logError) {
        console.error("❌ Error creating log:", logError);
        // Continue with response even if log fails
      }

      console.log("✅ Contact info deleted:", { id });

      res.json({
        success: true,
        message: "Contact info berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ Error deleting contact info:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus contact info",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Get all contact info (for admin)
  async getAllContactInfo(req, res) {
    try {
      const [contacts] = await db.execute(
        "SELECT * FROM contact_info ORDER BY display_order ASC, created_at DESC"
      );
      res.json({ success: true, data: contacts });
    } catch (error) {
      console.error("Error getting all contact info:", error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengambil data kontak" });
    }
  },

  // Get FAQs
  async getFAQs(req, res) {
    try {
      // Jika ada tabel FAQs di database, ambil dari sana
      // Untuk sementara gunakan data statis
      const faqs = [
        {
          question: "Berapa lama waktu pengerjaan proyek 3D printing?",
          answer:
            "Waktu pengerjaan bervariasi tergantung kompleksitas dan ukuran model. Rata-rata 3-7 hari kerja termasuk proses finishing.",
        },
        {
          question: "Format file apa saja yang diterima?",
          answer:
            "Kami menerima berbagai format file 3D termasuk STL, OBJ, 3MF, dan STEP. Tim kami dapat membantu konversi jika diperlukan.",
        },
      ];
      res.json({ success: true, data: faqs });
    } catch (error) {
      console.error("Error getting FAQs:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data FAQ",
      });
    }
  },
};

module.exports = contactController;
