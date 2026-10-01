const Material = require("../models/Material");
const Log = require("../models/Log");
const path = require("path");
const fs = require("fs");

// Helper function untuk mendapatkan IP address user
const getClientIp = (req) => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    "127.0.0.1"
  );
};

// Helper function untuk create log
const createMaterialLog = async (
  req,
  actionType,
  description,
  resourceId = null,
  oldValues = null,
  newValues = null
) => {
  try {
    const logData = {
      user_id: req.user?.id || null, // Asumsi user data ada di req.user setelah auth middleware
      action_type: actionType,
      resource_type: "material",
      resource_id: resourceId,
      description: description,
      old_values: oldValues,
      new_values: newValues,
      ip_address: getClientIp(req),
      user_agent: req.get("User-Agent") || null,
    };

    console.log(`📝 Creating material log: ${actionType}`, {
      user_id: logData.user_id,
      resource_id: resourceId,
      description: description,
    });

    await Log.create(logData);
  } catch (error) {
    console.error("❌ Error creating material log:", error);
    // Jangan throw error agar tidak mengganggu flow utama
  }
};

// Get all materials with pagination - FIXED
exports.getAllMaterialsWithPagination = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    console.log("🔍 [MATERIAL CONTROLLER] Pagination params:", {
      page,
      limit,
      search,
      status,
    });

    // Validasi dan parse parameter
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const result = await Material.getAllWithPagination({
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      status: status.trim(),
    });

    // Tambahkan full URL untuk gambar
    const materialsWithData = result.materials.map((material) => ({
      ...material,
      isActive: material.status === "active",
      image_url: material.image_url
        ? `${req.protocol}://${req.get("host")}${material.image_url}`
        : null,
    }));

    res.json({
      success: true,
      data: materialsWithData,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ Error getting materials with pagination:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data materials",
    });
  }
};

// Get all materials - tetap dipertahankan untuk kompatibilitas
exports.getAllMaterials = async (req, res) => {
  try {
    const materials = await Material.getAll();

    const materialsWithData = materials.map((material) => ({
      ...material,
      isActive: material.status === "active",
      image_url: material.image_url
        ? `${req.protocol}://${req.get("host")}${material.image_url}`
        : null,
    }));

    res.json({
      success: true,
      data: materialsWithData,
    });
  } catch (error) {
    console.error("Error getting materials:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data materials",
    });
  }
};

// Get material by ID
exports.getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.getById(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material tidak ditemukan",
      });
    }

    const materialWithData = {
      ...material,
      isActive: material.status === "active",
      image_url: material.image_url
        ? `${req.protocol}://${req.get("host")}${material.image_url}`
        : null,
    };

    res.json({
      success: true,
      data: materialWithData,
    });
  } catch (error) {
    console.error("Error getting material:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data material",
    });
  }
};

// Create material
exports.createMaterial = async (req, res) => {
  try {
    console.log("=== DEBUG CREATE MATERIAL ===");
    console.log("Body keys:", Object.keys(req.body));
    console.log("File:", req.file);
    console.log("=== END DEBUG ===");

    const {
      name,
      description,
      density,
      price_per_gram,
      status = "active",
    } = req.body;

    if (!name || !density || !price_per_gram) {
      return res.status(400).json({
        success: false,
        message: "Nama, density, dan harga per gram harus diisi",
      });
    }

    let image_url = "";
    if (req.file) {
      image_url = `/uploads/materials/${req.file.filename}`;
      console.log("✅ Image uploaded:", image_url);
    }

    const materialData = {
      name: name.trim(),
      description: description?.trim() || "",
      density: parseFloat(density),
      price_per_gram: parseFloat(price_per_gram),
      image_url: image_url,
      status: status || "active",
    };

    console.log("📝 Material data to create:", materialData);

    const newMaterial = await Material.create(materialData);

    // Create log untuk material creation
    await createMaterialLog(
      req,
      "created",
      `Material "${materialData.name}" berhasil dibuat`,
      newMaterial.id,
      null, // old values (null karena baru dibuat)
      {
        name: materialData.name,
        density: materialData.density,
        price_per_gram: materialData.price_per_gram,
        status: materialData.status,
        has_image: !!materialData.image_url,
      }
    );

    const materialResponse = {
      ...newMaterial,
      isActive: newMaterial.status === "active",
      image_url: newMaterial.image_url
        ? `${req.protocol}://${req.get("host")}${newMaterial.image_url}`
        : null,
    };

    res.status(201).json({
      success: true,
      message: "Material berhasil ditambahkan",
      data: materialResponse,
    });
  } catch (error) {
    console.error("❌ Error creating material:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan material",
    });
  }
};

