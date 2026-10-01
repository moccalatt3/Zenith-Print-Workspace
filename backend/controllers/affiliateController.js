const Affiliate = require("../models/Affiliate");
const Referral = require("../models/Referral");
const db = require("../config/db");

// Generate unique referral code
function generateReferralCode(name) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const random = Math.floor(Math.random() * 1000);
  return `${initials}${random}`;
}

function isValidCronExpression(cronString) {
  try {
    const cron = require("node-cron");
    const parts = cronString.split(" ");
    if (parts.length !== 5) return false;

    // Test dengan node-cron
    const task = cron.schedule(cronString, () => {});
    task.stop();
    return true;
  } catch (error) {
    return false;
  }
}

async function updateOrInsertSetting(connection, key, value, description) {
  try {
    // Cek apakah setting sudah ada
    const [existing] = await connection.execute(
      `SELECT id FROM affiliate_settings WHERE setting_name = ?`,
      [key]
    );

    if (existing.length > 0) {
      // UPDATE jika sudah ada
      const [result] = await connection.execute(
        `UPDATE affiliate_settings SET 
         setting_value = ?, 
         description = ?,
         updated_at = NOW()
         WHERE setting_name = ?`,
        [value, description, key]
      );
      console.log(`✅ Updated setting: ${key} = ${value}`);
      return result.affectedRows;
    } else {
      // INSERT jika belum ada
      const [result] = await connection.execute(
        `INSERT INTO affiliate_settings (setting_name, setting_value, description) 
         VALUES (?, ?, ?)`,
        [key, value, description]
      );
      console.log(`✅ Created new setting: ${key} = ${value}`);
      return result.affectedRows;
    }
  } catch (error) {
    console.error(`❌ Error updating setting ${key}:`, error);
    throw error;
  }
}

// Helper function untuk format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Calculate performance based on stats
function calculatePerformance(stats) {
  const conversionRate =
    stats.total_referrals > 0
      ? (stats.completed_referrals / stats.total_referrals) * 100
      : 0;

  if (conversionRate >= 50) return "excellent";
  if (conversionRate >= 30) return "good";
  if (conversionRate >= 15) return "average";
  return "poor";
}

// ✅ FUNGSI YANG SUDAH DIPERBAIKI - Akurat dan menggunakan expiry_date dari database
function calculateRemainingTime(
  affiliateJoinedAt,
  affiliateExpiryDate,
  expiryMonths
) {
  if (!affiliateJoinedAt) {
    return {
      remaining_days: 0,
      remaining_months: 0,
      status: "not_joined",
      message: "Belum bergabung dengan affiliate",
      is_expired: false,
    };
  }

  const joinDate = new Date(affiliateJoinedAt);

  // ✅ PRIORITAS: Gunakan expiry_date dari database JIKA ADA
  let expiryDate;
  let usingStoredExpiry = false;

  if (affiliateExpiryDate) {
    expiryDate = new Date(affiliateExpiryDate);
    usingStoredExpiry = true;
  } else {
    // Fallback: hitung manual berdasarkan join date + months
    expiryDate = new Date(joinDate);
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
  }

  const now = new Date();

  // Jika sudah expired
  if (expiryDate <= now) {
    return {
      remaining_days: 0,
      remaining_months: 0,
      status: "expired",
      message: "Relationship sudah expired",
      expiry_date: expiryDate,
      is_expired: true,
      using_stored_expiry: usingStoredExpiry,
    };
  }

  // Hitung selisih waktu yang akurat
  const timeDiff = expiryDate.getTime() - now.getTime();
  const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Hitung bulan dan hari tersisa dengan perhitungan yang lebih akurat
  const remainingMonths = Math.floor(totalDays / 30);
  const remainingDaysInMonth = totalDays % 30;

  // Format pesan yang lebih informatif
  let message;
  if (remainingMonths > 0) {
    message = `${remainingMonths} bulan ${remainingDaysInMonth} hari lagi`;
  } else {
    message = `${totalDays} hari lagi`;
  }

  return {
    remaining_days: totalDays,
    remaining_months: remainingMonths,
    remaining_days_in_month: remainingDaysInMonth,
    expiry_date: expiryDate,
    status: "active",
    message: message,
    is_expired: false,
    using_stored_expiry: usingStoredExpiry,
  };
}

