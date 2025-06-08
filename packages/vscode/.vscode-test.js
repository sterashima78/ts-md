const { defineConfig } = require('@vscode/test-cli');
const path = require('node:path');

module.exports = defineConfig({
  files: 'test/extension.test.js',
  workspaceFolder: path.join(__dirname, 'test/fixtures'),
});
