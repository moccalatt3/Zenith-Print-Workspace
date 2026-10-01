const db = require("../config/db");
const path = require("path");
const Material = require("../models/Material");

// Simple in-memory cache dengan TTL 5 menit dan memory limit
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit
const MAX_CACHE_SIZE = 100; // Limit cache entries

// Helper functions
const buildImageUrl = (req, type, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/${type}/${filename}`;
};

// ✅ Helper: Convert is_active ke integer (MySQL TINYINT)
const toIntBool = (value) => {
  return value === true || value === "true" || value === 1 || value === "1"
    ? 1
    : 0;
};

// ✅ Helper: Convert ke integer dengan fallback
const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const setCache = (key, data) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(key, {
    data: data,
    timestamp: Date.now(),
  });
};

const clearCache = () => {
  const previousSize = cache.size;
  cache.clear();
  console.log(`🧹 Cache cleared: ${previousSize} items removed`);
};

// Helper method untuk mendapatkan materials
const getActiveMaterials = async (req) => {
  try {
    let materials = await Material.getAll();

    console.log("📦 Total materials from database:", materials.length);

    const activeMaterials = materials
      .filter((material) => material.status === "active")
      .slice(0, 8)
      .map((material) => ({
        id: material.id,
        name: material.name,
        description: material.description,
        density: material.density,
        image_url: material.image_url
          ? buildImageUrl(
              req,
              "materials",
              material.image_url.replace("/uploads/materials/", ""),
            )
          : null,
      }));

    console.log("✅ Active materials count:", activeMaterials.length);
    return activeMaterials;
  } catch (materialError) {
    console.error("Error fetching materials for home:", materialError);
    return [];
  }
};

const homeController = {
  // Get hero slides
  async getHeroSlides(req, res) {
    try {
      const [slides] = await db.execute(
        "SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY display_order ASC",
      );

      const slidesWithFullUrl = slides.map((slide) => ({
        ...slide,
        background_image_url: buildImageUrl(
          req,
          "slides",
          slide.background_image,
        ),
      }));

      res.json({ success: true, data: slidesWithFullUrl });
    } catch (error) {
      console.error("Error getting hero slides:", error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengambil data slides" });
    }
  },

  // ✅ FIXED: Create new hero slide
  async createHeroSlide(req, res) {
    try {
      const { title, subtitle } = req.body;

      // ✅ Convert ke integer
      const display_order = toInt(req.body.display_order, 0);
      const is_active = toIntBool(req.body.is_active);

      // Validasi input
      if (!title || !req.file) {
        return res.status(400).json({
          success: false,
          message: "Title dan background image harus diisi",
        });
      }

      const background_image = req.file.filename;

      // Insert ke database
      const [result] = await db.execute(
        "INSERT INTO hero_slides (title, subtitle, background_image, display_order, is_active) VALUES (?, ?, ?, ?, ?)",
        [title, subtitle || null, background_image, display_order, is_active],
      );

      console.log("✅ Slide created:", {
        id: result.insertId,
        title,
        background_image,
        display_order,
        is_active,
      });

      clearCache();

      res.status(201).json({
        success: true,
        message: "Slide berhasil dibuat",
        data: {
          id: result.insertId,
          title,
          subtitle,
          background_image,
          background_image_url: buildImageUrl(req, "slides", background_image),
          display_order,
          is_active,
        },
      });
    } catch (error) {
      console.error("❌ Error creating hero slide:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat slide",
      });
    }
  },

  // ✅ FIXED: Update hero slide
  async updateHeroSlide(req, res) {
    try {
      const { id } = req.params;
      const { title, subtitle } = req.body;

      // ✅ Convert ke integer
      const display_order = toInt(req.body.display_order, 0);
      const is_active = toIntBool(req.body.is_active);

      // Cek apakah slide exists
      const [slides] = await db.execute(
        "SELECT * FROM hero_slides WHERE id = ?",
        [id],
      );

      if (slides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Slide tidak ditemukan",
        });
      }

      let background_image = slides[0].background_image;

      if (req.file) {
        background_image = req.file.filename;
      }

      // Update database
      await db.execute(
        "UPDATE hero_slides SET title = ?, subtitle = ?, background_image = ?, display_order = ?, is_active = ? WHERE id = ?",
        [
          title,
          subtitle || null,
          background_image,
          display_order,
          is_active,
          id,
        ],
      );

      console.log("✅ Slide updated:", { id, title, display_order, is_active });

      clearCache();

      res.json({
        success: true,
        message: "Slide berhasil diupdate",
        data: {
          id: parseInt(id),
          title,
          subtitle,
          background_image,
          background_image_url: buildImageUrl(req, "slides", background_image),
          display_order,
          is_active,
        },
      });
    } catch (error) {
      console.error("❌ Error updating hero slide:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengupdate slide",
      });
    }
  },

  // Delete hero slide
  async deleteHeroSlide(req, res) {
    try {
      const { id } = req.params;

      const [slides] = await db.execute(
        "SELECT * FROM hero_slides WHERE id = ?",
        [id],
      );

      if (slides.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Slide tidak ditemukan",
        });
      }

      await db.execute("DELETE FROM hero_slides WHERE id = ?", [id]);

      console.log("✅ Slide deleted:", { id });

      clearCache();

      res.json({
        success: true,
        message: "Slide berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ Error deleting hero slide:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus slide",
      });
    }
  },

  // Get all slides (for admin)
  async getAllSlides(req, res) {
    try {
      const [slides] = await db.execute(
        "SELECT * FROM hero_slides ORDER BY display_order ASC, created_at DESC",
      );

      const slidesWithFullUrl = slides.map((slide) => ({
        ...slide,
        background_image_url: buildImageUrl(
          req,
          "slides",
          slide.background_image,
        ),
      }));

      res.json({ success: true, data: slidesWithFullUrl });
    } catch (error) {
      console.error("Error getting all slides:", error);
      res
        .status(500)
        .json({ success: false, message: "Gagal mengambil data slides" });
    }
  },

  // Get site stats
  async getSiteStats(req, res) {
    try {
      const stats = [
        { stat_number: "2.5K+", stat_label: "Project sejak 2015" },
        { stat_number: "100+", stat_label: "Material tersedia" },
        { stat_number: "98%", stat_label: "Klien puas" },
        { stat_number: "60%", stat_label: "Order kembali" },
      ];
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting site stats:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil statistik",
      });
    }
  },

  async getActiveDiscount(req, res) {
    try {
      console.log("🤑 Fetching active discount for home page");

      const [discounts] = await db.execute(`
      SELECT * FROM pricing_rules 
      WHERE is_active = 1
        AND (start_date IS NULL OR start_date <= CURDATE())
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY created_at DESC 
      LIMIT 1
    `);

      console.log("📊 Discount query result:", {
        found: discounts.length,
        firstItem: discounts[0]
          ? {
              id: discounts[0].id,
              name: discounts[0].name,
              description: discounts[0].description,
              hasDescription: !!discounts[0].description,
            }
          : "no discount",
      });

      let activeDiscount = null;

      if (discounts.length > 0) {
        const discount = discounts[0];
        activeDiscount = {
          id: discount.id,
          name: discount.name,
          type: discount.type,
          value: discount.value,
          description: discount.description,
          image_url: discount.image_url
            ? `${req.protocol}://${req.get("host")}${discount.image_url}`
            : null,
          min_order_amount: discount.min_order_amount,
          max_discount_amount: discount.max_discount_amount,
          start_date: discount.start_date,
          end_date: discount.end_date,
          usage_limit: discount.usage_limit,
          used_count: discount.used_count,
          applicable_to: discount.applicable_to,
        };

        console.log("✅ Active discount found:", {
          id: activeDiscount.id,
          name: activeDiscount.name,
          value: activeDiscount.value,
          type: activeDiscount.type,
          description: activeDiscount.description,
          hasImage: !!activeDiscount.image_url,
        });
      } else {
        console.log("ℹ️ No active discount found");
      }

      res.json({
        success: true,
        data: activeDiscount,
      });
    } catch (error) {
      console.error("❌ Error getting active discount:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data diskon",
        error: error.message,
      });
    }
  },

  // ✅ FIXED: getHomeContent - ubah `TRUE` jadi `1` di query
  async getHomeContent(req, res) {
    const cacheKey = "homeContent";
    const cachedData = cache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log("🏠 Serving home content from cache");
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true,
      });
    }

    try {
      console.log("🏠 Fetching fresh home content from database");

      const [slidesResult, statsResult, materials, discountResult] =
        await Promise.all([
          db.execute(
            "SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY display_order ASC",
          ),
          db.execute(
            "SELECT * FROM site_stats WHERE is_active = 1 ORDER BY display_order ASC",
          ),
          getActiveMaterials(req),
          db.execute(`
          SELECT * FROM pricing_rules 
          WHERE is_active = 1
            AND (start_date IS NULL OR start_date <= CURDATE())
            AND (end_date IS NULL OR end_date >= CURDATE())
          ORDER BY created_at DESC 
          LIMIT 1
        `),
        ]);

      const [slides] = slidesResult;
      const [stats] = statsResult;
      const [discounts] = discountResult;

      console.log("🤑 Discount data in home content:", {
        found: discounts.length,
        discountData: discounts[0]
          ? {
              id: discounts[0].id,
              name: discounts[0].name,
              description: discounts[0].description,
              hasDescription: !!discounts[0].description,
            }
          : "no discount",
      });

      const slidesWithFullUrl = slides.map((slide) => ({
        ...slide,
        background_image_url: buildImageUrl(
          req,
          "slides",
          slide.background_image,
        ),
      }));

      let siteStats = stats;
      if (!stats || stats.length === 0) {
        siteStats = [
          { stat_number: "2.5K+", stat_label: "Project sejak 2015" },
          { stat_number: "100+", stat_label: "Material tersedia" },
          { stat_number: "98%", stat_label: "Klien puas" },
          { stat_number: "60%", stat_label: "Order kembali" },
        ];
      }

      let activeDiscount = null;
      if (discounts.length > 0) {
        const discount = discounts[0];
        activeDiscount = {
          id: discount.id,
          name: discount.name,
          type: discount.type,
          value: discount.value,
          description: discount.description,
          image_url: discount.image_url
            ? `${req.protocol}://${req.get("host")}${discount.image_url}`
            : null,
          min_order_amount: discount.min_order_amount,
          max_discount_amount: discount.max_discount_amount,
          start_date: discount.start_date,
          end_date: discount.end_date,
        };

        console.log("🤑 Active discount included in home content:", {
          name: activeDiscount.name,
          value: activeDiscount.value,
          type: activeDiscount.type,
          description: activeDiscount.description,
          hasDescription: !!activeDiscount.description,
          hasImage: !!activeDiscount.image_url,
        });
      }

      const responseData = {
        heroSlides: slidesWithFullUrl,
        siteStats: siteStats,
        materials: materials || [],
        activeDiscount: activeDiscount,
      };

      setCache(cacheKey, responseData);

      console.log("🏠 Home content prepared successfully:", {
        heroSlides: slidesWithFullUrl.length,
        siteStats: siteStats.length,
        materials: materials?.length || 0,
        hasDiscount: !!activeDiscount,
        discountHasDescription: activeDiscount
          ? !!activeDiscount.description
          : false,
      });

      res.json({
        success: true,
        data: responseData,
        cached: false,
      });
    } catch (error) {
      console.error("❌ Error getting home content:", error);

      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log("🏠 Serving expired cached data as fallback");
        return res.json({
          success: true,
          data: cachedData.data,
          cached: true,
          fallback: true,
        });
      }

      console.log("🏠 Using ultimate fallback data");
      const fallbackData = {
        heroSlides: [
          {
            id: 1,
            title: "Layanan 3D Printing Profesional",
            subtitle:
              "Transformasi ide digital menjadi objek fisik dengan presisi tinggi.",
            background_image_url: "/images/home2.jpg",
          },
        ],
        siteStats: [
          { stat_number: "2.5K+", stat_label: "Project sejak 2015" },
          { stat_number: "100+", stat_label: "Material tersedia" },
          { stat_number: "98%", stat_label: "Klien puas" },
          { stat_number: "60%", stat_label: "Order kembali" },
        ],
        materials: [
          {
            id: 1,
            name: "Aluminium",
            description:
              "Material kuat dan ringan dengan konduktivitas termal yang baik.",
            density: 2.7,
            image_url: "/images/contoh.png",
          },
        ],
        activeDiscount: null,
      };

      res.json({
        success: true,
        data: fallbackData,
        fallback: true,
      });
    }
  },

  // ✅ FIXED: Update site stats - ganti `true` jadi `1`
  async updateSiteStats(req, res) {
    try {
      const { stats } = req.body;

      if (!stats || !Array.isArray(stats)) {
        return res.status(400).json({
          success: false,
          message: "Data stats harus berupa array",
        });
      }

      await db.execute("DELETE FROM site_stats");

      for (const [index, stat] of stats.entries()) {
        await db.execute(
          "INSERT INTO site_stats (stat_number, stat_label, display_order, is_active) VALUES (?, ?, ?, ?)",
          [stat.stat_number, stat.stat_label, index + 1, 1], // ✅ pakai 1, bukan true
        );
      }

      console.log("✅ Site stats updated");

      clearCache();

      res.json({
        success: true,
        message: "Statistik berhasil diupdate",
        data: stats,
      });
    } catch (error) {
      console.error("❌ Error updating site stats:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengupdate statistik",
      });
    }
  },

  // Utility method untuk clear cache (bisa dipanggil dari admin)
  clearCacheEndpoint(req, res) {
    clearCache();
    res.json({
      success: true,
      message: "Cache berhasil dibersihkan",
    });
  },
};

module.exports = homeController;