exports.getAffiliateById = async (req, res) => {
  try {
    const { id } = req.params;
    const affiliate = await Affiliate.getById(id);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate tidak ditemukan",
      });
    }

    // ✅ AMBIL DATA ACTIVE REFERRALS DARI TABEL USERS
    const activeUsers = await Affiliate.getActiveReferralsFromUsers(id);
    console.log(
      `📊 Affiliate ${id} - Active users from DB:`,
      activeUsers.length
    );

    // Get affiliate settings untuk masa berlaku
    const [settings] = await db.execute(`
      SELECT setting_value FROM affiliate_settings 
      WHERE setting_name = 'relationship_expiry_months'
      ORDER BY created_at DESC LIMIT 1
    `);

    const expiryMonths =
      settings.length > 0 ? parseInt(settings[0].setting_value) : 6;

    // Process active users dengan remaining time
    const activeReferrals = await Promise.all(
      activeUsers.map(async (user) => {
        try {
          let remainingTime = {
            remaining_days: 0,
            remaining_months: 0,
            status: "unknown",
            message: "User tidak ditemukan",
          };

          if (user.affiliate_joined_at) {
            remainingTime = calculateRemainingTime(
              user.affiliate_joined_at,
              user.affiliate_expiry_date,
              expiryMonths
            );
          }

          // Tetap hitung commission per user untuk detail view
          const [commissionResult] = await db.execute(
            `SELECT COALESCE(SUM(commission_earned), 0) as total_commission 
             FROM referrals 
             WHERE referred_user_id = ? AND affiliate_id = ?`,
            [user.id, id]
          );

          const totalCommission =
            parseFloat(commissionResult[0]?.total_commission) || 0;

          return {
            id: user.id,
            referred_email: user.user_email,
            referred_user_id: user.id,
            user_info: {
              user_exists: true,
              joined_at: user.affiliate_joined_at,
              expiry_date: user.affiliate_expiry_date,
              user_created_at: user.user_created_at,
              user_name: user.user_name,
              user_email: user.user_email,
              user_status: user.user_status,
            },
            remaining_time: remainingTime,
            is_active: remainingTime.status === "active",
            total_commission: totalCommission,
            status: "active",
          };
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          return {
            id: user.id,
            referred_email: user.user_email,
            referred_user_id: user.id,
            user_info: {
              user_exists: true,
              joined_at: user.affiliate_joined_at,
              expiry_date: user.affiliate_expiry_date,
              user_created_at: user.user_created_at,
              user_name: user.user_name,
              user_email: user.user_email,
            },
            remaining_time: {
              remaining_days: 0,
              remaining_months: 0,
              status: "error",
              message: "Error memproses data",
            },
            is_active: false,
            total_commission: 0,
            status: "error",
          };
        }
      })
    );

    // Filter hanya yang active
    const filteredActiveReferrals = activeReferrals.filter(
      (referral) => referral.is_active
    );

    // Hitung statistik
    const referralStats = {
      total_active_users: activeUsers.length,
      active: filteredActiveReferrals.length,
      expired: activeReferrals.filter((r) => !r.is_active).length,
    };

    console.log(`📊 Affiliate ${id} user stats:`, referralStats);

    res.json({
      success: true,
      data: {
        ...affiliate,
        stats: {
          // Kosongkan stats yang tidak digunakan
        },
        referrals: filteredActiveReferrals,
        referral_stats: referralStats,
        total_referrals: affiliate.total_referrals || 0,
        active_referrals: filteredActiveReferrals.length, // ✅ PAKAI REAL-TIME COUNT
        total_earnings: parseFloat(affiliate.total_earnings) || 0,
        pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
        relationship_settings: {
          expiry_months: expiryMonths,
        },
      },
    });
  } catch (error) {
    console.error("Error getting affiliate:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data affiliate",
    });
  }
};


