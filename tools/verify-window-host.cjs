#!/usr/bin/env node
// Verifies the deployed host module can actually drive this window, without going through the
// app. Useful after a restart: if this passes but the buttons still do nothing, the host process
// is running older code than what is on disk.
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const home = process.env.HOME;
const candidates = [
  join(home, '.dsh/profiles/desktop/node_modules/dsh-industrial-acid-skin/lib/window-control-host.js'),
  join(home, '.dsh/plugins/dsh-industrial-acid-skin/2.4.9/lib/window-control-host.js'),
];
(async () => {
  for (const file of candidates) {
    try {
      const m = await import(file);
      const state = await m.applyWindowAction('state');
      console.log(`${file}\n  state: ${JSON.stringify(state)}`);
      if (!state.available) {
        console.log('  host cannot read the window. Check System Settings > Privacy & Security > Accessibility for DeepSeek Harness.');
      }
    } catch (error) {
      console.log(`${file}\n  FAILED: ${error.message}`);
    }
  }
  // A host process started before the module was written cannot serve the route.
  try {
    const out = execFileSync('ps', ['-eo', 'pid,lstart,command'], { encoding: 'utf8' });
    const line = out.split('\n').find(l => l.includes('dsh-desktop-host'));
    if (line) console.log(`\nhost process: ${line.trim().split(/\s{2,}/)[0]} started ${line.trim().slice(0, 30).trim()}`);
  } catch {}
})();
