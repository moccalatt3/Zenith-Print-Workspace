const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Pastikan folder uploads ada
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory:", uploadsDir);
}

// --- STORAGE UNTUK DISKON ---
const discountStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const discountDir = path.join(uploadsDir, "diskon");
      console.log("📁 Creating diskon directory:", discountDir);

      if (!fs.existsSync(discountDir)) {
        fs.mkdirSync(discountDir, { recursive: true });
        console.log("✅ Created diskon directory:", discountDir);
      }

      cb(null, discountDir);
    } catch (error) {
      console.error("❌ Error creating diskon directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `discount-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    console.log("📄 Saving discount image:", {
      original: file.originalname,
      savedAs: uniqueName,
      size: file.size,
      mimetype: file.mimetype,
    });

    cb(null, uniqueName);
  },
});

// --- STORAGE UNTUK MATERIALS ---
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const materialDir = path.join(uploadsDir, "materials");
      console.log("📁 Creating materials directory:", materialDir);

      if (!fs.existsSync(materialDir)) {
        fs.mkdirSync(materialDir, { recursive: true });
        console.log("✅ Created materials directory:", materialDir);
      }

      cb(null, materialDir);
    } catch (error) {
      console.error("❌ Error creating materials directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `material-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    console.log("📄 Saving material image:", {
      original: file.originalname,
      savedAs: uniqueName,
      size: file.size,
      mimetype: file.mimetype,
    });

    cb(null, uniqueName);
  },
});

// --- STORAGE UNTUK SLIDES ---
const slideStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const slideDir = path.join(uploadsDir, "slides");
      console.log("📁 Creating slides directory:", slideDir);

      if (!fs.existsSync(slideDir)) {
        fs.mkdirSync(slideDir, { recursive: true });
        console.log("✅ Created slides directory:", slideDir);
      }

      cb(null, slideDir);
    } catch (error) {
      console.error("❌ Error creating slides directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `slide-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    console.log("📄 Saving slide image:", {
      original: file.originalname,
      savedAs: uniqueName,
      size: file.size,
    });

    cb(null, uniqueName);
  },
});

// --- STORAGE UNTUK FILE MODEL 3D ---
const modelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const userId = getUserIdSafe(req);
      const userDir = path.join(uploadsDir, "models", userId);

      console.log("📁 Creating directory:", userDir);

      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log("✅ Created user directory:", userDir);
      }

      cb(null, userDir);
    } catch (error) {
      console.error("❌ Error creating directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    console.log("📄 Saving file:", {
      original: file.originalname,
      savedAs: uniqueName,
      size: file.size,
    });

    cb(null, uniqueName);
  },
});

// --- STORAGE UNTUK FILE PEMBAYARAN ---
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const userId = getUserIdSafe(req);
      const paymentDir = path.join(uploadsDir, "payments", userId);

      if (!fs.existsSync(paymentDir)) {
        fs.mkdirSync(paymentDir, { recursive: true });
        console.log("✅ Created payment directory:", paymentDir);
      }

      cb(null, paymentDir);
    } catch (error) {
      console.error("❌ Error creating payment directory:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `payment-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

// --- FILE FILTER ---
const fileFilter = (req, file, cb) => {
  const allowedModelTypes = [
    ".stl",
    ".obj",
    ".3mf",
    ".step",
    ".iges",
    ".fbx",
    ".dae",
  ];
  const allowedPaymentTypes = [".jpg", ".jpeg", ".png", ".pdf"];
  const allowedImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  const fileExt = path.extname(file.originalname).toLowerCase();
  const field = file.fieldname?.toLowerCase() || "";

  console.log("🔍 File filter checking:", {
    field: file.fieldname,
    originalname: file.originalname,
    extension: fileExt,
    mimetype: file.mimetype,
  });

  // Jika ini upload discount image
  if (field.includes("discount") || field === "image") {
    if (
      allowedImageTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file gambar (JPG, PNG, GIF, WebP) yang diizinkan untuk diskon"
        ),
        false
      );
    }
  }
  // Jika ini upload material image
  else if (field.includes("material") || field.includes("image")) {
    if (
      allowedImageTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file gambar (JPG, PNG, GIF, WebP) yang diizinkan untuk material"
        ),
        false
      );
    }
  }
  // Jika ini upload slide
  else if (field.includes("slide") || field.includes("background_image")) {
    if (
      allowedImageTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file gambar (JPG, PNG, GIF, WebP) yang diizinkan untuk slides"
        ),
        false
      );
    }
  }
  // Jika ini upload payment
  else if (field.includes("payment")) {
    if (
      allowedPaymentTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file JPG, PNG, atau PDF yang diizinkan untuk bukti pembayaran"
        ),
        false
      );
    }
  } else {
    // Upload model 3D
    if (allowedModelTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`❌ Format file 3D tidak didukung: ${fileExt}`), false);
    }
  }
};

