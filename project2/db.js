// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool using environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'flooring_business',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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