// Update material
exports.updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📦 Update Material Request:", {
      params: req.params,
      body: req.body,
      file: req.file
        ? {
            filename: req.file.filename,
            originalname: req.file.originalname,
          }
        : "No file",
    });

    const existingMaterial = await Material.getById(id);
    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        message: "Material tidak ditemukan",
      });
    }

    const { name, description, density, price_per_gram, status } = req.body;

    let image_url = existingMaterial.image_url;
    let imageChanged = false;

    if (req.file) {
      if (existingMaterial.image_url) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          existingMaterial.image_url
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("🗑️ Old image deleted:", oldImagePath);
        }
      }

      image_url = `/uploads/materials/${req.file.filename}`;
      imageChanged = true;
      console.log("✅ New image uploaded:", image_url);
    }

    const updateData = {
      name: name?.trim() || existingMaterial.name,
      description: description?.trim() || existingMaterial.description,
      density:
        density !== undefined ? parseFloat(density) : existingMaterial.density,
      price_per_gram:
        price_per_gram !== undefined
          ? parseFloat(price_per_gram)
          : existingMaterial.price_per_gram,
      image_url: image_url,
      status: status || existingMaterial.status,
    };

    console.log("📝 Material data to update:", updateData);

    // Simpan old values untuk log
    const oldValues = {
      name: existingMaterial.name,
      description: existingMaterial.description,
      density: existingMaterial.density,
      price_per_gram: existingMaterial.price_per_gram,
      status: existingMaterial.status,
      image_url: existingMaterial.image_url,
    };

    const updatedMaterial = await Material.update(id, updateData);

    // Prepare new values untuk log
    const newValues = {
      name: updateData.name,
      description: updateData.description,
      density: updateData.density,
      price_per_gram: updateData.price_per_gram,
      status: updateData.status,
      image_url: updateData.image_url,
    };

    // Identifikasi perubahan untuk deskripsi log
    const changes = [];
    if (oldValues.name !== newValues.name) {
      changes.push(`nama dari "${oldValues.name}" menjadi "${newValues.name}"`);
    }
    if (oldValues.density !== newValues.density) {
      changes.push(
        `density dari ${oldValues.density} menjadi ${newValues.density}`
      );
    }
    if (oldValues.price_per_gram !== newValues.price_per_gram) {
      changes.push(
        `harga dari Rp ${oldValues.price_per_gram} menjadi Rp ${newValues.price_per_gram}/gram`
      );
    }
    if (oldValues.status !== newValues.status) {
      changes.push(
        `status dari ${oldValues.status} menjadi ${newValues.status}`
      );
    }
    if (imageChanged) {
      changes.push("gambar material");
    }

    const changeDescription =
      changes.length > 0
        ? `Material "${existingMaterial.name}" diupdate: ${changes.join(", ")}`
        : `Material "${existingMaterial.name}" diperbarui tanpa perubahan data`;

    // Create log untuk material update
    await createMaterialLog(
      req,
      "updated",
      changeDescription,
      id,
      oldValues,
      newValues
    );

    const materialResponse = {
      ...updatedMaterial,
      isActive: updatedMaterial.status === "active",
      image_url: updatedMaterial.image_url
        ? `${req.protocol}://${req.get("host")}${updatedMaterial.image_url}`
        : null,
    };

    res.json({
      success: true,
      message: "Material berhasil diperbarui",
      data: materialResponse,
    });
  } catch (error) {
    console.error("❌ Error updating material:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui material",
    });
  }
};

// Get material statistics
exports.getMaterialStats = async (req, res) => {
  try {
    const stats = await Material.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting material stats:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik materials",
    });
  }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMaterial = await Material.getById(id);
    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        message: "Material tidak ditemukan",
      });
    }

    // Simpan data material sebelum dihapus untuk log
    const materialData = {
      name: existingMaterial.name,
      density: existingMaterial.density,
      price_per_gram: existingMaterial.price_per_gram,
      status: existingMaterial.status,
      image_url: existingMaterial.image_url,
    };

    if (existingMaterial.image_url) {
      const imagePath = path.join(__dirname, "..", existingMaterial.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("🗑️ Material image deleted:", imagePath);
      }
    }

    await Material.delete(id);

    // Create log untuk material deletion
    await createMaterialLog(
      req,
      "deleted",
      `Material "${existingMaterial.name}" dihapus dari sistem`,
      id,
      materialData, // old values (data sebelum dihapus)
      null // new values (null karena dihapus)
    );

    res.json({
      success: true,
      message: "Material berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus material",
    });
  }
};

// Bulk update materials status
exports.bulkUpdateMaterials = async (req, res) => {
  try {
    const { material_ids, status } = req.body;

    if (
      !material_ids ||
      !Array.isArray(material_ids) ||
      material_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Material IDs harus berupa array dan tidak boleh kosong",
      });
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status harus 'active' atau 'inactive'",
      });
    }

    // Get existing materials data untuk log
    const existingMaterials = [];
    for (const materialId of material_ids) {
      const material = await Material.getById(materialId);
      if (material) {
        existingMaterials.push(material);
      }
    }

    // Update materials
    const results = await Material.bulkUpdateStatus(material_ids, status);

    // Create log untuk bulk update
    const materialNames = existingMaterials.map((m) => m.name).join(", ");
    await createMaterialLog(
      req,
      "updated",
      `Bulk update status material: ${materialNames} menjadi ${status}`,
      null, // resource_id null untuk bulk operation
      {
        material_ids: material_ids,
        old_statuses: existingMaterials.map((m) => ({
          id: m.id,
          status: m.status,
        })),
      },
      {
        material_ids: material_ids,
        new_status: status,
        count: results.affectedRows,
      }
    );

    res.json({
      success: true,
      message: `Berhasil mengupdate status ${results.affectedRows} material menjadi ${status}`,
      data: {
        affectedRows: results.affectedRows,
      },
    });
  } catch (error) {
    console.error("Error in bulk update materials:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate materials",
    });
  }
};
