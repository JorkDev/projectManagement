// -------------------
// Imports and setup
// -------------------

/**
 * @file Provides simple file-based logging functions that write messages
 *       to separate log files by level (debug, info, warn, error),
 *       and also output to the console.
 *
 * Creates a `logs` directory if it does not exist, and appends messages
 * in ISO timestamped format to:
 *   - logs/debug.log
 *   - logs/info.log
 *   - logs/warn.log
 *   - logs/error.log
 */

const fs = require('fs');         // File system operations
const path = require('path');     // Path utilities

// Ensure `logs` directory exists
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

/**
 * Writes a log message both to a file and to the console.
 *
 * @param {string} type    - Log level ("debug", "info", "warn", "error")
 * @param {string} message - The message to log
 */
function writeLog(type, message) {
  const date = new Date().toISOString();
  const logMessage = `[${date}] [${type.toUpperCase()}] ${message}\n`;
  const filePath = path.join(logDir, `${type}.log`);

  // Append to the level-specific log file
  fs.appendFile(filePath, logMessage, err => {
    if (err) console.error('Failed to write log:', err);
  });

  // Also output to the console according to level
  if (type === 'error') {
    console.error(logMessage);
  } else if (type === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

// -------------------
// Exported log functions
// -------------------

/**
 * Logs a debug-level message.
 * @param {string} msg - The message to log
 */
module.exports.debug = msg => writeLog('debug', msg);

/**
 * Logs an info-level message.
 * @param {string} msg - The message to log
 */
module.exports.info = msg => writeLog('info', msg);

/**
 * Logs a warn-level message.
 * @param {string} msg - The message to log
 */
module.exports.warn = msg => writeLog('warn', msg);

/**
 * Logs an error-level message.
 * @param {string} msg - The message to log
 */
module.exports.error = msg => writeLog('error', msg);