async function getActiveUsersByAffiliateId(affiliateId) {
  try {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as active_users_count 
       FROM users 
       WHERE affiliate_id = ? 
       AND affiliate_joined_at IS NOT NULL 
       AND (affiliate_expiry_date IS NULL OR affiliate_expiry_date > NOW())`,
      [affiliateId]
    );
    
    return parseInt(rows[0]?.active_users_count) || 0;
  } catch (error) {
    console.error("Error getting active users count:", error);
    return 0;
  }
}

// ✅ FUNGSI BARU: Get detailed active users data
async function getActiveUsersDataByAffiliateId(affiliateId) {
  try {
    const [rows] = await db.execute(
      `SELECT 
        id, 
        name, 
        email, 
        affiliate_joined_at, 
        affiliate_expiry_date,
        created_at
       FROM users 
       WHERE affiliate_id = ? 
       AND affiliate_joined_at IS NOT NULL 
       AND (affiliate_expiry_date IS NULL OR affiliate_expiry_date > NOW())
       ORDER BY affiliate_joined_at DESC`,
      [affiliateId]
    );
    
    return rows;
  } catch (error) {
    console.error("Error getting active users data:", error);
    return [];
  }
}

exports.getAffiliateById = async (req, res) => {
  try {
    const { id } = req.params;
    const affiliate = await Affiliate.getById(id);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate tidak ditemukan",
      });
    }

    // Get referral stats
    const stats = await Referral.getStatsByAffiliate(id);
    const pendingEarnings = await Referral.getPendingEarningsByAffiliate(id);

    // ✅ AMBIL DATA ACTIVE REFERRALS DARI TABEL USERS
    const activeUsers = await Affiliate.getActiveReferralsFromUsers(id);

    // Get affiliate settings untuk masa berlaku
    const [settings] = await db.execute(`
      SELECT setting_value FROM affiliate_settings 
      WHERE setting_name = 'relationship_expiry_months'
      ORDER BY created_at DESC LIMIT 1
    `);

    const expiryMonths =
      settings.length > 0 ? parseInt(settings[0].setting_value) : 6;

    // Process active users dengan remaining time
    const activeReferrals = await Promise.all(
      activeUsers.map(async (user) => {
        try {
          let remainingTime = {
            remaining_days: 0,
            remaining_months: 0,
            status: "unknown",
            message: "User tidak ditemukan",
          };

          if (user.affiliate_joined_at) {
            remainingTime = calculateRemainingTime(
              user.affiliate_joined_at,
              user.affiliate_expiry_date,
              expiryMonths
            );
          }

          // Get total commission dari user ini
          const [commissionResult] = await db.execute(
            `SELECT COALESCE(SUM(commission_earned), 0) as total_commission 
             FROM referrals 
             WHERE referred_user_id = ? AND affiliate_id = ?`,
            [user.id, id]
          );

          const totalCommission =
            parseFloat(commissionResult[0]?.total_commission) || 0;

          return {
            id: user.id, // user ID sebagai key
            referred_email: user.user_email,
            referred_user_id: user.id,
            user_info: {
              user_exists: true,
              joined_at: user.affiliate_joined_at,
              expiry_date: user.affiliate_expiry_date,
              user_created_at: user.user_created_at,
              user_name: user.user_name,
              user_email: user.user_email,
              user_status: user.user_status,
            },
            remaining_time: remainingTime,
            is_active: remainingTime.status === "active",
            total_commission: totalCommission,
            status: "active", // karena dari users yang punya affiliate_id
          };
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          return {
            id: user.id,
            referred_email: user.user_email,
            referred_user_id: user.id,
            user_info: {
              user_exists: true,
              joined_at: user.affiliate_joined_at,
              expiry_date: user.affiliate_expiry_date,
              user_created_at: user.user_created_at,
              user_name: user.user_name,
              user_email: user.user_email,
            },
            remaining_time: {
              remaining_days: 0,
              remaining_months: 0,
              status: "error",
              message: "Error memproses data",
            },
            is_active: false,
            total_commission: 0,
            status: "error",
          };
        }
      })
    );

    // Filter hanya yang active
    const filteredActiveReferrals = activeReferrals.filter(
      (referral) => referral.is_active
    );

    // Hitung statistik
    const referralStats = {
      total_active_users: activeUsers.length,
      active: filteredActiveReferrals.length,
      expired: activeReferrals.filter((r) => !r.is_active).length,
    };

    console.log(`📊 Affiliate ${id} user stats:`, referralStats);

    res.json({
      success: true,
      data: {
        ...affiliate,
        stats: {
          ...stats,
          pending_earnings: pendingEarnings,
        },
        referrals: filteredActiveReferrals, 
        referral_stats: referralStats,
        total_referrals:
          affiliate.total_referrals || stats.total_referrals || 0,
        active_referrals: filteredActiveReferrals.length,
        total_earnings:
          parseFloat(affiliate.total_earnings) ||
          parseFloat(stats.total_commission) ||
          0,
        pending_earnings:
          parseFloat(affiliate.pending_earnings) ||
          parseFloat(pendingEarnings) ||
          0,
        relationship_settings: {
          expiry_months: expiryMonths,
        },
      },
    });
  } catch (error) {
    console.error("Error getting affiliate:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data affiliate",
    });
  }
};


exports.getAllAffiliates = async (req, res) => {
  try {
    const affiliates = await Affiliate.getAll();

    // ✅ PERBAIKAN: Hitung active_referrals REAL-TIME untuk setiap affiliate
    const affiliatesWithStats = await Promise.all(
      affiliates.map(async (affiliate) => {
        try {
          // ✅ HITUNG REAL-TIME ACTIVE REFERRALS dari tabel users
          const activeUsers = await Affiliate.getActiveReferralsFromUsers(
            affiliate.id
          );

          return {
            ...affiliate,
            total_referrals: affiliate.total_referrals || 0,
            active_referrals: activeUsers.length, // ✅ PAKAI REAL-TIME COUNT
            total_earnings: parseFloat(affiliate.total_earnings) || 0,
            pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
          };
        } catch (error) {
          console.error(
            `Error calculating active referrals for affiliate ${affiliate.id}:`,
            error
          );
          // Fallback ke data dari database jika error
          return {
            ...affiliate,
            total_referrals: affiliate.total_referrals || 0,
            active_referrals: affiliate.active_referrals || 0,
            total_earnings: parseFloat(affiliate.total_earnings) || 0,
            pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
          };
        }
      })
    );

    res.json({
      success: true,
      data: affiliatesWithStats,
    });
  } catch (error) {
    console.error("Error getting affiliates:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data affiliates",
    });
  }
};

exports.getAllAffiliatesPaginated = async (req, res) => {
  let connection;
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sortBy = "recent",
    } = req.query;

    console.log("📥 Affiliate pagination parameters:", {
      page,
      limit,
      search,
      status,
      sortBy,
    });

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Base query - HANYA ambil dari affiliates table
    let query = `
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        referral_code, 
        commission_rate,
        status,
        total_referrals,
        active_referrals,
        total_earnings,      
        pending_earnings,    
        join_date,
        created_at,
        updated_at
      FROM affiliates 
      WHERE 1=1
    `;

    const queryParams = [];

    // Add filters
    if (search && search.trim() !== "") {
      query += ` AND (name LIKE ? OR email LIKE ? OR referral_code LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== "all" && status.trim() !== "") {
      query += ` AND status = ?`;
      queryParams.push(status.trim());
    }

    // Sorting
    switch (sortBy) {
      case "name":
        query += ` ORDER BY name ASC`;
        break;
      case "earnings_high":
        query += ` ORDER BY total_earnings DESC`;
        break;
      case "earnings_low":
        query += ` ORDER BY total_earnings ASC`;
        break;
      case "pending_high":
        query += ` ORDER BY pending_earnings DESC`;
        break;
      case "pending_low":
        query += ` ORDER BY pending_earnings ASC`;
        break;
      case "referrals_high":
        query += ` ORDER BY total_referrals DESC`;
        break;
      case "referrals_low":
        query += ` ORDER BY total_referrals ASC`;
        break;
      case "join_date_new":
        query += ` ORDER BY join_date DESC`;
        break;
      case "join_date_old":
        query += ` ORDER BY join_date ASC`;
        break;
      case "recent":
      default:
        query += ` ORDER BY created_at DESC`;
        break;
    }

    // Add pagination
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    console.log("🔍 Final affiliate query:", query);
    console.log("📋 Query params:", queryParams);

    connection = await db.getConnection();

    // Execute main query
    const [affiliates] = await connection.execute(query, queryParams);
    console.log(`✅ Found ${affiliates.length} affiliates`);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM affiliates 
      WHERE 1=1
    `;

    const countParams = [];

    if (search && search.trim() !== "") {
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR referral_code LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== "all" && status.trim() !== "") {
      countQuery += ` AND status = ?`;
      countParams.push(status.trim());
    }

    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total || 0;

    console.log(`📊 Total affiliates: ${total}`);

    // ✅ PERBAIKAN: Hitung active_referrals REAL-TIME untuk setiap affiliate
    const affiliatesWithStats = await Promise.all(
      affiliates.map(async (affiliate) => {
        try {
          // ✅ HITUNG REAL-TIME ACTIVE REFERRALS dari tabel users
          const activeUsers = await Affiliate.getActiveReferralsFromUsers(
            affiliate.id
          );
          console.log(
            `📊 Affiliate ${affiliate.id} - Active users: ${activeUsers.length}`
          );

          return {
            ...affiliate,
            total_referrals: affiliate.total_referrals || 0,
            active_referrals: activeUsers.length, // ✅ PAKAI REAL-TIME COUNT
            referral_stats: {
              active: activeUsers.length, // ✅ UNTUK FRONTEND
            },
            total_earnings: parseFloat(affiliate.total_earnings) || 0,
            pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
          };
        } catch (error) {
          console.error(
            `❌ Error calculating active referrals for affiliate ${affiliate.id}:`,
            error
          );
          // Fallback ke data dari database jika error
          return {
            ...affiliate,
            total_referrals: affiliate.total_referrals || 0,
            active_referrals: affiliate.active_referrals || 0,
            referral_stats: {
              active: affiliate.active_referrals || 0,
            },
            total_earnings: parseFloat(affiliate.total_earnings) || 0,
            pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
          };
        }
      })
    );

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data: {
        affiliates: affiliatesWithStats,
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
    console.error("❌ Error getting affiliates with pagination:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data affiliates: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
exports.withdrawCommission = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔄 Processing commission withdrawal for affiliate: ${id}`);

    // Get affiliate data
    const affiliate = await Affiliate.getById(id);
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate tidak ditemukan",
      });
    }

    // Check if there's pending earnings to withdraw
    const pendingEarnings = parseFloat(affiliate.pending_earnings) || 0;
    if (pendingEarnings <= 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada komisi pending yang bisa dicairkan",
      });
    }

    // Process withdrawal - move pending_earnings to total_earnings
    const currentTotalEarnings = parseFloat(affiliate.total_earnings) || 0;
    const newTotalEarnings = currentTotalEarnings + pendingEarnings;

    // Update affiliate earnings
    const updatedAffiliate = await Affiliate.updateEarnings(
      id,
      newTotalEarnings,
      0 // Set pending_earnings to 0
    );

    // Update referral status from 'pending' to 'completed' for the withdrawn commissions
    await Referral.updatePendingToCompleted(id);

    console.log(`✅ Commission withdrawal successful for affiliate ${id}`);
    console.log(`💰 Withdrawn amount: ${formatCurrency(pendingEarnings)}`);
    console.log(`📈 New total earnings: ${formatCurrency(newTotalEarnings)}`);

    res.json({
      success: true,
      message: `Komisi sebesar ${formatCurrency(
        pendingEarnings
      )} berhasil dicairkan`,
      data: {
        affiliate: updatedAffiliate,
        withdrawn_amount: pendingEarnings,
        new_total_earnings: newTotalEarnings,
      },
    });
  } catch (error) {
    console.error("❌ Error withdrawing commission:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mencairkan komisi: " + error.message,
    });
  }
};

