// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

module.exports = pool;

// Test the connection upon startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully to MySQL!');
        console.log(`   - Host:     ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   - Database: ${process.env.DB_NAME || 'flooring_business'}`);
        console.log(`   - Port:     ${process.env.DB_PORT || 3306}`);
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
}

testConnection();

module.exports = pool;
