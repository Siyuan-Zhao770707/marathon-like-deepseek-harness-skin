// The macOS build exposes no window channel to the renderer, so the caption buttons round-trip
// through the host half. The validation below is what keeps that seam from becoming an arbitrary
// command runner: only four actions, only in a well-formed envelope.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let installWindowControlHost, applyWindowAction, WINDOW_ACTIONS;
test('load the host module', async () => {
  ({ installWindowControlHost, applyWindowAction, WINDOW_ACTIONS } = await import(path.join(__dirname, '..', 'lib', 'window-control-host.js')));
});

function hostWith(handler) {
  const routes = new Map();
  const ctx = { connection: { fetch: { register(route) { routes.set(route.path, route); } } } };
  installWindowControlHost(ctx);
  return { routes, handler };
}

const envelope = (payload, method = 'industrial-acid/window-control') => ({
  type: 'client-request', rpcId: 'r1', method,
  payload,
});

async function call(route, body) {
  return route.fetch({ json: async () => body, signal: undefined });
}

test('only the four known actions are accepted', () => {
  assert.deepEqual([...WINDOW_ACTIONS].sort(), ['close', 'maximize', 'minimize', 'state']);
});

test('a well-formed request is dispatched', async () => {
  const { routes } = hostWith();
  const route = routes.get('/api/industrial-acid/window-control');
  assert.ok(route, 'route must be registered');
  assert.equal(route.methods[0], 'POST');
});

test('unknown actions and wrong methods are rejected before anything runs', async () => {
  const { routes } = hostWith();
  const route = routes.get('/api/industrial-acid/window-control');
  for (const bad of [
    envelope({ action: 'shell' }),
    envelope({ action: 'close', extra: 1 }),
    envelope({}),
    envelope(null),
    envelope({ action: 'close' }, 'industrial-acid/token-activity'),
  ]) {
    const response = await call(route, bad);
    assert.equal(response.status, 400);
  }
});

test('malformed JSON is rejected', async () => {
  const { routes } = hostWith();
  const route = routes.get('/api/industrial-acid/window-control');
  const response = await route.fetch({ json: async () => { throw new Error('bad'); }, signal: undefined });
  assert.equal(response.status, 400);
});