// Fungsi baru untuk mendapatkan relationship status semua referrals affiliate
exports.getAffiliateRelationships = async (req, res) => {
  try {
    const { id } = req.params;

    // Get affiliate settings untuk masa berlaku
    const [settings] = await db.execute(`
      SELECT setting_value FROM affiliate_settings 
      WHERE setting_name = 'relationship_expiry_months'
      ORDER BY created_at DESC LIMIT 1
    `);

    const expiryMonths =
      settings.length > 0 ? parseInt(settings[0].setting_value) : 6;

    // Get semua referrals affiliate
    const referrals = await Referral.getByAffiliateId(id);

    // Get detailed relationship info untuk setiap referral
    const relationships = await Promise.all(
      referrals.map(async (referral) => {
        const [userData] = await db.execute(
          `SELECT id, name, email, affiliate_joined_at, affiliate_expiry_date 
           FROM users WHERE id = ?`,
          [referral.referred_user_id]
        );

        const user = userData[0];
        let relationshipInfo = {
          status: "not_joined",
          message: "Belum bergabung",
          remaining_days: 0,
          remaining_months: 0,
        };

        if (user && user.affiliate_joined_at) {
          relationshipInfo = calculateRemainingTime(
            user.affiliate_joined_at,
            expiryMonths
          );
        }

        return {
          referral_id: referral.id,
          user_id: user ? user.id : null,
          user_name: user ? user.name : "User tidak ditemukan",
          user_email: user ? user.email : "Email tidak tersedia",
          joined_at: user ? user.affiliate_joined_at : null,
          calculated_expiry:
            user && user.affiliate_joined_at
              ? new Date(
                  new Date(user.affiliate_joined_at).getTime() +
                    expiryMonths * 30 * 24 * 60 * 60 * 1000
                )
              : null,
          relationship_status: relationshipInfo,
        };
      })
    );

    // Hitung statistik
    const stats = {
      total: relationships.length,
      active: relationships.filter(
        (r) => r.relationship_status.status === "active"
      ).length,
      expired: relationships.filter(
        (r) => r.relationship_status.status === "expired"
      ).length,
      not_joined: relationships.filter(
        (r) => r.relationship_status.status === "not_joined"
      ).length,
    };

    res.json({
      success: true,
      data: {
        relationships,
        stats,
        settings: {
          expiry_months: expiryMonths,
        },
      },
    });
  } catch (error) {
    console.error("Error getting affiliate relationships:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data relationship affiliate",
    });
  }
};

