const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseToken, tokensOf, modulesFromDocument, resolvePrefix, mapModules, rewrite } = require('../src/module-map.cjs');

const own = 'dsh-industrial-acid-skin';
const doc = sheets => ({ querySelectorAll: selector => selector === 'style' ? sheets : [] });
const sheet = textContent => ({ textContent, dataset: { plugin: '@deepseek-ai/dsh-client-ui-workspace' } });

test('module tokens split at the last underscore and ignore React __html', () => {
  assert.deepEqual(parseToken('rh_gBW_assistantVioletBright'), { prefix: 'rh_gBW', local: 'assistantVioletBright' });
  assert.deepEqual(parseToken('_7qxJPq_arrow'), { prefix: '_7qxJPq', local: 'arrow' });
  assert.equal(parseToken('__html'), null);
  assert.deepEqual([...tokensOf('__html .rh_gBW_table .Kjh-qa_listArea').keys()], ['rh_gBW', 'Kjh-qa']);
});

test('unchanged hashes resolve immediately, including an otherwise ambiguous local', () => {
  const candidates = new Map([['stable', new Set(['panel'])], ['other', new Set(['panel'])]]);
  assert.equal(resolvePrefix(new Set(['panel']), candidates, 'stable'), 'stable');
  assert.equal(mapModules('.stable_panel{}', candidates).get('stable'), 'stable');
});

test('reported macOS hashes resolve from full sheets before any component mounts', () => {
  const authored = '.wtg9ga_root .wtg9ga_footArea{} .wnFoaW_projectRow .wnFoaW_title{} .GAkraW_listArea .GAkraW_treeBody{}';
  const inventory = modulesFromDocument(doc([sheet('.kB3qhq_root .kB3qhq_footArea{} .JoiKIa_projectRow .JoiKIa_title{} .Kjh-qa_listArea .Kjh-qa_treeBody{}')]), own);
  const mapping = mapModules(authored, inventory);
  assert.deepEqual([...mapping.values()], ['kB3qhq', 'JoiKIa', 'Kjh-qa']);
  assert.match(rewrite(authored, mapping), /\.kB3qhq_root \.kB3qhq_footArea/);
  assert.equal(rewrite('wnFoaW_menuOpen', mapping), 'JoiKIa_menuOpen');
  assert.equal(rewrite('.acid-drawer [data-row-key="workspace:a"]', mapping), '.acid-drawer [data-row-key="workspace:a"]');
});

test('reusable names never select an unrelated module just because it is smaller', () => {
  const candidates = new Map([['picker', new Set(['panel'])], ['rightbar', new Set(['panel', 'tabBody', 'tabHead'])]]);
  assert.equal(resolvePrefix(new Set(['panel']), candidates), null);
  assert.equal(resolvePrefix(new Set(['panel', 'tabBody']), candidates), 'rightbar');
  assert.equal(resolvePrefix(new Set(['panel', 'missing']), candidates), null);
  candidates.set('another', new Set(['panel', 'tabBody', 'tabHead']));
  assert.equal(resolvePrefix(new Set(['panel', 'tabBody']), candidates), null);
});

test('host inventory excludes the skin and unrelated plugin styles', () => {
  const sheets = [sheet('.real_root .real_footArea{}'),
    { textContent: '.fake_root .fake_footArea{}', dataset: { plugin: own } },
    { textContent: '.other_root{}', dataset: { plugin: 'another-plugin' } }];
  assert.deepEqual([...modulesFromDocument(doc(sheets), own).keys()], ['real']);
});

test('unknown and incomplete builds keep unresolved aliases intact', () => {
  const authored = '.oldone_root .oldone_footArea{}';
  const mapping = mapModules(authored, modulesFromDocument(doc([sheet('.newone_root{}')]), own));
  assert.equal(mapping.size, 0);
  assert.equal(rewrite(authored, mapping), authored);
});

test('all CSS and JS aliases resolve against an installed host', { skip: !process.env.DSH_ASAR && 'Set DSH_ASAR to validate a real host archive.' }, () => {
  const { verifyBuild } = require('../tools/verify-build.cjs');
  const result = verifyBuild(process.env.DSH_ASAR);
  assert.ok(result.hostStylesheets > 0);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.resolvedModules, result.authoredModules);
});

test('a different hash for every real host module preserves every resolved alias', { skip: !process.env.DSH_ASAR && 'Set DSH_ASAR to exercise a real host with substituted hashes.' }, () => {
  const { hostStyles } = require('../tools/host-styles.cjs');
  const sheets = hostStyles(process.env.DSH_ASAR), inventory = modulesFromDocument(doc(sheets), own);
  const source = fs.readFileSync(path.join(__dirname, '../lib/client.js'), 'utf8');
  const signatures = JSON.parse(source.match(/const MODULE_SIGNATURES = (.*);/)[1]);
  const baseline = mapModules(signatures, inventory);
  assert.equal(baseline.size, Object.keys(signatures).length);
  const renamed = new Map([...inventory.keys()].map((prefix, index) => [prefix, 'MAC' + index.toString(36).padStart(3, '0')]));
  for (const [old, target] of Object.entries({ wtg9ga: 'kB3qhq', 'mP3x-q': 'PIRFFq', wnFoaW: 'JoiKIa', GAkraW: 'Kjh-qa' })) renamed.set(old, target);
  const foreign = modulesFromDocument(doc(sheets.map(s => ({ ...s, textContent: rewrite(s.textContent, renamed) }))), own);
  const mapped = mapModules(signatures, foreign);
  for (const [prefix, target] of baseline) {
    assert.equal(mapped.get(prefix), renamed.get(target), prefix);
    for (const local of signatures[prefix]) assert.ok(foreign.get(mapped.get(prefix)).has(local), prefix + '_' + local);
  }
});
