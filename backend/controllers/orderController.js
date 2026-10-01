const db = require("../config/db");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const notificationService = require("../services/notificationService");

const orderController = {
  async uploadModelFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada file yang diupload",
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      console.log(`📁 Uploading ${req.files.length} files for user ${userId}`);

      // Process uploaded files
      const uploadedFiles = req.files.map((file) => {
        return {
          fileName: file.filename,
          originalFileName: file.originalname,
          fileSize: file.size,
          fileUrl: `/uploads/models/${userId}/${file.filename}`,
          filePath: file.path,
          uploadTime: new Date().toISOString(),
        };
      });

      console.log("✅ Files uploaded successfully:", uploadedFiles);

      res.json({
        success: true,
        message: `${req.files.length} file berhasil diupload`,
        data: {
          files: uploadedFiles,
        },
      });
    } catch (error) {
      console.error("❌ Error uploading files:", error);
      res.status(500).json({
        success: false,
        message: "Gagal upload file: " + error.message,
      });
    }
  },
  async getUserActiveOrders(req, res) {
    try {
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🔍 Fetching active orders for user:", userId);

      // ✅ PERBAIKAN: TAMBAHKAN final_touchup DAN ready_to_ship
      const [orders] = await db.execute(
        `SELECT 
        o.*, 
        u.name as customer_name,
        u.email as customer_email,
        COUNT(oi.id) AS item_count,
        GROUP_CONCAT(DISTINCT oi.material_name) AS materials,
        o.payment_status,
        o.total_amount,
        o.order_status
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? 
       AND o.order_status IN ('under_review', 'waiting_payment', 'payment_received', 'printing', 'final_touchup', 'ready_to_ship')
       GROUP BY o.id
       ORDER BY 
         CASE 
           WHEN o.order_status = 'printing' THEN 1
           WHEN o.order_status = 'final_touchup' THEN 2
           WHEN o.order_status = 'ready_to_ship' THEN 3
           WHEN o.order_status = 'payment_received' THEN 4
           WHEN o.order_status = 'waiting_payment' THEN 5
           WHEN o.order_status = 'under_review' THEN 6
           ELSE 7
         END, o.created_at DESC`,
        [userId]
      );

      console.log(`✅ Found ${orders.length} active orders for user ${userId}`);

      // Format response
      const formattedOrders = orders.map((order) => ({
        ...order,
        status_info: getOrderStatusInfo(order.order_status),
        can_proceed_to_payment:
          order.order_status === "waiting_payment" &&
          order.payment_status === "pending",
      }));

      res.json({
        success: true,
        data: formattedOrders,
      });
    } catch (error) {
      console.error("❌ Error getting active orders:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data order aktif: " + error.message,
      });
    }
  },

  // ✅ Get order by order number
  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🔍 Getting order by number:", { orderNumber, userId });

      const [orders] = await db.execute(
        `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.order_number = ? AND o.user_id = ?`,
        [orderNumber, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      const [items] = await db.execute(
        `SELECT oi.*, m.name as material_display_name, m.image_url as material_image
       FROM order_items oi
       LEFT JOIN materials m ON oi.material_id = m.id
       WHERE oi.order_id = ?`,
        [order.id]
      );

      console.log(
        `✅ Order found: ${order.order_number}, items: ${items.length}`
      );

      const formattedOrder = {
        ...order,
        status_info: getOrderStatusInfo(order.order_status),
        can_proceed_to_payment:
          order.order_status === "waiting_payment" &&
          order.payment_status === "pending",
      };

      res.json({
        success: true,
        data: {
          order: formattedOrder,
          items,
        },
      });
    } catch (error) {
      console.error("❌ Error getting order by number:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data order: " + error.message,
      });
    }
  },

  // ✅ Get order status only - DIPERBAIKI
  async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🔍 Getting order status for:", { orderId, userId });

      // ✅ PERBAIKAN: Ambil data lengkap termasuk admin_notes
      const [orders] = await db.execute(
        `SELECT id, order_number, order_status, payment_status, total_amount, admin_notes, user_type
       FROM orders 
       WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
            total_amount: order.total_amount,
            admin_notes: order.admin_notes, // ✅ TAMBAHKAN INI
            user_type: order.user_type, // ✅ TAMBAHKAN INI
            status_info: getOrderStatusInfo(order.order_status),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error getting order status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil status order: " + error.message,
      });
    }
  },

  async getOrdersByStatus(req, res) {
    try {
      const { status } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🔍 Getting orders by status:", { status, userId });

      const [orders] = await db.execute(
        `SELECT 
        o.*, 
        u.name as customer_name,
        u.email as customer_email,
        COUNT(oi.id) AS item_count,
        GROUP_CONCAT(DISTINCT oi.material_name) AS materials
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? AND o.order_status = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
        [userId, status]
      );

      console.log(
        `✅ Found ${orders.length} orders with status ${status} for user ${userId}`
      );

      const formattedOrders = orders.map((order) => ({
        ...order,
        status_info: getOrderStatusInfo(order.order_status),
        can_proceed_to_payment:
          order.order_status === "waiting_payment" &&
          order.payment_status === "pending",
      }));

      res.json({
        success: true,
        data: formattedOrders,
      });
    } catch (error) {
      console.error("❌ Error getting orders by status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data order: " + error.message,
      });
    }
  },

  async getUserFiles(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid",
        });
      }

      const userDir = path.join(
        __dirname,
        "../uploads/models",
        userId.toString()
      );

      if (!fs.existsSync(userDir)) {
        return res.json({
          success: true,
          data: {
            files: [],
          },
        });
      }

      const files = fs.readdirSync(userDir).map((filename) => {
        const filePath = path.join(userDir, filename);
        const stats = fs.statSync(filePath);

        return {
          fileName: filename,
          fileUrl: `/uploads/models/${userId}/${filename}`,
          fileSize: stats.size,
          uploadTime: stats.mtime,
          isModelFile: [
            ".stl",
            ".obj",
            ".3mf",
            ".step",
            ".iges",
            ".fbx",
            ".dae",
          ].includes(path.extname(filename).toLowerCase()),
        };
      });

      res.json({
        success: true,
        data: {
          files: files.filter((f) => f.isModelFile),
        },
      });
    } catch (error) {
      console.error("❌ Error getting user files:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data file",
      });
    }
  },

  async createOrder(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      console.log("🟢 ========== START CREATE ORDER ==========");
      console.log("📦 RAW REQUEST BODY:", JSON.stringify(req.body, null, 2));
      console.log("👤 REQ.USER:", req.user);

      const {
        files,
        affiliateCode,
        totalAmount, // ✅ INI SUDAH TOTAL SETELAH DISKON
        customerNotes,
        userType = "individual",
      } = req.body;

      // Handle userId
      let userId = req.user?.id;
      if (!userId) {
        console.log("⚠️ req.user.id undefined, mencoba decode token...");
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
            console.log("🔑 Decoded user ID from token:", userId);
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        console.log("❌ NO USER ID FOUND - Returning 401");
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid. Silakan login kembali.",
        });
      }

      console.log("✅ User ID resolved:", userId);
      console.log("🎯 Affiliate Code:", affiliateCode);
      console.log("🏢 User Type:", userType);
      console.log("💵 Total Amount (setelah diskon):", totalAmount);

      // ✅ DEBUG: DETAILED FILES ANALYSIS
      console.log("📁 FILES ANALYSIS:");
      if (!files || !Array.isArray(files)) {
        console.log("❌ FILES IS INVALID:", files);
        return res.status(400).json({
          success: false,
          message: "Data files tidak valid",
        });
      }

      console.log(`📊 Number of files: ${files.length}`);

      files.forEach((file, index) => {
        console.log(`\n📄 FILE ${index + 1}:`);
        console.log(`   📝 File Name: ${file.fileName}`);
        console.log(
          `   🆔 Material ID: ${
            file.materialId
          } (Type: ${typeof file.materialId})`
        );
        console.log(`   📛 Material Name: ${file.materialName}`);
        console.log(`   🔢 Quantity: ${file.quantity}`);
        console.log(`   💰 Final Price (setelah diskon): ${file.finalPrice}`);
        console.log(`   💰 Total Price (setelah diskon): ${file.totalPrice}`);
        console.log(`   🌐 File URL: ${file.fileUrl}`);

        if (!file.materialId) {
          console.log(`   ❌ MATERIAL ID MISSING IN FILE ${index + 1}`);
        } else {
          console.log(`   ✅ MATERIAL ID PRESENT: ${file.materialId}`);
        }
      });

      // ✅ STEP 1: CEK DATA USER DAN STATUS AFFILIATE + EXPIRY DATE
      console.log("\n👤 STEP 1: CHECKING USER DATA & AFFILIATE EXPIRY...");
      const [userData] = await connection.execute(
        `SELECT u.id, u.affiliate_id, u.referral_code, 
            u.affiliate_expiry_date, u.affiliate_joined_at,
            a.referral_code as affiliate_referral_code, 
            a.commission_rate, a.status as affiliate_status,
            u.created_at as user_created_at
       FROM users u 
       LEFT JOIN affiliates a ON u.affiliate_id = a.id 
       WHERE u.id = ?`,
        [userId]
      );

      const user = userData[0];
      console.log("📋 User data from DB:", {
        id: user?.id,
        affiliate_id: user?.affiliate_id,
        affiliate_expiry_date: user?.affiliate_expiry_date,
        affiliate_joined_at: user?.affiliate_joined_at,
        affiliate_status: user?.affiliate_status,
      });

      let finalReferralCode = null;
      let affiliateId = null;
      let commissionRate = null;
      let commissionAmount = 0;
      let isAffiliateRelationshipActive = false;
      let expiryCheckMessage = "";

      // 🔧 CHECK EXPIRY: Validasi apakah relationship masih aktif
      if (user?.affiliate_id) {
        const now = new Date();
        const expiryDate = new Date(user.affiliate_expiry_date);

        if (user.affiliate_expiry_date && now > expiryDate) {
          // ❌ RELATIONSHIP SUDAH EXPIRED
          console.log(`⏰ Affiliate relationship EXPIRED for user ${userId}`, {
            affiliate_id: user.affiliate_id,
            joined_at: user.affiliate_joined_at,
            expiry_date: user.affiliate_expiry_date,
            current_time: now,
          });

          // ✅ NULLIFY AFFILIATE_ID karena sudah expired
          await connection.execute(
            "UPDATE users SET affiliate_id = NULL, affiliate_expiry_date = NULL, affiliate_joined_at = NULL WHERE id = ?",
            [userId]
          );

          expiryCheckMessage = `Relationship dengan affiliate sudah expired (${expiryDate.toLocaleDateString(
            "id-ID"
          )}).`;
          console.log(
            `✅ affiliate_id dinullify untuk user ${userId} - Relationship expired`
          );

          // Set affiliateId ke null karena sudah expired
          affiliateId = null;
        } else {
          // ✅ RELATIONSHIP MASIH AKTIF
          isAffiliateRelationshipActive = true;
          affiliateId = user.affiliate_id;
          finalReferralCode = user.affiliate_referral_code;
          commissionRate = user.commission_rate;

          const timeRemaining = Math.ceil(
            (expiryDate - now) / (1000 * 60 * 60 * 24)
          );
          expiryCheckMessage = `Relationship dengan affiliate aktif. Sisa waktu: ${timeRemaining} hari.`;

          console.log(`✅ Affiliate relationship ACTIVE for user ${userId}`, {
            affiliate_id: affiliateId,
            days_remaining: timeRemaining,
            expiry_date: expiryDate.toLocaleDateString("id-ID"),
          });

          console.log(`🔒 User memiliki affiliate tetap: ${affiliateId}`);

          if (affiliateCode) {
            console.log(
              `⚠️ Ignoring manual affiliate code: ${affiliateCode} - Using existing affiliate`
            );
          }
        }
      }

      // ✅ STEP 2: JIKA USER TIDAK PUNYA AFFILIATE ATAU SUDAH EXPIRED, BOLEH GUNAKAN KODE MANUAL
      if ((!affiliateId || !isAffiliateRelationshipActive) && affiliateCode) {
        console.log(`🔍 Validating manual affiliate code: ${affiliateCode}`);

        const [affiliateData] = await connection.execute(
          `SELECT id, name, referral_code, commission_rate, status 
         FROM affiliates 
         WHERE referral_code = ? AND status = 'active'`,
          [affiliateCode]
        );

        if (affiliateData.length === 0) {
          console.log(`❌ Affiliate code not found: ${affiliateCode}`);
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Kode affiliate "${affiliateCode}" tidak valid atau tidak aktif.`,
          });
        }

        const affiliate = affiliateData[0];
        console.log(`✅ Manual affiliate validated:`, affiliate);

        if (user.referral_code === affiliateCode) {
          console.log(`❌ User cannot use own affiliate code`);
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Anda tidak dapat menggunakan kode affiliate sendiri.",
          });
        }

        // 🔧 AMBIL SETTING EXPIRY DARI DATABASE UNTUK RELATIONSHIP BARU
        console.log("🔄 Setting up new affiliate relationship with expiry...");
        try {
          const [settings] = await connection.execute(
            "SELECT setting_value FROM affiliate_settings WHERE setting_name = 'relationship_expiry_months'"
          );

          if (settings.length === 0) {
            console.error("Affiliate expiry setting not found in database");
            await connection.rollback();
            return res.status(500).json({
              success: false,
              message:
                "Konfigurasi sistem affiliate tidak ditemukan. Silakan hubungi administrator.",
            });
          }

          const expiryMonths = parseInt(settings[0].setting_value);
          if (isNaN(expiryMonths) || expiryMonths <= 0) {
            console.error(
              "Invalid expiry months value:",
              settings[0].setting_value
            );
            await connection.rollback();
            return res.status(500).json({
              success: false,
              message:
                "Konfigurasi expiry affiliate tidak valid. Silakan hubungi administrator.",
            });
          }

          // 🗓️ SET EXPIRY DATE BERDASARKAN SETTING
          const affiliateJoinedAt = new Date();
          const affiliateExpiryDate = new Date();
          affiliateExpiryDate.setMonth(
            affiliateExpiryDate.getMonth() + expiryMonths
          );

          console.log("🆕 New affiliate relationship settings:", {
            expiryMonths,
            joinedAt: affiliateJoinedAt,
            expiryDate: affiliateExpiryDate,
          });

          // ✅ SET AFFILIATE DATA BARU DENGAN EXPIRY DATE
          finalReferralCode = affiliateCode;
          affiliateId = affiliate.id;
          commissionRate = affiliate.commission_rate;
          isAffiliateRelationshipActive = true;

          await connection.execute(
            `UPDATE users SET affiliate_id = ?, affiliate_joined_at = ?, affiliate_expiry_date = ? WHERE id = ?`,
            [affiliateId, affiliateJoinedAt, affiliateExpiryDate, userId]
          );

          console.log(
            `🔒 User ${userId} connected to new affiliate: ${affiliateId} with expiry: ${affiliateExpiryDate.toLocaleDateString(
              "id-ID"
            )}`
          );
        } catch (settingsError) {
          console.error("Error getting affiliate settings:", settingsError);
          await connection.rollback();
          return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil konfigurasi sistem.",
          });
        }
      } else if (!affiliateId) {
        console.log("ℹ️ No affiliate used for this order");
      }

      // ✅ STEP 3: HITUNG KOMMISI JIKA ADA AFFILIATE YANG AKTIF
      if (
        affiliateId &&
        isAffiliateRelationshipActive &&
        commissionRate &&
        totalAmount
      ) {
        commissionAmount = (totalAmount * commissionRate) / 100;
        console.log(
          `💰 Commission calculated: ${commissionAmount} (${commissionRate}% of ${totalAmount} - SETELAH DISKON)`
        );
      } else if (affiliateId && !isAffiliateRelationshipActive) {
        console.log(
          `⏰ Skip commission calculation - affiliate relationship expired`
        );
        commissionAmount = 0;
      }

      console.log("🔍 Final Affiliate Status:", {
        affiliate_id: affiliateId,
        is_active: isAffiliateRelationshipActive,
        commission_amount: commissionAmount,
        message: expiryCheckMessage,
      });

      // ✅ VALIDASI: Pastikan file benar-benar ada di server
      console.log("\n🔍 STEP 4: VALIDATING FILES ON SERVER...");
      for (const file of files) {
        if (file.fileUrl) {
          const filePath = path.join(__dirname, "..", file.fileUrl);
          const fileExists = fs.existsSync(filePath);
          console.log(
            `   📁 File: ${file.fileName}, Exists: ${fileExists}, Path: ${filePath}`
          );

          if (!fileExists) {
            console.error(`❌ File not found: ${filePath}`);
            throw new Error(
              `File ${file.fileName} tidak ditemukan di server. Silakan upload ulang.`
            );
          }
        } else {
          console.log(`   ⚠️ File ${file.fileName} has no fileUrl`);
        }
      }

      // ✅ VALIDASI DATA SETIAP FILE
      console.log("\n🔍 STEP 5: VALIDATING FILE DATA...");
      for (const file of files) {
        console.log(`\n   📋 Validating file: ${file.fileName}`);

        const requiredFields = [
          "materialId",
          "materialName",
          "quantity",
          "unitPrice",
          "materialCost",
          "shippingCost",
          "taxAmount",
          "packingCost",
          "localShippingCost",
          "subtotal",
          "overheadAmount",
          "profitAmount",
          "finalPrice",
          "totalPrice",
        ];

        const missing = requiredFields.filter(
          (key) =>
            file[key] === undefined || file[key] === null || file[key] === ""
        );

        if (missing.length > 0) {
          console.log(`   ❌ Missing fields: ${missing.join(", ")}`);
          console.log(`   📊 File data:`, file);
          throw new Error(
            `File ${
              file.fileName || "unknown"
            } memiliki data tidak lengkap (${missing.join(", ")})`
          );
        } else {
          console.log(`   ✅ All required fields present`);
        }
      }

      // ✅ STEP 6: VALIDATE MATERIALS EXIST IN DATABASE
      console.log("\n🔍 STEP 6: VALIDATING MATERIALS IN DATABASE...");

      const materialIds = files
        .map((f) => {
          const materialId = parseInt(f.materialId);
          if (isNaN(materialId)) {
            console.log(
              `   ❌ INVALID MATERIAL ID: ${f.materialId} for file ${f.fileName}`
            );
            throw new Error(
              `ID Material "${f.materialId}" tidak valid untuk file "${f.fileName}"`
            );
          }
          return materialId;
        })
        .filter((id) => id > 0);

      console.log(`   Material IDs to validate: ${materialIds.join(", ")}`);

      if (materialIds.length > 0) {
        const placeholders = materialIds.map(() => "?").join(",");
        const [materialsInDB] = await connection.execute(
          `SELECT id, name, status, stock FROM materials WHERE id IN (${placeholders})`,
          materialIds
        );

        console.log(`   📋 Materials found in DB:`, materialsInDB);

        for (const file of files) {
          const fileMaterialId = parseInt(file.materialId);
          const materialInDB = materialsInDB.find(
            (m) => m.id === fileMaterialId
          );

          if (!materialInDB) {
            console.log(`   ❌ Material not found for file ${file.fileName}:`, {
              requestedId: fileMaterialId,
              availableIds: materialsInDB.map((m) => m.id),
              allMaterialsInDB: materialsInDB,
            });
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Material dengan ID "${fileMaterialId}" untuk file "${file.fileName}" tidak ditemukan di database. Silakan refresh halaman dan coba lagi.`,
            });
          }

          if (materialInDB.status !== "active") {
            console.log(
              `   ❌ Material inactive for file ${file.fileName}:`,
              materialInDB
            );
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Material "${materialInDB.name}" tidak aktif.`,
            });
          }

          console.log(
            `   ✅ Material validated for ${file.fileName}: ${materialInDB.name} (ID: ${materialInDB.id})`
          );
        }
      } else {
        console.log("   ⚠️ No material IDs to validate");
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Tidak ada material ID yang valid dalam data file.",
        });
      }

      console.log(`   ✅ All materials validated successfully`);

      // ✅ STEP 7: DEBUG DETAILED - CEK SEMUA MATERIAL YANG TERSEDIA
      console.log("\n🔍 STEP 7: CHECKING ALL AVAILABLE MATERIALS...");
      const [allMaterials] = await connection.execute(
        `SELECT id, name, status FROM materials ORDER BY id`
      );
      console.log(`   📋 All materials in database:`, allMaterials);

      // Generate order number
      const orderNumber = `3DP-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;
      console.log(`\n📦 STEP 8: CREATING ORDER ${orderNumber}...`);

      // ✅ STEP 8: INSERT ORDER - GUNAKAN total_amount SETELAH DISKON
      let orderStatus;
      let paymentStatus;

      // SESUAI FLOW BARU: Semua order masuk dengan status "under_review"
      if (userType === "company") {
        orderStatus = "under_review";
        paymentStatus = "pending";
        console.log(
          "   👔 COMPANY ORDER - Menunggu review admin terlebih dahulu"
        );
      } else {
        orderStatus = "under_review";
        paymentStatus = "pending";
        console.log(
          "   👤 INDIVIDUAL ORDER - Menunggu review admin terlebih dahulu"
        );
      }

      console.log(
        `   📊 Status: Order=${orderStatus}, Payment=${paymentStatus}`
      );

      // ✅ PERBAIKAN: Gunakan total_amount yang sudah include diskon
      const orderInsertParams = [
        orderNumber,
        userId,
        totalAmount, // ✅ INI SUDAH TOTAL SETELAH DISKON
        paymentStatus,
        orderStatus,
        finalReferralCode,
        affiliateId,
        commissionAmount,
        isAffiliateRelationshipActive ? "pending" : "pending",
        customerNotes || null,
        userType,
      ];

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (
        order_number, user_id, total_amount, 
        payment_status, order_status, referral_code, affiliate_id, 
        commission_amount, commission_status, customer_notes, user_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderInsertParams
      );

      const orderId = orderResult.insertId;
      console.log(`   ✅ Order created with ID: ${orderId}`);

      // ✅ STEP 9: INSERT ORDER ITEMS DENGAN FINAL_PRICE SETELAH DISKON
      console.log(`\n📦 STEP 9: INSERTING ${files.length} ORDER ITEMS...`);
      for (const file of files) {
        console.log(
          `   ➕ Inserting item: ${file.fileName} (Material: ${file.materialName})`
        );

        const materialId = parseInt(file.materialId);

        const params = [
          orderId,
          file.fileName || "unknown",
          file.originalFileName || "unknown",
          file.fileSize || 0,
          file.fileUrl || "",
          materialId,
          file.materialName,
          file.quantity,
          file.volume || 0,
          file.weight || 0,
          file.dimensions || "0 x 0 x 0 mm",
          file.unitPrice, // ✅ FINAL PRICE PER UNIT SETELAH DISKON
          file.materialCost,
          file.shippingCost,
          file.taxAmount,
          file.packingCost,
          file.localShippingCost,
          file.subtotal,
          file.overheadAmount,
          file.profitAmount,
          file.finalPrice, // ✅ FINAL PRICE SETELAH DISKON
          file.totalPrice, // ✅ TOTAL PRICE SETELAH DISKON (final_price * quantity)
        ];

        await connection.execute(
          `INSERT INTO order_items (
          order_id, file_name, original_file_name, file_size, file_url,
          material_id, material_name, quantity, volume, weight, dimensions,
          unit_price, material_cost, shipping_cost, tax_amount, packing_cost,
          local_shipping_cost, subtotal, overhead_amount, profit_amount,
          final_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params
        );

        console.log(
          `   ✅ Item inserted successfully - Final Price: ${file.finalPrice}, Total: ${file.totalPrice}`
        );
      }

      // ✅ STEP 10: INSERT STATUS HISTORY
      console.log(`\n📝 STEP 10: INSERTING STATUS HISTORY...`);
      await connection.execute(
        `INSERT INTO order_status_history 
      (order_id, old_status, new_status, changed_by, notes, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())`,
        [orderId, null, orderStatus, userId, "Order created - Under Review"]
      );

      // ✅ STEP 11: UPDATE AFFILIATE STATISTICS & RECORD REFERRAL - TANPA +1 ACTIVE_REFERRALS
      if (
        affiliateId &&
        commissionAmount > 0 &&
        isAffiliateRelationshipActive
      ) {
        console.log(
          `\n💰 STEP 11: UPDATING AFFILIATE STATISTICS & RECORDING REFERRAL...`
        );

        try {
          // ✅ 1. UPDATE AFFILIATE STATISTICS - TANPA ACTIVE_REFERRALS
          await connection.execute(
            `UPDATE affiliates SET 
            total_referrals = total_referrals + 1,
            pending_earnings = pending_earnings + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
            [commissionAmount, affiliateId]
          );
          console.log(
            `   ✅ Affiliate ${affiliateId} updated - total_referrals +1, pending_earnings +${commissionAmount}`
          );

          // ✅ 2. RECORD KE TABEL REFERRALS DENGAN STATUS 'active'
          const [userInfo] = await connection.execute(
            `SELECT name, email FROM users WHERE id = ?`,
            [userId]
          );

          const referredUser = userInfo[0];

          await connection.execute(
            `INSERT INTO referrals (
            affiliate_id, referred_user_id, referred_name, referred_email,
            referral_code, status, commission_earned, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              affiliateId,
              userId,
              referredUser?.name || "Unknown",
              referredUser?.email || "unknown@email.com",
              finalReferralCode,
              "active",
              commissionAmount,
            ]
          );

          console.log(
            `   ✅ Referral recorded for affiliate ${affiliateId} with status 'active'`
          );
        } catch (affiliateError) {
          console.error(`   ❌ Error processing affiliate:`, affiliateError);
          console.log(`   ⚠️ Continuing without affiliate processing...`);
        }
      } else if (affiliateId && !isAffiliateRelationshipActive) {
        console.log(`⏰ Skip affiliate processing - relationship expired`);
      }

      // ✅ STEP 12: BUAT NOTIFIKASI
      console.log(`\n🔔 STEP 12: CREATING NOTIFICATIONS...`);

      const orderDataForNotification = {
        id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount, // ✅ SETELAH DISKON
        user_id: userId,
        affiliate_id: affiliateId,
        is_affiliate_active: isAffiliateRelationshipActive,
        expiry_message: expiryCheckMessage,
        order_status: orderStatus,
      };

      console.log("📋 Data for notification:", orderDataForNotification);

      try {
        await notificationService.notifyNewOrder(
          orderDataForNotification,
          userType
        );
        console.log(
          `   ✅ Notifications created successfully for order #${orderNumber}`
        );
      } catch (notifError) {
        console.error(`   ⚠️ Notification error (non-critical):`, notifError);
        // Jangan rollback hanya karena notifikasi gagal
      }

      await connection.commit();
      console.log("✅ TRANSACTION COMMITTED SUCCESSFULLY");

      // ✅ RESPONSE - GUNAKAN total_amount SETELAH DISKON
      const responseData = {
        orderId,
        orderNumber,
        totalAmount, // ✅ SETELAH DISKON
        orderStatus: orderStatus,
        paymentStatus: paymentStatus,
        userType: userType,
        affiliate: affiliateId
          ? {
              affiliateId,
              referralCode: finalReferralCode,
              commissionRate,
              commissionAmount,
              isActive: isAffiliateRelationshipActive,
              expiryMessage: expiryCheckMessage,
            }
          : null,
      };

      // ✅ PESAN SESUAI FLOW BARU
      let message = "Order berhasil dibuat - Sedang dalam proses review admin";

      // Tambahkan info affiliate status ke message
      if (affiliateId && !isAffiliateRelationshipActive) {
        message += ` [Relationship affiliate expired - tidak ada commission]`;
      }

      console.log("🎉 ORDER CREATION SUCCESSFUL:", responseData);
      console.log("🔚 ========== END CREATE ORDER ==========\n");

      res.json({
        success: true,
        message: message,
        data: responseData,
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ ========== ORDER CREATION ERROR ==========");
      console.error("💥 Error details:", error);
      console.error("📋 Error message:", error.message);
      console.error("🔚 ========== END ERROR ==========\n");

      if (
        error.message.includes("affiliate") ||
        error.message.includes("kode") ||
        error.message.includes("Material") ||
        error.message.includes("material") ||
        error.message.includes("expiry") ||
        error.message.includes("konfigurasi")
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Gagal membuat order: " + error.message,
        });
      }
    } finally {
      connection.release();
      console.log("🔗 Database connection released");
    }
  },

  async getUserOrders(req, res) {
    let connection;
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        sortBy = "recent",
      } = req.query;

      let userId = req.user?.id;

      if (!userId) {
        console.log("⚠️ req.user.id undefined, mencoba decode token...");
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      // Convert page and limit to numbers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      console.log("🔍 Fetching orders with pagination for user:", {
        userId,
        page: pageNum,
        limit: limitNum,
        search,
        status,
        sortBy,
      });

      connection = await db.getConnection();

      // Base query dengan filter user_id
      let query = `
        SELECT 
          o.*, 
          u.name as customer_name,
          u.email as customer_email,
          u.user_type,
          COUNT(oi.id) AS item_count,
          GROUP_CONCAT(DISTINCT oi.material_name) AS materials
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
      `;

      const queryParams = [userId];

      // Add search filter
      if (search && search.trim() !== "") {
        query += ` AND (o.order_number LIKE ? OR u.name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm);
      }

      // Add status filter
      if (status && status !== "all" && status.trim() !== "") {
        query += ` AND o.order_status = ?`;
        queryParams.push(status.trim());
      }

      // Group by order
      query += ` GROUP BY o.id`;

      // Sorting
      switch (sortBy) {
        case "oldest":
          query += ` ORDER BY o.created_at ASC`;
          break;
        case "total_high":
          query += ` ORDER BY o.total_amount DESC`;
          break;
        case "total_low":
          query += ` ORDER BY o.total_amount ASC`;
          break;
        case "recent":
        default:
          query += ` ORDER BY o.created_at DESC`;
          break;
      }

      // Add pagination
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;

      console.log("🔍 Final query:", query);
      console.log("📋 Query params:", queryParams);

      // Execute main query
      const [orders] = await connection.execute(query, queryParams);
      console.log(`✅ Found ${orders.length} orders for user ${userId}`);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        WHERE o.user_id = ?
      `;

      const countParams = [userId];

      if (search && search.trim() !== "") {
        countQuery += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        countParams.push(searchTerm, searchTerm);
      }

      if (status && status !== "all" && status.trim() !== "") {
        countQuery += ` AND o.order_status = ?`;
        countParams.push(status.trim());
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      console.log(`📊 Total orders: ${total}`);

      // Format response dengan pagination
      const formattedOrders = orders.map((order) => ({
        ...order,
        status_info: getOrderStatusInfo(order.order_status),
        // ✅ PERUBAHAN: Hanya bisa bayar jika status waiting_payment
        can_proceed_to_payment: order.order_status === "waiting_payment",
        // ✅ PERUBAHAN: Untuk full payment, sisa bayar = total_amount (karena belum ada pembayaran sama sekali)
        remaining_amount:
          order.order_status === "waiting_payment" ? order.total_amount : 0,
        paid_amount:
          order.order_status === "waiting_payment" ? 0 : order.total_amount,
      }));

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalItems: total,
            itemsPerPage: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error getting user orders:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data order: " + error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  async getOrderDetail(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        console.log("⚠️ req.user.id undefined, mencoba decode token...");
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🔍 Getting order detail for:", { orderId, userId });

      const [orders] = await db.execute(
        `SELECT o.*, u.name as customer_name, u.email as customer_email
         FROM orders o 
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = ? AND o.user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      const [items] = await db.execute(
        `SELECT oi.*, m.name as material_display_name, m.image_url as material_image
         FROM order_items oi
         LEFT JOIN materials m ON oi.material_id = m.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      const [payments] = await db.execute(
        `SELECT * FROM payment_transactions 
         WHERE order_id = ? 
         ORDER BY created_at DESC`,
        [orderId]
      );

      const [statusHistory] = await db.execute(
        `SELECT osh.*, u.name as changed_by_name
         FROM order_status_history osh 
         LEFT JOIN users u ON osh.changed_by = u.id 
         WHERE osh.order_id = ? 
         ORDER BY osh.created_at DESC`,
        [orderId]
      );

      console.log(
        `✅ Order detail: ${order.order_number}, items: ${items.length}, payments: ${payments.length}`
      );

      // Format response dengan informasi status
      const formattedOrder = {
        ...order,
        status_info: getOrderStatusInfo(order.order_status),
        can_proceed_to_payment:
          order.order_status === "waiting_payment" &&
          order.payment_status === "pending",
      };

      res.json({
        success: true,
        data: {
          order: formattedOrder,
          items,
          payments,
          statusHistory,
        },
      });
    } catch (error) {
      console.error("❌ Error getting order detail:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil detail order: " + error.message,
      });
    }
  },

  async deleteUserOrder(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId =
              decoded?.id ||
              decoded?.userId ||
              decoded?.user_id ||
              decoded?.user?.id;
          } catch (err) {
            console.error("❌ Token decode error:", err);
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID tidak valid.",
        });
      }

      console.log("🗑️ User attempting to delete order:", { orderId, userId });

      // ✅ CEK: Order harus milik user dan status completed atau cancelled
      const [orders] = await connection.execute(
        `SELECT id, order_number, order_status, user_id 
       FROM orders 
       WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan.",
        });
      }

      const order = orders[0];

      // ✅ VALIDASI: Hanya boleh hapus jika status completed atau cancelled
      if (
        order.order_status !== "completed" &&
        order.order_status !== "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: `Order hanya dapat dihapus jika statusnya Completed atau Cancelled. Status saat ini: ${order.order_status}.`,
        });
      }

      console.log(
        `✅ Order eligible for deletion: ${order.order_number}, Status: ${order.order_status}`
      );

      // ✅ STEP 1: HAPUS DATA DI TABEL ORDER_ITEMS TERLEBIH DAHULU (foreign key constraint)
      console.log("🗑️ Deleting order items...");
      await connection.execute(`DELETE FROM order_items WHERE order_id = ?`, [
        orderId,
      ]);

      // ✅ STEP 2: HAPUS DATA DI TABEL ORDER_STATUS_HISTORY
      console.log("🗑️ Deleting order status history...");
      await connection.execute(
        `DELETE FROM order_status_history WHERE order_id = ?`,
        [orderId]
      );

      // ✅ STEP 3: HAPUS DATA PAYMENT TRANSACTIONS JIKA ADA
      console.log("🗑️ Deleting payment transactions...");
      await connection.execute(
        `DELETE FROM payment_transactions WHERE order_id = ?`,
        [orderId]
      );

      // ✅ STEP 4: HAPUS ORDER DARI TABEL ORDERS
      console.log("🗑️ Deleting main order record...");
      await connection.execute(`DELETE FROM orders WHERE id = ?`, [orderId]);

      await connection.commit();

      console.log(
        `✅ Order ${order.order_number} successfully deleted by user ${userId}`
      );

      res.json({
        success: true,
        message: `Order ${order.order_number} berhasil dihapus.`,
        data: {
          orderId: orderId,
          orderNumber: order.order_number,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error deleting order:", error);

      // Handle foreign key constraint errors
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          success: false,
          message:
            "Tidak dapat menghapus order karena masih terkait dengan data lain. Silakan hubungi administrator.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Gagal menghapus order: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  // ✅ FUNGSI BARU: Untuk admin mengubah status order
  async updateOrderStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { orderId } = req.params;
      const { newStatus, adminNotes } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Admin ID tidak valid.",
        });
      }

      console.log(`🔄 Updating order ${orderId} status to: ${newStatus}`);

      // Validasi status yang diizinkan
      const allowedStatuses = [
        "under_review",
        "waiting_payment",
        "payment_received",
        "printing",
        "final_touchup",
        "ready_to_ship",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status order tidak valid.",
        });
      }

      // Dapatkan status lama
      const [currentOrder] = await connection.execute(
        `SELECT order_status FROM orders WHERE id = ?`,
        [orderId]
      );

      if (currentOrder.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan.",
        });
      }

      const oldStatus = currentOrder[0].order_status;

      // Update status order
      await connection.execute(
        `UPDATE orders 
         SET order_status = ?, status_updated_at = NOW(), admin_notes = ?
         WHERE id = ?`,
        [newStatus, adminNotes || null, orderId]
      );

      // Insert ke status history
      await connection.execute(
        `INSERT INTO order_status_history 
         (order_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          oldStatus,
          newStatus,
          adminId,
          adminNotes || `Status diubah oleh admin`,
        ]
      );

      // Jika status berubah ke waiting_payment, update payment_status juga
      if (newStatus === "waiting_payment") {
        await connection.execute(
          `UPDATE orders SET payment_status = 'pending' WHERE id = ?`,
          [orderId]
        );
      }

      await connection.commit();

      console.log(
        `✅ Order ${orderId} status updated from ${oldStatus} to ${newStatus}`
      );

      res.json({
        success: true,
        message: `Status order berhasil diubah menjadi ${newStatus}`,
        data: {
          orderId,
          oldStatus,
          newStatus,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error updating order status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengubah status order: " + error.message,
      });
    } finally {
      connection.release();
    }
  },
};

