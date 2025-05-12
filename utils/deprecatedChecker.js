// -------------------
// Imports and function setup
// -------------------

/**
 * @file Checks for outdated npm dependencies by running `npm outdated`,
 *       parsing its output, and logging any outdated packages.
 *
 * Exports:
 *   - checkOutdatedPackages(): Invoke programmatically or via CLI.
 */

const { exec } = require('child_process'); // Execute shell commands

/**
 * @name checkOutdatedPackages
 * @description
 *   Executes `npm outdated --json`, parses the JSON output,
 *   and logs each outdated package (current, wanted, latest).
 *   If all packages are up-to-date, logs a corresponding message.
 *
 * @example
 *   const { checkOutdatedPackages } = require('./deprecatedChecker');
 *   checkOutdatedPackages();
 *
 * @returns {void}
 */
function checkOutdatedPackages() {
  exec('npm outdated --json', (_error, stdout) => {
    let outdated = {};
    try {
      outdated = stdout ? JSON.parse(stdout) : {};
    } catch (e) {
      console.error('Failed to parse npm outdated output:', e);
      return;
    }

    const outdatedKeys = Object.keys(outdated);
    if (outdatedKeys.length === 0) {
      console.log('All packages are up-to-date.');
    } else {
      console.log('Outdated packages found:');
      outdatedKeys.forEach(pkg => {
        const info = outdated[pkg];
        console.log(
          `${pkg}: current = ${info.current}, wanted = ${info.wanted}, latest = ${info.latest}`
        );
      });
    }
  });
}

// -------------------
// Module exports
// -------------------

/**
 * Exports the checkOutdatedPackages utility function.
 */
module.exports = {
  checkOutdatedPackages
};
