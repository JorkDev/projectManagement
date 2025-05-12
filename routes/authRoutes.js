// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines authentication routes:
 *   - GET /login    → render login form
 *   - POST /login   → authenticate user against external API, issue JWT, set session/cookie
 *   - GET /logout   → destroy session and clear auth cookie
 */

const express = require('express'); // Express framework
const axios = require('axios'); // HTTP client for external API calls
const router = express.Router(); // Create a modular router
const logger = require('../utils/loggerGlobal'); // Global logger utility
const jwt = require('jsonwebtoken'); // JWT library for token creation

/**
 * GET /login
 * @name RenderLogin
 * @description
 *   Renders the login page with no error message.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
router.get('/login', (req, res) => {
  logger.debug('Rendering login page');
  res.render('auth/login', {
    title: 'Iniciar Sesión',
    error: null
  });
});

/**
 * POST /login
 * @name HandleLogin
 * @description
 *   Authenticates the user by calling an external Oracle API.
 *   On success, signs a JWT, stores user data in the session,
 *   sets a secure HTTP-only cookie, and redirects to home.
 *   On failure, re-renders the login page with an error message.
 *
 * @param {Request}  req                  - Express request
 * @param {string}   req.body.username    - User code (cod_ascinsa)
 * @param {string}   req.body.password    - Plaintext password
 * @param {Response} res                  - Express response
 * @async
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  logger.info(`Login attempt for user: ${username}`);

  // Construct external API URL using environment variables
  const apiUrl = `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`;

  try {
    // Call the external API to retrieve user records
    const response = await axios.get(apiUrl);

    // Handle API-level errors
    if (response.data.error) {
      return res.render('auth/login', {
        title: 'Iniciar Sesión',
        error: 'API error: ' + response.data.message
      });
    }

    // Find matching user by code and password
    const trabajadores = response.data.data;
    const trabajador = trabajadores.find(
      t => t.cod_ascinsa === username && t.clave_sin_encriptar === password
    );

    if (trabajador) {
      // Successful authentication
      logger.info(`User ${username} authenticated successfully.`);

      // Prepare JWT payload
      const tokenPayload = {
        cod_ascinsa: trabajador.cod_ascinsa,
        pnombre: trabajador.pnombre,
        apaterno: trabajador.apaterno,
        amaterno: trabajador.amaterno || '',
        area: trabajador.area,
        puesto: trabajador.puesto
      };

      // Sign token (expires in 8 hours)
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: '8h'
      });

      // Store user info and token in session
      req.session.user = {
        ...trabajador,
        token,
        fullName: `${trabajador.pnombre} ${trabajador.apaterno}`.trim()
      };

      // Set secure, HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return res.redirect('/');
    } else {
      // Invalid credentials
      logger.warn(`Failed login attempt for user: ${username}`);
      return res.render('auth/login', {
        title: 'Iniciar Sesión',
        error: 'Credenciales inválidas'
      });
    }
  } catch (error) {
    // Network or server error during API call
    console.error('Error calling external API:', error);
    logger.error(`Error during login API call: ${error}`);
    return res.render('auth/login', {
      title: 'Iniciar Sesión',
      error: 'Error del servidor, inténtalo más tarde.'
    });
  }
});

/**
 * GET /logout
 * @name HandleLogout
 * @description
 *   Logs the user out by destroying the session, clearing the auth cookie,
 *   and redirecting to the login page.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
router.get('/logout', (req, res) => {
  logger.info('User logged out');
  req.session.destroy();
  res.clearCookie('token');
  res.redirect('/login');
});

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 *
 *   const authRouter = require('./routes/auth');
 *   app.use('/', authRouter);
 */
module.exports = router;
