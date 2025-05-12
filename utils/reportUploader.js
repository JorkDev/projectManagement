// -------------------
// Imports and storage factory setup
// -------------------

/**
 * @file Provides Multer upload handlers for global and user report files.
 *       Uses date-stamped filenames and separate storage directories.
 *
 * Exports:
 *   - uploadGlobal: Multer instance storing in `/public/uploads/reports/global`
 *   - uploadUser:   Multer instance storing in `/public/uploads/reports/users`
 */

const multer = require('multer');   // File upload middleware
const path = require('path');       // Path utilities

/**
 * storageFor
 * @name storageFor
 * @description
 *   Generates a Multer diskStorage configuration for the given report type.
 *   Files are placed under `/public/uploads/reports/{type}` and
 *   named using the `report_date` form field plus a timestamp and original extension.
 *
 * @param {string} type - Subdirectory name under `public/uploads/reports` (e.g., 'global' or 'users')
 * @returns {multer.StorageEngine} Configured Multer storage engine
 */
function storageFor(type) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const base = path.join(__dirname, '../public/uploads/reports', type);
      cb(null, base);
    },
    filename: (req, file, cb) => {
      const stamp = Date.now();
      // Use report_date from the form plus timestamp to avoid collisions
      cb(
        null,
        `${req.body.report_date}_${stamp}${path.extname(file.originalname)}`
      );
    }
  });
}

// -------------------
// Exported upload handlers
// -------------------

/**
 * uploadGlobal
 * @description Multer middleware for uploading global report files
 * @type {multer.Instance}
 */
const uploadGlobal = multer({ storage: storageFor('global') });

/**
 * uploadUser
 * @description Multer middleware for uploading individual user report files
 * @type {multer.Instance}
 */
const uploadUser = multer({ storage: storageFor('users') });

module.exports = {
  uploadGlobal,
  uploadUser
};
