// MARATHON // SECRET TERMINAL PROTOCOL — pure trigger logic. No DOM, no storage, no network.
// Only egg IDs and timestamps ever leave this module; composer text is read, matched and dropped.
const MARATHON_PREF = 'dsh-industrial-acid-skin:marathon';
const MARATHON_SEQUENCE = Object.freeze(['leela', 'tycho', 'durandal']);
const MARATHON_SEQUENCE_WINDOW = 180000;
const MARATHON_COOLDOWNS = Object.freeze([0, 10000, 30000, 60000]);
const MARATHON_SCOPES = Object.freeze(['full', 'composer']);
const MARATHON_DEFAULTS = Object.freeze({ enabled: true, cooldown: 10000, scope: 'full' });
// `keywords` are matched after normalizeMarathonText; `exact` eggs only fire when they are the whole input.
const MARATHON_EGGS = Object.freeze([
  { id: 'durandal', code: 'EG-01', name: 'DURANDAL', keywords: ['durandal'], duration: 6800, tone: 'green' },
  { id: 'tycho', code: 'EG-02', name: 'TYCHO', keywords: ['tycho'], duration: 5200, tone: 'red' },
  { id: 'leela', code: 'EG-03', name: 'LEELA', keywords: ['leela'], duration: 5200, tone: 'blue' },
  { id: 'thoth', code: 'EG-04', name: 'THOTH', keywords: ['thoth'], duration: 5600, tone: 'mono' },
  { id: 'rampancy', code: 'EG-05', name: 'RAMPANCY', keywords: ['rampancy'], duration: 3200, tone: 'split' },
  { id: 'tauceti', code: 'EG-06', name: 'TAU CETI', keywords: ['tau ceti iv', 'tau ceti'], duration: 6000, tone: 'nav' },
  { id: 'pfhor', code: 'EG-07', name: 'PFHOR', keywords: ['pfhor'], duration: 5600, tone: 'violet' },
  { id: 'cryo', code: 'EG-08', name: 'CRYO ARCHIVE', keywords: ['cryo archive'], duration: 6200, tone: 'ice' },
  { id: 'frog', code: 'EG-09', name: 'FROG BLAST', keywords: ['frog blast the vent core'], duration: 6200, tone: 'toy' },
  { id: 'seven', code: 'EG-10', name: 'SEVEN', keywords: ['777'], exact: true, duration: 5000, tone: 'gold' },
  { id: 'vidmaster', code: 'EG-11', name: 'VIDMASTER', keywords: ['vidmaster'], duration: 5400, tone: 'bone' },
  { id: 'mida', code: 'EG-12', name: 'MIDA', keywords: ['mida'], duration: 5200, tone: 'agit' },
  { id: 'traxus', code: 'EG-13', name: 'TRAXUS', keywords: ['traxus'], duration: 5800, tone: 'corp' },
  { id: 'jjaro', code: 'EG-14', name: 'JJARO', keywords: ['jjaro'], duration: 6400, tone: 'ancient' },
  { id: 'wrkncacnter', code: 'EG-15', name: "W'RKNCACNTER", keywords: ["w'rkncacnter"], duration: 6000, tone: 'void' },
  { id: 'null', code: 'EG-16', name: 'NULL TRANSMISSION', keywords: ['null//transmit.err'], duration: 6800, tone: 'null' }
].map(egg => Object.freeze({ exact: false, ...egg, keywords: Object.freeze(egg.keywords) })));
const MARATHON_FINALE = Object.freeze({ id: 'threeai', code: 'EG-∞', name: 'THREE AI PROTOCOL // RAMPANCY', duration: 10400, tone: 'green' });
const MARATHON_BY_ID = new Map([...MARATHON_EGGS, MARATHON_FINALE].map(egg => [egg.id, egg]));

