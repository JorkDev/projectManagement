// -------------------
// Middleware setup
// -------------------

/**
 * @file Handles assigning role flags to `req.session.user` and
 *       making the user object available in `res.locals`.
 *
 * Flags added to `req.session.user`:
 *   - isAdmin       (true if user code is in the admin list)
 *   - isAreaWorker  (true if user code is in the area-workers list)
 *   - onlyView      (true for the specific read-only user)
 */

// -------------------
// Role handler middleware
// -------------------

/**
 * roleHandler
 * @name roleHandler
 * @description
 *   Reads the authenticated user's code from session,
 *   sets role-related boolean flags on `req.session.user`,
 *   and exposes the user object to views via `res.locals.user`.
 *
 * @param   {Request}  req   - Express request, with `req.session.user`
 * @param   {Response} res   - Express response, to set `res.locals.user`
 * @param   {Function} next  - Next middleware function
 */
module.exports = function roleHandler(req, res, next) {
  if (req.session.user) {
    // Admin users by specific codes
    req.session.user.isAdmin =
      req.session.user.cod_ascinsa === 'HHC001' ||
      req.session.user.cod_ascinsa === 'VJA001' ||
      req.session.user.cod_ascinsa === 'EJQ001';

    // Area workers by specific codes
    const normalUser = [
      'JRB001', 'KVA001', 'MSA001', 'ERA001',
      'LJP001', 'WAC001', 'LQM001', 'WOC001', 'GCC003'
    ];
    req.session.user.isAreaWorker = normalUser.includes(req.session.user.cod_ascinsa);

    // Specific read-only user
    req.session.user.onlyView = req.session.user.cod_ascinsa === 'MFD001';
  }

  // Make user available in all views
  res.locals.user = req.session.user || null;
  next();
};
