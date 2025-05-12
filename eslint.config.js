const js = require('@eslint/js');
const globals = require('globals');
const htmlPlugin = require('@html-eslint/eslint-plugin');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jquery
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2]
    }
  },

  {
    files: ['**/*.html'],
    plugins: {
      '@html-eslint': htmlPlugin
    },
    languageOptions: {
      parser: htmlPlugin.parser
    },
    rules: {
      ...htmlPlugin.configs.recommended.rules,
      '@html-eslint/indent': ['error', 2]
    }
  }
];