// Create new affiliate
exports.createAffiliate = async (req, res) => {
  try {
    const { name, email, phone, commission_rate, status } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Nama dan email harus diisi",
      });
    }

    // Check if email already exists
    const existingAffiliate = await Affiliate.getByEmail(email);
    if (existingAffiliate) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(name);
    let attempts = 0;

    // Ensure referral code is unique
    while (attempts < 5) {
      const existingCode = await Affiliate.getByReferralCode(referralCode);
      if (!existingCode) break;

      referralCode = generateReferralCode(name);
      attempts++;
    }

    const affiliateData = {
      name,
      email,
      phone: phone || "",
      referral_code: referralCode,
      commission_rate: commission_rate || 10,
      status: status || "active",
    };

    const newAffiliate = await Affiliate.create(affiliateData);

    res.status(201).json({
      success: true,
      message: "Affiliate berhasil ditambahkan",
      data: newAffiliate,
    });
  } catch (error) {
    console.error("Error creating affiliate:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan affiliate",
    });
  }
};

// Update affiliate
exports.updateAffiliate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, commission_rate, status } = req.body;

    // Check if affiliate exists
    const existingAffiliate = await Affiliate.getById(id);
    if (!existingAffiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate tidak ditemukan",
      });
    }

    // Check if email is already used by another affiliate
    if (email && email !== existingAffiliate.email) {
      const emailExists = await Affiliate.getByEmail(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email sudah digunakan oleh affiliate lain",
        });
      }
    }

    const updateData = {
      name: name || existingAffiliate.name,
      email: email || existingAffiliate.email,
      phone: phone || existingAffiliate.phone,
      commission_rate: commission_rate || existingAffiliate.commission_rate,
      status: status || existingAffiliate.status,
    };

    const updatedAffiliate = await Affiliate.update(id, updateData);

    res.json({
      success: true,
      message: "Affiliate berhasil diperbarui",
      data: updatedAffiliate,
    });
  } catch (error) {
    console.error("Error updating affiliate:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui affiliate",
    });
  }
};

