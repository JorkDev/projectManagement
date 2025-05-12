// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines authentication-protected routes for user-related actions:
 *   - GET /protected       → simple protected test endpoint
 *   - GET /hours           → fetch logged hours for the authenticated user
 *   - POST /hours          → create a new hours‐entry for the authenticated user
 */

const express = require('express'); // Express framework
const router = express.Router(); // Create a modular router
const authenticateJWT = require('../middleware/authenticateJWT'); // JWT auth middleware
const db = require('../config/db'); // MySQL database connection

/**
 * GET /protected
 * @name GetProtected
 * @middleware authenticateJWT
 * @description
 *   Simple test endpoint to verify the JWT middleware and
 *   return the decoded user payload.
 *
 * @param  {Request}  req   - Express request, with `req.user` populated by authenticateJWT
 * @param  {Response} res   - Express response
 * @returns {Object}        JSON containing a message and the `user` object
 */
router.get('/protected', authenticateJWT, (req, res) => {
  // At this point authenticateJWT has verified the token
  // and attached the decoded payload to req.user
  res.json({
    message: 'This is a protected API endpoint.',
    user: req.user
  });
});

/**
 * GET /hours
 * @name GetUserHours
 * @middleware authenticateJWT
 * @description
 *   Retrieves all hour‐logging records for the authenticated user.
 *
 * @param  {Request}  req   - Express request, with `req.user.id`
 * @param  {Response} res   - Express response
 * @async
 * @returns {Array<Object>} JSON array of rows from `user_hours` table
 */
router.get('/hours', authenticateJWT, async (req, res) => {
  // Extract the authenticated user's ID from the JWT payload
  const userId = req.user.id;

  try {
    // Query all hour entries belonging to this user
    const [
      rows
    ] = await db.execute('SELECT * FROM user_hours WHERE user_id = ?', [
      userId
    ]);

    // Send the retrieved rows as JSON
    res.json(rows);
  } catch (error) {
    // Log the error and respond with HTTP 500
    console.error('Error fetching user hours:', error);
    res.status(500).send('Server error while fetching user hours.');
  }
});

/**
 * POST /hours
 * @name PostUserHours
 * @middleware authenticateJWT
 * @description
 *   Creates a new time‐log record for the authenticated user.
 *
 * @param  {Request}  req   - Express request
 *   @property {string} req.body.task         - Description of the task
 *   @property {number} req.body.hours_worked - Hours worked on the task
 *   @property {string} req.body.date         - Date of the work (YYYY-MM-DD)
 *   @property {number} req.user.id           - Authenticated user ID
 * @param  {Response} res   - Express response
 * @async
 * @returns {string}        Success message or error
 */
router.post('/hours', authenticateJWT, async (req, res) => {
  const { task, hours_worked, date } = req.body; // Destructure request body
  const userId = req.user.id;

  try {
    // Insert a new record into `user_hours`
    await db.execute(
      'INSERT INTO user_hours (user_id, task, hours_worked, date) VALUES (?, ?, ?, ?)',
      [userId, task, hours_worked, date]
    );

    // Respond with success
    res.status(200).send('Hours logged successfully');
  } catch (error) {
    // Log and return server error
    console.error('Error logging user hours:', error);
    res.status(500).send('Server error while logging user hours.');
  }
});

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 * 
 *   const userHoursRouter = require('./routes/userHours');
 *   app.use('/api', userHoursRouter);
 */
module.exports = router;
