// DSH_ASAR=/path/to/app.asar node tools/verify-build.cjs — read-only host validation.
const fs = require('node:fs');
const path = require('node:path');
const { hostStyles } = require('./host-styles.cjs');
const { mapModules, modulesFromDocument } = require('../src/module-map.cjs');

function verifyBuild(asar) {
  const client = fs.readFileSync(path.join(__dirname, '../lib/client.js'), 'utf8');
  const signatures = JSON.parse(client.match(/const MODULE_SIGNATURES = (.*);/)[1]);
  const sheets = hostStyles(asar);
  const inventory = modulesFromDocument({ querySelectorAll: selector => selector === 'style' ? sheets : [] }, 'dsh-industrial-acid-skin');
  const mapping = mapModules(signatures, inventory);
  return { hostStylesheets: sheets.length, hostModules: inventory.size,
    authoredModules: Object.keys(signatures).length, resolvedModules: mapping.size,
    unresolved: Object.keys(signatures).filter(prefix => !mapping.has(prefix)), mapping: Object.fromEntries(mapping) };
}

if (require.main === module) {
  const asar = process.argv[2] || process.env.DSH_ASAR || (process.platform === 'darwin'
    ? '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar'
    : path.resolve(__dirname, '../../resources/app.asar'));
  if (!fs.existsSync(asar)) throw new Error('Host archive not found; set DSH_ASAR to the installed app.asar.');
  const report = verifyBuild(asar);
  console.log(JSON.stringify(report, null, 2));
  if (!report.hostStylesheets || report.unresolved.length) process.exitCode = 1;
}

module.exports = { verifyBuild };
