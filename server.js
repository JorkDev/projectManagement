// -------------------
// Imports and app setup
// -------------------

/**
 * @file Entry point for the Express application:
 *   - Loads environment variables
 *   - Configures middleware (parsers, sessions, flash, static files, authentication, role handling)
 *   - Sets up view engine and global template locals
 *   - Defines core routes: changelog, docs, history, auth, projects, hours, control, API, dashboard, reports
 *   - Handles 404 and global errors
 *   - Starts the server and checks for outdated packages
 */

require('dotenv').config(); // Load .env
const express = require('express'); // Express framework
const path = require('path'); // Filesystem paths
const db = require('./config/db'); // MySQL database connection
const session = require('express-session'); // Session middleware
const flash = require('connect-flash'); // Flash messaging
const cookieParser = require('cookie-parser'); // Cookie parsing
const { checkOutdatedPackages } = require('./utils/deprecatedChecker'); // Utility to warn about outdated dependencies
const logger = require('./utils/loggerGlobal'); // Global logger
const moment = require('moment'); // Date formatting
const multer = require('multer'); // File upload middleware
const authenticateJWT = require('./middleware/authenticateJWT'); // JWT authentication middleware
const roleHandler = require('./middleware/roleHandler'); // Role-based access middleware
const axios = require('axios'); // HTTP client


const app = express();
const PORT = process.env.PORT;

// -------------------
// Middleware Setup
// -------------------

app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Force UTF-8 for all views
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Session secret
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use(flash()); // Flash for user messages
app.use(roleHandler); // Attach role-based flags to request

// Expose template locals for all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.moment = moment;
  res.locals.multer = multer;
  res.locals.user = req.session.user || null;
  next();
});

// Redirect unauthenticated users to login except for public assets/auth
app.use((req, res, next) => {
  const openPaths = ['/auth/login', '/auth/logout', '/favicon.ico'];
  if (
    !req.session.user &&
    !openPaths.includes(req.path) &&
    !req.path.startsWith('/css') &&
    !req.path.startsWith('/js') &&
    !req.path.startsWith('/img') &&
    !req.path.startsWith('/vendor')
  ) {
    return res.redirect('/auth/login');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

app.set('view engine', 'ejs'); // EJS templating
app.set('views', path.join(__dirname, 'views')); // Views directory

// -------------------
// Simple Page Routes
// -------------------

/**
 * GET /changelog
 * @name ShowChangelog
 * @description
 *   Renders the changelog page.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 */
app.get('/changelog', (req, res) => {
  res.render('changelog', { categoryTitle: 'Historial de Cambios' });
});

/**
 * GET /docs
 * @name ShowDocs
 * @description
 *   Renders the documentation page.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 */
app.get('/docs', (req, res) => {
  res.render('docs', { categoryTitle: 'Documentación' });
});

/**
 * GET /checking
 * @name ShowCheckList
 * @description
 *   Renderiza la vista del checklist de equipos críticos.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 */
app.get('/checking', authenticateJWT, (req, res) => {
  res.render('checking/check-list', {
    categoryTitle: 'Control Diario de Equipos Críticos',
    activePage: 'checking'
  });
});


/**
 * GET /history
 * @name ShowHistory
 * @description
 *   Fetches activity logs from the database, enriches with user names
 *   from external API, groups by date, and renders the history page.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 * @async
 */
app.get('/history', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT user_code, action, details, created_at
      FROM pms_activity_logs
      ORDER BY created_at DESC
    `);
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const users = data.data;

    // Group log entries by date
    const logs = {};
    for (const row of rows) {
      const date = moment(row.created_at).format('YYYY-MM-DD');
      const u = users.find(u => u.cod_ascinsa === row.user_code);
      const userName = u ? `${u.pnombre} ${u.apaterno}` : row.user_code;
      const entry =
        `${userName} ${row.action}` + (row.details ? `: ${row.details}` : '');
      logs[date] = logs[date] || [];
      logs[date].push(entry);
    }

    res.render('history', {
      categoryTitle: 'Historial de Cambios',
      activePage: 'history',
      logs
    });
  } catch (err) {
    console.error('Error loading history:', err);
    res.status(500).send('Error cargando el historial de cambios.');
  }
});

// -------------------
// Route Modules
// -------------------

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const controlRoutes = require('./routes/controlRoutes');
const apiRoutes = require('./routes/apiRoutes');
const dashboardRoutes = require('./routes/dashRoutes');
const hourRoutes = require('./routes/hourRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/auth', authRoutes);
app.use('/projects', authenticateJWT, projectRoutes);
app.use('/hour', authenticateJWT, hourRoutes);
app.use('/control', authenticateJWT, controlRoutes);
app.use('/docs', authenticateJWT, apiRoutes);
app.use('/', authenticateJWT, dashboardRoutes);
app.use('/reports', reportRoutes);

// -------------------
// Error Handling
// -------------------

/**
 * 404 Handler
 * @name HandleNotFound
 * @description
 *   Catches all unmatched routes and returns a 404 message.
 */
app.use((req, res) => {
  res.status(404).send('Sorry, page not found!');
});

/**
 * Global Error Handler
 * @name HandleError
 * @description
 *   Logs server errors and returns a 500 message.
 */
app.use((err, res) => {
  logger.error(`Global Error: ${err.stack}`);
  res.status(500).send('Something went wrong!');
});

// -------------------
// Server Startup
// -------------------

/**
 * Starts the Express server on the configured port
 * and initiates the outdated packages check.
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  checkOutdatedPackages();
});
