const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password harus berupa string non-empty");
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
}

async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  return await bcrypt.compare(plain, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};

// Jika file ini dijalankan langsung, tampilkan contoh hashing di CLI
if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.log("Usage: node hashPassword.js <password>");
    process.exit(1);
  }

  hashPassword(input)
    .then((h) => {
      console.log("Hashed password:");
      console.log(h);
    })
    .catch((err) => {
      console.error("Gagal hash password:", err.message);
    });
}
