const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Terhubung ke database MySQL: ${process.env.DB_NAME}`);
    connection.release();
  } catch (err) {
    console.error("❌ Gagal konek ke database:", err.message);
  }
})();

module.exports = pool;
