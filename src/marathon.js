// MARATHON // SECRET TERMINAL PROTOCOL — composer listener, progress store and settings.
const MARATHON_DEBOUNCE = 520;
// Hidden theme unlocked by THREE AI PROTOCOL; it goes through makeScheme like every other preset.
const MARATHON_THEME = Object.freeze({
  day: Object.freeze({ accent: '#3DFF7F', signal: '#0B6B3A', surface: '#EAF2EA', text: '#0A150D' }),
  night: Object.freeze({ accent: '#3DFF7F', signal: '#1FA65A', surface: '#030806', text: '#C4F7D3' })
});
const MARATHON_DICTIONARIES = {
  zh: { 'marathon': '隐藏终端协议', 'marathon.description': '在输入框中输入特定的《Marathon》关键词即可接入。只记录已发现的信号编号与解锁进度，不保存任何输入内容。', 'marathon.enabled': '启用', 'marathon.on': '开启', 'marathon.off': '关闭', 'marathon.cooldown': '同一信号冷却', 'marathon.scope': '演出范围', 'marathon.scope.full': '全屏', 'marathon.scope.composer': '避开输入框', 'marathon.signals': '已发现信号', 'marathon.unknown': '未知信号', 'marathon.replay': '重播', 'marathon.protocol': '重播三 AI 协议', 'marathon.protocolLocked': '三 AI 协议：依次唤醒三个 AI', 'marathon.theme': '应用 RAMPANCY // 终端绿', 'marathon.themeLocked': '隐藏主题：未解锁', 'marathon.reset': '重置进度', 'marathon.confirm': '确认重置？', 'rampancy': '终端绿' },
  en: { 'marathon': 'Secret terminal protocol', 'marathon.description': 'Type certain Marathon keywords in the composer to open a channel. Only discovered signal IDs and unlock progress are stored, never what you type.', 'marathon.enabled': 'Enabled', 'marathon.on': 'On', 'marathon.off': 'Off', 'marathon.cooldown': 'Per-signal cooldown', 'marathon.scope': 'Show area', 'marathon.scope.full': 'Full window', 'marathon.scope.composer': 'Keep composer clear', 'marathon.signals': 'Signals found', 'marathon.unknown': 'Unknown signal', 'marathon.replay': 'Replay', 'marathon.protocol': 'Replay THREE AI PROTOCOL', 'marathon.protocolLocked': 'THREE AI PROTOCOL: wake three AIs in order', 'marathon.theme': 'Apply RAMPANCY // TERMINAL GREEN', 'marathon.themeLocked': 'Hidden theme: locked', 'marathon.reset': 'Reset progress', 'marathon.confirm': 'Confirm reset?', 'rampancy': 'Terminal green' }
};

function createMarathonStore(storage = globalThis.localStorage) {
  const listeners = new Set();
  const read = () => { try { return normalizeMarathonState(JSON.parse(storage?.getItem(MARATHON_PREF) ?? 'null')); } catch { return normalizeMarathonState(); } };
  let state = read();
  const emit = () => { for (const listener of listeners) listener(); };
  return {
    get: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    update(patch) {
      state = normalizeMarathonState({ ...state, ...patch });
      try { storage?.setItem(MARATHON_PREF, JSON.stringify(state)); } catch { /* Progress stays in memory when storage is blocked. */ }
      emit(); return state;
    },
    reload() { state = read(); emit(); },
    reset() { return this.update({ discovered: [], sequence: { step: 0, at: 0 }, unlocked: 0 }); }
  };
}

/** Record one trigger (ID only) and decide which show to play. */
function recordMarathonTrigger(store, id, now = Date.now()) {
  const state = store.get(), result = advanceMarathonSequence(state.sequence, id, now);
  const first = result.complete && !state.unlocked;
  store.update({ discovered: state.discovered.includes(id) ? state.discovered : [...state.discovered, id], sequence: result.sequence, unlocked: result.complete ? state.unlocked || now : state.unlocked });
  if (result.complete) return { show: MARATHON_FINALE.id, info: { first } };
  return { show: id, info: { step: MARATHON_SEQUENCE.includes(id) ? result.step : 0 } };
}

/**
 * Watch only the focused composer. Listeners are passive and never cancel or rewrite input; text is
 * read when the user pauses, after IME composition ends, or right before Enter sends it.
 */
