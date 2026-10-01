const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./config/db");
const path = require("path"); 

dotenv.config();

const app = express();

// CORS Configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes"); 
const paymentRoutes = require("./routes/paymentRoutes"); 
const affiliateRoutes = require("./routes/affiliateRoutes");
const homeRoutes = require("./routes/homeRoutes");
const contactRoutes = require("./routes/contactRoutes");
const materialRoutes = require("./routes/materialRoutes");
const adminCustomerRoutes = require("./routes/adminCustomerRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const bankRoutes = require("./routes/bankRoutes");
const logRoutes = require("./routes/logs");
const popupRoutes = require("./routes/popupRoutes");

const { startAffiliateCleanupJob } = require("./jobs/affiliateCleanup");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/orders", orderRoutes); 
app.use("/api/user/payments", paymentRoutes);
app.use("/api/affiliate", affiliateRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/home", homeRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/user/profile", userProfileRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/admin/logs", logRoutes);
app.use("/api/popup", popupRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "3D Printing API aktif & aman 🚀" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err);
  res.status(500).json({ message: "Terjadi kesalahan di server." });
});

const PORT = process.env.PORT || 4000;

startAffiliateCleanupJob();

app.listen(PORT, () => {
  console.log(
    `🚀 Server berjalan di mode ${
      process.env.NODE_ENV || "development"
    } pada port ${PORT}`
  );
});
