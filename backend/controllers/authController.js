const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const Affiliate = require("../models/Affiliate");
const User = require("../models/User");
const createTransporter = require("../config/emailConfig");
const { getResetPasswordEmail } = require("../utils/emailTemplates");
const crypto = require("crypto");

const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      userId: userId,
      role,
    },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "7d" }
  );
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password harus diisi",
      });
    }

    const [users] = await db.execute(
      "SELECT id, email, password, role, name, status, user_type FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Akun Anda tidak aktif. Silakan hubungi administrator.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

const register = async (req, res) => {
  try {
    console.log("=== REGISTER DEBUG ===");
    console.log("Request body:", req.body);

    const { name, email, password, userType, referralCode, companyName } =
      req.body;

    // Validasi field wajib
    if (!name || !email || !password || !userType) {
      console.log("Validation failed - missing fields");
      return res.status(400).json({
        success: false,
        message: "Semua field harus diisi",
      });
    }

    // Validasi khusus untuk company
    if (userType === "company" && (!companyName || companyName.trim() === "")) {
      console.log("Validation failed - company name required");
      return res.status(400).json({
        success: false,
        message: "Nama perusahaan harus diisi untuk tipe company",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validation failed - invalid email");
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid",
      });
    }

    try {
      const [existingUsers] = await db.execute(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existingUsers.length > 0) {
        console.log("Email already exists:", email);
        return res.status(400).json({
          success: false,
          message: "Email sudah terdaftar",
        });
      }
    } catch (emailError) {
      console.error("Error checking email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memeriksa email",
      });
    }

    console.log("All validations passed");

    let affiliateId = null;
    let affiliateData = null;
    let affiliateExpiryDate = null;
    let affiliateJoinedAt = null;

    if (referralCode && referralCode.trim() !== "") {
      try {
        console.log("Validating referral code:", referralCode);

        const [affiliates] = await db.execute(
          'SELECT id, name, email, status FROM affiliates WHERE referral_code = ? AND status = "active"',
          [referralCode.trim()]
        );

        if (affiliates.length === 0) {
          console.log("Referral code not found or inactive");
          return res.status(400).json({
            success: false,
            message: "Kode referral tidak valid atau tidak aktif",
          });
        }

        affiliateData = affiliates[0];
        affiliateId = affiliateData.id;

        console.log("Referral code valid. Affiliate:", affiliateData.name);

        // 🔧 AMBIL SETTING EXPIRY DARI DATABASE
        try {
          console.log("Getting affiliate expiry settings from database...");
          const [settings] = await db.execute(
            "SELECT setting_value FROM affiliate_settings WHERE setting_name = 'relationship_expiry_months'"
          );

          if (settings.length === 0) {
            console.error("Affiliate expiry setting not found in database");
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
            return res.status(500).json({
              success: false,
              message:
                "Konfigurasi expiry affiliate tidak valid. Silakan hubungi administrator.",
            });
          }

          // 🗓️ SET EXPIRY DATE BERDASARKAN SETTING
          affiliateJoinedAt = new Date();
          affiliateExpiryDate = new Date();
          affiliateExpiryDate.setMonth(
            affiliateExpiryDate.getMonth() + expiryMonths
          );

          console.log("Affiliate expiry settings applied:", {
            expiryMonths,
            joinedAt: affiliateJoinedAt,
            expiryDate: affiliateExpiryDate,
          });
        } catch (settingsError) {
          console.error("Error getting affiliate settings:", settingsError);
          return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil konfigurasi sistem.",
          });
        }
      } catch (referralError) {
        console.error("Error validating referral code:", referralError);
        return res.status(500).json({
          success: false,
          message: "Terjadi kesalahan saat memvalidasi kode referral",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("Inserting user into database...");

    // 🔧 UPDATE QUERY UNTUK INCLUDE COMPANY_NAME
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password, role, status, user_type, company_name, affiliate_id, affiliate_joined_at, affiliate_expiry_date) 
       VALUES (?, ?, ?, 'customer', 'active', ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        userType,
        userType === "company" ? companyName?.trim() : null, // Hanya simpan jika company
        affiliateId,
        affiliateJoinedAt,
        affiliateExpiryDate,
      ]
    );

    const userId = result.insertId;
    console.log("User inserted with ID:", userId);

    console.log(
      "✅ User registered successfully with affiliate relationship (NO referral record created)"
    );

    const token = generateToken(userId, "customer");

    // 🔧 UPDATE QUERY UNTUK AMBIL DATA BARU TERMASUK COMPANY_NAME
    const [users] = await db.execute(
      "SELECT id, name, email, role, status, user_type, company_name, affiliate_id, affiliate_joined_at, affiliate_expiry_date, created_at FROM users WHERE id = ?",
      [userId]
    );

    const newUser = users[0];

    console.log("Registration successful for:", newUser.email);

    let message = "Registrasi berhasil";
    if (affiliateData) {
      message = `Registrasi berhasil! Anda direferensikan oleh ${
        affiliateData.name
      }. Relationship akan aktif sampai ${affiliateExpiryDate.toLocaleDateString(
        "id-ID"
      )}`;
    }

    res.status(201).json({
      success: true,
      message: message,
      data: {
        user: newUser,
        token,
        referredBy: affiliateData
          ? {
              name: affiliateData.name,
              email: affiliateData.email,
              expiryDate: affiliateExpiryDate,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("=== REGISTER ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    if (error.code) {
      console.error("MySQL Error code:", error.code);
      console.error("MySQL Error message:", error.sqlMessage);
      console.error("SQL:", error.sql);
    }

    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Validate referral code
const validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "Kode referral harus diisi",
      });
    }

    const affiliate = await Affiliate.getByReferralCode(referralCode.trim());

    if (!affiliate) {
      return res.status(400).json({
        success: false,
        message: "Kode referral tidak valid",
      });
    }

    if (affiliate.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Kode referral tidak aktif",
      });
    }

    res.json({
      success: true,
      message: "Kode referral valid",
      data: {
        affiliate: {
          name: affiliate.name,
          commission_rate: affiliate.commission_rate,
        },
      },
    });
  } catch (error) {
    console.error("Validate referral code error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

// Forgot Password - FIXED VERSION
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email harus diisi",
      });
    }

    console.log("📧 Forgot password request:", email);

    const [users] = await db.execute(
      "SELECT id, name, email FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      console.log("❌ Email not found in database");
      return res.json({
        success: true,
        message: "Jika email terdaftar, instruksi reset akan dikirim",
      });
    }

    const user = users[0];
    console.log("✅ User found:", user.name);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.execute("DELETE FROM password_resets WHERE email = ?", [
      user.email,
    ]);

    await db.execute(
      "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
      [user.email, resetToken, expiresAt]
    );

    console.log("📝 Reset token saved to database");

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log("🔗 Reset link:", resetLink);

    const emailTemplate = getResetPasswordEmail(user.name, resetLink);

    console.log("📤 Sending email to:", user.email);

    try {
      const transporter = await createTransporter();
      
      // ✅ TARUH DI SINI - GANTI mailOptions YANG LAMA
      const mailOptions = {
        from: '"ZENITH PRINT LABS" <noreply@3dprintlabs.co.id>',
        to: user.email,
        bcc: 'noreply@3dprintlabs.co.id', // ✅ 100% MASUK INBOX
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      };

      console.log("🔄 Attempting to send email...");
      const emailResult = await transporter.sendMail(mailOptions);
      
      console.log("✅ Email sent successfully!");
      console.log("📧 Message ID:", emailResult.messageId);
      console.log("👤 From: noreply@3dprintlabs.co.id");
      console.log("🎯 To:", user.email);
      console.log("📨 BCC: noreply@3dprintlabs.co.id");
      console.log("📨 Response:", emailResult.response);

      return res.json({
        success: true,
        message: "Instruksi reset password telah dikirim ke email Anda",
      });

    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      
      await db.execute("DELETE FROM password_resets WHERE email = ?", [
        user.email,
      ]);

      return res.status(500).json({
        success: false,
        message: "Gagal mengirim email reset password. Silakan coba lagi.",
      });
    }

  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token dan password baru harus diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    const [tokens] = await db.execute(
      "SELECT * FROM password_resets WHERE token = ? AND used = FALSE AND expires_at > NOW()",
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token tidak valid atau sudah kadaluarsa",
      });
    }

    const resetRecord = tokens[0];
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password user
    await db.execute("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      resetRecord.email,
    ]);

    // Tandai token sebagai digunakan
    await db.execute("UPDATE password_resets SET used = TRUE WHERE token = ?", [
      token,
    ]);

    console.log("✅ Password reset successful for:", resetRecord.email);

    res.json({
      success: true,
      message: "Password berhasil direset. Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

module.exports = {
  login,
  register,
  validateReferralCode,
  forgotPassword,
  resetPassword,
};
