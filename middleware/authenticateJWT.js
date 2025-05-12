// -------------------
// Imports and middleware setup
// -------------------

/**
 * @file JWT authentication middleware for Express.
 *       Validates tokens from cookies, Authorization header, or session,
 *       attaches decoded user info to `req.user`, and enforces simple role-based access.
 */

const jwt = require('jsonwebtoken'); // JSON Web Token library

// -------------------
// Middleware function
// -------------------

/**
 * authenticateJWT
 * @name authenticateJWT
 * @description
 *   Verifies a JWT from cookies, Authorization header, or session.
 *   On success, populates `req.user` with decoded payload and
 *   optionally enforces area-based restrictions for non-admin users.
 *   On failure or expiration, clears cookies/session and redirects to login.
 *
 * @param {Request}   req   - Express request object
 * @param {Response}  res   - Express response object
 * @param {Function}  next  - Next middleware function
 */
function authenticateJWT(req, res, next) {
  // Extract token from cookie, header, or session
  const token =
    req.cookies.token ||
    req.headers.authorization?.split(' ')[1] ||
    req.session.user?.token;

  if (!token) {
    console.log('No token found - redirecting to login');
    return res.redirect('/auth/login');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Token verification failed:', err);
      res.clearCookie('token');
      if (req.session.user) delete req.session.user.token;
      return res.redirect('/auth/login');
    }

    // Check token expiration manually (in case verify doesn't catch it)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log('Token has expired');
      res.clearCookie('token');
      if (req.session.user) delete req.session.user.token;
      return res.redirect('/auth/login');
    }

    // Build fullName from payload fields
    const fullName = [
      decoded.pnombre || decoded.PNOMBRE || '',
      decoded.apaterno || decoded.APATERNO || '',
      decoded.amaterno || decoded.AMATERNO || ''
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || decoded.cod_ascinsa;

    // Attach user info to request
    req.user = {
      cod_ascinsa: decoded.cod_ascinsa,
      fullName,
      area: decoded.area || decoded.AREA,
      ...decoded
    };

    // Role-based access: non-EJQ001 and non-area "004" cannot access certain paths
    if (req.user.cod_ascinsa !== 'EJQ001' && req.user.area !== '004') {
      const restrictedPaths = ['/projects', '/hour', '/docs', '/changelog'];
      if (restrictedPaths.includes(req.path)) {
        console.log('Access denied. Redirecting to home.');
        return res.redirect('/');
      }
    }

    next();
  });
}

// -------------------
// Export middleware
// -------------------

/**
 * Exports the authenticateJWT middleware to protect routes.
 */
module.exports = authenticateJWT;
