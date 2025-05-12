// -------------------
// Imports and pool setup
// -------------------

/**
 * @file Configures and exports a MySQL connection pool using mysql2/promise.
 *       Connection parameters are sourced from environment variables.
 */

const mysql = require('mysql2/promise'); // Promise-based MySQL client

let pool;

/**
 * Initialize the MySQL connection pool.
 * Logs success or throws an error on failure.
 * @throws Will throw if the pool cannot be created.
 */
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('Successfully connected to the database: ' + process.env.DB_NAME);
} catch (error) {
  console.error('Error creating MySQL connection pool: ' + error.message);
  throw error;
}

// -------------------
// Export pool
// -------------------

/**
 * Exports the configured MySQL pool for use in application modules.
 */
module.exports = pool;
