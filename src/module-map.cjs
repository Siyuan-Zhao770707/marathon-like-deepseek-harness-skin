'use strict';

// Runtime module matching follows the approach contributed by Siyuan-Zhao770707 in PR #4.
// Read complete host stylesheets: the workspace tree and settings can mount much later.
const TOKEN = /(^|[^\w-])([A-Za-z0-9_-]+_[a-z][A-Za-z0-9]*)(?![\w-])/g;

function parseToken(token) {
  const split = token.lastIndexOf('_');
  return split > 0 && /[A-Za-z0-9]/.test(token.slice(0, split))
    ? { prefix: token.slice(0, split), local: token.slice(split + 1) } : null;
}

function tokensOf(source) {
  const modules = new Map();
  for (const match of source.matchAll(TOKEN)) {
    const parsed = parseToken(match[2]);
    if (!parsed) continue;
    const { prefix, local } = parsed;
    if (!modules.has(prefix)) modules.set(prefix, new Set());
    modules.get(prefix).add(local);
  }
  return modules;
}

function modulesFromDocument(doc, ownMark) {
  const modules = new Map();
  const add = source => {
    for (const [prefix, locals] of tokensOf(source)) {
      if (!modules.has(prefix)) modules.set(prefix, new Set());
      for (const local of locals) modules.get(prefix).add(local);
    }
  };
  for (const style of doc.querySelectorAll('style')) {
    if (style.dataset?.plugin === ownMark || style.dataset?.pluginCss?.startsWith(ownMark + '/')) continue;
    if (style.dataset?.plugin && !style.dataset.plugin.startsWith('@deepseek-ai/')) continue;
    add(style.textContent || '');
  }
  // Standalone previews may expose classes without the host's stylesheet loader.
  if (!modules.size) for (const node of doc.querySelectorAll('[class]')) {
    if (!node.closest?.('[data-acid-motion-owned]')) add(node.getAttribute('class') || '');
  }
  return modules;
}

function resolvePrefix(locals, candidates, authored) {
  const contains = names => [...locals].every(local => names.has(local));
  // An unchanged build is resolved too; it must never wait for its hashes to change.
  if (candidates.has(authored) && contains(candidates.get(authored))) return authored;
  const matches = [...candidates].filter(([, names]) => contains(names));
  if (!matches.length || (locals.size === 1 && matches.length !== 1)) return null;
  matches.sort((a, b) => a[1].size - b[1].size);
  if (matches[1]?.[1].size === matches[0][1].size) return null;
  return matches[0][0];
}

function mapModules(signatures, candidates) {
  const authored = typeof signatures === 'string' ? tokensOf(signatures)
    : new Map(Object.entries(signatures).map(([prefix, locals]) => [prefix, new Set(locals)]));
  const mapping = new Map();
  for (const [prefix, locals] of authored) {
    const target = resolvePrefix(locals, candidates, prefix);
    if (target) mapping.set(prefix, target);
  }
  return mapping;
}

function rewrite(source, mapping) {
  return source.replace(TOKEN, (whole, before, token) => {
    const parsed = parseToken(token);
    if (!parsed) return whole;
    const { prefix, local } = parsed;
    return mapping.has(prefix) ? before + mapping.get(prefix) + '_' + local : whole;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseToken, tokensOf, modulesFromDocument, resolvePrefix, mapModules, rewrite };
}
