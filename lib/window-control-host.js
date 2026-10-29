import { execFile } from 'node:child_process';

// The macOS build draws its window buttons with the system and never forwards a window-control
// channel to the renderer: `dshDesktop.windowControls` does not exist there, and the only window
// operation the bridge exposes is close. So the skin asks the host half for those actions instead.
// The host runs as a child process of the desktop app, which is what makes the accessibility
// route work; the renderer cannot reach it on its own.
//
// Every action addresses the window by its owning process and main-window subrole rather than by
// list index: indexes shift when a window enters or leaves full screen, and a control that acts on
// "window 2" would eventually minimize the wrong thing.

const APP = 'DeepSeek Harness';

/** Run an AppleScript snippet and return its trimmed stdout. */
function osascript(script, signal) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout: 5000, signal }, (error, stdout, stderr) => {
      if (error) { reject(new Error(stderr?.trim() || error.message)); return; }
      resolve(stdout.trim());
    });
  });
}

// Locate the product window inside a `tell` block: auxiliary panels are not standard windows, and
// addressing by index is unsafe because indexes shift when a window enters or leaves full screen.
// The body must run inside the same `tell` block, so this returns only the locator statement.
// The main window is captured once as `target`. Indexes are deliberately avoided: the window list
// reorders during full-screen and Dock transitions, so an index resolved at the start of a script
// can name a different window by the time it is used.
//
// `try` keeps an empty window list (while the window animates into the Dock) from raising.
const FIND_WINDOW = `set target to missing value
  try
    set target to first window whose subrole is "AXStandardWindow"
  end try
  if target is missing value then return "missing"`;

/** Wrap a body in the process scope so `target` is addressable. */
const inProcess = body => `tell application "System Events" to tell process "${APP}"
  ${FIND_WINDOW}
  ${body}
end tell`;

export const WINDOW_ACTIONS = new Set(['minimize', 'maximize', 'close', 'state']);

/**
 * Apply a window action on the current build's main window.
 * @param action - one of WINDOW_ACTIONS
 * @returns the resulting window state, so the caller can paint the right glyph
 */
export async function applyWindowAction(action, signal) {
  if (!WINDOW_ACTIONS.has(action)) throw new Error('Unsupported window action.');
  if (process.platform !== 'darwin') throw new Error('Native window control is macOS-only.');
  if (action === 'state') return readWindowState(signal);

  const body =
    action === 'minimize'
      ? // Minimizing a full-screen window would leave an empty space; leave full screen first.
        `if (value of attribute "AXFullScreen" of target) is true then set value of attribute "AXFullScreen" of target to false
         set value of attribute "AXMinimized" of target to true`
      : action === 'maximize'
        ? `set value of attribute "AXFullScreen" of target to not (value of attribute "AXFullScreen" of target)`
        : // Closing uses the application's own close path so unsaved-state handling still runs.
          // The button is resolved with `repeat` rather than a `whose` clause: a `whose` after a
          // window reference is re-parented onto the window list and fails with "invalid index".
          `set hit to missing value
           try
             repeat with b in (buttons of target)
               if (subrole of b as text) is "AXCloseButton" then
                 set hit to b
                 exit repeat
               end if
             end repeat
           end try
           if hit is missing value then return "missing-button"
           perform action "AXPress" of hit`;

  await osascript(inProcess(`${body}
  return "ok"`), signal);
  // Entering or leaving full screen animates, and during the animation the window's accessibility
  // attributes are not readable. Waiting lets the caller paint the settled state instead of
  // flickering an "unavailable" glyph, and the retry covers a slow animation.
  for (const delay of [220, 420, 700]) {
    await new Promise(resolve => setTimeout(resolve, delay));
    const state = await readWindowState(signal);
    if (state.available) return state;
  }
  return { available: false };
}

/** Read the minimized/maximized facts the caption glyphs depend on. */
export async function readWindowState(signal) {
  if (process.platform !== 'darwin') return { available: false };
  try {
    const out = await osascript(inProcess(
      `return (value of attribute "AXMinimized" of target as text) & "," & (value of attribute "AXFullScreen" of target as text)`), signal);
    if (out === 'missing') return { available: false };
    const [minimized, fullscreen] = out.split(',');
    return { available: true, minimized: minimized === 'true', maximized: fullscreen === 'true' };
  } catch {
    // Reading may fail while the app is starting or when accessibility access is not granted;
    // the caller renders the controls as unavailable rather than guessing.
    return { available: false };
  }
}

/** Register the `industrial-acid/window-control` RPC on the authenticated connection. */
export function installWindowControlHost(ctx) {
  ctx.connection.fetch.register({
    path: '/api/industrial-acid/window-control',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      let message;
      try { message = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
      const payload = message?.payload;
      if (message?.type !== 'client-request' || typeof message.rpcId !== 'string' || message.rpcId.length > 128
          || message.method !== 'industrial-acid/window-control'
          || payload === null || typeof payload !== 'object' || Array.isArray(payload)
          || Object.keys(payload).length !== 1 || !WINDOW_ACTIONS.has(payload.action)) {
        return new Response('Invalid request', { status: 400 });
      }
      let result;
      try { result = { ok: true, value: await applyWindowAction(payload.action, request.signal) }; }
      catch (error) { result = { ok: false, error: { code: 'industrial-acid/window-control', message: String(error?.message ?? error), details: {} } }; }
      return new Response(JSON.stringify({ type: 'server-response', rpcId: message.rpcId, result }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
      });
    },
  });
}