// ✅ Helper function untuk informasi status order
function getOrderStatusInfo(status) {
  const statusInfo = {
    under_review: {
      label: "Under Review",
      description: "Order sedang dalam proses review oleh admin",
      color: "yellow",
      canProceed: false,
    },
    waiting_payment: {
      label: "Waiting Payment",
      description: "Order telah disetujui, menunggu pembayaran",
      color: "blue",
      canProceed: true,
    },
    payment_review: {
      label: "Payment Review",
      description: "Pembayaran sedang ditinjau oleh admin",
      color: "orange",
      canProceed: false,
    },
    processing: {
      label: "Processing",
      description: "Order sedang diproses",
      color: "purple",
      canProceed: false,
    },
    printing: {
      label: "Printing",
      description: "Order sedang dalam proses printing",
      color: "indigo",
      canProceed: false,
    },
    quality_check: {
      label: "Quality Check",
      description: "Order sedang dalam quality check",
      color: "teal",
      canProceed: false,
    },
    shipping: {
      label: "Shipping",
      description: "Order sedang dikirim",
      color: "blue",
      canProceed: false,
    },
    completed: {
      label: "Completed",
      description: "Order telah selesai",
      color: "green",
      canProceed: false,
    },
    cancelled: {
      label: "Cancelled",
      description: "Order telah dibatalkan",
      color: "red",
      canProceed: false,
    },
  };

  return (
    statusInfo[status] || {
      label: status,
      description: "Status tidak diketahui",
      color: "gray",
      canProceed: false,
    }
  );
}
module.exports = orderController;
