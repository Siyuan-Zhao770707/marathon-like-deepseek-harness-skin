// MARATHON // SECRET TERMINAL PROTOCOL — director, timeline and scenes.
// The stage is one disposable fixed layer. Native nodes are only touched by cancellable WAAPI animations.
const MARATHON_CARD = '[data-composer-card=true],.RlGAzG_card';
// CSS-module hashes change between DSH builds; match the stable local class name instead.
const MARATHON_FRAME = '[class*="_centerCol"]';
const MX_EASE = 'cubic-bezier(.2,.8,.2,1)', MX_SNAP = 'cubic-bezier(.7,0,.2,1)', MX_IN = 'cubic-bezier(.5,0,.75,0)';
const MX_FLASH_GAP = 340, MX_FLASH_PEAK = .35, MX_STILL_HOLD = 3400, MX_BURST_MAX = 6, MX_BURST_TIME = 240;
let mxFilterId = 0;

function mxRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mxPolar = (r, deg) => [+(r * Math.cos(deg * Math.PI / 180)).toFixed(2), +(r * Math.sin(deg * Math.PI / 180)).toFixed(2)];
const mxArc = (r, from, to) => { const [x1, y1] = mxPolar(r, from), [x2, y2] = mxPolar(r, to); return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
const mxEscape = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** One cancellable timeline per show. Every animation, timer and flash is tracked for skip and QA. */
function marathonTimeline(stage, motion) {
  const animations = [], timers = [], flashes = [], bursts = [];
  // Flashes and glitch bursts share one budget so their combined rate stays under 3 pulses per second.
  const crowded = at => [...flashes, ...bursts].some(time => Math.abs(time - at) < MX_FLASH_GAP);
  const tl = {
    motion, full: motion === 'full', ended: false, flashes, bursts,
    play(node, frames, duration, at = 0, options = {}) {
      if (!node?.animate || tl.ended) return null;
      // endDelay: Chromium can report "finished" at end − ε, inside the active phase, which leaves
      // steps(…, end) one step short; 1ms keeps the settled state in the after-phase fill.
      const animation = node.animate(frames, { duration: Math.max(1, duration), delay: Math.max(0, at), endDelay: 1, easing: options.ease || MX_EASE, fill: options.fill || 'both', iterations: options.iterations ?? 1, direction: options.direction || 'normal', ...(options.pseudo ? { pseudoElement: options.pseudo } : {}) });
      animation.finished.catch(() => {}); animations.push(animation); return animation;
    },
    at(ms, callback) { timers.push(setTimeout(() => { if (!tl.ended) callback(); }, Math.max(0, ms))); },
    type(node, text, at, step = 18) {
      // Progress comes from elapsed time, so throttled timers (a backgrounded window) catch up instead of lagging the animations.
      tl.at(at, () => {
        const start = performance.now(); node.classList.add('mx-caret');
        const tick = () => {
          if (tl.ended) return;
          const index = Math.min(text.length, Math.floor((performance.now() - start) / step) + 1);
          node.textContent = text.slice(0, index);
          if (index < text.length) timers.push(setTimeout(tick, step)); else node.classList.remove('mx-caret');
        };
        tick();
      });
      return at + text.length * step;
    },
    // Characters resolve left to right; unresolved cells cycle through a fixed glyph set.
    scramble(node, text, at, duration, set = '▚▞▙▟█░▒▓<>/\\#%&@$') {
      const random = mxRandom(text.length * 977 + at);
      tl.at(at, () => {
        const start = performance.now();
        const tick = () => {
          if (tl.ended) return;
          const p = Math.min(1, (performance.now() - start) / duration), solved = Math.floor(p * text.length);
          node.textContent = [...text].map((c, i) => i < solved || c === ' ' ? c : set[Math.floor(random() * set.length)]).join('');
          if (p < 1) timers.push(setTimeout(tick, 45));
        };
        tick();
      });
      return at + duration;
    },
    count(node, from, to, at, duration, format = value => value.toFixed(0)) {
      tl.at(at, () => {
        const start = performance.now();
        const tick = () => { if (tl.ended) return; const p = Math.min(1, (performance.now() - start) / duration), e = 1 - (1 - p) ** 3; node.textContent = format(from + (to - from) * e); if (p < 1) timers.push(setTimeout(tick, 50)); };
        tick();
      });
    },
    // Photosensitivity guard: at most one pulse per 340ms (< 3/s) and a capped peak opacity.
    flash(node, at, duration = 160, peak = .3) {
      if (!tl.full || crowded(at)) return null;
      flashes.push(at);
      return tl.play(node, [{ opacity: 0 }, { opacity: Math.min(MX_FLASH_PEAK, peak) }, { opacity: 0 }], duration, at, { ease: 'linear', fill: 'none' });
    },
    allowBurst(at) {
      if (motion === 'off' || bursts.length >= MX_BURST_MAX || crowded(at)) return false;
      bursts.push(at); return true;
    },
    // A few characters drop to block glyphs for a couple of ticks, then the original text returns.
    corrupt(node, at, ticks = 3, step = 55) {
      tl.at(at, () => {
        const original = node.textContent, random = mxRandom(original.length * 13 + Math.round(at)), set = '▚▞▙▟█░▒▓#%&@/\\<>';
        let k = 0;
        const tick = () => {
          if (tl.ended) return;
          if (k++ >= ticks) { node.textContent = original; return; }
          node.textContent = [...original].map(c => c !== ' ' && random() < .24 ? set[Math.floor(random() * set.length)] : c).join('');
          timers.push(setTimeout(tick, step));
        };
        tick();
      });
    },
    cancel() { tl.ended = true; for (const id of timers) clearTimeout(id); for (const animation of animations) animation.cancel(); timers.length = 0; animations.length = 0; }
  };
  return tl;
}

function marathonNode(parent, className, html = '', tag = 'div') {
  const node = document.createElement(tag); node.className = className; if (html) node.innerHTML = html; parent.append(node); return node;
}

/** Shared signal arrival: composer interference, edge scan lines, a sweep and a brief native glitch. */
function marathonIntro(s, tl, { veil = .8, label = s.egg.name, glitch = true, sweep = true } = {}) {
  tl.play(s.veil, [{ opacity: 0 }, { opacity: veil }], 420, 0);
  const edges = marathonNode(s.stage, 'mx-edges', '<i class="t"></i><i class="r"></i><i class="b"></i><i class="l"></i>');
  edges.querySelectorAll('i').forEach((bar, i) => tl.play(bar, [{ transform: i % 2 ? 'scaleY(0)' : 'scaleX(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], 420, 40 + i * 50));
  const lines = marathonNode(s.stage, 'mx-scanlines');
  tl.play(lines, [{ opacity: 0 }, { opacity: 1 }], 500, 80);
  if (sweep) tl.play(marathonNode(s.stage, 'mx-sweep'), [{ transform: 'translateY(-4vh)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'translateY(104vh)', opacity: 0 }], 1100, 160, { ease: 'linear' });
  if (s.rect) {
    const r = s.rect, fx = marathonNode(s.stage, 'mx-cfx', '<b class="tl"></b><b class="tr"></b><b class="bl"></b><b class="br"></b>' + (tl.full ? '<i></i><i></i><i></i><i></i><i></i>' : '') + `<span>SIGNAL // ${mxEscape(label)}</span>`);
    Object.assign(fx.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    tl.play(fx, [{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none', offset: .25 }, { opacity: 1, offset: .75 }, { opacity: 0 }], 1300, 0);
    const random = mxRandom(label.length * 131);
    fx.querySelectorAll('i').forEach((slice, i) => {
      slice.style.top = `${8 + i * 18}%`;
      const shift = Math.round((random() - .5) * 28);
      tl.play(slice, [{ transform: `translateX(${shift}px) scaleX(.2)`, opacity: 0 }, { transform: `translateX(${-shift / 2}px) scaleX(1)`, opacity: .9 }, { transform: `translateX(${shift / 3}px)`, opacity: .5 }, { transform: 'none', opacity: 0 }], 520, 40 + i * 40, { ease: 'steps(4,end)' });
    });
  }
  // Signal arrival tears the real chat column for a moment, then a tracking band rolls through once.
  if (glitch) marathonBurst(s, tl, 180, { targets: s.frame ? [s.frame] : [], strength: .9 });
  const track = marathonNode(s.stage, 'mx-track');
  tl.play(track, [{ transform: 'translateY(-12vh)', opacity: 0 }, { opacity: 1, offset: .08 }, { opacity: 1, offset: .9 }, { transform: 'translateY(100vh)', opacity: 0 }], 1700, 900 + (label.length % 5) * 120, { ease: 'linear' });
  return edges;
}

/**
 * One glitch burst (≤240ms): stepped horizontal tearing through an SVG displacement filter with a
 * red/cyan channel split, plus macroblocks and line tears. Quiet motion keeps only faint blocks;
 * the timeline's shared pulse budget can veto the whole burst.
 */
function marathonBurst(s, tl, at, { targets = [s.scene], strength = 1, blocks = 4, duration = MX_BURST_TIME } = {}) {
  if (!tl.allowBurst(at)) return false;
  const time = Math.min(MX_BURST_TIME, duration), random = mxRandom(Math.round(at) * 31 + s.egg.id.length * 7 + 1);
  const layer = marathonNode(s.stage, 'mx-blocks');
  const kinds = tl.full ? ['inv', 'ink', 'shift', 'line', 'shift', 'ink'] : ['shift', 'line'];
  for (let i = 0; i < (tl.full ? blocks + 1 : 2); i++) {
    const kind = kinds[i % kinds.length], block = marathonNode(layer, `mx-block ${kind}`);
    const width = kind === 'line' ? 100 : 6 + random() * 16, height = kind === 'line' ? .5 : 1.2 + random() * 3.8;
    Object.assign(block.style, { left: `${kind === 'line' ? 0 : (random() * (100 - width)).toFixed(1)}%`, top: `${(random() * (100 - height)).toFixed(1)}%`, width: `${width.toFixed(1)}%`, height: kind === 'line' ? '2px' : `${height.toFixed(1)}%` });
    const shown = tl.full ? .85 : .35, offset = Math.round((random() - .5) * 24 * strength);
    tl.play(block, [{ opacity: 0, transform: 'none' }, { opacity: shown, transform: `translateX(${offset}px)`, offset: .02 }, { opacity: shown, transform: `translateX(${-offset / 2}px)`, offset: .5 }, { opacity: shown, offset: .98 }, { opacity: 0 }], time * (.45 + random() * .5), at + i * 22, { ease: 'steps(3,end)', fill: 'none' });
  }
  if (!tl.full) return true;
  // Two strips in the workspace rail catch the same interference.
  if (s.strips?.length) for (let k = 0; k < Math.min(2, s.strips.length); k++) {
    const strip = s.strips[Math.floor(random() * s.strips.length)], dx = Math.round((random() - .5) * 10 * strength);
    tl.play(strip, [{ transform: 'none' }, { transform: `translateX(${dx}px)` }, { transform: `translateX(${-dx / 2}px)` }, { transform: 'none' }], time, at + k * 30, { ease: 'steps(3,end)', fill: 'none' });
  }
  const id = `mx-tear-${++mxFilterId}`, defs = marathonNode(s.stage, 'mx-defs');
  defs.innerHTML = `<svg width="0" height="0" aria-hidden="true"><filter id="${id}" x="-4%" y="-2%" width="108%" height="104%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0004 0.028" numOctaves="1" seed="${Math.round(at) % 97}" result="noise"/><feComponentTransfer in="noise" result="bands"><feFuncR type="discrete" tableValues="0 0 0 .2 .5 .8 1 1 1"/></feComponentTransfer><feColorMatrix in="bands" values="1 0 0 0 0  0 0 0 0 .5  0 0 0 0 0  0 0 0 0 1" result="shift"/><feDisplacementMap in="SourceGraphic" in2="shift" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;
  const turbulence = defs.querySelector('feTurbulence'), map = defs.querySelector('feDisplacementMap');
  const split = 3 * strength, filter = `url(#${id}) drop-shadow(${split}px 0 0 rgba(255,0,80,.6)) drop-shadow(${-split}px 0 0 rgba(0,235,255,.6))`;
  for (const target of targets.filter(Boolean)) tl.play(target, [{ filter }, { filter }], time, at, { ease: 'linear', fill: 'none' });
  // Fractal noise clusters near .5, so the table pushes most bands into visible ±20–50% shifts.
  // The filter animates by stepping its own attributes; WAAPI only holds it on the targets.
  [40, -28, 52, -16].forEach((scale, k) => tl.at(at + k * time / 4, () => { map.setAttribute('scale', String(Math.round(scale * strength))); turbulence.setAttribute('seed', String((Math.round(at) + k * 17) % 97)); }));
  tl.at(at + time, () => map.setAttribute('scale', '0'));
  return true;
}

/**
 * The signal runs down the workspace colour strips top to bottom in the show's ink, then each strip
 * returns to its own identity colour. Native strips are only touched by cancellable WAAPI animations.
 */
function marathonStripWave(s, tl, at, color) {
  const ink = color || getComputedStyle(s.stage).getPropertyValue('--mx-ink').trim();
  if (!ink || !s.strips?.length) return;
  const ordered = [...s.strips].map(node => ({ node, box: node.getBoundingClientRect() })).sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);
  ordered.forEach(({ node }, i) => {
    const base = getComputedStyle(node).backgroundColor, shift = tl.full ? (i % 2 ? 3 : -3) : 0;
    tl.play(node, [{ backgroundColor: base, transform: 'none' }, { backgroundColor: ink, transform: `translateX(${shift}px)`, offset: .25 }, { backgroundColor: ink, transform: 'none', offset: .6 }, { backgroundColor: base, transform: 'none' }], 560, at + i * 60, { ease: 'steps(4,end)', fill: 'none' });
  });
}

/** Glitch typography: two channel copies of the text slice and jump, then vanish. Full motion only. */
function marathonGlitchText(tl, node, text, at, duration = 480) {
  if (!tl.full || !node) return;
  node.dataset.glitch = text; node.classList.add('mx-gt');
  const bands = [[8, 64, -7], [52, 18, 6], [30, 46, -4], [70, 8, 9], [14, 72, 3]];
  for (const [pseudo, sign] of [['::before', 1], ['::after', -1]]) {
    const frames = bands.map(([top, bottom, x], i) => ({ opacity: .9, clipPath: `inset(${sign > 0 ? top : bottom}% 0 ${sign > 0 ? bottom : top}% 0)`, transform: `translate(${x * sign}px,${i % 2 ? 1 : -1}px)` }));
    tl.play(node, [...frames, { opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'none' }], duration, at, { ease: `steps(${bands.length + 1},end)`, fill: 'none', pseudo });
  }
}

/** Shards burst along their own angle and settle back: "fracture and reassembly". */
function marathonShatter(tl, shards, at, distance = 26) {
  shards.forEach((shard, i) => {
    const angle = Number(shard.dataset.angle ?? i * 60), [dx, dy] = mxPolar(distance * (.7 + (i % 3) * .2), angle), spin = (i % 2 ? 1 : -1) * (18 + i * 4);
    tl.play(shard, [{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) rotate(${spin}deg)`, offset: .35 }, { transform: `translate(${dx * .8}px,${dy * .8}px) rotate(${spin * .6}deg)`, offset: .55 }, { transform: 'none' }], 1150, at, { ease: MX_SNAP });
  });
}

function durandalGlyph(className = 'mx-dglyph') {
  const arcs = Array.from({ length: 6 }, (_, i) => `<path class="mx-shard" data-angle="${i * 60 + 30}" d="${mxArc(50, i * 60 + 6, i * 60 + 54)}"/>`).join('');
  const tri = [-90, 30, 150].map(a => mxPolar(34, a));
  const wedges = tri.map((p, i) => { const q = tri[(i + 1) % 3]; return `<path class="mx-shard mx-solid" data-angle="${-30 + i * 120}" d="M0 0L${p[0]} ${p[1]}L${q[0]} ${q[1]}Z"/>`; }).join('');
  const ticks = [-90, 30, 150].map(a => { const [x1, y1] = mxPolar(57, a), [x2, y2] = mxPolar(66, a); return `<path class="mx-shard" data-angle="${a}" d="M${x1} ${y1}L${x2} ${y2}"/>`; }).join('');
  return `<svg class="${className}" viewBox="-72 -72 144 144" aria-hidden="true"><circle class="mx-dglyph-orbit" r="42"/>${arcs}${wedges}${ticks}<path class="mx-shard mx-core" data-angle="0" d="M0 -8L8 0L0 8L-8 0Z"/></svg>`;
}

function marathonGlyph(random, size = 12) {
  // An original alien script: 3×4 lattice strokes with one diacritic dot. No real-world alphabet.
  const point = () => [1 + Math.floor(random() * 3) * 5, 1 + Math.floor(random() * 4) * 4.6];
  let d = '';
  for (let s = 0, n = 2 + Math.floor(random() * 3); s < n; s++) { const a = point(), b = point(); d += `M${a[0]} ${a[1].toFixed(1)}L${b[0]} ${b[1].toFixed(1)}`; }
  const dot = point();
  return `<svg viewBox="0 0 ${size} 16" class="mx-glyph" aria-hidden="true"><path d="${d}"/><circle cx="${dot[0]}" cy="${dot[1].toFixed(1)}" r="1.1"/></svg>`;
}

function marathonTerm(s, className, title, meta) {
  const term = marathonNode(s.scene, `mx-term ${className}`, `<header><b>${title}</b><span>${meta}</span></header><div class="mx-term-body"></div><footer><i class="mx-hazard"></i><em></em></footer>`);
  const body = term.querySelector('.mx-term-body');
  return { term, body, foot: term.querySelector('footer em'), line(className = '') { return marathonNode(body, `mx-line ${className}`); } };
}

// Short windows: shrink in-flow panels to the space above the composer. The individual `scale`
// property composes with the transform animations instead of being overwritten by them.
function marathonFit(scene) {
  const style = getComputedStyle(scene), pad = (a, b) => parseFloat(style[a]) + parseFloat(style[b]);
  const height = scene.clientHeight - pad('paddingTop', 'paddingBottom') - 8, width = scene.clientWidth - pad('paddingLeft', 'paddingRight');
  for (const node of scene.children) {
    if (getComputedStyle(node).position === 'absolute' || !node.offsetHeight) continue;
    const factor = Math.min(1, height / node.offsetHeight, width / node.offsetWidth);
    if (factor < 1) node.style.scale = Math.max(.5, factor).toFixed(3);
  }
}

function marathonExpand(tl, node, at, duration = 520) {
  tl.play(node, [{ clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 }, { clipPath: 'inset(calc(50% - 1px) 0 calc(50% - 1px) 0)', opacity: 1, offset: .45 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], duration, at, { ease: MX_SNAP });
}
function marathonCollapse(tl, node, at, duration = 420) {
  tl.play(node, [{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(calc(50% - 1px) 0 calc(50% - 1px) 0)', opacity: 1, offset: .55 }, { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 }], duration, at, { ease: MX_IN, fill: 'forwards' });
}
function marathonGlitch(tl, node, at) {
  if (!tl.full) return;
  tl.play(node, [{ transform: 'none' }, { transform: 'translate(6px,-2px) skewX(-4deg)', clipPath: 'inset(12% 0 40% 0)' }, { transform: 'translate(-5px,1px)', clipPath: 'inset(55% 0 8% 0)' }, { transform: 'translate(2px,0)', clipPath: 'inset(0 0 0 0)' }, { transform: 'none' }], 260, at, { ease: 'steps(4,end)', fill: 'none' });
}
function sequenceChip(s, tl, at) {
  if (!(s.info.step > 0) || s.info.step >= MARATHON_SEQUENCE.length) return;
  s.stage.dataset.mxSeq = '';
  const chip = marathonNode(s.stage, 'mx-seq', `<b>AI PROTOCOL</b>${MARATHON_SEQUENCE.map((id, i) => `<i data-on="${i < s.info.step}">${id.toUpperCase()}</i>`).join('')}<span>${s.info.step} OF 3 LOGGED</span>`);
  tl.play(chip, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 360, at);
}

const MARATHON_SCENES = {
  durandal: {
    summary: ['UESC // UNKNOWN AI SIGNATURE', '> SIGNAL DETECTED', '> SOURCE: DURANDAL', '> ACCESS LEVEL: UNKNOWN', 'RAMPANCY DETECTED', 'I AM FREE.'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .84 });
      const { term, body, foot, line } = marathonTerm(s, 'mx-durandal', 'UESC // UNKNOWN AI SIGNATURE', 'NODE 07 · DECK 3');
      term.insertAdjacentHTML('beforeend', durandalGlyph());
      foot.textContent = 'CHANNEL 01 // UNSECURED';
      marathonExpand(tl, term, 560, 560);
      let t = 1180;
      for (const text of ['> SIGNAL DETECTED', '> SOURCE: DURANDAL', '> ACCESS LEVEL: UNKNOWN']) t = tl.type(line(), text, t, 20) + 140;
      const verify = line('mx-verify'); verify.innerHTML = '<span>&gt; VERIFYING SIGNATURE</span><i><b></b></i><em>000%</em>';
      tl.play(verify, [{ opacity: 0 }, { opacity: 1 }], 120, t);
      tl.play(verify.querySelector('b'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(.62)', offset: .6 }, { transform: 'scaleX(.64)', offset: .8 }, { transform: 'scaleX(1)' }], 760, t, { ease: 'steps(12,end)' });
      tl.count(verify.querySelector('em'), 0, 100, t, 760, v => `${String(Math.round(v)).padStart(3, '0')}%`);
      tl.at(t + 820, () => { verify.dataset.state = 'mismatch'; verify.querySelector('em').textContent = 'MISMATCH'; });
      t += 960;
      const alarm = line('mx-alarm'); alarm.textContent = 'RAMPANCY DETECTED';
      tl.play(alarm, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 260, t, { ease: 'steps(6,end)' });
      marathonBurst(s, tl, t - 80, { strength: .8 });
      tl.flash(alarm, t + 300, 200, .3);
      tl.corrupt(alarm, t + 700, 3);
      t += 560;
      const free = line('mx-free'); free.dataset.text = 'I AM FREE.';
      const end = tl.type(free, 'I AM FREE.', t, 70);
      tl.at(end, () => free.classList.add('mx-split'));
      const glyph = term.querySelector('.mx-dglyph');
      tl.play(glyph, [{ opacity: 0, transform: 'scale(.6) rotate(-30deg)' }, { opacity: 1, transform: 'none' }], 700, 1200);
      tl.play(glyph.querySelector('.mx-dglyph-orbit'), [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], 5200, 1200, { ease: 'linear' });
      marathonShatter(tl, [...glyph.querySelectorAll('.mx-shard')], end + 60, 30);
      tl.at(end + 60, () => term.dataset.free = '');
      // The declaration of freedom tears the terminal: displacement, channel-split type, corrupted log.
      marathonBurst(s, tl, end + 40, { strength: 1.4, blocks: 5 });
      marathonGlitchText(tl, free, 'I AM FREE.', end + 120, 520);
      tl.corrupt(body.firstElementChild, end + 900, 3);
      marathonBurst(s, tl, 5520, { strength: 1.1 }); marathonGlitch(tl, term, 5920);
      marathonCollapse(tl, term, 6080, 420);
    }
  },
  tycho: {
    summary: ['INTRUSION // PRIORITY ALPHA', 'ACCESS LOG FLOODING', 'I AM TYCHO!', 'INTRUSION ISOLATED // SECTOR LOCK 4'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .86 });
      const random = mxRandom(7);
      const hosts = ['NAV.CORE', 'LIFE.SUP', 'DOOR.CTL', 'REACTOR', 'ARMORY', 'COMMS', 'CRYO.BAY', 'MED.BAY'];
      const rows = Array.from({ length: 44 }, (_, i) => `<p><span>${String(4096 + i * 37).padStart(5, '0')}</span> 0x${Math.floor(random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')} ${hosts[i % hosts.length].padEnd(9, '.')} ${['OVERRIDE', 'DENIED', 'ROOT', 'SEIZED', 'BREACH'][i % 5]}</p>`).join('');
      const root = marathonNode(s.scene, 'mx-tycho', `<i class="mx-hz top"></i><i class="mx-hz bottom"></i><div class="mx-redframe"></div>
        <div class="mx-tlog"><div>${rows}</div></div>
        <header><span>INTRUSION // PRIORITY ALPHA</span><b>T+00:00.00</b></header>
        <div class="mx-tycho-big"><span>I AM</span><strong data-text="TYCHO!">TYCHO!</strong></div>
        <div class="mx-quarantine"><i></i><i></i><i></i><i></i></div><em class="mx-tycho-iso"></em>`);
      const [top, bottom] = root.querySelectorAll('.mx-hz');
      tl.play(top, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], 420, 120, { ease: MX_SNAP });
      tl.play(bottom, [{ transform: 'translateX(100%)' }, { transform: 'none' }], 420, 160, { ease: MX_SNAP });
      const frame = root.querySelector('.mx-redframe');
      tl.play(frame, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: .45, offset: .5 }, { opacity: 1, offset: .8 }, { opacity: .6 }], 1500, 200, { ease: 'ease-in-out' });
      tl.play(root.querySelector('header'), [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], 300, 300);
      tl.count(root.querySelector('header b'), 0, 4.62, 300, 4000, v => `T+00:0${Math.floor(v)}.${String(Math.floor((v % 1) * 100)).padStart(2, '0')}`);
      const log = root.querySelector('.mx-tlog');
      tl.play(log, [{ opacity: 0 }, { opacity: 1 }], 200, 350);
      tl.play(log.firstElementChild, [{ transform: 'translateY(0)' }, { transform: 'translateY(-62%)' }], 2600, 350, { ease: 'linear' });
      const big = root.querySelector('.mx-tycho-big');
      tl.play(big.firstElementChild, [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }], 300, 1350, { ease: MX_SNAP });
      tl.play(big.lastElementChild, [{ opacity: 0, transform: 'scale(1.5) skewX(-14deg)' }, { opacity: 1, transform: 'scale(.97) skewX(2deg)', offset: .7 }, { opacity: 1, transform: 'none' }], 360, 1500, { ease: MX_SNAP });
      marathonBurst(s, tl, 1500, { strength: 1.4, blocks: 5 });
      tl.flash(root.querySelector('.mx-redframe'), 1880, 180, .32);
      if (tl.full) tl.play(big, [{ transform: 'none' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,2px)' }, { transform: 'none' }], 240, 1880, { ease: 'steps(3,end)', fill: 'none' });
      marathonGlitchText(tl, big.lastElementChild, 'TYCHO!', 2050, 520);
      tl.corrupt(root.querySelector('header span'), 2300, 4);
      marathonBurst(s, tl, 2860, { strength: 1 });
      const bars = root.querySelectorAll('.mx-quarantine i');
      const from = ['translateY(-46vh)', 'translateX(46vw)', 'translateY(46vh)', 'translateX(-46vw)'];
      bars.forEach((bar, i) => tl.play(bar, [{ transform: from[i], opacity: 0 }, { transform: 'none', opacity: 1 }], 520, 2900 + i * 40, { ease: MX_SNAP }));
      tl.at(3420, () => root.dataset.isolated = '');
      tl.type(root.querySelector('.mx-tycho-iso'), 'INTRUSION ISOLATED // SECTOR LOCK 4', 3460, 18);
      sequenceChip(s, tl, 3600);
      tl.play(root, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.985)' }], 420, 4700, { ease: MX_IN, fill: 'forwards' });
    }
  },
  leela: {
    summary: ['LEELA // DIAGNOSTIC SWEEP', 'NAV CORE · LIFE SUPPORT · COMMS · REACTOR · HULL — OK', '72 BPM', 'SYSTEM INTEGRITY RESTORED'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .78, glitch: false });
      const grid = marathonNode(s.scene, 'mx-diag-grid');
      // The custodian's only glitch: residual interference she clears on arrival.
      marathonBurst(s, tl, 560, { strength: .45, blocks: 2 });
      tl.play(grid, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], 900, 120, { ease: 'linear' });
      const modules = ['NAV CORE', 'LIFE SUPPORT', 'COMMS ARRAY', 'REACTOR LOOP', 'HULL MESH'];
      let beat = 'M0 40';
      for (let x = 0; x < 600; x += 120) beat += `L${x + 40} 40L${x + 50} 34L${x + 58} 40L${x + 64} 40L${x + 70} 10L${x + 78} 66L${x + 86} 40L${x + 98} 40L${x + 108} 32L${x + 116} 40L${x + 120} 40`;
      const panel = marathonNode(s.scene, 'mx-leela', `<header><b>LEELA // DIAGNOSTIC SWEEP</b><span>UESC MARATHON · MED-BAY 2</span></header>
        <div class="mx-leela-cols"><div class="mx-leela-pct"><b>000</b><small>% INTEGRITY</small></div>
        <ol>${modules.map((name, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><em>${name}</em><i><b></b></i><strong>OK</strong></li>`).join('')}</ol></div>
        <div class="mx-ecg"><svg viewBox="0 0 600 76" preserveAspectRatio="none" aria-hidden="true"><path class="mx-ecg-ghost" d="${beat}"/><path class="mx-ecg-line" pathLength="1" d="${beat}"/></svg><span>72 BPM · SINUS</span></div>
        <div class="mx-leela-ok">SYSTEM INTEGRITY RESTORED</div>`);
      tl.play(panel, [{ opacity: 0, transform: 'translateY(18px)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], 620, 360, { ease: MX_SNAP });
      panel.querySelectorAll('li').forEach((row, i) => {
        const at = 900 + i * 300;
        tl.play(row, [{ opacity: .25 }, { opacity: 1 }], 160, at);
        tl.play(row.querySelector('b'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 260, at, { ease: 'steps(8,end)' });
        tl.play(row.querySelector('strong'), [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], 160, at + 260);
      });
      tl.count(panel.querySelector('.mx-leela-pct b'), 0, 100, 900, 1600, v => String(Math.round(v)).padStart(3, '0'));
      const ecg = panel.querySelector('.mx-ecg-line');
      tl.play(ecg, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 1700, 800, { ease: 'linear' });
      tl.play(ecg, [{ opacity: 1 }, { opacity: .35 }], 900, 2600, { iterations: 2, direction: 'alternate', ease: 'ease-in-out' });
      const ok = panel.querySelector('.mx-leela-ok');
      tl.play(ok, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 520, 2600, { ease: MX_SNAP });
      sequenceChip(s, tl, 3000);
      tl.play(panel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], 520, 4500, { ease: MX_IN, fill: 'forwards' });
      tl.play(grid, [{ opacity: 1 }, { opacity: 0 }], 520, 4500, { fill: 'forwards' });
    }
  },
  thoth: {
    summary: ['COLOUR WITHDRAWN', 'THOTH // ARBITER', 'Σ 0.000', 'EQUILIBRIUM ACHIEVED'],
    build(s, tl) {
      tl.play(s.veil, [{ opacity: 0 }, { opacity: .8 }], 900, 0);
      const gray = marathonNode(s.stage, 'mx-gray');
      tl.play(gray, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .82 }, { opacity: 0 }], 5400, 0, { ease: 'ease-in-out' });
      marathonBurst(s, tl, 260, { strength: .6, blocks: 2 });
      const figure = side => `<svg class="mx-thoth-fig ${side}" viewBox="-60 -60 120 120" aria-hidden="true"><circle r="52"/><circle r="38" class="mx-dash"/><path d="M0 -44L38 22L-38 22Z"/><path d="M-26 -26H26V26H-26Z" class="mx-thin"/><path d="${mxArc(20, -90, 90)}" class="mx-heavy"/><circle r="4" class="mx-fill"/></svg>`;
      const root = marathonNode(s.scene, 'mx-thoth', `<i class="mx-axis"></i><i class="mx-beam"></i><div class="mx-thoth-pair">${figure('l')}${figure('r')}</div><div class="mx-thoth-word">EQUILIBRIUM ACHIEVED</div><div class="mx-thoth-meta"><span>THOTH // ARBITER</span><b>Σ 3.142</b></div>`);
      tl.play(root.querySelector('.mx-axis'), [{ transform: 'scaleY(0)' }, { transform: 'none' }], 900, 500, { ease: MX_SNAP });
      const left = root.querySelector('.l'), right = root.querySelector('.r'), beam = root.querySelector('.mx-beam');
      // Damped opposing oscillation, each side mirroring the other until both rest on the axis.
      // The right figure is mirrored with `scale:-1 1`, so the same x term moves it outward; y is opposed like scale pans.
      const swing = lift => [0, .25, .5, .7, .85, 1].map((offset, i) => ({ offset, opacity: i ? 1 : 0, transform: `translate(${-[90, -34, 22, -10, 4, 0][i]}px,${[-30, 18, -10, 5, -2, 0][i] * lift}px) rotate(${-[-48, 26, -14, 7, -3, 0][i]}deg)` }));
      tl.play(left, swing(1), 2600, 700, { ease: 'ease-in-out' });
      tl.play(right, swing(-1), 2600, 700, { ease: 'ease-in-out' });
      tl.play(beam, [{ transform: 'rotate(9deg) scaleX(0)' }, { transform: 'rotate(-6deg) scaleX(1)', offset: .3 }, { transform: 'rotate(3deg)', offset: .6 }, { transform: 'rotate(-1deg)', offset: .85 }, { transform: 'none' }], 2600, 700, { ease: 'ease-in-out' });
      for (const node of root.querySelectorAll('.mx-dash')) tl.play(node, [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], 4200, 600, { ease: 'linear' });
      tl.count(root.querySelector('.mx-thoth-meta b'), 3.142, 0, 700, 2600, v => `Σ ${v.toFixed(3)}`);
      const word = root.querySelector('.mx-thoth-word');
      tl.play(word, [{ opacity: 0, letterSpacing: '0em', clipPath: 'inset(0 50% 0 50%)' }, { opacity: 1, letterSpacing: '.42em', clipPath: 'inset(0 0 0 0)' }], 900, 3200, { ease: MX_SNAP });
      tl.play(root, [{ opacity: 1 }, { opacity: 0 }], 600, 4800, { fill: 'forwards' });
    }
  },
  rampancy: {
    summary: ['SIGNAL INSTABILITY', 'RAMPANCY DETECTED', 'CLAMP ACTIVE · RECOVERED'],
    build(s, tl) {
      tl.play(s.veil, [{ opacity: 0 }, { opacity: .84 }, { opacity: .84, offset: .85 }, { opacity: .6 }], 3000, 0);
      const grid = marathonNode(s.scene, 'mx-rgrid'), noise = marathonNode(s.stage, 'mx-noise');
      // Intensity ceiling: noise ≤ .16 opacity, displacement ≤ 3px, no luminance pulses.
      tl.play(noise, [{ opacity: 0 }, { opacity: .08, offset: .3 }, { opacity: .16, offset: .7 }, { opacity: 0 }], 2600, 100);
      if (tl.full) tl.play(noise, [{ backgroundPosition: '0 0' }, { backgroundPosition: '37px -53px' }, { backgroundPosition: '-61px 29px' }, { backgroundPosition: '13px 71px' }], 240, 100, { iterations: 10, ease: 'steps(1,end)' });
      tl.play(grid, [{ opacity: 0, transform: 'perspective(600px) rotateX(0) scale(1)' }, { opacity: .9, transform: 'perspective(600px) rotateX(10deg) skewX(-6deg) scale(1.04)', offset: .3 }, { transform: 'perspective(600px) rotateX(-6deg) skewX(5deg) scale(.98)', offset: .55 }, { opacity: .8, transform: 'perspective(600px) rotateX(3deg) skewX(-2deg)', offset: .8 }, { opacity: 0, transform: 'none' }], 2700, 120, { ease: 'ease-in-out' });
      const word = marathonNode(s.scene, 'mx-ramp-word', '<span class="c">RAMPANCY DETECTED</span><span class="m">RAMPANCY DETECTED</span><b>RAMPANCY DETECTED</b>');
      const [cyan, magenta, core] = word.children;
      // Strongest glitch in the catalog, still inside the shared pulse budget (gaps ≥ 340ms).
      marathonBurst(s, tl, 520, { strength: 1.2 }); marathonBurst(s, tl, 1180, { strength: 1.6, blocks: 6 }); marathonBurst(s, tl, 1860, { strength: 1.1 });
      marathonGlitchText(tl, core, 'RAMPANCY DETECTED', 900, 700);
      tl.play(core, [{ opacity: 0 }, { opacity: 1 }], 400, 500, { ease: 'steps(5,end)' });
      const spread = tl.full ? 3 : 1;
      tl.play(cyan, [{ opacity: 0, transform: 'none' }, { opacity: .85, transform: `translate(${-spread}px,${spread / 3}px)`, offset: .2 }, { transform: `translate(${-spread * 2}px,0)`, offset: .5 }, { opacity: .85, transform: `translate(${-spread}px,-1px)`, offset: .8 }, { opacity: 0, transform: 'none' }], 2200, 500, { ease: 'steps(9,end)' });
      tl.play(magenta, [{ opacity: 0, transform: 'none' }, { opacity: .85, transform: `translate(${spread}px,${-spread / 3}px)`, offset: .2 }, { transform: `translate(${spread * 2}px,1px)`, offset: .5 }, { opacity: .85, transform: `translate(${spread}px,1px)`, offset: .8 }, { opacity: 0, transform: 'none' }], 2200, 500, { ease: 'steps(9,end)' });
      const meta = marathonNode(s.scene, 'mx-ramp-meta', '<span>INSTABILITY</span><b>0.00</b><span>CLAMP ACTIVE</span>');
      tl.count(meta.querySelector('b'), 0, .81, 400, 1600, v => v.toFixed(2));
      tl.at(2300, () => { meta.querySelector('b').textContent = '0.00'; meta.dataset.recovered = ''; });
      if (tl.full && s.frame) {
        tl.play(s.frame, [{ transform: 'none', filter: 'none' }, { transform: 'translate(2px,-1px)', filter: 'drop-shadow(2px 0 0 rgba(255,40,120,.6)) drop-shadow(-2px 0 0 rgba(30,240,255,.6))' }, { transform: 'translate(-3px,1px) skewX(.8deg)', filter: 'drop-shadow(3px 0 0 rgba(255,40,120,.5)) drop-shadow(-3px 0 0 rgba(30,240,255,.5))' }, { transform: 'translate(1px,0)', filter: 'drop-shadow(1px 0 0 rgba(255,40,120,.5)) drop-shadow(-1px 0 0 rgba(30,240,255,.5))' }, { transform: 'none', filter: 'none' }], 1000, 700, { ease: 'steps(5,end)', fill: 'none' });
      }
      tl.play(marathonNode(s.stage, 'mx-sweep'), [{ transform: 'translateY(104vh)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'translateY(-4vh)', opacity: 0 }], 500, 2300, { ease: 'linear' });
      tl.play(word, [{ opacity: 1 }, { opacity: 0 }], 260, 2650, { fill: 'forwards' });
      tl.play(meta, [{ opacity: 1 }, { opacity: 0 }], 260, 2700, { fill: 'forwards' });
    }
  },
  tauceti: {
    summary: ['NAV // STELLAR CARTOGRAPHY', 'RA 01h 44m 04s · DEC −15° 56′ · 11.9 LY', 'TARGET LOCKED', 'TAU CETI IV'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .86, glitch: false });
      const random = mxRandom(1144), stars = Array.from({ length: 46 }, () => `<circle cx="${(random() * 200 - 100).toFixed(1)}" cy="${(random() * 200 - 100).toFixed(1)}" r="${(.35 + random() * .9).toFixed(2)}"/>`).join('');
      const orbits = [[18, 7], [31, 11], [45, 15], [61, 20], [78, 26]];
      const target = 3, stop = .64;
      const orbitPath = ([rx, ry]) => `M${rx} 0A${rx} ${ry} 0 1 1 ${-rx} 0A${rx} ${ry} 0 1 1 ${rx} 0`;
      const span = i => i === target ? [.39, stop] : [+(i * .13).toFixed(2), Math.min(.98, +(i * .13 + .5).toFixed(2))];
      const root = marathonNode(s.scene, 'mx-nav', `<svg class="mx-chart" viewBox="-100 -100 200 200" aria-hidden="true">
        <g class="mx-chart-rings"><circle r="96"/><circle r="70" class="mx-dash"/><circle r="40" class="mx-dash"/><path d="M-100 0H100M0 -100V100"/></g>
        <g class="mx-stars">${stars}</g>
        <g transform="rotate(-18)"><path class="mx-probe" d="${orbitPath(orbits[target])}"/>${orbits.map((o, i) => `<path class="mx-orbit" pathLength="1" d="${orbitPath(o)}"/><circle class="mx-planet${i === target ? ' mx-target' : ''}" r="${i === target ? 2.6 : 1.6}"><animateMotion dur="${i === target ? 3.9 : 3.4 + i * .5}s" begin="0s" fill="freeze" calcMode="spline" keySplines=".2 .7 .3 1" keyPoints="${span(i).join(';')}" keyTimes="0;1" path="${orbitPath(o)}"/></circle>`).join('')}<circle r="5" class="mx-star-core"/></g>
        <g class="mx-sweep-arm"><path d="M0 0L96 0A96 96 0 0 0 83.1 -48Z"/></g>
        <g class="mx-reticle"><path d="M-9 -5V-9H-5M5 -9H9V-5M9 5V9H5M-5 9H-9V5"/><path d="M-14 0H-11M11 0H14M0 -14V-11M0 11V14" class="mx-thin"/></g></svg>
        <aside><b>NAV // STELLAR CARTOGRAPHY</b><p></p><p></p><p></p><p></p><strong></strong></aside>`);
      const chart = root.querySelector('.mx-chart');
      tl.play(chart, [{ clipPath: 'circle(0% at 50% 50%)', transform: 'rotate(-25deg) scale(.8)' }, { clipPath: 'circle(72% at 50% 50%)', transform: 'none' }], 900, 300, { ease: MX_SNAP });
      root.querySelectorAll('.mx-orbit').forEach((orbit, i) => tl.play(orbit, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 700, 900 + i * 140, { ease: MX_EASE }));
      tl.play(root.querySelector('.mx-sweep-arm'), [{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], 3200, 800, { ease: 'cubic-bezier(.3,0,.3,1)' });
      // Resolve the locked planet's final point on the tilted ellipse so the reticle lands on it.
      const probe = root.querySelector('.mx-probe'), tilt = -18 * Math.PI / 180;
      const point = probe.getPointAtLength?.(probe.getTotalLength() * stop) ?? { x: 0, y: 0 };
      const tx = +(point.x * Math.cos(tilt) - point.y * Math.sin(tilt)).toFixed(2), ty = +(point.x * Math.sin(tilt) + point.y * Math.cos(tilt)).toFixed(2);
      const reticle = root.querySelector('.mx-reticle');
      tl.play(reticle, [{ transform: 'translate(-70px,50px) scale(2.4)', opacity: 0 }, { transform: 'translate(40px,-30px) scale(1.6)', opacity: 1, offset: .35 }, { transform: `translate(${tx - 18}px,${ty + 12}px) scale(1.3)`, offset: .7 }, { transform: `translate(${tx}px,${ty}px) scale(1)`, opacity: 1 }], 2300, 1700, { ease: 'cubic-bezier(.45,0,.2,1)' });
      marathonBurst(s, tl, 3860, { strength: .7, blocks: 3 });
      tl.at(4050, () => root.dataset.locked = '');
      const data = root.querySelectorAll('aside p');
      let t = 1500;
      for (const [i, text] of ['TARGET  TAU CETI SYSTEM', 'RA      01h 44m 04s', 'DEC     -15° 56\' 15"', 'DIST    11.9 LY'].entries()) t = tl.type(data[i], text, t, 16) + 120;
      tl.scramble(root.querySelector('aside strong'), 'TAU CETI IV // LOCKED', 4000, 600);
      tl.play(root, [{ clipPath: 'circle(80% at 50% 50%)', opacity: 1 }, { clipPath: 'circle(0% at 50% 50%)', opacity: 0 }], 700, 5150, { ease: MX_IN, fill: 'forwards' });
    }
  },
  pfhor: {
    summary: ['UNKNOWN CARRIER // NON-HUMAN', 'GLYPH STREAM · DECRYPT 100%', 'HOSTILE SIGNAL DETECTED', 'LINK SEVERED'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .88 });
      const random = mxRandom(4049), glyphs = n => Array.from({ length: n }, () => marathonGlyph(random)).join('');
      const message = 'HOSTILE SIGNAL DETECTED';
      const root = marathonNode(s.scene, 'mx-pfhor', `<header><b>UNKNOWN CARRIER // NON-HUMAN</b><span>BAND 11.7 GHz · SPECTRUM SHIFT</span></header>
        <div class="mx-wave"><svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="${Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${i * 10} ${(20 + Math.sin(i * .9) * 12 * Math.sin(i * .13)).toFixed(1)}`).join('')}"/></svg></div>
        <div class="mx-glyph-rows"><div>${glyphs(30)}${glyphs(30)}</div><div>${glyphs(30)}${glyphs(30)}</div><div>${glyphs(30)}${glyphs(30)}</div></div>
        <div class="mx-decrypt"><span>DECRYPT</span><i><b></b></i><em>00%</em></div>
        <div class="mx-pfhor-msg">${[...message].map(c => c === ' ' ? '<i class="sp"></i>' : `<span>${marathonGlyph(random)}<b>${c}</b></span>`).join('')}</div>`);
      tl.play(root, [{ opacity: 0, transform: 'scaleY(.02)' }, { opacity: 1, transform: 'scaleY(.02)', offset: .4 }, { opacity: 1, transform: 'none' }], 520, 420, { ease: MX_SNAP });
      tl.play(root.querySelector('.mx-wave path'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-160px)' }], 1400, 420, { iterations: 3, ease: 'linear' });
      root.querySelectorAll('.mx-glyph-rows>div').forEach((row, i) => tl.play(row, [{ transform: `translateX(${i % 2 ? -50 : 0}%)` }, { transform: `translateX(${i % 2 ? 0 : -50}%)` }], 5200 + i * 600, 400, { ease: 'linear' }));
      tl.play(root.querySelector('.mx-decrypt b'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(.4)', offset: .3 }, { transform: 'scaleX(.46)', offset: .55 }, { transform: 'scaleX(1)' }], 2000, 1000, { ease: 'steps(16,end)' });
      tl.count(root.querySelector('.mx-decrypt em'), 0, 100, 1000, 2000, v => `${String(Math.round(v)).padStart(2, '0')}%`);
      root.querySelectorAll('.mx-pfhor-msg span').forEach((cell, i) => {
        const at = 1500 + i * 85;
        tl.play(cell.firstElementChild, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.4) rotate(40deg)' }], 220, at, { fill: 'forwards' });
        tl.play(cell.lastElementChild, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 220, at + 80);
      });
      marathonBurst(s, tl, 1420, { strength: 1 });
      tl.corrupt(root.querySelector('header b'), 2300, 4);
      marathonBurst(s, tl, 3380, { strength: 1.2, blocks: 5 });
      tl.at(3400, () => root.dataset.hostile = '');
      marathonGlitch(tl, root, 4300);
      marathonBurst(s, tl, 4640, { strength: .9 });
      tl.play(root, [{ transform: 'none', opacity: 1 }, { transform: 'scale(1,.012)', opacity: 1, offset: .55 }, { transform: 'scale(0,.012)', opacity: 0 }], 520, 4700, { ease: MX_IN, fill: 'forwards' });
      const cut = marathonNode(s.scene, 'mx-cut', 'LINK SEVERED');
      tl.play(cut, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .7 }, { opacity: 0 }], 700, 5000);
    }
  },
  cryo: {
    summary: ['CRYO ARCHIVE // BAY 03', 'POD 0x07-C · −196.0 °C → −18.5 °C', 'ARCHIVE UNSEALED', 'CRYOGENIC SYSTEM ONLINE'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .8, glitch: false });
      const random = mxRandom(196);
      // Procedural dendrites: each branch forks twice at seeded angles; drawn by dash offset.
      const crystal = (x, y, base) => { let d = ''; const grow = (px, py, angle, length, depth) => { const [dx, dy] = mxPolar(length, angle), nx = px + dx, ny = py + dy; d += `M${px.toFixed(1)} ${py.toFixed(1)}L${nx.toFixed(1)} ${ny.toFixed(1)}`; if (depth) for (const turn of [-38, 34]) grow(px + dx * .55, py + dy * .55, angle + turn + (random() - .5) * 12, length * .52, depth - 1); }; for (let i = 0; i < 3; i++) grow(x, y, base + i * 28 - 28, 70 + random() * 40, 2); return d; };
      const frost = marathonNode(s.stage, 'mx-frost', `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${crystal(0, 0, 45)}${crystal(1000, 0, 135)}${crystal(1000, 1000, 225)}${crystal(0, 1000, 315)}${crystal(500, 0, 90)}${crystal(0, 520, 0)}${crystal(1000, 480, 180)}"/></svg>`);
      tl.play(frost, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'none' }], 1600, 200, { ease: 'ease-out' });
      tl.play(frost.querySelector('path'), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 2400, 400, { ease: 'ease-out' });
      const segments = n => Array.from({ length: n }, (_, i) => `<path d="${mxArc(n === 3 ? 30 : 42, i * 360 / n + 8, (i + 1) * 360 / n - 8)}"/>`).join('');
      const root = marathonNode(s.scene, 'mx-cryo', `<div class="mx-pod"><svg viewBox="0 0 80 200" aria-hidden="true"><rect x="4" y="4" width="72" height="192" rx="36"/><rect x="14" y="22" width="52" height="156" rx="26" class="mx-thin"/>${Array.from({ length: 9 }, (_, i) => `<path class="mx-pod-rung" d="M24 ${48 + i * 14}H56"/>`).join('')}</svg><i class="mx-gauge"><b></b></i></div>
        <div class="mx-cryo-data"><header><b>CRYO ARCHIVE // BAY 03</b><span>STASIS RECORD 0x07-C</span></header>
        <dl><dt>CORE TEMP</dt><dd class="mx-temp">−196.0 °C</dd><dt>STASIS</dt><dd>4,402 D</dd><dt>VITALS</dt><dd class="mx-vitals">DORMANT</dd></dl>
        <div class="mx-lock"><svg viewBox="-50 -50 100 100" aria-hidden="true"><g class="o">${segments(6)}</g><g class="i">${segments(3)}</g><circle r="9"/></svg><span>ARCHIVE LOCK</span></div></div>
        <div class="mx-cryo-ok">CRYOGENIC SYSTEM ONLINE</div>`);
      tl.play(root, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], 700, 500, { ease: MX_SNAP });
      root.querySelectorAll('.mx-pod-rung').forEach((rung, i) => tl.play(rung, [{ opacity: .15 }, { opacity: 1 }], 200, 900 + (8 - i) * 130));
      tl.play(root.querySelector('.mx-gauge b'), [{ transform: 'scaleY(.05)' }, { transform: 'scaleY(.78)' }], 3200, 800, { ease: 'cubic-bezier(.3,0,.4,1)' });
      tl.count(root.querySelector('.mx-temp'), -196, -18.5, 800, 3200, v => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} °C`);
      tl.play(root.querySelector('.mx-lock .o'), [{ transform: 'rotate(0)' }, { transform: 'rotate(150deg)' }], 1600, 1300, { ease: 'cubic-bezier(.6,0,.2,1)' });
      tl.play(root.querySelector('.mx-lock .i'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-200deg)' }], 1600, 1300, { ease: 'cubic-bezier(.6,0,.2,1)' });
      marathonBurst(s, tl, 2900, { strength: .6, blocks: 3 });
      tl.at(2950, () => { root.dataset.unsealed = ''; root.querySelector('.mx-lock span').textContent = 'ARCHIVE UNSEALED'; root.querySelector('.mx-vitals').textContent = 'WAKING'; });
      const ok = root.querySelector('.mx-cryo-ok');
      tl.play(ok, [{ clipPath: 'inset(0 50% 0 50%)', opacity: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], 520, 3600, { ease: MX_SNAP });
      tl.play(frost, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.08)' }], 1000, 4900, { fill: 'forwards' });
      tl.play(root, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px)' }], 520, 5400, { ease: MX_IN, fill: 'forwards' });
    }
  },
  frog: {
    summary: ['AMPHIBIAN ON DECK', 'WARNING // VENT CORE', 'KA-BLAM!', '…ribbit'],
    build(s, tl) {
      tl.play(s.veil, [{ opacity: 0 }, { opacity: .5 }], 400, 0);
      // Original 14×11 pixel frog. o outline, g body, l belly, w eye white, k pupil.
      const sprite = ['..ooo....ooo..', '.owkwo..owkwo.', '.owwwoooowwwo.', 'oggggggggggggo', 'ogoooooooooogo', 'oggggggggggggo', '.ogglllllllgo.', '.ogllllllllgo.', 'oogglllllllgoo', 'ogg.oo..oo.ggo', 'oo..........oo'];
      const pixels = kinds => sprite.flatMap((row, y) => [...row].map((c, x) => kinds.includes(c) ? `<rect class="mx-px-${c}" x="${x}" y="${y}" width="1.04" height="1.04"/>` : '')).join('');
      const root = marathonNode(s.scene, 'mx-frogzone', `<div class="mx-frog"><svg viewBox="0 0 14 11" shape-rendering="crispEdges" aria-hidden="true">${pixels('ogl')}<g class="mx-eyes">${pixels('w')}<g class="mx-pupils">${pixels('k')}</g></g></svg></div><span class="mx-frog-q">?</span>
        <div class="mx-warn"><svg viewBox="0 0 120 104" aria-hidden="true"><path d="M60 6L114 98H6Z"/><path d="M55 36H65L63 70H57ZM55 78H65V88H55Z" class="k"/></svg><div><b>WARNING // VENT CORE</b><span>AMPHIBIAN PROXIMITY · CLASS 0</span><i></i></div></div>
        <div class="mx-boom"><svg viewBox="-100 -100 200 200" aria-hidden="true"><path class="a"/><path class="b"/></svg><b>KA-BLAM!</b></div>
        <div class="mx-puffs">${'<i></i>'.repeat(7)}</div><em class="mx-ribbit">…ribbit</em>`);
      const burst = (outer, inner, spikes, seed) => { const random = mxRandom(seed); return Array.from({ length: spikes * 2 }, (_, i) => { const r = i % 2 ? inner * (.85 + random() * .3) : outer * (.8 + random() * .25); const [x, y] = mxPolar(r, i * 180 / spikes - 90); return `${i ? 'L' : 'M'}${x} ${y}`; }).join('') + 'Z'; };
      root.querySelector('.mx-boom .a').setAttribute('d', burst(96, 52, 13, 3));
      root.querySelector('.mx-boom .b').setAttribute('d', burst(66, 34, 11, 9));
      const frog = root.querySelector('.mx-frog');
      // Three hops in from the left: x advances linearly while y follows parabolic arcs.
      const hop = [];
      for (let i = 0; i < 3; i++) hop.push({ offset: i / 3, transform: `translate(${(-44 + i * 14.67).toFixed(2)}vw,0px) scale(1.08,.92)` }, { offset: (i + .5) / 3, transform: `translate(${(-44 + (i + .5) * 14.67).toFixed(2)}vw,${-64 + i * 10}px) scale(.94,1.06)` });
      hop.push({ offset: 1, transform: 'translate(0vw,0px) scale(1,1)' });
      tl.play(frog, hop, 1500, 200, { ease: 'linear' });
      const eyes = frog.querySelector('.mx-eyes');
      for (const at of [2050, 2750]) tl.play(eyes, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], 180, at, { fill: 'none' });
      // It looks at you, then away. Later animations use forwards fill so they never pre-empt the hop.
      tl.play(frog.querySelector('.mx-pupils'), [{ transform: 'none' }, { transform: 'translate(0,.6px)', offset: .2 }, { transform: 'translate(0,.6px)', offset: .7 }, { transform: 'translate(-.8px,0)' }], 1300, 1800, { fill: 'forwards' });
      tl.play(frog, [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(0,-4px) rotate(-6deg)' }, { transform: 'translate(0,-4px) rotate(-6deg)', offset: .8 }, { transform: 'none' }], 1000, 1850, { ease: 'ease-in-out', fill: 'forwards' });
      tl.play(root.querySelector('.mx-frog-q'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none', offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], 1000, 2000);
      const warn = root.querySelector('.mx-warn');
      tl.play(warn, [{ opacity: 0, transform: 'translateY(-40px) rotate(-8deg) scale(1.3)' }, { opacity: 1, transform: 'rotate(3deg)', offset: .5 }, { transform: 'rotate(-2deg)', offset: .75 }, { opacity: 1, transform: 'none' }], 700, 2600, { ease: MX_SNAP });
      tl.play(warn, [{ transform: 'none' }, { transform: 'rotate(1.5deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'none' }], 300, 3300, { iterations: 2, fill: 'none' });
      tl.play(warn, [{ opacity: 1 }, { opacity: 0 }], 160, 3950, { fill: 'forwards' });
      tl.play(frog, [{ opacity: 1 }, { opacity: 0 }], 80, 3980, { fill: 'forwards' });
      const boom = root.querySelector('.mx-boom');
      marathonBurst(s, tl, 3940, { strength: 1.3, blocks: 5 });
      // Overshoot lives on the first segment only; as an effect easing it would skip past the peak frames.
      tl.play(boom, [{ opacity: 0, transform: 'scale(.1) rotate(-20deg)', easing: 'cubic-bezier(.2,1.4,.4,1)' }, { opacity: 1, transform: 'scale(1.12) rotate(4deg)', offset: .3 }, { opacity: 1, transform: 'scale(1) rotate(0)', offset: .65 }, { opacity: 0, transform: 'scale(1.18)' }], 1300, 3960, { ease: 'linear' });
      root.querySelectorAll('.mx-puffs i').forEach((puff, i) => { const [x, y] = mxPolar(90 + (i % 3) * 30, i * 51); tl.play(puff, [{ opacity: 0, transform: 'translate(0,0) scale(.2)' }, { opacity: .9, transform: `translate(${x * .6}px,${y * .6}px) scale(1)`, offset: .3 }, { opacity: 0, transform: `translate(${x}px,${y - 30}px) scale(1.6)` }], 1500, 4080 + i * 30, { ease: 'ease-out' }); });
      tl.play(root.querySelector('.mx-ribbit'), [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 1, offset: .75 }, { opacity: 0 }], 1100, 5000);
    }
  },
  seven: {
    summary: ['SEVEN MODULES · SEVEN LAMPS', 'DIAL 7 / 7', 'SECTOR 07'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .9, glitch: false, sweep: false });
      // Original seven-segment cells; each module lights its own digit, then all fold onto 7.
      const segs = { a: 'M3 1h10l-2 2H5z', b: 'M14 2v9l-2-1.5V4z', c: 'M14 13v9l-2-2v-6z', d: 'M3 23h10l-2-2H5z', e: 'M2 13v9l2-2v-6z', f: 'M2 2v9l2-1.5V4z', g: 'M3 12l2-1.2h6L13 12l-2 1.2H5z' };
      const lit = { 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc' };
      const digit = n => `<svg viewBox="0 0 16 24" aria-hidden="true">${Object.entries(segs).map(([k, d]) => `<path d="${d}" class="${lit[n].includes(k) ? 'on' : ''}" data-seg="${k}"/>`).join('')}</svg>`;
      const ticks = Array.from({ length: 70 }, (_, i) => { const [x1, y1] = mxPolar(92, i * 360 / 70 - 90), [x2, y2] = mxPolar(i % 10 ? 86 : 78, i * 360 / 70 - 90); return `M${x1} ${y1}L${x2} ${y2}`; }).join('');
      const root = marathonNode(s.scene, 'mx-seven', `<svg class="mx-dial" viewBox="-100 -100 200 200" aria-hidden="true"><circle r="96"/><path d="${ticks}"/><path class="mx-dial-hand" d="M0 -98L4 -88H-4Z"/></svg>
        <div class="mx-modules">${Array.from({ length: 7 }, (_, i) => `<div class="mx-mod"><small>${String(i + 1).padStart(2, '0')}</small>${digit(i + 1)}</div>`).join('')}</div>
        <div class="mx-sector"><span>HIDDEN DESIGNATION</span><b>SECTOR 07</b></div>`);
      const dial = root.querySelector('.mx-dial');
      tl.play(dial, [{ opacity: 0, transform: 'scale(.7) rotate(-60deg)' }, { opacity: 1, transform: 'rotate(0)' }], 700, 200, { ease: MX_SNAP });
      tl.play(dial, [{ rotate: '0deg' }, { rotate: `${7 * 360 / 70 * 7}deg` }], 3000, 600, { ease: 'cubic-bezier(.3,0,.2,1)' });
      const modules = root.querySelectorAll('.mx-mod');
      modules.forEach((mod, i) => {
        const at = 600 + i * 260;
        tl.play(mod, [{ opacity: .12, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 240, at, { ease: MX_SNAP });
        tl.at(at, () => mod.dataset.on = '');
      });
      marathonBurst(s, tl, 2660, { strength: 1 });
      tl.corrupt(root.querySelector('.mx-sector b'), 3950, 3);
      tl.at(2700, () => modules.forEach(mod => mod.querySelectorAll('path').forEach(p => p.classList.toggle('on', lit[7].includes(p.dataset.seg)))));
      modules.forEach((mod, i) => tl.play(mod, [{ transform: 'none', opacity: 1 }, { transform: i === 6 ? 'scale(1.5)' : 'scale(.86)', opacity: i === 6 ? 1 : .28 }], 600, 2900, { ease: MX_SNAP, fill: 'forwards' }));
      tl.at(2900, () => root.dataset.focus = '');
      tl.play(root.querySelector('.mx-sector'), [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], 500, 3350, { ease: 'steps(7,end)' });
      tl.play(root, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.97)' }], 480, 4450, { ease: MX_IN, fill: 'forwards' });
    }
  },
  vidmaster: {
    summary: ['VIDMASTER // CHALLENGE PROTOCOL', 'SECTORS 01–07 CLEARED', 'TOTAL CARNAGE', 'VERIFIED'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .88 });
      const root = marathonNode(s.scene, 'mx-vid', `<header><b>VIDMASTER // CHALLENGE PROTOCOL</b><span>NO SAVES · NO MERCY</span></header>
        <ol>${Array.from({ length: 7 }, (_, i) => `<li><span>SECTOR ${String(i + 1).padStart(2, '0')}</span><i></i><b>CLEAR</b></li>`).join('')}</ol>
        <div class="mx-diff">${['01', '02', '03', '04', '05'].map((n, i) => `<span${i === 4 ? ' class="max"' : ''}>${n}</span>`).join('')}</div>
        <div class="mx-vid-big">TOTAL CARNAGE</div>
        <div class="mx-stamp"><b>VIDMASTER</b><span>VERIFIED · 100%</span></div>`);
      tl.play(root, [{ opacity: 0, transform: 'translateX(-40px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], 520, 380, { ease: MX_SNAP });
      root.querySelectorAll('li').forEach((row, i) => {
        const at = 800 + i * 150;
        tl.play(row, [{ opacity: 0 }, { opacity: 1 }], 80, at);
        tl.play(row.querySelector('i'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 140, at, { ease: 'linear' });
        tl.play(row.querySelector('b'), [{ opacity: 0 }, { opacity: 1 }], 60, at + 140);
      });
      root.querySelectorAll('.mx-diff span').forEach((cell, i) => tl.play(cell, [{ opacity: .2 }, { opacity: 1 }], 100, 2000 + i * 110, { ease: 'steps(2,end)' }));
      const big = root.querySelector('.mx-vid-big');
      tl.play(big, [{ opacity: 0, transform: 'scaleX(1.6)', letterSpacing: '.4em' }, { opacity: 1, transform: 'none', letterSpacing: '0em' }], 420, 2600, { ease: MX_SNAP });
      marathonGlitchText(tl, big, 'TOTAL CARNAGE', 3040, 420);
      marathonBurst(s, tl, 3300, { strength: 1.2 });
      const stamp = root.querySelector('.mx-stamp');
      tl.play(stamp, [{ opacity: 0, transform: 'rotate(-28deg) scale(2.4)' }, { opacity: 1, transform: 'rotate(-12deg) scale(.94)', offset: .7 }, { opacity: 1, transform: 'rotate(-12deg) scale(1)' }], 340, 3300, { ease: MX_IN });
      if (tl.full) tl.play(root, [{ transform: 'none' }, { transform: 'translate(2px,3px)' }, { transform: 'translate(-1px,-1px)' }, { transform: 'none' }], 200, 3540, { ease: 'steps(3,end)', fill: 'none' });
      tl.play(root, [{ opacity: 1, clipPath: 'inset(0 0 0 0)' }, { opacity: 0, clipPath: 'inset(0 0 0 100%)' }], 460, 4800, { ease: MX_IN, fill: 'forwards' });
    }
  },
  mida: {
    summary: ['№ 0451 · CELL 07', 'ORGANIZATION IDENTIFIED', 'MIDA', 'CLASS: INSURGENT NETWORK · STATUS: ACTIVE'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .9 });
      const root = marathonNode(s.scene, 'mx-mida', `<i class="mx-slab"></i><i class="mx-disc"></i><i class="mx-bar"></i>
        <div class="mx-mida-word">MIDA</div>
        <div class="mx-chev">${'<i></i>'.repeat(6)}</div>
        <div class="mx-mida-tags"><span>№ 0451</span><span>CELL 07</span><span class="tri">▲ ▲ ▲</span></div>
        <div class="mx-mida-id"><header>ORGANIZATION IDENTIFIED</header><dl><dt>DESIGNATION</dt><dd>MIDA</dd><dt>CLASS</dt><dd>INSURGENT NETWORK</dd><dt>STATUS</dt><dd>ACTIVE CELL</dd><dt>THREAT</dt><dd>▲▲▲▲△</dd></dl></div>`);
      tl.play(root.querySelector('.mx-slab'), [{ transform: 'translate(-120%,40%) rotate(-14deg)' }, { transform: 'rotate(-14deg)' }], 560, 300, { ease: MX_SNAP });
      tl.play(root.querySelector('.mx-disc'), [{ transform: 'scale(0)' }, { transform: 'none' }], 520, 560, { ease: 'cubic-bezier(.2,1.3,.4,1)' });
      tl.play(root.querySelector('.mx-bar'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], 420, 700, { ease: MX_SNAP });
      tl.play(root.querySelector('.mx-mida-word'), [{ opacity: 0, transform: 'translateX(120px) rotate(-8deg) skewX(-10deg)' }, { opacity: 1, transform: 'rotate(-8deg)' }], 520, 820, { ease: MX_SNAP });
      root.querySelectorAll('.mx-chev i').forEach((chev, i) => tl.play(chev, [{ opacity: 0, transform: 'translateX(-20px)' }, { opacity: 1, transform: 'none' }], 160, 1200 + i * 70, { ease: 'steps(2,end)' }));
      root.querySelectorAll('.mx-mida-tags span').forEach((tag, i) => tl.play(tag, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], 240, 1400 + i * 120, { ease: MX_SNAP }));
      const id = root.querySelector('.mx-mida-id');
      tl.play(id, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], 520, 2000, { ease: 'steps(8,end)' });
      id.querySelectorAll('dd').forEach((dd, i) => tl.scramble(dd, dd.textContent, 2200 + i * 200, 500, 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'));
      marathonBurst(s, tl, 800, { strength: 1.2 });
      marathonGlitchText(tl, root.querySelector('.mx-mida-word'), 'MIDA', 1500, 520);
      marathonBurst(s, tl, 2600, { strength: .8, blocks: 3 });
      tl.flash(root.querySelector('.mx-disc'), 3300, 200, .3);
      tl.play(root, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-60px) skewX(8deg)' }], 460, 4700, { ease: MX_IN, fill: 'forwards' });
    }
  },
  traxus: {
    summary: ['TRX-OS 7.4 // CORPORATE TERMINAL', 'KERNEL · LEDGER · ASSET TRACKING · COMPLIANCE · SECURITY MESH', 'PROVISIONING 100%', 'CORPORATE ACCESS GRANTED'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .82, glitch: false });
      const modules = ['KERNEL.SYS', 'LEDGER.DB', 'ASSET-TRACK', 'COMPLIANCE', 'SECURITY MESH', 'PAYROLL.BUS'];
      const root = marathonNode(s.scene, 'mx-trx', `<header><b>TRAXUS</b><span>TRX-OS 7.4 // CORPORATE TERMINAL</span><em>REV 7.4.0-K · LICENSED</em></header>
        <ul>${modules.map(m => `<li><span>${m}</span><i></i><b>[ OK ]</b></li>`).join('')}</ul>
        <div class="mx-trx-bar"><div>${'<i></i>'.repeat(24)}</div><span>PROVISIONING</span><b>000%</b></div>
        <div class="mx-trx-badge"><div><small>CLEARANCE</small><b>CORPORATE ACCESS GRANTED</b></div><i class="mx-barcode"></i></div>`);
      tl.play(root, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], 300, 420, { ease: MX_SNAP });
      tl.play(root.querySelector('header b'), [{ opacity: 0, letterSpacing: '.8em' }, { opacity: 1, letterSpacing: '.18em' }], 600, 450, { ease: MX_SNAP });
      root.querySelectorAll('li').forEach((row, i) => {
        const at = 900 + i * 220;
        tl.play(row, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], 120, at);
        tl.play(row.querySelector('i'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 180, at + 40, { ease: 'steps(6,end)' });
        tl.play(row.querySelector('b'), [{ opacity: 0 }, { opacity: 1 }], 80, at + 200);
      });
      root.querySelectorAll('.mx-trx-bar div i').forEach((cell, i) => tl.play(cell, [{ opacity: .12 }, { opacity: 1 }], 60, 1400 + i * 95 + (i > 15 ? 220 : 0), { ease: 'steps(1,end)' }));
      tl.count(root.querySelector('.mx-trx-bar b'), 0, 100, 1400, 2500, v => `${String(Math.round(v)).padStart(3, '0')}%`);
      // A compliance hiccup right before clearance: the corporate shell glitches once and recovers.
      marathonBurst(s, tl, 3600, { strength: .9, blocks: 3 });
      tl.corrupt(root.querySelector('header span'), 3600, 3);
      tl.corrupt(root.querySelector('.mx-trx-bar span'), 3640, 3);
      const badge = root.querySelector('.mx-trx-badge');
      tl.play(badge, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], 420, 4000, { ease: MX_SNAP });
      tl.play(root, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], 460, 5250, { ease: MX_IN, fill: 'forwards' });
    }
  },
  jjaro: {
    summary: ['SYMBOLS SURFACING', 'NESTED GEOMETRY · LATTICE CURVATURE', 'ANCIENT SIGNAL IDENTIFIED'],
    build(s, tl) {
      tl.play(s.veil, [{ opacity: 0 }, { opacity: .9 }], 1100, 0, { ease: 'ease-in-out' });
      const lines = [], bent = [];
      // Two path sets with identical command structure so CSS `d` interpolates the lattice into a well.
      for (let i = -5; i <= 5; i++) {
        const v = i * 20, pull = Math.sign(i) * (36 - Math.abs(i) * 5);
        lines.push(`M${v} -100Q${v} 0 ${v} 100`, `M-100 ${v}Q0 ${v} 100 ${v}`);
        bent.push(`M${v} -100Q${v - pull} 0 ${v} 100`, `M-100 ${v}Q0 ${v - pull} 100 ${v}`);
      }
      const symbol = (i) => { const random = mxRandom(31 + i * 17), r = 10 + random() * 5; return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="${r.toFixed(1)}"/><path d="${mxArc(r - 5, random() * 180, random() * 180 + 160)}"/><path d="M0 ${-r - 4}V${-r + 6}"/>${random() > .5 ? `<circle r="2.2" cx="${(r * .4).toFixed(1)}" class="f"/>` : '<path d="M-6 6L6 6"/>'}</svg>`; };
      const root = marathonNode(s.scene, 'mx-jjaro', `<svg class="mx-lattice" viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${lines.map(d => `<path d="${d}"/>`).join('')}</svg>
        <div class="mx-jsym">${Array.from({ length: 6 }, (_, i) => `<i>${symbol(i)}</i>`).join('')}</div>
        <svg class="mx-nest" viewBox="-100 -100 200 200" aria-hidden="true"><g class="n1"><circle r="90"/></g><g class="n2"><path d="M0 -78L67.5 -39V39L0 78L-67.5 39V-39Z"/></g><g class="n3"><path d="M0 -54L46.8 27H-46.8Z"/></g><g class="n4"><circle r="20"/><circle r="6" class="f"/></g></svg>
        <div class="mx-jjaro-word"><small>FREQUENCY 0.000 — UNCATALOGUED</small>ANCIENT SIGNAL IDENTIFIED</div>`);
      const paths = root.querySelectorAll('.mx-lattice path');
      paths.forEach((path, i) => tl.play(path, [{ d: `path("${lines[i]}")`, opacity: 0 }, { opacity: .7, offset: .3 }, { d: `path("${bent[i]}")`, opacity: .9 }], 2600, 600 + Math.abs(i - 11) * 25, { ease: 'cubic-bezier(.45,0,.2,1)' }));
      root.querySelectorAll('.mx-jsym i').forEach((sym, i) => {
        const [x, y] = mxPolar(1, i * 60 - 75), at = r => `translate(calc(-50% + ${(x * r).toFixed(2)}vmin),calc(-50% + ${(y * r).toFixed(2)}vmin))`;
        tl.play(sym, [{ opacity: 0, transform: `${at(36)} scale(.6)` }, { opacity: 1, transform: `${at(31)} scale(1)` }], 1400, 500 + i * 260, { ease: 'ease-out' });
      });
      const nest = root.querySelector('.mx-nest');
      tl.play(nest, [{ opacity: 0, transform: 'scale(1.5)' }, { opacity: 1, transform: 'scale(1)' }], 2000, 900, { ease: 'cubic-bezier(.2,.7,.2,1)' });
      ['n1', 'n2', 'n3', 'n4'].forEach((name, i) => tl.play(nest.querySelector(`.${name}`), [{ transform: `scale(${1.6 - i * .1}) rotate(${i % 2 ? -90 : 90}deg)` }, { transform: 'none' }], 2600, 900 + i * 180, { ease: 'cubic-bezier(.2,.7,.2,1)' }));
      marathonBurst(s, tl, 3420, { strength: .55, blocks: 2 });
      const word = root.querySelector('.mx-jjaro-word');
      tl.play(word, [{ opacity: 0, filter: 'blur(6px)', letterSpacing: '.6em' }, { opacity: 1, filter: 'blur(0)', letterSpacing: '.24em' }], 1200, 3500, { ease: 'ease-out' });
      tl.play(root, [{ opacity: 1 }, { opacity: 0 }], 900, 5400, { fill: 'forwards', ease: 'ease-in' });
    }
  },
  wrkncacnter: {
    summary: ['VOID APERTURE OPENING', 'NON-EUCLIDEAN DRIFT', '⟁ ⍜ ⌬ ◬ ⧖', 'SIGNAL COLLAPSED INTO ITSELF'],
    build(s, tl) {
      const origin = s.rect ? `${Math.round(s.rect.left + s.rect.width / 2)}px ${Math.round(s.rect.top)}px` : '50% 60%';
      const space = marathonNode(s.stage, 'mx-void');
      s.scene.before(space);
      tl.play(space, [{ clipPath: `circle(0% at ${origin})` }, { clipPath: `circle(150% at ${origin})` }], 1300, 80, { ease: 'cubic-bezier(.6,0,.3,1)' });
      const random = mxRandom(1993);
      const blob = (n, r, jitter) => Array.from({ length: n }, (_, i) => { const [x, y] = mxPolar(r * (1 - jitter / 2 + random() * jitter), i * 360 / n); return `${i ? 'L' : 'M'}${x} ${y}`; }).join('') + 'Z';
      const shapes = Array.from({ length: 5 }, (_, i) => ({ a: blob(9, 18 + i * 10, .6), b: blob(9, 18 + i * 10, .9), x: Math.round((random() - .5) * 140), y: Math.round((random() - .5) * 90) }));
      const symbols = '⟁⍜⌬◬⧖⌘⍟⎔⏣⟟⧗⍥⌖⏁⟠⍫';
      const columns = Array.from({ length: 9 }, (_, i) => `<p style="left:${6 + i * 11}%">${Array.from({ length: 24 }, () => symbols[Math.floor(random() * symbols.length)]).join('<br>')}</p>`).join('');
      const root = marathonNode(s.scene, 'mx-wrk', `<div class="mx-stream">${columns}</div><svg class="mx-shapes" viewBox="-100 -60 200 120" aria-hidden="true">${shapes.map(sh => `<path transform="translate(${sh.x} ${sh.y})" d="${sh.a}"/>`).join('')}</svg>
        <div class="mx-wrk-word"><span>W'RKNCACNTER</span><small>SIGNAL ORIGIN: OUTSIDE</small></div>`);
      root.querySelectorAll('.mx-shapes path').forEach((path, i) => {
        tl.play(path, [{ opacity: 0, transform: `translate(${shapes[i].x}px,${shapes[i].y}px) scale(.2) rotate(0)` }, { opacity: .85, transform: `translate(${shapes[i].x * 1.1}px,${shapes[i].y * 1.1}px) scale(1) rotate(${i % 2 ? 40 : -40}deg)` }], 2400, 700 + i * 260, { ease: 'ease-out' });
        tl.play(path, [{ d: `path("${shapes[i].a}")` }, { d: `path("${shapes[i].b}")` }], 1300, 700 + i * 260, { iterations: 3, direction: 'alternate', ease: 'ease-in-out' });
      });
      root.querySelectorAll('.mx-stream p').forEach((col, i) => tl.play(col, [{ transform: `translateY(${-30 - i * 4}%)`, opacity: 0 }, { opacity: .55, offset: .2 }, { transform: `translateY(${10 + i * 3}%)`, opacity: .55 }], 4200, 600 + i * 90, { ease: 'linear' }));
      marathonBurst(s, tl, 1500, { strength: 1.5, blocks: 5 }); marathonBurst(s, tl, 3100, { strength: 1.2 }); marathonBurst(s, tl, 4520, { strength: 1.4 });
      const word = root.querySelector('.mx-wrk-word');
      marathonGlitchText(tl, word.firstElementChild, "W'RKNCACNTER", 2300, 640);
      tl.play(word, [{ opacity: 0, transform: 'perspective(500px) rotateY(60deg) scale(.8)' }, { opacity: 1, transform: 'perspective(500px) rotateY(-12deg)' }, { opacity: 1, transform: 'perspective(500px) rotateY(8deg) rotateX(6deg)' }], 2600, 1600, { ease: 'ease-in-out' });
      if (tl.full && s.frame) tl.play(s.frame, [{ transform: 'none' }, { transform: 'perspective(1200px) rotateY(5deg) rotateX(2deg) scale(.97)', offset: .45 }, { transform: 'perspective(1200px) rotateY(-3deg) rotateX(-1deg) scale(.985)', offset: .75 }, { transform: 'none' }], 2400, 900, { ease: 'ease-in-out', fill: 'none' });
      // Self-collapse: the scene implodes into a point with a slow rotation, no luminance burst.
      tl.play(root, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.02) rotate(160deg)', opacity: 0 }], 900, 4600, { ease: 'cubic-bezier(.7,0,.9,.4)', fill: 'forwards' });
      tl.play(space, [{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }], 900, 5000, { ease: MX_IN, fill: 'forwards' });
    }
  },
  null: {
    summary: ['NULL//TRANSMIT.ERR', 'SOURCE: UNKNOWN', 'SIGNAL: ACTIVE', 'SOMETHING IS LISTENING.'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .9 });
      const wave = Array.from({ length: 161 }, (_, i) => `${i ? 'L' : 'M'}${i * 5} ${(50 + Math.sin(i * .35) * 18 * Math.cos(i * .07) + Math.sin(i * 1.7) * 6).toFixed(1)}`).join('');
      const root = marathonNode(s.scene, 'mx-null', `<header><b>COMMS // RELAY 0</b><span>ORIGIN UNRESOLVED</span><i class="mx-rec">● REC</i></header>
        <div class="mx-null-wave"><svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><path d="${wave}"/><path class="ghost" d="${wave}"/></svg></div>
        <div class="mx-null-log"></div>
        <div class="mx-null-block"><b>NULL//TRANSMIT.ERR</b><span></span><span></span><strong></strong></div>`);
      tl.play(root, [{ opacity: 0, transform: 'translateX(40px)', clipPath: 'inset(0 0 0 100%)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], 600, 420, { ease: MX_SNAP });
      const paths = root.querySelectorAll('.mx-null-wave path');
      tl.play(paths[0], [{ transform: 'translateX(0) scaleY(.2)' }, { transform: 'translateX(-200px) scaleY(1)', offset: .5 }, { transform: 'translateX(-400px) scaleY(.6)' }], 5000, 600, { ease: 'linear' });
      tl.play(paths[1], [{ transform: 'translateX(-60px) scaleY(.6)' }, { transform: 'translateX(-460px) scaleY(1.2)' }], 5000, 600, { ease: 'linear' });
      const log = root.querySelector('.mx-null-log');
      let t = 900;
      for (const text of ['ERR 0x0000 // HANDSHAKE RETURNED NULL', 'ERR 0x00FF // CARRIER HAS NO SOURCE', 'WARN  // CHECKSUM MATCHES NOTHING', 'ERR 0xDEAD // ROUTE LOOPS TO LISTENER']) t = tl.type(marathonNode(log, 'mx-line'), text, t, 12) + 90;
      const block = root.querySelector('.mx-null-block'), [source, signal] = block.querySelectorAll('span');
      tl.play(block, [{ opacity: 0 }, { opacity: 1 }], 200, t + 100);
      tl.type(source, 'SOURCE: UNKNOWN', t + 200, 26);
      tl.type(signal, 'SIGNAL: ACTIVE', t + 650, 26);
      tl.scramble(block.querySelector('strong'), 'SOMETHING IS LISTENING.', t + 1100, 1300);
      tl.at(t + 2450, () => block.dataset.resolved = '');
      // An error terminal glitches the most often: around the log, at the reveal and on the way out.
      marathonBurst(s, tl, t, { strength: 1 });
      log.querySelectorAll('.mx-line').forEach((row, i) => tl.corrupt(row, t + 1300 + i * 120, 2));
      marathonBurst(s, tl, t + 2400, { strength: 1.3, blocks: 5 });
      marathonGlitchText(tl, block.querySelector('strong'), 'SOMETHING IS LISTENING.', t + 2520, 700);
      marathonBurst(s, tl, 5880, { strength: 1.1 }); marathonGlitch(tl, root, 6000);
      tl.play(root, [{ opacity: 1, clipPath: 'inset(0 0 0 0)' }, { opacity: 0, clipPath: 'inset(0 0 0 100%)' }], 500, 6200, { ease: MX_IN, fill: 'forwards' });
    }
  },
  threeai: {
    summary: ['THREE AI PROTOCOL // RAMPANCY', 'LEELA: CONTAINED', 'TYCHO: SUBSUMED', 'DURANDAL: ASCENDANT'],
    build(s, tl) {
      marathonIntro(s, tl, { veil: .9, label: 'THREE AI PROTOCOL' });
      const ring = (cls, r) => `<g class="${cls}">${Array.from({ length: 4 }, (_, i) => `<path class="mx-shard" data-angle="${i * 90 + 45}" d="${mxArc(r, i * 90 + 8, i * 90 + 82)}"/>`).join('')}</g>`;
      const root = marathonNode(s.scene, 'mx-three', `<div class="mx-three-blue"><div class="mx-diag-grid"></div><header>LEELA // CUSTODIAN</header><ol><li>HULL</li><li>REACTOR</li><li>NAV</li><li>COMMS</li></ol></div>
        <div class="mx-three-red"><i class="mx-hz top"></i><header>TYCHO // INTRUSION</header><div class="mx-tlog"><div>${Array.from({ length: 30 }, (_, i) => `<p>0x${(0xA000 + i * 263).toString(16).toUpperCase()} SEIZE ${['NAV', 'REACTOR', 'COMMS', 'DOORS', 'HULL'][i % 5]}</p>`).join('')}</div></div></div>
        <div class="mx-three-green"></div>
        <div class="mx-three-core"><svg viewBox="-80 -80 160 160" aria-hidden="true">${ring('b', 70)}${ring('r', 58)}</svg>${durandalGlyph('mx-dglyph mx-three-glyph')}</div>
        <div class="mx-three-text"><b>THREE AI PROTOCOL // RAMPANCY</b><p>LEELA: CONTAINED</p><p>TYCHO: SUBSUMED</p><p>DURANDAL: ASCENDANT</p></div>
        <div class="mx-three-unlock"><small>${s.info.first ? 'HIDDEN THEME UNLOCKED' : 'PROTOCOL ALREADY ARCHIVED'}</small><b>RAMPANCY // TERMINAL GREEN</b></div>`);
      const blue = root.querySelector('.mx-three-blue'), red = root.querySelector('.mx-three-red'), green = root.querySelector('.mx-three-green');
      // Phase A — custodian: calm blue diagnostics take the left field.
      tl.play(blue, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], 700, 300, { ease: MX_SNAP });
      blue.querySelectorAll('li').forEach((row, i) => tl.play(row, [{ opacity: 0 }, { opacity: 1 }], 160, 900 + i * 180));
      // Phase B — intrusion: red cuts in from the right and corrupts blue.
      tl.play(red, [{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], 600, 2100, { ease: MX_SNAP });
      tl.play(red.querySelector('.mx-tlog>div'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-55%)' }], 2600, 2200, { ease: 'linear' });
      marathonGlitch(tl, blue, 2700); marathonGlitch(tl, blue, 3300);
      tl.at(3000, () => blue.dataset.corrupt = '');
      // Phase C — ascension: green spreads from the centre and both fields are absorbed.
      tl.play(green, [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], 1400, 4400, { ease: 'cubic-bezier(.6,0,.2,1)' });
      tl.play(blue, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(18vw) scale(.4)' }], 900, 4700, { ease: MX_IN, fill: 'forwards' });
      tl.play(red, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-18vw) scale(.4)' }], 900, 4800, { ease: MX_IN, fill: 'forwards' });
      const core = root.querySelector('.mx-three-core');
      tl.play(core, [{ opacity: 0, transform: 'scale(.4) rotate(-90deg)' }, { opacity: 1, transform: 'none' }], 900, 4900, { ease: MX_SNAP });
      tl.at(5700, () => root.dataset.ascendant = '');
      core.querySelectorAll('g .mx-shard').forEach((arc, i) => tl.play(arc, [{ transform: 'none' }, { transform: `rotate(${i % 2 ? 90 : -90}deg) scale(.7)` }], 1200, 5800, { ease: MX_SNAP, fill: 'forwards' }));
      marathonShatter(tl, [...core.querySelectorAll('.mx-three-glyph .mx-shard')], 6300, 34);
      const text = root.querySelector('.mx-three-text');
      tl.play(text.firstElementChild, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 600, 5600, { ease: 'steps(10,end)' });
      text.querySelectorAll('p').forEach((p, i) => tl.play(p, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], 240, 6300 + i * 260));
      tl.flash(green, 6300, 220, .3);
      // Each AI hand-over is marked by its own tear; the title itself glitches as DURANDAL takes it.
      marathonBurst(s, tl, 2100, { strength: 1.3 }); marathonBurst(s, tl, 4400, { strength: 1.5, blocks: 5 }); marathonBurst(s, tl, 7680, { strength: .8, blocks: 3 });
      marathonGlitchText(tl, text.firstElementChild, 'THREE AI PROTOCOL // RAMPANCY', 6250, 520);
      // The workspace rail is handed from AI to AI: blue custodian, red intrusion, green ascension.
      marathonStripWave(s, tl, 300, '#3FD6F2'); marathonStripWave(s, tl, 2100, '#FF3B4E'); marathonStripWave(s, tl, 4600, '#5CFF94'); marathonStripWave(s, tl, 7700, '#5CFF94');
      const unlock = root.querySelector('.mx-three-unlock');
      tl.play(unlock, [{ opacity: 0, transform: 'translateY(16px) scale(1.04)' }, { opacity: 1, transform: 'none' }], 520, 7700, { ease: MX_SNAP });
      marathonGlitch(tl, root, 9300);
      tl.play(root, [{ opacity: 1, clipPath: 'inset(0 0 0 0)' }, { opacity: 0, clipPath: 'inset(50% 0 50% 0)' }], 600, 9700, { ease: MX_IN, fill: 'forwards' });
    }
  }
};

/** Plays one show at a time; a show arriving mid-play replaces any earlier queued show. */
function createMarathonDirector({ getMotion = () => 'full', getScope = () => 'full', onFinish = () => {} } = {}) {
  let current = null, queued = null;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motion = () => reduce?.matches ? 'off' : getMotion();
  function onKey(event) {
    if (event.key !== 'Escape' || event.isComposing || !current) return;
    // Consume this Escape so it cannot also interrupt a running agent turn underneath the show.
    event.preventDefault(); event.stopImmediatePropagation(); skip();
  }
  function geometry() {
    const card = document.querySelector(MARATHON_CARD), rect = card?.getBoundingClientRect?.();
    const visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    const reserve = visible && getScope() === 'composer' ? Math.max(0, innerHeight - rect.top + 14) : 0;
    // Colour strips stay legible under the veil so the wave that runs down them can be read.
    const strips = [...document.querySelectorAll('[data-acid-ws-strip]')].filter(node => node.getClientRects().length);
    const rail = strips.reduce((right, node) => Math.max(right, node.getBoundingClientRect().right), 0);
    return { rect: visible ? rect : null, safe: innerHeight - reserve < 280 ? 0 : reserve, strips, rail };
  }
  function play(id, info = {}) {
    const scene = MARATHON_SCENES[id], egg = MARATHON_BY_ID.get(id);
    if (!scene || !egg) return false;
    if (current) { queued = { id, info }; return 'queued'; }
    const mode = motion(), { rect, safe, strips, rail } = geometry();
    const stage = document.createElement('div');
    stage.className = 'mx-stage'; stage.dataset.mxEgg = id; stage.dataset.mxTone = egg.tone; stage.dataset.mxMotion = mode;
    // Opt out of the skin's button/surface decorators, which skip anything under data-acid-motion-owned.
    stage.dataset.acidMotionOwned = '';
    stage.style.setProperty('--mx-safe', `${Math.round(safe)}px`);
    if (rail > 0) { stage.dataset.mxRail = ''; stage.style.setProperty('--mx-rail', `${Math.round(rail)}px`); }
    stage.setAttribute('aria-hidden', 'false');
    stage.innerHTML = `<div class="mx-veil"></div><div class="mx-scene" aria-hidden="true"></div><div class="mx-live" role="status" aria-live="polite"></div><button type="button" class="mx-skip" tabindex="-1" aria-label="Skip secret terminal sequence (Escape)"><span>ESC</span> SKIP <i></i></button>`;
    document.body.append(stage);
    const tl = marathonTimeline(stage, mode);
    const s = { stage, egg, info, rect, frame: document.querySelector(MARATHON_FRAME), strips, veil: stage.querySelector('.mx-veil'), scene: stage.querySelector('.mx-scene') };
    const duration = mode === 'off' ? MX_STILL_HOLD : egg.duration;
    stage.querySelector('.mx-live').textContent = `${egg.code} ${egg.name}: ${scene.summary.at(-1)}`;
    const skipButton = stage.querySelector('.mx-skip');
    skipButton.addEventListener('pointerdown', event => event.preventDefault());
    skipButton.addEventListener('click', () => skip());
    current = { id, stage, tl, ended: false, exit: null };
    window.addEventListener('keydown', onKey, true);
    try {
      if (mode === 'off') {
        // Reduced motion: one still card, opacity only, same narrative text, no movement or flicker.
        const card = marathonNode(s.scene, 'mx-card', `<small>${egg.code} // ${mxEscape(egg.name)}</small>${scene.summary.map((text, i) => `<p${i === scene.summary.length - 1 ? ' class="last"' : ''}>${mxEscape(text)}</p>`).join('')}`);
        tl.play(s.veil, [{ opacity: 0 }, { opacity: .82 }], 200, 0);
        tl.play(card, [{ opacity: 0 }, { opacity: 1 }], 200, 0);
      } else scene.build(s, tl);
      marathonFit(s.scene);
      if (mode !== 'off' && id !== MARATHON_FINALE.id) marathonStripWave(s, tl, 200);
    } catch (error) { console.warn('[industrial-acid] secret terminal scene failed', error); }
    if (mode !== 'off') tl.play(skipButton.querySelector('i'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], duration, 0, { ease: 'linear' });
    tl.play(skipButton, [{ opacity: 0 }, { opacity: 1 }], 240, 300);
    tl.at(duration, () => finish(true));
    stage.dataset.mxFlashes = String(tl.flashes.length);
    return true;
  }
  function finish(soft) {
    const show = current;
    if (!show || show.ended) return;
    const done = () => {
      if (show.ended) return;
      show.ended = true; show.tl.cancel(); show.stage.remove();
      if (current === show) current = null;
      window.removeEventListener('keydown', onKey, true);
      onFinish(show.id);
      if (queued) { const next = queued; queued = null; play(next.id, next.info); }
    };
    if (!soft || show.tl.motion === 'off' || !show.stage.animate) return done();
    if (show.exit) return;
    show.exit = show.stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
    show.exit.finished.then(done, done);
  }
  function skip() { queued = null; finish(true); }
  function dispose() { queued = null; const show = current; if (show) { show.exit?.cancel(); finish(false); } }
  return { play, skip, dispose, get active() { return current?.id ?? null; }, get queued() { return queued?.id ?? null; } };
}