// Helper: pastikan userId aman
function getUserIdSafe(req) {
  try {
    if (req.user && req.user.id) {
      console.log("🔐 User ID from req.user:", req.user.id);
      return req.user.id.toString();
    }

    // Coba decode token jika req.user tidak ada
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          console.log("🔐 User ID from token:", decoded.id);
          return decoded.id.toString();
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Tidak bisa membaca user ID:", err.message);
  }

  console.warn("⚠️ Using anonymous folder");
  return "anonymous";
}

// --- INSTANS MULTER ---

// ✅ UPLOAD UNTUK DISKON
const uploadDiscount = multer({
  storage: discountStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB untuk gambar diskon
  },
}).single("image"); // Field name untuk discount image

const uploadMaterial = multer({
  storage: materialStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB untuk gambar material
  },
}).single("material_image"); // Field name untuk material image

const uploadSlide = multer({
  storage: slideStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB untuk gambar slide
  },
}).single("background_image");

const uploadModel = multer({
  storage: modelStorage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

const uploadPayment = multer({
  storage: paymentStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

const uploadPaymentFlexible = multer({
  storage: paymentStorage,
  fileFilter: (req, file, cb) => {
    const allowedPaymentTypes = [".jpg", ".jpeg", ".png", ".pdf"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (
      allowedPaymentTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file JPG, PNG, atau PDF yang diizinkan untuk bukti pembayaran"
        ),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single("paymentProof");

// ✅ MIDDLEWARE ALTERNATIF UNTUK FIELD NAME LAIN
const uploadPaymentAny = multer({
  storage: paymentStorage,
  fileFilter: (req, file, cb) => {
    const allowedPaymentTypes = [".jpg", ".jpeg", ".png", ".pdf"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    // Terima semua field name yang berhubungan dengan payment
    const isPaymentField =
      file.fieldname?.toLowerCase().includes("payment") ||
      file.fieldname?.toLowerCase().includes("proof") ||
      file.fieldname?.toLowerCase().includes("bukti");

    if (
      isPaymentField &&
      (allowedPaymentTypes.includes(fileExt) ||
        ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype))
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file JPG, PNG, atau PDF yang diizinkan untuk bukti pembayaran"
        ),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).any();

const uploadPaymentProof = multer({
  storage: paymentStorage,
  fileFilter: (req, file, cb) => {
    const allowedPaymentTypes = [".jpg", ".jpeg", ".png", ".pdf"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    console.log("🔍 Payment proof upload - Field:", file.fieldname);

    if (
      allowedPaymentTypes.includes(fileExt) ||
      ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "❌ Hanya file JPG, PNG, atau PDF yang diizinkan untuk bukti pembayaran"
        ),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single("payment_proof");

module.exports = {
  uploadDiscount, // ✅ TAMBAHKAN UPLOAD DISCOUNT
  uploadMaterial,
  uploadSlide,
  uploadModel,
  uploadPayment,
  uploadPaymentFlexible,
  uploadPaymentAny,
  uploadPaymentProof,
};