// Fold widths, case and the apostrophes autocorrect/IMEs substitute, keep every other character as typed.
function normalizeMarathonText(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[‘’ʼʹ`´＇]/g, "'")
    .replace(/[ ​ - 　\s]+/gu, ' ').trim();
}
const MARATHON_WORD = /[\p{Script=Latin}\p{N}_']/u;
// Sentence punctuation after a keyword counts as "finished"; inner keyword symbols (/, ., ') are never stripped.
const MARATHON_TRAIL = /[\s,!?;:…。，！？；：、~～]+$/u;
const MARATHON_PATTERNS = MARATHON_EGGS.flatMap(egg => egg.keywords.map(keyword => ({ egg, keyword })))
  .sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Match a whole composer value against the catalog.
 * kind 'full': the input is exactly the keyword. kind 'tail': the input ends with a standalone keyword.
 */
function matchMarathonKeyword(raw) {
  const text = normalizeMarathonText(raw);
  if (!text || text.length > 400) return null;
  for (const { egg, keyword } of MARATHON_PATTERNS) if (text === keyword) return { id: egg.id, keyword, kind: 'full' };
  // A trailing period may belong to a keyword (null//transmit.err.) so strip it only after the exact pass.
  const tail = text.replace(MARATHON_TRAIL, '').replace(/\.+$/, '');
  for (const { egg, keyword } of MARATHON_PATTERNS) {
    if (egg.exact || !tail.endsWith(keyword)) continue;
    const before = tail.slice(0, tail.length - keyword.length);
    if (before === '' || !MARATHON_WORD.test(before.at(-1))) return { id: egg.id, keyword, kind: before === '' ? 'full' : 'tail' };
  }
  return null;
}

function normalizeMarathonState(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const known = id => MARATHON_EGGS.some(egg => egg.id === id);
  const sequence = value.sequence && Number.isInteger(value.sequence.step) && value.sequence.step >= 0 && value.sequence.step < MARATHON_SEQUENCE.length && Number.isFinite(value.sequence.at)
    ? { step: value.sequence.step, at: value.sequence.at } : { step: 0, at: 0 };
  return {
    v: 1,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : MARATHON_DEFAULTS.enabled,
    cooldown: MARATHON_COOLDOWNS.includes(value.cooldown) ? value.cooldown : MARATHON_DEFAULTS.cooldown,
    // 'full' covers the whole Harness window; 'composer' keeps the input area clear.
    scope: MARATHON_SCOPES.includes(value.scope) ? value.scope : MARATHON_DEFAULTS.scope,
    discovered: [...new Set(Array.isArray(value.discovered) ? value.discovered.filter(known) : [])],
    sequence,
    unlocked: Number.isFinite(value.unlocked) && value.unlocked > 0 ? value.unlocked : 0
  };
}

/**
 * Advance LEELA → TYCHO → DURANDAL. Any other egg, a wrong order or an expired window resets progress.
 * Returns the next sequence and whether this trigger completed the protocol.
 */
function advanceMarathonSequence(sequence, id, now, window = MARATHON_SEQUENCE_WINDOW) {
  const live = sequence && sequence.step > 0 && now - sequence.at <= window ? sequence.step : 0;
  if (id === MARATHON_SEQUENCE[live]) {
    if (live === MARATHON_SEQUENCE.length - 1) return { sequence: { step: 0, at: 0 }, step: MARATHON_SEQUENCE.length, complete: true };
    return { sequence: { step: live + 1, at: now }, step: live + 1, complete: false };
  }
  if (id === MARATHON_SEQUENCE[0]) return { sequence: { step: 1, at: now }, step: 1, complete: false };
  return { sequence: { step: 0, at: 0 }, step: 0, complete: false };
}

/**
 * Debounced gate between composer input and the director. It never stores text: after a match it keeps
 * only the egg ID as "spent" until that keyword leaves the composer, so continuing to type cannot re-fire.
 */
function createMarathonGate({ cooldown = () => MARATHON_DEFAULTS.cooldown, now = () => Date.now(), globalGap = 1200, bypass = () => false } = {}) {
  const lastFired = new Map();
  let spent = null, lastAny = -Infinity;
  return {
    evaluate(raw) {
      const match = matchMarathonKeyword(raw);
      if (!match) { spent = null; return null; }
      if (spent === match.id) return null;
      const time = now(), wait = cooldown();
      // The protocol finale must not be swallowed by an earlier stand-alone DURANDAL cooldown.
      if (!bypass(match.id) && (time - lastAny < globalGap || time - (lastFired.get(match.id) ?? -Infinity) < wait)) return null;
      spent = match.id; lastAny = time; lastFired.set(match.id, time);
      return match;
    },
    release() { spent = null; },
    reset() { spent = null; lastAny = -Infinity; lastFired.clear(); }
  };
}

// Composer fields only: the native Lexical editor, or the documented textarea fallback. Never passwords.
// Resolved per use so the gate follows the running build instead of the one at load time.
const marathonInput = () => moduleSelector('[data-composer-input=true],textarea[data-composer-input],[data-composer-card=true] textarea,.RlGAzG_card textarea');
function marathonComposerText(node) {
  if (!node || node.type === 'password' || node.getAttribute?.('type') === 'password') return null;
  if (node.getAttribute?.('autocomplete')?.includes('password')) return null;
  if (typeof node.value === 'string' && node.tagName === 'TEXTAREA') return node.value;
  return node.isContentEditable === false ? null : node.textContent ?? null;
}
