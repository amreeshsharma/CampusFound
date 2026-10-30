/**
 * CampusFind 2.0 - Database Configuration
 * Configures a MySQL connection pool using mysql2/promise.
 * Prepared for Phase 3 schema execution and query handling.
 */

const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campusfind_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promise wrapper for async/await queries
const db = pool.promise();

/**
 * Test MySQL connection
 * Used during server startup / diagnostics
 */
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log(`[Database]: Connected to MySQL database '${process.env.DB_NAME || 'campusfind_db'}' successfully.`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[Database Warning]: Could not establish MySQL connection (${error.message}).`);
    console.warn(`[Database Note]: Ensure MySQL service is running and database '${process.env.DB_NAME || 'campusfind_db'}' is created (Phase 3).`);
    return false;
  }
};

module.exports = {
  db,
  pool,
  testConnection
};

