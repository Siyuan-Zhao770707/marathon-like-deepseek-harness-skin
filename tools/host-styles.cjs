// Read the host's emitted CSS without executing its bundles or starting the application.
const fs = require('node:fs');
const { parse } = require('./desktop-bridge.cjs');

function hostStyles(asar) {
  const archive = parse(fs.readFileSync(asar)), sheets = [];
  function walk(node, prefix = '') {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const file = prefix + name;
      if (entry.files) { walk(entry, file + '/'); continue; }
      if (!file.startsWith('dsh/node_modules/@deepseek-ai/') || !/\/lib\/client[\w.-]*\.js$/.test(file)) continue;
      const source = archive.read(file).toString('utf8');
      for (const match of source.matchAll(/\bconst css(?:\$\d+)?\s*=\s*("(?:[^"\\]|\\.)*");\s*const tagId(?:\$\d+)?\s*=\s*("(?:[^"\\]|\\.)*")/g)) {
        const tagId = JSON.parse(match[2]);
        sheets.push({ textContent: JSON.parse(match[1]), dataset: { plugin: tagId.split('/').slice(0, 2).join('/'), pluginCss: tagId } });
      }
    }
  }
  walk(archive.tree);
  return sheets;
}

module.exports = { hostStyles };
