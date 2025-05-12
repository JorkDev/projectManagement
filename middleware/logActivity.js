// -------------------
// Imports and middleware setup
// -------------------

/**
 * @file Factory middleware for logging user actions:
 *   - Wraps route handlers to automatically record an activity log
 *   - Uses the `logActivity` utility to insert entries in `pms_activity_logs`
 */

const { logActivity } = require('../utils/loggerUtility'); // Utility to record activity logs

// -------------------
// Middleware factory
// -------------------

/**
 * logAction
 * @name logAction
 * @description
 *   Returns Express middleware that logs the specified action name
 *   along with the request body as `details`.
 *   Always calls `next()` after attempting logging.
 *
 * @param {string} action - Descriptive action identifier (e.g. 'add_task_hour')
 * @returns {Function}    Middleware function (req, res, next)
 */
function logAction(action) {
  return async (req, res, next) => {
    try {
      const userCode = req.user.cod_ascinsa;
      const details = JSON.stringify(req.body || {});
      await logActivity(userCode, action, details);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
    next();
  };
}

// -------------------
// Module exports
// -------------------

/**
 * Exports logAction factory for use in route definitions
 */
module.exports = { logAction };
