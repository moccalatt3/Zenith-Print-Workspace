const PricingConfig = require("../models/PricingConfig");
const PricingRule = require("../models/PricingRule");
const PricingCalculation = require("../models/PricingCalculation");

class PricingController {
  // Get pricing configuration
  async getConfig(req, res) {
    try {
      const config = await PricingConfig.getCurrentConfig();

      // Return default values if no config exists
      const defaultConfig = {
        shippingRatePerKg: 500000,
        taxRate: 20,
        packingCost: 10000,
        localShippingRatePerKg: 30000,
        overheadPercentage: 25,
        profitPercentage: 150,
        finalPriceDiscount: 0, // ✅ DIUBAH: Default 0, bukan 15
        volumeToCM3: 1000,
        gramToKg: 1000,
      };

      // Jika ada config dari database, mapping field names
      let responseConfig = defaultConfig;
      if (config) {
        responseConfig = {
          shippingRatePerKg:
            config.shipping_rate_per_kg || defaultConfig.shippingRatePerKg,
          taxRate: config.tax_rate || defaultConfig.taxRate,
          packingCost: config.packing_cost || defaultConfig.packingCost,
          localShippingRatePerKg:
            config.local_shipping_rate_per_kg ||
            defaultConfig.localShippingRatePerKg,
          overheadPercentage:
            config.overhead_percentage || defaultConfig.overheadPercentage,
          profitPercentage:
            config.profit_percentage || defaultConfig.profitPercentage,
          finalPriceDiscount:
            config.final_price_discount || defaultConfig.finalPriceDiscount, // ✅ DIUBAH: Tidak ada fallback ke 15
          volumeToCM3: config.volume_to_cm3 || defaultConfig.volumeToCM3,
          gramToKg: config.gram_to_kg || defaultConfig.gramToKg,
        };
      }

      res.json({
        success: true,
        data: responseConfig,
      });
    } catch (error) {
      console.error("Get config error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil konfigurasi harga",
      });
    }
  }

  // Update pricing configuration
  async updateConfig(req, res) {
    try {
      const configData = req.body;

      // Validate required fields
      const requiredFields = [
        "shippingRatePerKg",
        "taxRate",
        "packingCost",
        "localShippingRatePerKg",
        "overheadPercentage",
        "profitPercentage",
        "finalPriceDiscount",
      ];

      for (const field of requiredFields) {
        if (configData[field] === undefined || configData[field] === null) {
          return res.status(400).json({
            success: false,
            message: `Field ${field} harus diisi`,
          });
        }
      }

      const result = await PricingConfig.updateConfig(configData);

      res.json({
        success: true,
        message: "Konfigurasi harga berhasil diperbarui",
        data: result,
      });
    } catch (error) {
      console.error("Update config error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui konfigurasi harga",
      });
    }
  }

  // Get all pricing rules with pagination - UPDATE INI
  async getPricingRules(req, res) {
    try {
      const { page = 1, limit = 10, search = "", status = "" } = req.query;

      const filters = {
        search,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      console.log("📋 Fetching pricing rules with filters:", filters);

      const result = await PricingRule.getAllWithPagination(filters);

      console.log(
        `📋 Found ${result.rules.length} pricing rules out of ${result.total}`
      );

      // Tambahkan full URL untuk image_url
      const rulesWithFullUrl = result.rules.map((rule) => ({
        ...rule,
        image_url: rule.image_url
          ? `${req.protocol}://${req.get("host")}${rule.image_url}`
          : null,
      }));

      res.json({
        success: true,
        data: rulesWithFullUrl,
        total: result.total,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: result.limit,
          hasNext: result.currentPage < result.totalPages,
          hasPrev: result.currentPage > 1,
        },
      });
    } catch (error) {
      console.error("❌ Get pricing rules error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data diskon",
        error: error.message,
      });
    }
  }

  async createPricingRule(req, res) {
    try {
      const ruleData = req.body;
      let imageUrl = null;

      console.log("➕ Creating pricing rule with data:", ruleData);
      console.log("📁 Request file:", req.file); // Debug file

      // Validate required fields
      if (!ruleData.name || ruleData.value === undefined) {
        return res.status(400).json({
          success: false,
          message: "Nama dan nilai diskon harus diisi",
        });
      }

      // Handle file upload jika ada - PERBAIKI BAGIAN INI
      if (req.file) {
        console.log("✅ File uploaded successfully:", {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
        });

        // File sudah otomatis disimpan oleh multer, cukup ambil URL-nya
        imageUrl = `/uploads/diskon/${req.file.filename}`;

        console.log("📁 Image URL:", imageUrl);
      } else {
        console.log("ℹ️ No file uploaded, using default image");
      }

      // Format data untuk model
      const formattedData = {
        name: ruleData.name,
        type: ruleData.type || "percentage",
        value: parseFloat(ruleData.value),
        description: ruleData.description || "",
        imageUrl: imageUrl, // Gunakan imageUrl yang sudah di-set
        isActive: Boolean(ruleData.isActive),
        minOrderAmount: ruleData.minOrderAmount
          ? parseFloat(ruleData.minOrderAmount)
          : 0,
        maxDiscountAmount: ruleData.maxDiscountAmount
          ? parseFloat(ruleData.maxDiscountAmount)
          : null,
        startDate: ruleData.startDate || null,
        endDate: ruleData.endDate || null,
        usageLimit: ruleData.usageLimit ? parseInt(ruleData.usageLimit) : null,
        applicableTo: ruleData.applicableTo || "all",
      };

      console.log("📦 Formatted data for creation:", formattedData);

      const ruleId = await PricingRule.create(formattedData);

      // Get the created rule to return
      const newRule = await PricingRule.getById(ruleId);

      res.json({
        success: true,
        message: "Diskon berhasil ditambahkan",
        data: newRule,
      });
    } catch (error) {
      console.error("❌ Create pricing rule error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menambahkan diskon",
        error: error.message,
      });
    }
  }

  // Update pricing rule - PERBAIKI TOTAL
  async updatePricingRule(req, res) {
    try {
      const { id } = req.params;
      const ruleData = req.body;
      let imageUrl = null;

      console.log(`✏️ Updating pricing rule ${id} with data:`, ruleData);
      console.log("📁 Request file:", req.file); // Debug file

      // Check if rule exists first
      const existingRule = await PricingRule.getById(id);
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: "Diskon tidak ditemukan",
        });
      }

      // Handle file upload jika ada - PERBAIKI BAGIAN INI
      if (req.file) {
        console.log("✅ File uploaded successfully:", {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
        });

        // File sudah otomatis disimpan oleh multer, cukup ambil URL-nya
        imageUrl = `/uploads/diskon/${req.file.filename}`;

        console.log("📁 New image URL:", imageUrl);
      } else {
        // Jika tidak ada file baru, gunakan image_url yang sudah ada
        imageUrl = existingRule.image_url;
        console.log("ℹ️ No new file, keeping existing image:", imageUrl);
      }

      // Format data untuk model
      const formattedData = {
        name: ruleData.name,
        type: ruleData.type || existingRule.type,
        value: parseFloat(ruleData.value),
        description: ruleData.description || existingRule.description,
        imageUrl: imageUrl, // Gunakan imageUrl yang sudah di-set
        isActive: Boolean(ruleData.is_active),
        minOrderAmount: ruleData.minOrderAmount
          ? parseFloat(ruleData.minOrderAmount)
          : existingRule.min_order_amount || 0,
        maxDiscountAmount: ruleData.maxDiscountAmount
          ? parseFloat(ruleData.maxDiscountAmount)
          : existingRule.max_discount_amount || null,
        startDate: ruleData.startDate || existingRule.start_date || null,
        endDate: ruleData.endDate || existingRule.end_date || null,
        usageLimit: ruleData.usageLimit
          ? parseInt(ruleData.usageLimit)
          : existingRule.usage_limit || null,
        applicableTo:
          ruleData.applicableTo || existingRule.applicable_to || "all",
      };

      console.log("📦 Formatted data for update:", formattedData);

      const updated = await PricingRule.update(id, formattedData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Gagal memperbarui diskon",
        });
      }

      // Get the updated rule
      const updatedRule = await PricingRule.getById(id);

      res.json({
        success: true,
        message: "Diskon berhasil diperbarui",
        data: updatedRule,
      });
    } catch (error) {
      console.error("❌ Update pricing rule error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui diskon",
        error: error.message,
      });
    }
  }

  // Delete pricing rule
  async deletePricingRule(req, res) {
    try {
      const { id } = req.params;

      console.log(`🗑️ Deleting pricing rule ${id}`);

      // Check if rule exists first
      const existingRule = await PricingRule.getById(id);
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: "Diskon tidak ditemukan",
        });
      }

      const deleted = await PricingRule.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Gagal menghapus diskon",
        });
      }

      res.json({
        success: true,
        message: "Diskon berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ Delete pricing rule error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus diskon",
        error: error.message,
      });
    }
  }

  // Toggle pricing rule status - PERBAIKI INI
  async togglePricingRuleStatus(req, res) {
    try {
      const { id } = req.params;

      console.log(`🔄 Toggling status for pricing rule ${id}`);

      // Check if rule exists first
      const existingRule = await PricingRule.getById(id);
      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: "Diskon tidak ditemukan",
        });
      }

      const toggled = await PricingRule.toggleStatus(id);

      if (!toggled) {
        return res.status(404).json({
          success: false,
          message: "Gagal mengubah status diskon",
        });
      }

      // Get the updated rule
      const updatedRule = await PricingRule.getById(id);

      res.json({
        success: true,
        message: "Status diskon berhasil diubah",
        data: updatedRule,
      });
    } catch (error) {
      console.error("❌ Toggle pricing rule status error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengubah status diskon",
        error: error.message,
      });
    }
  }

  async calculatePricing(req, res) {
    try {
      console.log("📥 Received calculation request:", req.body);

      const {
        material = "resin",
        quantity = 1,
        volume = 0,
        grams = 0,
        config: customConfig,
        discountCode = "",
        referralCode = null,
      } = req.body;

      // ✅ DEBUG: Log discount dan referral details
      console.log("🎫 DISCOUNT & REFERRAL ANALYSIS:", {
        discountCode: discountCode,
        referralCode: referralCode,
        hasDiscountCode: !!discountCode,
        hasReferralCode: !!referralCode,
        shouldActivateAllDiscounts:
          !!referralCode && referralCode.trim() !== "",
      });

      // 1. AMBIL DATA MATERIAL DARI DATABASE DENGAN VALIDASI
      let materialFromDB;
      try {
        const Material = require("../models/Material");
        const allMaterials = await Material.getAll();

        // Cari material by ID atau name (case insensitive)
        materialFromDB = allMaterials.find(
          (m) =>
            m.id.toString() === material.toString() ||
            m.name.toLowerCase() === material.toLowerCase()
        );

        console.log("📦 Material from DB:", materialFromDB);

        // VALIDASI: Pastikan material ditemukan
        if (!materialFromDB) {
          const availableMaterials = allMaterials
            .map((m) => `${m.name} (ID: ${m.id})`)
            .join(", ");
          return res.status(404).json({
            success: false,
            message: `Material '${material}' tidak ditemukan. Material yang tersedia: ${availableMaterials}`,
          });
        }

        // VALIDASI: Pastikan data lengkap
        if (!materialFromDB.density || materialFromDB.density <= 0) {
          return res.status(400).json({
            success: false,
            message: `Data density untuk material '${materialFromDB.name}' tidak valid: ${materialFromDB.density}`,
          });
        }

        if (
          !materialFromDB.price_per_gram ||
          materialFromDB.price_per_gram <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: `Data price_per_gram untuk material '${materialFromDB.name}' tidak valid: ${materialFromDB.price_per_gram}`,
          });
        }
      } catch (dbError) {
        console.log("❌ Database error:", dbError.message);
        return res.status(500).json({
          success: false,
          message: "Gagal mengambil data materials dari database",
        });
      }

      // 2. GUNAKAN DATA DARI DATABASE SAJA
      const materialInfo = {
        name: materialFromDB.name,
        density: parseFloat(materialFromDB.density),
        pricePerGram: parseFloat(materialFromDB.price_per_gram),
      };

      console.log("🎯 Using material from DB:", materialInfo);

      // 3. ✅ PERHITUNGAN BERAT BERDASARKAN VOLUME × DENSITY
      let calculatedWeight = 0;

      // ✅ VALIDASI: Volume harus ada
      if (!volume || parseFloat(volume) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Volume harus diisi dan lebih dari 0",
        });
      }

      // ✅ PERHITUNGAN BERAT YANG BENAR
      const volumeNum = parseFloat(volume);
      const volumeCM3 = volumeNum / 1000;
      const densityNum = parseFloat(materialInfo.density);
      calculatedWeight = volumeCM3 * densityNum;

      console.log("✅ CORRECTED Weight Calculation:", {
        volumeMM3: volumeNum,
        volumeCM3: volumeCM3,
        density: densityNum,
        calculatedWeight: calculatedWeight,
        materialName: materialInfo.name,
      });

      // ✅ WARNING: Jika grams dikirim, abaikan
      if (grams && parseFloat(grams) > 0) {
        console.log(
          "⚠️ WARNING: grams parameter ignored, using volume×density calculation instead"
        );
      }

      calculatedWeight = parseFloat(calculatedWeight.toFixed(4));
      console.log(`🎯 Final weight for calculation: ${calculatedWeight}g`);

      // 4. AMBIL KONFIGURASI - ✅ PERBAIKAN: HILANGKAN HARCODE FALLBACK
      let config;
      if (customConfig) {
        config = {
          // ✅ PERBAIKAN: Gunakan 0 sebagai default, bukan nilai hardcode
          shippingRatePerKg:
            customConfig.shippingRatePerKg !== null &&
            customConfig.shippingRatePerKg !== undefined
              ? parseFloat(customConfig.shippingRatePerKg)
              : 500000,
          taxRate:
            customConfig.taxRate !== null && customConfig.taxRate !== undefined
              ? parseFloat(customConfig.taxRate)
              : 20,
          packingCost:
            customConfig.packingCost !== null &&
            customConfig.packingCost !== undefined
              ? parseFloat(customConfig.packingCost)
              : 10000,
          localShippingRatePerKg:
            customConfig.localShippingRatePerKg !== null &&
            customConfig.localShippingRatePerKg !== undefined
              ? parseFloat(customConfig.localShippingRatePerKg)
              : 30000,
          overheadPercentage:
            customConfig.overheadPercentage !== null &&
            customConfig.overheadPercentage !== undefined
              ? parseFloat(customConfig.overheadPercentage)
              : 25,
          profitPercentage:
            customConfig.profitPercentage !== null &&
            customConfig.profitPercentage !== undefined
              ? parseFloat(customConfig.profitPercentage)
              : 150,
          // ✅ PERBAIKAN KRITIS: Final price discount default ke 0, bukan 15
          finalPriceDiscount:
            customConfig.finalPriceDiscount !== null &&
            customConfig.finalPriceDiscount !== undefined
              ? parseFloat(customConfig.finalPriceDiscount)
              : 0,
        };
        console.log("⚙️ Using custom config from frontend:", config);
      } else {
        config = await PricingConfig.getCurrentConfig();
        if (!config) {
          // ✅ PERBAIKAN: Default config tanpa hardcode discount
          config = {
            shippingRatePerKg: 500000,
            taxRate: 20,
            packingCost: 10000,
            localShippingRatePerKg: 30000,
            overheadPercentage: 25,
            profitPercentage: 150,
            finalPriceDiscount: 0, // ✅ Default 0, bukan 15
          };
          console.log("⚙️ Using default config (no DB config)");
        } else {
          // ✅ PERBAIKAN KRITIS: Hilangkan fallback || 15 untuk final_price_discount
          config = {
            shippingRatePerKg:
              config.shipping_rate_per_kg !== null &&
              config.shipping_rate_per_kg !== undefined
                ? parseFloat(config.shipping_rate_per_kg)
                : 500000,
            taxRate:
              config.tax_rate !== null && config.tax_rate !== undefined
                ? parseFloat(config.tax_rate)
                : 20,
            packingCost:
              config.packing_cost !== null && config.packing_cost !== undefined
                ? parseFloat(config.packing_cost)
                : 10000,
            localShippingRatePerKg:
              config.local_shipping_rate_per_kg !== null &&
              config.local_shipping_rate_per_kg !== undefined
                ? parseFloat(config.local_shipping_rate_per_kg)
                : 30000,
            overheadPercentage:
              config.overhead_percentage !== null &&
              config.overhead_percentage !== undefined
                ? parseFloat(config.overhead_percentage)
                : 25,
            profitPercentage:
              config.profit_percentage !== null &&
              config.profit_percentage !== undefined
                ? parseFloat(config.profit_percentage)
                : 150,
            // ✅ PERBAIKAN PENTING: Final price discount default ke 0 jika null/undefined
            finalPriceDiscount:
              config.final_price_discount !== null &&
              config.final_price_discount !== undefined
                ? parseFloat(config.final_price_discount)
                : 0,
          };
          console.log("⚙️ Using config from database:", config);
        }
      }

      // 5. LAKUKAN KALKULASI HARGA DASAR
      console.log("🧮 EXACT CLIENT CALCULATIONS (MARKUP BERTINGKAT):");

      // MATERIAL COST
      const materialCostNum = calculatedWeight * materialInfo.pricePerGram;
      console.log(
        `💰 Material Cost: ${calculatedWeight}g × Rp ${materialInfo.pricePerGram}/g = Rp ${materialCostNum}`
      );

      // SHIPPING
      const shippingNum = (calculatedWeight / 1000) * config.shippingRatePerKg;
      console.log(
        `🚚 Shipping: ${calculatedWeight}g / 1000 × Rp ${config.shippingRatePerKg}/kg = Rp ${shippingNum}`
      );

      // TAX
      const taxNum = materialCostNum * (config.taxRate / 100);
      console.log(
        `🧾 Tax: Rp ${materialCostNum} × ${config.taxRate}% = Rp ${taxNum}`
      );

      // PACKING
      const packingNum = config.packingCost;
      console.log(`📦 Packing: Rp ${packingNum}`);

      // ONGKIR LOCAL
      const ongkirLocalNum = config.localShippingRatePerKg;
      console.log(`🚛 Ongkir Local: Rp ${ongkirLocalNum} (FIXED)`);

      // SUBTOTAL
      const subTotalNum =
        materialCostNum + shippingNum + taxNum + packingNum + ongkirLocalNum;
      console.log(
        `🧮 SubTotal: ${materialCostNum} + ${shippingNum} + ${taxNum} + ${packingNum} + ${ongkirLocalNum} = ${subTotalNum}`
      );

      // MARKUP CALCULATION
      console.log("🔍 DETAILED MARKUP CALCULATION:");

      // OVERHEAD: dari subtotal
      const overheadAmount = subTotalNum * (config.overheadPercentage / 100);
      const afterOverhead = subTotalNum + overheadAmount;
      console.log(
        `🏢 Overhead Calculation: Rp ${subTotalNum} × ${config.overheadPercentage}% = Rp ${overheadAmount}`
      );

      // PROFIT: dari afterOverhead
      const profitAmount = afterOverhead * (config.profitPercentage / 100);
      const priceBeforeDiscount = afterOverhead + profitAmount;
      console.log(
        `📈 Profit Calculation: Rp ${afterOverhead} × ${config.profitPercentage}% = Rp ${profitAmount}`
      );

      console.log(`💰 Price Before Discount: Rp ${priceBeforeDiscount}`);

      // ✅✅✅ PERBAIKAN KRITIS: HAPUS STANDARD DISCOUNT UNTUK HINDARI DOUBLE DISCOUNT
      let finalPriceNum = priceBeforeDiscount; // ✅ LANGSUNG GUNAKAN priceBeforeDiscount
      let additionalDiscountAmount = 0;
      let appliedDiscounts = [];

      console.log("🎯 STARTING DISCOUNT CALCULATION - NO STANDARD DISCOUNT");

      // ✅ LOGIKA BARU: Jika ada referral code, aktifkan SEMUA diskon yang eligible
      if (referralCode && referralCode.trim() !== "") {
        console.log(
          `🎫 REFERRAL CODE DETECTED: "${referralCode}" - Activating ALL eligible discounts`
        );

        try {
          // Ambil SEMUA diskon aktif yang eligible (abaikan usage_limit)
          const allActiveDiscounts = await PricingRule.getAllActiveDiscounts(
            finalPriceNum
          );
          console.log(
            `🔍 Found ${allActiveDiscounts.length} active discounts to apply`
          );

          if (allActiveDiscounts.length > 0) {
            const discountResults = await this.applyMultipleDiscounts(
              allActiveDiscounts,
              finalPriceNum
            );
            appliedDiscounts = discountResults.appliedDiscounts;
            additionalDiscountAmount = discountResults.totalDiscountAmount;
            finalPriceNum = discountResults.finalPrice;

            console.log(
              `✅ SUCCESS: Applied ${appliedDiscounts.length} discounts via referral code`
            );
            console.log(
              `💰 Total additional discount: Rp ${additionalDiscountAmount}`
            );
            console.log(
              `🎯 New final price after all discounts: Rp ${finalPriceNum}`
            );
          } else {
            console.log(
              "ℹ️ No active discounts available to apply via referral code"
            );
          }
        } catch (referralError) {
          console.error(
            "❌ Error applying discounts via referral code:",
            referralError
          );
          appliedDiscounts.push({
            code: referralCode,
            error: "Terjadi kesalahan saat memproses diskon referral",
          });
        }
      }
      // ✅ LOGIKA LAMA: Jika hanya ada discount code (tanpa referral)
      else if (discountCode && discountCode.trim() !== "") {
        const cleanDiscountCode = discountCode.trim();
        console.log(
          `🎫 PROCESSING SINGLE DISCOUNT CODE: "${cleanDiscountCode}"`
        );

        try {
          console.log(
            `🔍 Looking up discount rule for: "${cleanDiscountCode}"`
          );
          const discountRule = await PricingRule.getActiveByCode(
            cleanDiscountCode
          );

          if (discountRule) {
            console.log("✅ Discount rule found, validating...", {
              ruleName: discountRule.name,
              ruleType: discountRule.type,
              ruleValue: discountRule.value,
              isActive: discountRule.is_active,
              minOrderAmount: discountRule.min_order_amount,
              currentFinalPrice: finalPriceNum,
            });

            // Validasi diskon (abaikan usage_limit)
            const validation = this.validateDiscountRule(
              discountRule,
              finalPriceNum,
              true
            );
            console.log("📋 Discount validation result:", validation);

            if (validation.isValid) {
              additionalDiscountAmount = this.calculateDiscountAmount(
                discountRule,
                finalPriceNum
              );

              console.log("💰 Discount amount calculation:", {
                finalPriceBeforeDiscount: finalPriceNum,
                discountAmount: additionalDiscountAmount,
                discountType: discountRule.type,
                discountValue: discountRule.value,
              });

              // Apply diskon tambahan
              finalPriceNum -= additionalDiscountAmount;

              appliedDiscounts.push({
                code: cleanDiscountCode,
                name: discountRule.name,
                type: discountRule.type,
                value: discountRule.value,
                amount: additionalDiscountAmount,
                description: discountRule.description,
              });

              console.log(
                `🎫 SUCCESS: Single discount applied! ${discountRule.name} - ${
                  discountRule.value
                }${
                  discountRule.type === "percentage" ? "%" : " IDR"
                } = Rp ${additionalDiscountAmount}`
              );
              console.log(
                `🎯 New final price after discount: Rp ${finalPriceNum}`
              );

              // ✅ INCREMENT USAGE COUNT jika berhasil
              try {
                await PricingRule.incrementUsage(discountRule.id);
                console.log(
                  `🔢 Incremented usage count for rule ID: ${discountRule.id}`
                );
              } catch (usageError) {
                console.warn(
                  "⚠️ Failed to increment usage count:",
                  usageError.message
                );
              }
            } else {
              console.log("❌ Discount validation failed:", validation.message);
              appliedDiscounts.push({
                code: cleanDiscountCode,
                error: validation.message,
              });
            }
          } else {
            console.log(
              "❌ No active discount rule found for code:",
              cleanDiscountCode
            );
            appliedDiscounts.push({
              code: cleanDiscountCode,
              error: "Kode diskon tidak valid atau sudah tidak aktif",
            });
          }
        } catch (discountError) {
          console.error("❌ Error applying discount:", discountError);
          appliedDiscounts.push({
            code: cleanDiscountCode,
            error: "Terjadi kesalahan saat memproses diskon",
          });
        }
      } else {
        console.log("ℹ️ No discount code or referral code provided");
      }

      const totalPriceNum = finalPriceNum * parseFloat(quantity);
      console.log(
        `🛒 Total Price: Rp ${finalPriceNum} × ${quantity} units = Rp ${totalPriceNum}`
      );

      // 6. HASIL AKHIR - ✅ PERBAIKAN: HAPUS STANDARD DISCOUNT DARI RESULT
      const result = {
        weight: parseFloat(calculatedWeight.toFixed(1)),
        materialCost: Math.round(materialCostNum),
        shipping: Math.round(shippingNum),
        tax: Math.round(taxNum),
        packing: Math.round(packingNum),
        ongkirLocal: Math.round(ongkirLocalNum),
        subTotal: Math.round(subTotalNum),
        overhead: Math.round(overheadAmount),
        profit: Math.round(profitAmount),
        finalPrice: Math.round(finalPriceNum),
        totalPrice: Math.round(totalPriceNum),
        // ✅ DIUBAH: Hanya additional discount yang ditampilkan
        discountAmount: 0, // Standard discount dihapus
        additionalDiscountAmount: Math.round(additionalDiscountAmount),
        totalDiscountAmount: Math.round(additionalDiscountAmount), // Hanya additional discount
        materialName: materialInfo.name,
        materialPricePerGram: materialInfo.pricePerGram,
        materialId: materialFromDB.id,
        quantity: parseInt(quantity),
        appliedDiscounts: appliedDiscounts,
        calculationDetails: {
          shippingRatePerKg: config.shippingRatePerKg,
          taxRate: config.taxRate,
          packingCost: config.packingCost,
          localShippingRatePerKg: config.localShippingRatePerKg,
          overheadPercentage: config.overheadPercentage,
          profitPercentage: config.profitPercentage,
          finalPriceDiscount: config.finalPriceDiscount,
        },
      };

      console.log("📈 FINAL RESULT with Discounts:", {
        finalPrice: result.finalPrice,
        standardDiscount: result.discountAmount,
        additionalDiscount: result.additionalDiscountAmount,
        totalDiscountAmount: result.totalDiscountAmount,
        appliedDiscounts: result.appliedDiscounts,
        hasAdditionalDiscount: additionalDiscountAmount > 0,
        activatedByReferral: !!(referralCode && referralCode.trim() !== ""),
        configFinalPriceDiscount: config.finalPriceDiscount,
      });

      // 7. SIMPAN KE HISTORY
      // try {
      //   await PricingCalculation.saveCalculation({
      //     materialId: materialFromDB.id,
      //     weight: calculatedWeight,
      //     volume: volume,
      //     quantity: quantity,
      //     shippingCost: result.shipping,
      //     taxAmount: result.tax,
      //     packingCost: result.packing,
      //     localShippingCost: result.ongkirLocal,
      //     subtotal: result.subTotal,
      //     overheadAmount: result.overhead,
      //     profitAmount: result.profit,
      //     finalPrice: result.finalPrice,
      //     calculationData: result,
      //   });
      //   console.log("💾 Calculation saved to history");
      // } catch (saveError) {
      //   console.log("⚠️ Cannot save calculation history:", saveError.message);
      // }

      console.log("💾 Calculation history disabled - Data not saved to DB");
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Calculate pricing error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal melakukan perhitungan harga",
        error: error.message,
      });
    }
  }

  // ✅ FUNGSI BARU: Apply multiple discounts (METHOD BIASA - SUDAH DIPERBAIKI)
  async applyMultipleDiscounts(discountRules, finalPrice) {
    let currentPrice = finalPrice;
    let totalDiscountAmount = 0;
    let appliedDiscounts = [];

    console.log(`🔄 Applying ${discountRules.length} eligible discounts...`);

    // Urutkan diskon: fixed amount dulu, kemudian percentage
    const sortedDiscounts = discountRules.sort((a, b) => {
      if (a.type === "fixed" && b.type === "percentage") return -1;
      if (a.type === "percentage" && b.type === "fixed") return 1;
      return b.value - a.value; // Value tertinggi dulu
    });

    for (const discountRule of sortedDiscounts) {
      try {
        console.log(
          `🎯 Processing discount: ${discountRule.name} (${discountRule.type})`
        );

        // Validasi diskon (ignoreUsageLimit = true)
        const validation = this.validateDiscountRule(
          discountRule,
          currentPrice,
          true
        );

        if (validation.isValid) {
          const discountAmount = this.calculateDiscountAmount(
            discountRule,
            currentPrice
          );

          if (discountAmount > 0) {
            // Apply diskon
            currentPrice -= discountAmount;
            totalDiscountAmount += discountAmount;

            appliedDiscounts.push({
              code: discountRule.name,
              name: discountRule.name,
              type: discountRule.type,
              value: discountRule.value,
              amount: Math.round(discountAmount),
              description: discountRule.description,
              appliedOrder: appliedDiscounts.length + 1,
            });

            console.log(
              `✅ Applied: ${discountRule.name} - ${discountRule.value}${
                discountRule.type === "percentage" ? "%" : " IDR"
              } = Rp ${discountAmount}`
            );
            console.log(`💰 Price after this discount: Rp ${currentPrice}`);

            // ✅ INCREMENT USAGE COUNT untuk setiap diskon yang berhasil diapply
            try {
              await PricingRule.incrementUsage(discountRule.id);
              console.log(
                `🔢 Incremented usage count for rule ID: ${discountRule.id}`
              );
            } catch (usageError) {
              console.warn(
                `⚠️ Failed to increment usage count for ${discountRule.id}:`,
                usageError.message
              );
            }
          } else {
            console.log(
              `⏭️ Skipped: ${discountRule.name} - No discount amount calculated`
            );
          }
        } else {
          console.log(
            `⏭️ Skipped: ${discountRule.name} - Validation failed: ${validation.message}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing discount ${discountRule.name}:`,
          error
        );
      }
    }

    console.log(
      `🎉 Finished applying discounts. Total applied: ${appliedDiscounts.length}, Total discount: Rp ${totalDiscountAmount}`
    );

    return {
      appliedDiscounts,
      totalDiscountAmount,
      finalPrice: currentPrice,
    };
  }

  // ✅ FUNGSI: Validasi Discount Rule (METHOD BIASA - SUDAH DIPERBAIKI)
  validateDiscountRule(discountRule, finalPrice, ignoreUsageLimit = false) {
    const now = new Date();

    // Cek status aktif
    if (!discountRule.is_active) {
      return { isValid: false, message: "Kode diskon tidak aktif" };
    }

    // Cek tanggal berlaku
    if (discountRule.start_date && new Date(discountRule.start_date) > now) {
      return { isValid: false, message: "Kode diskon belum berlaku" };
    }

    if (discountRule.end_date && new Date(discountRule.end_date) < now) {
      return { isValid: false, message: "Kode diskon sudah kedaluwarsa" };
    }

    // Cek minimum order amount
    if (
      discountRule.min_order_amount &&
      finalPrice < discountRule.min_order_amount
    ) {
      return {
        isValid: false,
        message: `Minimum order Rp ${discountRule.min_order_amount.toLocaleString(
          "id-ID"
        )}`,
      };
    }

    // ✅ ABAIKAN USAGE LIMIT JIKA ignoreUsageLimit = true (untuk referral code)
    if (
      !ignoreUsageLimit &&
      discountRule.usage_limit &&
      discountRule.used_count >= discountRule.usage_limit
    ) {
      return {
        isValid: false,
        message: "Kode diskon sudah mencapai batas penggunaan",
      };
    }

    return { isValid: true, message: "Kode diskon valid" };
  }

  // ✅ FUNGSI: Hitung Amount Diskon (METHOD BIASA)
  calculateDiscountAmount(discountRule, finalPrice) {
    let discountAmount = 0;

    if (discountRule.type === "percentage") {
      discountAmount = finalPrice * (discountRule.value / 100);

      // Apply max discount amount jika ada
      if (
        discountRule.max_discount_amount &&
        discountAmount > discountRule.max_discount_amount
      ) {
        discountAmount = discountRule.max_discount_amount;
      }
    } else if (discountRule.type === "fixed") {
      discountAmount = discountRule.value;

      // Pastikan diskon tidak melebihi harga final
      if (discountAmount > finalPrice) {
        discountAmount = finalPrice;
      }
    }

    return discountAmount;
  }

  // Di PricingController.js
  async getCalculationHistory(req, res) {
    try {
      // RETURN EMPTY ARRAY - NO DATABASE QUERY
      res.json({
        success: true,
        data: [],
        message: "Calculation history feature is currently disabled",
      });
    } catch (error) {
      console.error("Get calculation history error:", error);
      res.json({
        success: true,
        data: [],
        message: "History feature disabled",
      });
    }
  }
}

module.exports = new PricingController();
