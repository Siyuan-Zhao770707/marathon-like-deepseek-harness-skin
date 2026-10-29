// End-to-end check of the resolution pipeline against a simulated host document:
//   node tools/verify-build.cjs
// Every host bundle ships its CSS as text inside one <style>, so a realistic document can be
// assembled from the installed app.asar without launching the app. Read-only.
'use strict';

const fs = require('fs');
const path = require('path');
const { mapModules, modulesFromDocument, modulesFromStylesheets, rewrite, tokensOf } = require('../src/module-map.cjs');

const ASAR = process.env.DSH_ASAR || '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar';
const SRC = path.join(__dirname, '..', 'src');
const OWN = 'dsh-industrial-acid-skin';

const CSS = fs.readdirSync(SRC)
  .filter(name => name.endsWith('.css'))
  .map(name => fs.readFileSync(path.join(SRC, name), 'utf8'))
  .join('\n');

function readAsar(asar) {
  const fd = fs.openSync(asar, 'r');
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  const size = head.readUInt32LE(12);
  const buffer = Buffer.alloc(size);
  fs.readSync(fd, buffer, 0, size, 16);
  const header = JSON.parse(buffer.toString('utf8'));
  const base = 16 + size;
  const read = target => {
    const node = target.split('/').reduce((acc, key) => acc?.files?.[key], header);
    if (!node?.size) return null;
    const out = Buffer.alloc(node.size);
    fs.readSync(fd, out, 0, node.size, base + Number(node.offset));
    return out.toString('utf8');
  };
  const close = () => fs.closeSync(fd);
  return { header, read, close };
}

// Collect the CSS text each host client bundle embeds, keyed by package.
function hostStyles(archive) {
  const sheets = [];
  const walk = (node, prefix, pkg) => {
    for (const [key, value] of Object.entries(node.files || {})) {
      const full = prefix + key;
      const owner = pkg ?? (full.startsWith('dsh/node_modules/@deepseek-ai/')
        ? full.slice('dsh/node_modules/@deepseek-ai/'.length).split('/')[0]
        : null);
      if (value.files) { walk(value, full + '/', owner); continue; }
      if (!/\/lib\/client[\w.-]*\.js$/.test(full) || !owner) continue;
      const source = archive.read(full);
      if (!source) continue;
      // The host embeds each module's stylesheet as a JS string literal and injects it into a
      // <style>. Any literal carrying `.hash_local` selectors is one of those stylesheets.
      for (const match of source.matchAll(/("(?:[^"\\]|\\.)*")/g)) {
        const raw = match[1];
        if (raw.length < 24 || !/\.[A-Za-z0-9_-]+_[a-z]/.test(raw)) continue;
        let text;
        try { text = JSON.parse(raw); } catch { continue; }
        if (!/^[\s.]*[.*#:\[a-zA-Z-]/.test(text)) continue;
        sheets.push({ textContent: text, dataset: { plugin: owner } });
      }
    }
  };
  walk(archive.header, '');
  return sheets;
}

function documentWith(sheets) {
  return { querySelectorAll: selector => (selector === 'style' ? sheets : []) };
}

function report() {
  if (!fs.existsSync(ASAR)) return { skipped: `no host build at ${ASAR}` };

  const archive = readAsar(ASAR);
  const sheets = hostStyles(archive);
  archive.close();

  const doc = documentWith(sheets);
  const inventory = modulesFromStylesheets(doc, OWN);
  const mapping = mapModules(CSS, modulesFromDocument(doc, OWN));
  const out = rewrite(CSS, mapping);

  const authored = tokensOf(CSS);
  // A remaining authored prefix means that module was not placed on this build.
  const stale = [...out.matchAll(/\.((?:_?[A-Za-z0-9][A-Za-z0-9_-]*?)_[a-z][A-Za-z0-9]*)/g)]
    .map(m => m[1])
    .filter(token => mapping.has(token.slice(0, token.lastIndexOf('_'))));

  return {
    hostStylesheets: sheets.length,
    hostModules: inventory.size,
    authoredModules: authored.size,
    resolvedModules: mapping.size,
    unresolved: [...authored.keys()].filter(prefix => !mapping.has(prefix)),
    staleSelectors: stale.length,
    mapping: Object.fromEntries(mapping)
  };
}

const result = report();
console.log(JSON.stringify(result, null, 2));
if (!result.skipped && (result.unresolved.length || result.staleSelectors)) process.exitCode = 1;
