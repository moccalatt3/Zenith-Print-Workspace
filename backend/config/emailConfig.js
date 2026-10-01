const nodemailer = require("nodemailer");

const createTransporter = async () => {
  try {
    console.log("🔄 Attempting to connect to 3D Print Labs SMTP...");
    console.log("📧 Host:", process.env.EMAIL_HOST);
    console.log("👤 User:", process.env.EMAIL_USER);
    console.log("🚪 Port:", process.env.EMAIL_PORT);
    console.log("🔐 Secure: true");

    // SELALU pakai 3D Print Labs SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "mail.3dprintlabs.co.id",
      port: parseInt(process.env.EMAIL_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || "noreply@3dprintlabs.co.id",
        pass: process.env.EMAIL_PASS || "?$wR{Zv6RJQ_r0B4",
      },
      debug: true,
      logger: true,
    });

    // Verify connection configuration
    console.log("🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP 3D Print Labs connected successfully");

    return transporter;
  } catch (error) {
    console.error("❌❌❌ SMTP 3D Print Labs CONNECTION FAILED:");
    console.error("Error details:", error.message);

    // THROW ERROR instead of fallback
    throw new Error(`SMTP Connection Failed: ${error.message}`);
  }
};

// ✅ PERBAIKAN: Export functionnya saja, tanpa execute ()
module.exports = createTransporter;
