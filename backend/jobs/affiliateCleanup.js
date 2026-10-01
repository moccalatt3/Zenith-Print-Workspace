// File: backend/jobs/affiliateCleanup.js
const db = require("../config/db");
const cron = require("node-cron");

// Fungsi untuk get config dari affiliate_settings
async function getAffiliateConfig(key, defaultValue = null) {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT setting_value FROM affiliate_settings WHERE setting_name = ? ORDER BY created_at DESC LIMIT 1",
      [key]
    );

    return rows.length > 0 ? rows[0].setting_value : defaultValue;
  } catch (error) {
    console.error("❌ Error getting affiliate config:", error);
    return defaultValue;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ FUNGSI BARU: Validate cron expression
function isValidCronExpression(cronString) {
  try {
    const parts = cronString.split(" ");
    if (parts.length !== 5) return false;

    const task = cron.schedule(cronString, () => {});
    task.stop();
    return true;
  } catch (error) {
    return false;
  }
}

let currentCronJob = null;

// ✅ FUNGSI UTAMA: Reset relationships yang expired
async function resetExpiredAffiliateRelationships() {
  let connection;
  try {
    connection = await db.getConnection();

    // Get current settings
    const expiryMonths = await getAffiliateConfig(
      "relationship_expiry_months",
      "1"
    );
    const schedule = await getAffiliateConfig(
      "cleanup_schedule",
      "*/1 * * * *"
    );

    console.log(
      `🔄 Running cleanup - Expiry: ${expiryMonths} bulan, Schedule: ${schedule}`
    );

    // 1. Reset relationships yang sudah expired
    const [cleanupResult] = await connection.execute(`
      UPDATE users 
      SET 
        affiliate_id = NULL,
        affiliate_joined_at = NULL, 
        affiliate_expiry_date = NULL,
        updated_at = NOW()
      WHERE affiliate_expiry_date IS NOT NULL 
        AND affiliate_expiry_date < NOW()
    `);

    console.log(
      `🧹 Cleaned ${cleanupResult.affectedRows} expired relationships`
    );

    // 2. Log detail untuk debugging
    if (cleanupResult.affectedRows > 0) {
      const [cleanedData] = await connection.execute(`
        SELECT u.email, u.affiliate_joined_at, u.affiliate_expiry_date 
        FROM users u 
        WHERE u.affiliate_expiry_date IS NOT NULL 
          AND u.affiliate_expiry_date < NOW()
        LIMIT 5
      `);
      console.log("📋 Sample cleaned data:", cleanedData);
    }

    return {
      cleaned: cleanupResult.affectedRows,
    };
  } catch (error) {
    console.error("❌ Error in affiliate cleanup:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ FUNGSI BARU: Set expiry dates untuk relationship baru
async function setAffiliateExpiryDates() {
  let connection;
  try {
    connection = await db.getConnection();

    const intervalMonths = await getAffiliateConfig(
      "relationship_expiry_months",
      "1"
    );

    console.log(
      `🔄 Setting affiliate expiry dates with ${intervalMonths} months interval...`
    );

    const [result] = await connection.execute(
      `
      UPDATE users 
      SET 
        affiliate_expiry_date = DATE_ADD(affiliate_joined_at, INTERVAL ? MONTH),
        updated_at = NOW()
      WHERE affiliate_id IS NOT NULL 
        AND affiliate_expiry_date IS NULL
        AND affiliate_joined_at IS NOT NULL
    `,
      [parseInt(intervalMonths)]
    );

    console.log(
      `✅ Set expiry dates for ${result.affectedRows} affiliate relationships`
    );

    return result.affectedRows;
  } catch (error) {
    console.error("❌ Error setting affiliate expiry dates:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ FUNGSI BARU: Update semua expiry dates yang sudah ada
async function updateAllAffiliateExpiryDates() {
  let connection;
  try {
    connection = await db.getConnection();

    // Get interval dari affiliate_settings
    const intervalMonths = await getAffiliateConfig(
      "relationship_expiry_months",
      "1"
    );

    console.log(
      `🔄 Updating ALL affiliate expiry dates to ${intervalMonths} months...`
    );

    const [result] = await connection.execute(
      `
      UPDATE users 
      SET 
        affiliate_expiry_date = DATE_ADD(affiliate_joined_at, INTERVAL ? MONTH),
        updated_at = NOW()
      WHERE affiliate_id IS NOT NULL 
        AND affiliate_joined_at IS NOT NULL
    `,
      [parseInt(intervalMonths)]
    );

    console.log(
      `✅ Updated expiry dates for ${result.affectedRows} affiliate relationships`
    );

    return result.affectedRows;
  } catch (error) {
    console.error("❌ Error updating affiliate expiry dates:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ FUNGSI: Restart job dengan setting baru
function restartCleanupJob() {
  if (currentCronJob) {
    currentCronJob.stop();
    console.log("🛑 Stopped previous cleanup job");
  }

  startAffiliateCleanupJob();
}

// ✅ FUNGSI: Start cleanup job
async function startAffiliateCleanupJob() {
  // Cek apakah job enabled
  const isEnabled = await getAffiliateConfig("cleanup_job_enabled", "true");

  if (isEnabled !== "true") {
    console.log("⏸️ Affiliate cleanup job is disabled");
    return;
  }

  // Get settings
  let schedule = await getAffiliateConfig("cleanup_schedule", "*/1 * * * *");
  const timezone = await getAffiliateConfig("cleanup_timezone", "Asia/Jakarta");
  const expiryMonths = await getAffiliateConfig(
    "relationship_expiry_months",
    "1"
  );

  // Validate cron expression
  if (!isValidCronExpression(schedule)) {
    console.warn(`⚠️ Invalid cron: ${schedule}, using default`);
    schedule = "*/1 * * * *";
  }

  console.log(`🚀 Starting cleanup job:`);
  console.log(`   📅 Expiry: ${expiryMonths} bulan`);
  console.log(`   ⏰ Schedule: ${schedule}`);
  console.log(`   🌍 Timezone: ${timezone}`);

  // Schedule job
  currentCronJob = cron.schedule(
    schedule,
    async () => {
      const now = new Date().toLocaleString("id-ID", { timeZone: timezone });
      console.log(`\n🎯 EXECUTING CLEANUP at ${now}`);

      try {
        // Set expiry dates untuk relationships baru
        await setAffiliateExpiryDates();

        // Cleanup yang sudah expired
        const result = await resetExpiredAffiliateRelationships();
        console.log(`✅ Cleanup completed: ${result.cleaned} cleaned`);
      } catch (error) {
        console.error("❌ Cleanup failed:", error);
      }
    },
    {
      scheduled: true,
      timezone: timezone,
    }
  );

  console.log("✅ Cleanup job scheduled successfully");
}

// ✅ FUNGSI: Get job info
async function getCleanupJobInfo() {
  const isEnabled = await getAffiliateConfig("cleanup_job_enabled", "true");
  const schedule = await getAffiliateConfig("cleanup_schedule", "*/1 * * * *");
  const timezone = await getAffiliateConfig("cleanup_timezone", "Asia/Jakarta");
  const expiryMonths = await getAffiliateConfig(
    "relationship_expiry_months",
    "1"
  );

  return {
    is_enabled: isEnabled === "true",
    schedule: schedule,
    timezone: timezone,
    expiry_months: parseInt(expiryMonths),
    is_running: currentCronJob !== null,
    next_runs: getNextRuns(schedule, timezone),
  };
}

// ✅ FUNGSI: Get next run times
function getNextRuns(cronExpression, timezone, count = 3) {
  try {
    const schedule = cron.schedule(cronExpression, () => {}, {
      scheduled: false,
      timezone: timezone,
    });

    const nextRuns = [];
    let date = new Date();

    for (let i = 0; i < count; i++) {
      date = schedule.nextDate(date);
      if (date) {
        nextRuns.push(
          date.toLocaleString("id-ID", {
            timeZone: timezone,
            dateStyle: "full",
            timeStyle: "medium",
          })
        );
      }
    }

    return nextRuns;
  } catch (error) {
    return ["Error calculating schedule"];
  }
}

// ✅ PASTIKAN SEMUA FUNGSI DI-EXPORT
module.exports = {
  resetExpiredAffiliateRelationships,
  setAffiliateExpiryDates, // ✅ INI YANG MISSING
  updateAllAffiliateExpiryDates, // ✅ INI JUGA
  startAffiliateCleanupJob,
  restartCleanupJob,
  getAffiliateConfig,
  getCleanupJobInfo,
  isValidCronExpression,
};