function installMarathonProtocol({ store, director, now = () => Date.now() }) {
  const live = () => { const sequence = store.get().sequence; return sequence.step === MARATHON_SEQUENCE.length - 1 && now() - sequence.at <= MARATHON_SEQUENCE_WINDOW; };
  const gate = createMarathonGate({ cooldown: () => store.get().cooldown, now, bypass: id => id === MARATHON_SEQUENCE.at(-1) && live() });
  const controller = new AbortController(), options = { capture: true, passive: true, signal: controller.signal };
  let target = null, timer = 0, composing = false;
  const observer = typeof MutationObserver === 'function' ? new MutationObserver(() => { if (!composing) schedule(MARATHON_DEBOUNCE); }) : null;
  const composerOf = node => node?.closest?.(MARATHON_INPUT) ?? null;
  function attach(node) {
    if (node === target) return;
    observer?.disconnect(); target = node; gate.release();
    if (node) observer?.observe(node, { characterData: true, childList: true, subtree: true });
  }
  function evaluate() {
    clearTimeout(timer); timer = 0;
    if (!store.get().enabled || composing || !target?.isConnected) return;
    const text = marathonComposerText(target);
    if (text === null) return;
    const match = gate.evaluate(text);
    if (!match) return;
    const { show, info } = recordMarathonTrigger(store, match.id, now());
    director.play(show, info);
  }
  function schedule(delay) { clearTimeout(timer); timer = setTimeout(evaluate, delay); }
  document.addEventListener('focusin', event => { const node = composerOf(event.target); if (node) attach(node); }, options);
  document.addEventListener('input', event => {
    const node = composerOf(event.target);
    if (!node) return;
    attach(node);
    if (event.isComposing || composing) return;
    // A typed space or sentence mark means the word is finished; otherwise wait for a pause.
    schedule(typeof event.data === 'string' && /[\s,!?;:。，！？；：、]$/u.test(event.data) ? 40 : MARATHON_DEBOUNCE);
  }, options);
  document.addEventListener('compositionstart', event => { if (composerOf(event.target)) composing = true; }, options);
  document.addEventListener('compositionend', event => { const node = composerOf(event.target); if (!node) return; composing = false; attach(node); schedule(MARATHON_DEBOUNCE); }, options);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    const node = composerOf(event.target);
    if (node) { attach(node); evaluate(); }
  }, options);
  const onStorage = event => { if (event.key === MARATHON_PREF || event.key === null) store.reload(); };
  window.addEventListener('storage', onStorage);
  return () => { controller.abort(); window.removeEventListener('storage', onStorage); observer?.disconnect(); clearTimeout(timer); target = null; director.dispose(); };
}

function MarathonSettings({ t, useMarathon, store, play, applyTheme, prefix = 'acid-mx' }) {
  const state = useMarathon(), [confirm, setConfirm] = React.useState(false);
  const found = new Set(state.discovered);
  return h('section', { className: 'acid-mx-settings', 'aria-label': t('marathon') },
    h('div', { className: 'acid-mx-head' }, h('strong', null, `SECRET TERMINAL // ${t('marathon')}`), h('span', { 'aria-label': t('marathon.signals') }, `${String(found.size).padStart(2, '0')} / ${MARATHON_EGGS.length}`)),
    h('p', null, t('marathon.description')),
    h('div', { className: 'acid-setting-row' }, h('label', { htmlFor: `${prefix}-enabled` }, t('marathon.enabled')),
      h('select', { id: `${prefix}-enabled`, value: state.enabled ? 'on' : 'off', onChange: event => store.update({ enabled: event.target.value === 'on' }) }, h('option', { value: 'on' }, t('marathon.on')), h('option', { value: 'off' }, t('marathon.off')))),
    h('div', { className: 'acid-setting-row' }, h('label', { htmlFor: `${prefix}-scope` }, t('marathon.scope')),
      h('select', { id: `${prefix}-scope`, value: state.scope, onChange: event => store.update({ scope: event.target.value }) }, ...MARATHON_SCOPES.map(scope => h('option', { key: scope, value: scope }, t(`marathon.scope.${scope}`))))),
    h('div', { className: 'acid-setting-row' }, h('label', { htmlFor: `${prefix}-cooldown` }, t('marathon.cooldown')),
      h('select', { id: `${prefix}-cooldown`, value: String(state.cooldown), onChange: event => store.update({ cooldown: Number(event.target.value) }) }, ...MARATHON_COOLDOWNS.map(ms => h('option', { key: ms, value: String(ms) }, `${ms / 1000}s`)))),
    h('div', { className: 'acid-mx-grid', role: 'group', 'aria-label': t('marathon.signals') }, ...MARATHON_EGGS.map(egg => found.has(egg.id)
      ? h('button', { key: egg.id, type: 'button', 'data-mx-replay': egg.id, title: `${t('marathon.replay')} ${egg.name}`, onClick: () => play(egg.id, {}) }, h('span', null, egg.code), h('b', null, egg.name), h('span', { 'aria-hidden': true }, '▶'))
      : h('button', { key: egg.id, type: 'button', disabled: true, 'aria-label': `${egg.code} ${t('marathon.unknown')}` }, h('span', null, egg.code), h('b', { 'aria-hidden': true }, '▒▒▒▒▒▒')))),
    h('div', { className: 'acid-mx-actions' },
      h('button', { type: 'button', 'data-primary': state.unlocked ? '' : undefined, 'data-mx-replay': 'threeai', disabled: !state.unlocked, onClick: () => play(MARATHON_FINALE.id, { first: false }) }, state.unlocked ? t('marathon.protocol') : t('marathon.protocolLocked')),
      h('button', { type: 'button', 'data-mx-theme': '', disabled: !state.unlocked, onClick: applyTheme }, state.unlocked ? t('marathon.theme') : t('marathon.themeLocked')),
      h('button', { type: 'button', 'data-mx-reset': '', disabled: !found.size && !state.unlocked, onClick: () => { if (confirm) { store.reset(); setConfirm(false); } else setConfirm(true); }, onBlur: () => setConfirm(false) }, confirm ? t('marathon.confirm') : t('marathon.reset'))));
}
