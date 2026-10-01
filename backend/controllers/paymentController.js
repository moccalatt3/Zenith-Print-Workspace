const db = require("../config/db");
const path = require("path");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const notificationService = require("../services/notificationService");

function calculatePaymentUpdates(currentOrder, paymentAmount) {
  const totalAmount = parseFloat(currentOrder.total_amount || 0);
  const currentPaid = parseFloat(currentOrder.paid_amount || 0);
  const currentRemaining = parseFloat(currentOrder.remaining_amount || 0);

  console.log("🔧 Kalkulasi pembayaran:", {
    totalAmount,
    currentPaid,
    currentRemaining,
    paymentAmount,
  });

  // ✅ Validasi: Pastikan amount positif
  if (paymentAmount <= 0) {
    throw new Error("Jumlah pembayaran harus lebih dari 0");
  }

  // ✅ Validasi: Pastikan tidak melebihi remaining amount
  const maxAllowedAmount = currentRemaining;
  if (paymentAmount > maxAllowedAmount) {
    throw new Error(
      `Jumlah pembayaran (${formatCurrency(
        paymentAmount
      )}) melebihi sisa tagihan (${formatCurrency(maxAllowedAmount)})`
    );
  }

  // ✅ Hitung nilai baru dengan guarantee tidak minus
  const newPaidAmount = currentPaid + paymentAmount;
  const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);

  // ✅ Pastikan paid_amount tidak melebihi total_amount
  const finalPaidAmount = Math.min(newPaidAmount, totalAmount);
  const finalRemainingAmount = Math.max(0, totalAmount - finalPaidAmount);

  // ✅ Tentukan status pembayaran
  let paymentStatus = "partial";
  if (finalRemainingAmount <= 0) {
    paymentStatus = "paid";
  } else if (finalPaidAmount === 0) {
    paymentStatus = "pending";
  } else if (finalPaidAmount > 0 && finalRemainingAmount > 0) {
    paymentStatus = "partial";
  }

  console.log("🔧 Hasil kalkulasi:", {
    paymentAmount,
    finalPaidAmount,
    finalRemainingAmount,
    paymentStatus,
  });

  return {
    paymentAmount: paymentAmount,
    paidAmount: finalPaidAmount,
    remainingAmount: finalRemainingAmount,
    paymentStatus: paymentStatus,
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Helper function untuk status info
function getOrderStatusInfo(orderStatus, paymentStatus) {
  const statusMap = {
    under_review: {
      title: "Under Review",
      message: "Order Anda sedang dalam proses review oleh tim kami.",
      color: "yellow",
      icon: "clock",
    },
    waiting_payment: {
      title: "Menunggu Pembayaran",
      message: "Order telah disetujui. Silakan lakukan pembayaran.",
      color: "blue",
      icon: "dollar",
    },
    payment_received: {
      title: "Menunggu Verifikasi",
      message: "Bukti pembayaran telah diupload. Menunggu verifikasi admin.",
      color: "blue",
      icon: "clock",
    },
    printing: {
      title: "Payment Confirmed!",
      message:
        "Thank you for your payment. We've received your payment and payment is confirmed. Order sedang diproses.",
      color: "green",
      icon: "check",
    },
    final_touchup: {
      title: "Final Touchup",
      message: "Order sedang dalam proses finishing.",
      color: "purple",
      icon: "brush",
    },
    ready_to_ship: {
      title: "Ready to Ship",
      message: "Order telah selesai dan siap dikirim.",
      color: "green",
      icon: "truck",
    },
    completed: {
      title: "Completed",
      message: "Order telah selesai dan terkirim.",
      color: "green",
      icon: "check-circle",
    },
  };

  // Jika payment sudah verified, tampilkan status khusus
  if (paymentStatus === "verified" && orderStatus === "printing") {
    return {
      title: "Payment Confirmed!",
      message:
        "Thank you for your payment. We've received your payment and payment is confirmed. Order sedang diproses.",
      color: "green",
      icon: "check",
    };
  }

  return (
    statusMap[orderStatus] || {
      title: "Unknown Status",
      message: "Status tidak dikenali",
      color: "gray",
      icon: "help",
    }
  );
}

const paymentController = {
  async uploadPaymentProof(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        orderId,
        amount,
        payment_method = "transfer",
        bankName = "",
        accountNumber = "",
        accountHolder = "",
      } = req.body;

      const userId = req.user.id;
      const paymentProofFile = req.file;

      console.log("💰 Processing payment proof upload:", {
        orderId,
        amount: parseFloat(amount),
        userId,
        file: paymentProofFile
          ? {
              filename: paymentProofFile.filename,
              path: paymentProofFile.path,
              destination: paymentProofFile.destination,
            }
          : "No file",
      });

      // Validasi required fields
      if (!orderId || !amount) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Order ID dan amount harus diisi",
        });
      }

      // Validasi file
      if (!paymentProofFile) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Bukti pembayaran harus diupload",
        });
      }

      // Cek order exists dan milik user yang benar
      const [orders] = await connection.execute(
        `SELECT o.*, u.id as user_id 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       WHERE o.id = ? AND o.user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        await connection.rollback();

        // Hapus file yang sudah diupload
        if (paymentProofFile.path) {
          fs.unlinkSync(paymentProofFile.path);
        }

        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];
      const orderAmount = parseFloat(order.total_amount);
      const paymentAmount = parseFloat(amount);

      console.log("🔍 Order validation:", {
        orderAmount,
        paymentAmount,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
      });

      // Validasi order status
      if (order.order_status !== "waiting_payment") {
        await connection.rollback();
        // Hapus file yang sudah diupload
        if (paymentProofFile.path) {
          fs.unlinkSync(paymentProofFile.path);
        }
        return res.status(400).json({
          success: false,
          message: `Order tidak dalam status menunggu pembayaran. Status saat ini: ${order.order_status}`,
        });
      }

      // ✅ PERBAIKAN: BUAT SUBFOLDER USER_ID JIKA BELUM ADA
      const userUploadDir = path.join(
        __dirname,
        "..",
        "uploads",
        "payments",
        userId.toString()
      );
      if (!fs.existsSync(userUploadDir)) {
        fs.mkdirSync(userUploadDir, { recursive: true });
        console.log(`✅ Created user upload directory: ${userUploadDir}`);
      }

      // ✅ PERBAIKAN: PINDAHKAN FILE KE SUBFOLDER USER_ID
      const newFileName = `payment-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 8)}.png`;
      const newFilePath = path.join(userUploadDir, newFileName);

      // Pindahkan file dari temporary location ke user folder
      fs.renameSync(paymentProofFile.path, newFilePath);

      // ✅ PERBAIKAN: SIMPAN PATH YANG BENAR KE DATABASE (DENGAN SUBFOLDER USER_ID)
      const paymentProofUrl = `/uploads/payments/${userId}/${newFileName}`;

      console.log("📁 File moved to:", {
        from: paymentProofFile.path,
        to: newFilePath,
        dbUrl: paymentProofUrl,
      });

      // Generate transaction number
      const transactionNumber = `PAY-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;

      // Simpan payment transaction
      const [transactionResult] = await connection.execute(
        `INSERT INTO payment_transactions (
        order_id, transaction_number, amount, payment_method, 
        payment_proof_url, bank_name, account_number, account_holder, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          transactionNumber,
          paymentAmount,
          payment_method,
          paymentProofUrl, // ✅ SEKARANG SUDAH INCLUDES USER_ID SUBFOLDER
          bankName,
          accountNumber,
          accountHolder,
          "waiting_verification",
        ]
      );

      // Update order status ke payment_received
      await connection.execute(
        `UPDATE orders 
       SET order_status = 'payment_received', 
           status_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [orderId]
      );

      // Add to status history
      await connection.execute(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) 
       VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          "waiting_payment",
          "payment_received",
          userId,
          `Bukti pembayaran diupload - Menunggu verifikasi admin. Amount: ${formatCurrency(
            paymentAmount
          )}`,
        ]
      );

      await connection.commit();

      console.log("✅ Payment proof uploaded successfully:", {
        transactionId: transactionResult.insertId,
        transactionNumber,
        orderId,
        amount: paymentAmount,
        proofUrl: paymentProofUrl,
      });

      res.json({
        success: true,
        message:
          "Bukti pembayaran berhasil diupload dan menunggu verifikasi admin",
        data: {
          transactionId: transactionResult.insertId,
          transactionNumber,
          orderId,
          amount: paymentAmount,
          status: "waiting_verification",
        },
      });
    } catch (error) {
      await connection.rollback();

      // Hapus file yang sudah diupload jika ada error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Error deleting uploaded file:", fileError);
        }
      }

      console.error("❌ Error uploading payment proof:", error);
      res.status(500).json({
        success: false,
        message: "Gagal upload bukti pembayaran: " + error.message,
      });
    } finally {
      connection.release();
    }
  },
  // ==========================================
  // 🔍 FUNGSI: Get order status untuk frontend
  // ==========================================
  async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      // Fallback decode token
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

      // Verify order belongs to user
      const [orders] = await db.execute(
        `SELECT o.*, 
              pt.status as payment_transaction_status,
              pt.verified_at,
              pt.transaction_number
       FROM orders o 
       LEFT JOIN payment_transactions pt ON o.id = pt.order_id 
       WHERE o.id = ? AND o.user_id = ?
       ORDER BY pt.created_at DESC 
       LIMIT 1`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      // Get order items
      const [orderItems] = await db.execute(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [orderId]
      );

      // Get status history
      const [statusHistory] = await db.execute(
        `SELECT * FROM order_status_history 
       WHERE order_id = ? 
       ORDER BY created_at DESC`,
        [orderId]
      );

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            created_at: order.created_at,
            status_updated_at: order.status_updated_at,
          },
          items: orderItems,
          statusHistory: statusHistory,
          payment: {
            transaction_status: order.payment_transaction_status,
            verified_at: order.verified_at,
            transaction_number: order.transaction_number,
          },
          statusInfo: getOrderStatusInfo(
            order.order_status,
            order.payment_transaction_status
          ),
        },
      });
    } catch (error) {
      console.error("Error getting order status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil status order: " + error.message,
      });
    }
  },

  async verifyPayment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { paymentId } = req.params;
      const { action, rejectionReason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Admin ID tidak valid.",
        });
      }

      console.log(`🔍 Verifying payment ${paymentId} with action: ${action}`);

      // ✅ Ambil data transaksi pembayaran dengan informasi affiliate
      const [payments] = await connection.execute(
        `SELECT pt.*, o.id as order_id, o.order_number, o.total_amount, 
          o.user_id, o.order_status, o.payment_status, o.affiliate_id,
          o.commission_amount, o.commission_status, o.referral_code,
          u.name as customer_name, u.email as customer_email
     FROM payment_transactions pt
     JOIN orders o ON pt.order_id = o.id
     JOIN users u ON o.user_id = u.id
     WHERE pt.id = ?`,
        [paymentId]
      );

      if (payments.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transaksi pembayaran tidak ditemukan.",
        });
      }

      const payment = payments[0];
      const orderId = payment.order_id;

      if (action === "approve") {
        // ✅ APPROVE PAYMENT - PAYMENT CONFIRMED!
        console.log(`✅ Approving payment for order: ${payment.order_number}`);

        // Update status transaksi menjadi verified
        await connection.execute(
          `UPDATE payment_transactions SET 
      status = 'verified',
      verified_by = ?,
      verified_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
          [adminId, paymentId]
        );

        // ✅ Update order status menjadi printing (langsung proses printing)
        const newOrderStatus = "printing";
        const newPaymentStatus = "paid";

        await connection.execute(
          `UPDATE orders SET 
      order_status = ?,
      payment_status = ?,
      status_updated_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
          [newOrderStatus, newPaymentStatus, orderId]
        );

        // ✅ KIRIM KE AFFILIATE JIKA ADA - HANYA DI SINI!
        if (payment.affiliate_id && payment.commission_amount > 0) {
          console.log(
            `💰 Processing affiliate commission for order: ${payment.order_number}`
          );

          try {
            // ✅ PASTIKAN referred_user_id TIDAK KOSONG
            const referredUserId = payment.user_id;
            if (!referredUserId) {
              throw new Error("referred_user_id tidak boleh kosong");
            }

            // ✅ UPDATE COMMISSION STATUS MENJADI 'earned'
            await connection.execute(
              `UPDATE orders SET 
            commission_status = 'earned',
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
              [orderId]
            );

            // ✅ UPDATE AFFILIATE STATISTICS - HANYA DI SINI!
            await connection.execute(
              `UPDATE affiliates SET 
            total_referrals = total_referrals + 1,
            active_referrals = active_referrals + 1,
            pending_earnings = pending_earnings + ?,
            total_earnings = total_earnings + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
              [
                payment.commission_amount,
                payment.commission_amount,
                payment.affiliate_id,
              ]
            );

            // ✅ BUAT AFFILIATE EARNINGS RECORD
            await connection.execute(
              `INSERT INTO affiliate_earnings (
            affiliate_id, order_id, referred_user_id, 
            commission_amount, commission_rate, status, earned_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
              [
                payment.affiliate_id,
                orderId,
                referredUserId, // ✅ referred_user_id TIDAK KOSONG
                payment.commission_amount,
                (payment.commission_amount / payment.total_amount) * 100,
                "earned",
              ]
            );

            console.log(`✅ Affiliate commission processed:`, {
              affiliate_id: payment.affiliate_id,
              referred_user_id: referredUserId,
              commission_amount: payment.commission_amount,
              order_id: orderId,
            });
          } catch (affiliateError) {
            console.error(
              `❌ Error processing affiliate commission:`,
              affiliateError
            );
            // Jangan rollback seluruh transaksi hanya karena affiliate error
            // Tapi log dan lanjutkan
          }
        } else {
          console.log(
            `ℹ️ No affiliate commission to process for order: ${payment.order_number}`
          );
        }

        // ✅ Simpan riwayat status
        await connection.execute(
          `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            payment.order_status,
            newOrderStatus,
            adminId,
            "Payment Confirmed! Pembayaran telah diverifikasi dan dikonfirmasi. Order akan segera diproses." +
              (payment.affiliate_id
                ? ` Commission affiliate: ${formatCurrency(
                    payment.commission_amount
                  )}`
                : ""),
          ]
        );

        // ✅ BUAT NOTIFIKASI UNTUK USER - PAYMENT CONFIRMED!
        await notificationService.createUserNotification(
          payment.user_id,
          "Payment Confirmed!",
          `Thank you for your payment. We've received your payment and payment is confirmed. Order #${payment.order_number} akan segera diproses.`,
          "payment_confirmed",
          {
            action_url: `/orders/${orderId}`,
            order_id: orderId,
            payment_id: paymentId,
            amount: payment.amount,
            order_number: payment.order_number,
          }
        );

        await connection.commit();

        res.json({
          success: true,
          message: `Payment Confirmed! Pembayaran untuk order #${payment.order_number} berhasil diverifikasi. Order akan segera diproses.`,
          data: {
            orderId,
            orderNumber: payment.order_number,
            newOrderStatus: "printing",
            paymentStatus: "paid",
            verifiedAt: new Date(),
            affiliateProcessed: !!payment.affiliate_id,
            commissionAmount: payment.commission_amount,
            message:
              "Payment Confirmed! Thank you for your payment. We've received your payment and payment is confirmed.",
          },
        });
      } else if (action === "reject") {
        // ✅ REJECT PAYMENT
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: "Alasan penolakan wajib diisi.",
          });
        }

        console.log(`❌ Rejecting payment for order: ${payment.order_number}`);

        // Update status transaksi menjadi rejected
        await connection.execute(
          `UPDATE payment_transactions SET 
      status = 'rejected',
      verified_by = ?,
      verified_at = CURRENT_TIMESTAMP,
      rejection_reason = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
          [adminId, rejectionReason, paymentId]
        );

        // Kembalikan order status ke waiting_payment
        const newOrderStatus = "waiting_payment";
        const newPaymentStatus = "pending";

        await connection.execute(
          `UPDATE orders SET 
      order_status = ?,
      payment_status = ?,
      status_updated_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
          [newOrderStatus, newPaymentStatus, orderId]
        );

        // Simpan riwayat status
        await connection.execute(
          `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            payment.order_status,
            newOrderStatus,
            adminId,
            `Pembayaran ditolak: ${rejectionReason}`,
          ]
        );

        // ✅ BUAT NOTIFIKASI UNTUK USER
        await notificationService.createUserNotification(
          payment.user_id,
          "Pembayaran Ditolak",
          `Pembayaran untuk order #${payment.order_number} ditolak. Alasan: ${rejectionReason}. Silakan upload bukti pembayaran yang valid.`,
          "payment_rejected",
          {
            action_url: `/orders/${orderId}`,
            order_id: orderId,
            payment_id: paymentId,
            rejection_reason: rejectionReason,
          }
        );

        await connection.commit();

        res.json({
          success: true,
          message: `Pembayaran untuk order #${payment.order_number} ditolak.`,
          data: {
            orderId,
            orderNumber: payment.order_number,
            newOrderStatus,
            rejectionReason,
            rejectedAt: new Date(),
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Action tidak valid. Gunakan 'approve' atau 'reject'.",
        });
      }
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error verifying payment:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memverifikasi pembayaran: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  async getPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;
      let userId = req.user?.id;

      // Fallback decode token
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

      const [payments] = await db.execute(
        `SELECT pt.*, o.order_number, o.total_amount, o.paid_amount, o.remaining_amount,
             o.order_status, u.name as customer_name, u.email as customer_email
       FROM payment_transactions pt
       JOIN orders o ON pt.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE pt.id = ? AND o.user_id = ?`,
        [paymentId, userId]
      );

      if (payments.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transaksi pembayaran tidak ditemukan.",
        });
      }

      const payment = payments[0];

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error getting payment details:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil detail pembayaran: " + error.message,
      });
    }
  },

  // ==========================================
  // 🔍 FUNGSI: Get payments waiting for verification
  // ==========================================
  async getPaymentsWaitingVerification(req, res) {
    try {
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: "Admin ID tidak valid.",
        });
      }

      const [payments] = await db.execute(
        `SELECT pt.*, o.order_number, o.total_amount, o.user_type,
              u.name as customer_name, u.email as customer_email
       FROM payment_transactions pt
       JOIN orders o ON pt.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE pt.status = 'waiting_verification'
       ORDER BY pt.created_at DESC`
      );

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Error getting payments waiting verification:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data pembayaran: " + error.message,
      });
    }
  },

  // ==========================================
  // 🔧 FUNGSI: Repair data yang corrupt (minus)
  // ==========================================
  async repairCorruptedPayments(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      console.log("🔧 Memulai perbaikan data pembayaran yang corrupt...");

      // ✅ Cari orders dengan nilai minus di paid_amount atau remaining_amount
      const [corruptedOrders] = await connection.execute(
        `SELECT id, order_number, total_amount, paid_amount, remaining_amount 
         FROM orders 
         WHERE paid_amount < 0 OR remaining_amount < 0 
         OR paid_amount > total_amount 
         OR remaining_amount > total_amount`
      );

      console.log(
        `🔧 Ditemukan ${corruptedOrders.length} order yang perlu diperbaiki`
      );

      let repairedCount = 0;

      for (const order of corruptedOrders) {
        console.log(`🔧 Memperbaiki order: ${order.order_number}`, {
          current: {
            total: order.total_amount,
            paid: order.paid_amount,
            remaining: order.remaining_amount,
          },
        });

        // ✅ Hitung ulang dari payment transactions
        const [payments] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) as total_paid 
           FROM payment_transactions 
           WHERE order_id = ? AND status != 'rejected'`,
          [order.id]
        );

        const actualPaidAmount = parseFloat(payments[0]?.total_paid || 0);
        const actualRemainingAmount = Math.max(
          0,
          order.total_amount - actualPaidAmount
        );

        // ✅ Tentukan status berdasarkan pembayaran aktual
        let newPaymentStatus = "partial";
        if (actualRemainingAmount <= 0) {
          newPaymentStatus = "paid";
        } else if (actualPaidAmount === 0) {
          newPaymentStatus = "pending";
        }

        // ✅ Update order dengan nilai yang benar
        await connection.execute(
          `UPDATE orders SET 
            paid_amount = ?,
            remaining_amount = ?,
            payment_status = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [actualPaidAmount, actualRemainingAmount, newPaymentStatus, order.id]
        );

        console.log(`✅ Order ${order.order_number} diperbaiki:`, {
          paid: actualPaidAmount,
          remaining: actualRemainingAmount,
          status: newPaymentStatus,
        });

        repairedCount++;
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Berhasil memperbaiki ${repairedCount} order yang corrupt`,
        data: {
          repairedCount,
          totalChecked: corruptedOrders.length,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error repairing corrupted payments:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbaiki data: " + error.message,
      });
    } finally {
      connection.release();
    }
  },

  // ==========================================
  // 💳 Get user payments
  // ==========================================
  async getUserPayments(req, res) {
    try {
      let userId = req.user?.id;

      // Fallback decode token
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

      const [payments] = await db.execute(
        `SELECT pt.*, o.order_number, o.total_amount, o.paid_amount, o.remaining_amount
         FROM payment_transactions pt
         JOIN orders o ON pt.order_id = o.id
         WHERE o.user_id = ?
         ORDER BY pt.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Error getting user payments:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data pembayaran: " + error.message,
      });
    }
  },

  // ==========================================
  // 🔍 Get payment transactions by order ID
  // ==========================================
  async getPaymentTransactionsByOrder(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      // Fallback decode token
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

      // Verify order belongs to user
      const [orders] = await db.execute(
        `SELECT id FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const [payments] = await db.execute(
        `SELECT * FROM payment_transactions 
         WHERE order_id = ? 
         ORDER BY created_at DESC`,
        [orderId]
      );

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Error getting payment transactions:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data transaksi pembayaran: " + error.message,
      });
    }
  },

  // ==========================================
  // 📊 Get payment summary for order
  // ==========================================
  async getPaymentSummary(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      if (!userId) {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (token) {
          try {
            const decoded = jwt.decode(token);
            userId = decoded?.id || decoded?.userId;
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

      // Verify order belongs to user
      const [orders] = await db.execute(
        `SELECT id, order_number, total_amount, paid_amount, remaining_amount, payment_status
         FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      // Get payment history
      const [payments] = await db.execute(
        `SELECT * FROM payment_transactions 
         WHERE order_id = ? 
         ORDER BY created_at DESC`,
        [orderId]
      );

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            paid_amount: order.paid_amount,
            remaining_amount: order.remaining_amount,
            payment_status: order.payment_status,
          },
          payments: payments,
          summary: {
            total_paid: payments.reduce(
              (sum, payment) => sum + parseFloat(payment.amount),
              0
            ),
            payment_count: payments.length,
            is_fully_paid: order.remaining_amount <= 0,
          },
        },
      });
    } catch (error) {
      console.error("Error getting payment summary:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil summary pembayaran: " + error.message,
      });
    }
  },

  // ==========================================
  // 🔍 FUNGSI BARU: Get payment status untuk frontend
  // ==========================================
  async getPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      let userId = req.user?.id;

      // Fallback decode token
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

      // Verify order belongs to user
      const [orders] = await db.execute(
        `SELECT id, order_number, order_status, payment_status 
       FROM orders WHERE id = ? AND user_id = ?`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      const order = orders[0];

      // Get latest payment transaction
      const [payments] = await db.execute(
        `SELECT * FROM payment_transactions 
       WHERE order_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
        [orderId]
      );

      const latestPayment = payments.length > 0 ? payments[0] : null;

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
          },
          payment: latestPayment,
          statusInfo: getOrderStatusInfo(
            order.order_status,
            latestPayment?.status
          ),
        },
      });
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil status pembayaran: " + error.message,
      });
    }
  },
};

module.exports = paymentController;
