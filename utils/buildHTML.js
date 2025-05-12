// -------------------
// Imports and setup
// -------------------

/**
 * @file Static template builder:
 *   - Reads EJS view files from `views` directory
 *   - Renders each to HTML with common template data
 *   - Adjusts asset paths for static output
 *   - Writes resulting HTML files to the `public` directory
 */

const fs = require('fs');                           // File system operations
const path = require('path');                       // Path utilities
const ejs = require('ejs');                         // EJS templating engine

// Directories for input (views) and output (static files)
const inputDir = path.join(__dirname, '../views');
const outputDir = path.join(__dirname, '../public');

// Common data passed to every template
const templateData = {
  title: 'Gestión de Proyectos',
  description: ''
};

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// -------------------
// Helper functions
// -------------------

/**
 * adjustAssetPaths
 * @name adjustAssetPaths
 * @description
 *   Rewrites absolute asset URLs (href/src) to relative paths for static files.
 *
 * @param {string} html - The rendered HTML string
 * @returns {string}    - HTML with adjusted asset paths
 */
function adjustAssetPaths(html) {
  return html.replace(/(href|src)=(")\/(?!\/)/g, '$1=$2./');
}

// -------------------
// Main builder function
// -------------------

/**
 * buildTemplates
 * @name buildTemplates
 * @description
 *   Reads all .ejs templates (excluding partials) from the input directory,
 *   renders each with `templateData` and `activePage`, adjusts asset paths,
 *   and writes them as .html files in the output directory.
 */
function buildTemplates() {
  fs.readdir(inputDir, (err, files) => {
    if (err) {
      console.error('Error reading input directory:', err);
      return;
    }
    files.forEach(file => {
      // Process only EJS files, skip partials directory
      if (path.extname(file) === '.ejs' && file !== 'partials') {
        const inputFilePath = path.join(inputDir, file);
        const activePage = file === 'index.ejs' ? 'home' : file.replace('.ejs', '');
        const data = { ...templateData, activePage };

        ejs.renderFile(inputFilePath, data, (err, html) => {
          if (err) {
            console.error(`Error rendering ${file}:`, err);
            return;
          }
          html = adjustAssetPaths(html);

          const outputFileName = file.replace('.ejs', '.html');
          const outputFilePath = path.join(outputDir, outputFileName);
          fs.writeFile(outputFilePath, html, err => {
            if (err) {
              console.error(`Error writing ${outputFileName}:`, err);
            } else {
              console.log(`Built ${outputFileName}`);
            }
          });
        });
      }
    });
  });
}

// -------------------
// Execute builder
// -------------------

buildTemplates();