// Delete affiliate
exports.deleteAffiliate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if affiliate exists
    const existingAffiliate = await Affiliate.getById(id);
    if (!existingAffiliate) {
      return res.status(404).json({
        success: false,
        message: "Affiliate tidak ditemukan",
      });
    }

    await Affiliate.delete(id);

    res.json({
      success: true,
      message: "Affiliate berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting affiliate:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus affiliate",
    });
  }
};

exports.validateAffiliateCode = async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();

    const { affiliateCode } = req.body;
    const userId = req.user.id;

    console.log(
      "🔍 Validating affiliate code:",
      affiliateCode,
      "for user:",
      userId
    );

    if (!affiliateCode || affiliateCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Kode affiliate harus diisi",
      });
    }

    // ✅ CEK DATA USER TERLEBIH DAHULU
    const [userData] = await connection.execute(
      `SELECT id, affiliate_id, referral_code FROM users WHERE id = ?`,
      [userId]
    );

    const user = userData[0];

    // ✅ PERBAIKAN: JIKA USER SUDAH PUNYA AFFILIATE_ID, CEK APAKAH KODE SAMA
    if (user && user.affiliate_id) {
      // Cari data affiliate user
      const [userAffiliateData] = await connection.execute(
        `SELECT id, referral_code FROM affiliates WHERE id = ?`,
        [user.affiliate_id]
      );

      const userAffiliate = userAffiliateData[0];

      // ✅ JIKA KODE SAMA DENGAN AFFILIATE USER, BERARTI VALID
      if (
        userAffiliate &&
        userAffiliate.referral_code === affiliateCode.trim()
      ) {
        console.log(
          "✅ User menggunakan affiliate tetapnya sendiri:",
          affiliateCode
        );
        return res.json({
          success: true,
          message: "Kode affiliate valid (affiliate tetap)",
          data: {
            affiliateId: user.affiliate_id,
            affiliateName: "Affiliate Tetap Anda",
            referralCode: userAffiliate.referral_code,
            commissionRate: 10, // Default atau ambil dari database
            isPermanent: true,
          },
        });
      }

      // ❌ JIKA KODE BEDA, TOLAK KARENA USER SUDAH TERKUNCI
      if (
        userAffiliate &&
        userAffiliate.referral_code !== affiliateCode.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: `Anda sudah terdaftar dengan affiliate ${userAffiliate.referral_code} dan tidak dapat mengganti kode`,
        });
      }
    }

    // ✅ JIKA USER BELUM PUNYA AFFILIATE, VALIDASI KODE BARU
    // Cek kode affiliate di database
    const [affiliateData] = await connection.execute(
      `SELECT id, name, referral_code, commission_rate, status 
       FROM affiliates 
       WHERE referral_code = ? AND status = 'active'`,
      [affiliateCode.trim()]
    );

    console.log("🔍 Affiliate data found:", affiliateData.length, "records");

    if (affiliateData.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Kode affiliate "${affiliateCode}" tidak valid atau tidak aktif`,
      });
    }

    const affiliate = affiliateData[0];

    // ✅ CEK: User tidak bisa menggunakan kode affiliate sendiri
    if (user && user.referral_code === affiliateCode) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menggunakan kode affiliate sendiri",
      });
    }

    console.log("✅ Manual affiliate code validated:", affiliateCode);

    res.json({
      success: true,
      message: "Kode affiliate valid",
      data: {
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        referralCode: affiliate.referral_code,
        commissionRate: affiliate.commission_rate,
        isPermanent: false,
      },
    });
  } catch (error) {
    console.error("❌ Error validating affiliate code:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memvalidasi kode affiliate: " + error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get affiliate performance stats
exports.getPerformanceStats = async (req, res) => {
  try {
    const stats = await Affiliate.getPerformanceStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting performance stats:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik performa",
    });
  }
};

exports.getAffiliateSettings = async (req, res) => {
  try {
    console.log("🔧 Getting all affiliate settings...");

    const [settings] = await db.execute(`
      SELECT * FROM affiliate_settings 
      ORDER BY created_at DESC
    `);

    // Format settings
    const formattedSettings = {};
    settings.forEach((setting) => {
      formattedSettings[setting.setting_name] = {
        id: setting.id,
        value: setting.setting_value,
        description: setting.description,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
      };
    });

    // Get job info
    const { getCleanupJobInfo } = require("../jobs/affiliateCleanup");
    const jobInfo = await getCleanupJobInfo();

    console.log("✅ All settings retrieved");

    res.json({
      success: true,
      data: {
        settings: formattedSettings,
        job_info: jobInfo,
      },
    });
  } catch (error) {
    console.error("❌ Error getting affiliate settings:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil pengaturan affiliate",
      error: error.message,
    });
  }
};

exports.getCleanupJobInfo = async (req, res) => {
  try {
    const { getCleanupJobInfo } = require("../jobs/affiliateCleanup");

    const jobInfo = await getCleanupJobInfo();

    res.json({
      success: true,
      data: jobInfo,
    });
  } catch (error) {
    console.error("Error getting cleanup job info:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil info cleanup job",
    });
  }
};

// ✅ FUNGSI: Update affiliate settings (TAMBAH DEBUG)
exports.updateAffiliateSettings = async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const {
      relationship_expiry_months,
      cleanup_schedule,
      cleanup_timezone,
      cleanup_job_enabled,
    } = req.body;

    console.log("🔧 Updating affiliate settings:", req.body);

    // ✅ CEK DATA SEBELUMNYA
    const [currentSettings] = await connection.execute(
      `SELECT setting_name, setting_value FROM affiliate_settings`
    );
    console.log("📊 Current settings in DB:", currentSettings);

    // ✅ VALIDASI 1: Masa berlaku harus 1-6 bulan
    if (relationship_expiry_months) {
      const expiryMonths = parseInt(relationship_expiry_months);
      if (expiryMonths < 1 || expiryMonths > 6) {
        return res.status(400).json({
          success: false,
          message: "Masa berlaku harus antara 1-6 bulan",
        });
      }

      const result = await updateOrInsertSetting(
        connection,
        "relationship_expiry_months",
        expiryMonths.toString(),
        `Lama hubungan affiliate dengan user dalam bulan (${expiryMonths} bulan)`
      );
      console.log(`📝 relationship_expiry_months update result:`, result);
    }

    // ✅ VALIDASI 2: Schedule tidak boleh kosong
    if (cleanup_schedule) {
      if (!cleanup_schedule.trim()) {
        return res.status(400).json({
          success: false,
          message: "Jadwal cleanup tidak boleh kosong",
        });
      }

      const result = await updateOrInsertSetting(
        connection,
        "cleanup_schedule",
        cleanup_schedule,
        "Jadwal cleanup dalam format cron"
      );
      console.log(`📝 cleanup_schedule update result:`, result);
    }

    // ✅ UPDATE timezone
    if (cleanup_timezone) {
      const result = await updateOrInsertSetting(
        connection,
        "cleanup_timezone",
        cleanup_timezone,
        "Timezone untuk jadwal cleanup"
      );
      console.log(`📝 cleanup_timezone update result:`, result);
    }

    // ✅ UPDATE job enabled
    if (cleanup_job_enabled !== undefined) {
      const result = await updateOrInsertSetting(
        connection,
        "cleanup_job_enabled",
        cleanup_job_enabled.toString(),
        "Enable/disable automatic cleanup job"
      );
      console.log(`📝 cleanup_job_enabled update result:`, result);
    }

    await connection.commit();

    // ✅ CEK DATA SETELAH UPDATE
    const [updatedSettings] = await connection.execute(
      `SELECT setting_name, setting_value FROM affiliate_settings`
    );
    console.log("📊 Updated settings in DB:", updatedSettings);

    // ✅ RESTART job dengan setting baru
    const { restartCleanupJob } = require("../jobs/affiliateCleanup");
    restartCleanupJob();

    console.log("✅ All affiliate settings updated successfully");

    res.json({
      success: true,
      message: "Semua pengaturan berhasil diperbarui",
      data: req.body,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error updating affiliate settings:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengaturan: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// ✅ FUNGSI BARU: Group referrals by user untuk tampilan yang lebih rapi
function groupReferralsByUser(referrals) {
  const userMap = new Map();
  
  referrals.forEach(referral => {
    const userKey = referral.referred_email || referral.user_email;
    
    if (!userMap.has(userKey)) {
      // Buat entry baru untuk user
      userMap.set(userKey, {
        id: referral.id, // Gunakan ID referral pertama sebagai representasi
        referred_email: userKey,
        referred_user_id: referral.referred_user_id,
        user_info: {
          user_exists: referral.user_info?.user_exists || false,
          joined_at: referral.user_info?.joined_at,
          expiry_date: referral.user_info?.expiry_date,
          user_created_at: referral.user_info?.user_created_at,
          user_name: referral.user_info?.user_name,
          user_email: referral.user_info?.user_email,
        },
        remaining_time: referral.remaining_time,
        is_active: referral.is_active,
        // Data agregat
        total_commission: 0,
        referral_count: 0,
        referrals: [], // Simpan semua referral untuk detail
        status: referral.status,
        latest_created_at: referral.created_at
      });
    }
    
    const userEntry = userMap.get(userKey);
    
    // Akumulasi komisi
    userEntry.total_commission += parseFloat(referral.commission_earned || 0);
    userEntry.referral_count += 1;
    userEntry.referrals.push(referral);
    
    // Update status ke yang terbaru
    if (new Date(referral.created_at) > new Date(userEntry.latest_created_at)) {
      userEntry.latest_created_at = referral.created_at;
      userEntry.status = referral.status;
    }
  });
  
  return Array.from(userMap.values());
}

exports.manualCleanupExpiredRelationships = async (req, res) => {
  try {
    const {
      resetExpiredAffiliateRelationships,
    } = require("../jobs/affiliateCleanup");

    console.log("🔄 Starting manual cleanup...");

    const result = await resetExpiredAffiliateRelationships();

    res.json({
      success: true,
      message: `Manual cleanup completed: ${result.updated} updated, ${result.cleaned} cleaned`,
      data: result,
    });
  } catch (error) {
    console.error("Error in manual cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Gagal melakukan cleanup: " + error.message,
    });
  }
};

exports.updateAllExpiryDates = async (req, res) => {
  try {
    const {
      updateAllAffiliateExpiryDates,
    } = require("../jobs/affiliateCleanup");

    const affectedRows = await updateAllAffiliateExpiryDates();

    res.json({
      success: true,
      message: `Berhasil update ${affectedRows} expiry dates berdasarkan setting baru`,
      data: { affected_rows: affectedRows },
    });
  } catch (error) {
    console.error("Error updating expiry dates:", error);
    res.status(500).json({
      success: false,
      message: "Gagal update expiry dates: " + error.message,
    });
  }
};

exports.debugUserAffiliateData = async (req, res) => {
  try {
    const { email } = req.query;

    const [userData] = await db.execute(
      `SELECT id, name, email, affiliate_joined_at, affiliate_expiry_date, created_at 
       FROM users WHERE email = ?`,
      [email]
    );

    const user = userData[0];

    res.json({
      success: true,
      data: {
        user_exists: !!user,
        user_data: user,
        debug_info: {
          affiliate_joined_at: user ? user.affiliate_joined_at : "null",
          affiliate_expiry_date: user ? user.affiliate_expiry_date : "null",
          user_created_at: user ? user.created_at : "null",
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
};