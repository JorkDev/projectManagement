// -------------------
// Imports and middleware setup
// -------------------

/**
 * @file Middleware to authorize access to hourly records:
 *   - Verifies that the authenticated user is the owner of the hour entry
 *   - Redirects to the hours list with an error flash if not authorized
 */

const db = require('../config/db'); // MySQL database connection

// -------------------
// Authorization middleware
// -------------------

/**
 * authorizeHourOwner
 * @name authorizeHourOwner
 * @description
 *   Ensures that the currently authenticated user (`req.user.cod_ascinsa`)
 *   matches the `user_code` of the hour record identified by `req.params.id`.
 *   If not authorized, sets an error flash message and redirects to '/hour/view-hours'.
 *
 * @param {Request}   req   - Express request, with `req.user.cod_ascinsa` and `req.params.id`
 * @param {Response}  res   - Express response, used to redirect on failure
 * @param {Function}  next  - Next middleware function (called when authorization succeeds)
 * @async
 */
module.exports = async function authorizeHourOwner(req, res, next) {
  const [[hour]] = await db.execute(
    'SELECT user_code FROM pms_hour_control WHERE id = ?',
    [req.params.id]
  );

  // If no record found or owner mismatch, redirect with error
  if (!hour || hour.user_code !== req.user.cod_ascinsa) {
    req.flash('error', 'No tienes permiso para esta acción');
    return res.redirect('/hour/view-hours');
  }

  // Owner verified; proceed
  next();
};