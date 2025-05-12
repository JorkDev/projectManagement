// -------------------
// Imports and database setup
// -------------------

/**
 * @file Utility to record user actions in the `pms_activity_logs` table.
 *       Provides a single function to insert log entries asynchronously.
 */

const db = require('../config/db'); // MySQL connection (Promise-based)

// -------------------
// Activity logging function
// -------------------

/**
 * logActivity
 * @name logActivity
 * @description
 *   Inserts an action record into the `pms_activity_logs` table.
 *   Suppresses errors but logs failures to the console.
 *
 * @param {string} userCode - Identifier of the user performing the action (e.g., cod_ascinsa)
 * @param {string} action   - Description of the action performed
 * @param {?string} details - Optional additional details (empty string if none)
 * @async
 */
async function logActivity(userCode, action, details = null) {
  try {
    await db.execute(
      `INSERT INTO pms_activity_logs (user_code, action, details)
       VALUES (?, ?, ?)`,
      [userCode, action, details || '']
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// -------------------
// Module exports
// -------------------

/**
 * Exports the logActivity function for use in route handlers and services.
 */
module.exports = {
  logActivity
};
