import { mountShell } from './ui/theme-shell.js';
import { mountDropZone } from './ui/drop-zone.js';
import { mountWaveform } from './ui/waveform-view.js';
import { mountDrumPads } from './ui/drum-pads.js';
import { mountKeyboard } from './ui/keyboard.js';
import { bounceLoop, patternHasContent } from './audio/loop-bounce.js';
import { mountExportPanel } from './ui/export-panel.js';
import { getAudioContext, unlockAudio } from './audio/context.js';
import { decodeSample } from './audio/sample-buffer.js';
import { DrumKit, PADS } from './audio/drum-kit.js';
import { MoogSub } from './audio/moog-sub.js';
import { createPatternState, pushUndo, undo, updateClip, setBpm, STEPS_PER_BAR } from './audio/pattern-state.js';
import { createClock } from './audio/clock.js';
import { createScheduler } from './audio/scheduler.js';
import { mountTransport } from './ui/transport.js';
import { mountSessionStrip } from './ui/session-strip.js';

/** Build slice descriptors from a buffer and sorted marker times. */
export function buildSlices(buffer, markers) {
  if (!buffer) return [];
  const dur = buffer.duration || buffer.length / buffer.sampleRate;
  const pts = (markers && markers.length ? markers : [0]).filter((t) => t < dur);
  if (pts.length <= 1) return [{ buffer }];
  return pts.map((startSec, i) => ({ buffer, startSec, endSec: i + 1 < pts.length ? pts[i + 1] : dur }));
}

export const CHOP_HINT = 'Few transients found — try raising Sensitivity to chop more slices.';

export function bootApp(root) {
  const { refs, glow } = mountShell(root);
  const banner = document.createElement('button');
  banner.type = 'button';
  banner.className = 'vc-audio-banner';
  banner.textContent = 'Tap to enable audio';
  banner.hidden = true;
  root.prepend(banner);
  const syncBanner = () => {
    let s;
    try { s = getAudioContext().state; } catch { s = 'running'; }
    banner.hidden = s !== 'suspended';
  };
  const unlock = () => unlockAudio().catch(() => {}).finally(syncBanner);
  banner.addEventListener('click', unlock);
  const chopHint = document.createElement('p');
  chopHint.className = 'vc-hint';
  chopHint.textContent = CHOP_HINT;
  chopHint.hidden = true;
  const state = { buffer: null, markers: [0], pattern: createPatternState(), vocalBuffers: {}, bufferId: null, selectedClipId: null };
  let bufSeq = 0;

  const kit = new DrumKit();
  const exportPanel = mountExportPanel(refs.export, {
    getSlices: () => buildSlices(state.buffer, state.markers),
    getKitBuffers: () => PADS.map((name) => ({ name, buffer: kit.getBuffer(name) })).filter((p) => p.buffer),
    hasLoop: () => patternHasContent(state.pattern),
    getLoop: async () => {
      const p = state.pattern;
      if (!patternHasContent(p)) return null;
      try { return await bounceLoop({ state: p, kit, getBuffer: (id) => state.vocalBuffers?.[id] || null }); }
      catch (e) { console.error('VOIDCHOP: loop bounce failed', e); return null; }
    },
  });
  const refresh = () => exportPanel?.refresh?.();

  const waveform = mountWaveform(refs.wave, {
    onMarkersChange: (m) => {
      state.markers = m;
      chopHint.hidden = !state.buffer || buildSlices(state.buffer, m).length > 1;
      refresh();
    },
    onWarpChange: (clip, wm) => {
      state.pattern = updateClip(pushUndo(state.pattern), clip.id, { warpMarkers: wm });
      refresh();
    },
  });
  refs.wave.appendChild(chopHint);

  /* Place gesture: click a slice on the waveform (no drag) to arm it as the pending chop,
     then click an empty spot in the session strip's vocal lane to drop it there. */
  let downX = null;
  waveform.canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  waveform.canvas.addEventListener('click', (e) => {
    if (!state.buffer || state.selectedClipId) return;
    if (downX != null && Math.abs(e.clientX - downX) > 3) return;
    const r = waveform.canvas.getBoundingClientRect();
    const d = state.buffer.duration || state.buffer.length / state.buffer.sampleRate;
    const t = ((e.clientX - r.left) / (r.width || waveform.canvas.width)) * d;
    const sl = buildSlices(state.buffer, state.markers).map((x) => ({ in: x.startSec ?? 0, out: x.endSec ?? d }));
    const hit = sl.find((x) => t >= x.in && t < x.out) || sl[sl.length - 1];
    if (!hit) return;
    window.__voidchopPendingChop = { bufferId: state.bufferId, slice: hit, lengthSteps: 2 };
  });

  const drop = mountDropZone(refs.drop, {
    onFile: async (file) => {
      try {
        await unlock();
        state.buffer = await decodeSample(await file.arrayBuffer());
        state.markers = [0];
        state.bufferId = `b${++bufSeq}`;
        state.vocalBuffers[state.bufferId] = state.buffer;
        state.selectedClipId = null;
        waveform.setClip(null);
        waveform.setBuffer(state.buffer);
        refresh();
      } catch (err) {
        console.error('VOIDCHOP: failed to load sample', err);
        drop.setMessage(`Couldn't read that file — try another or drop it again.`);
      }
    },
  });

  kit.loadDefaults()
    .catch((err) => console.error('VOIDCHOP: kit load failed', err))
    .finally(() => { mountDrumPads(refs.pads, kit); refresh(); });

  const moog = new MoogSub(getAudioContext());
  const knobs = document.createElement('div');
  knobs.className = 'vc-knobs';
  for (const [label, setter, init] of [
    ['Cutoff', 'setCutoff', moog.cutoff],
    ['Resonance', 'setResonance', moog.resonance],
    ['Decay', 'setDecay', moog.decay],
  ]) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: '0', max: '1', step: '0.01', value: String(init) });
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => moog[setter](Number(input.value)));
    wrap.appendChild(input);
    knobs.appendChild(wrap);
  }
  const keys = document.createElement('div');
  refs.sub.append(knobs, keys);
  mountKeyboard(keys, moog);

  // --- Sequencer ---
  const clock = createClock({ getBpm: () => state.pattern.bpm });
  const scheduler = createScheduler({
    getState: () => state.pattern, kit, getBuffer: (id) => state.vocalBuffers[id] || null,
  });
  const now = () => { try { return getAudioContext().currentTime; } catch { return 0; } };
  const curStep = () => (clock.isPlaying() ? clock.currentStep() : -1);
  const strip = mountSessionStrip(refs.sessionStrip, {
    getState: () => state.pattern,
    setState: (s) => { state.pattern = s; refresh(); },
    getCurrentStep: curStep,
    onSelectClip: (id) => {
      const c = state.pattern.vocals.find((v) => v.id === id);
      if (!c) return;
      if (state.selectedClipId === id) { state.selectedClipId = null; waveform.setClip(null, state.buffer); return; }
      state.selectedClipId = id;
      waveform.setClip(c, state.vocalBuffers[c.bufferId] || state.buffer);
    },
  });
  const transport = mountTransport(refs.transport, {
    getBpm: () => state.pattern.bpm,
    setBpm: (v) => { state.pattern = setBpm(pushUndo(state.pattern), v); },
    onPlay: () => { const t = now(); clock.play(t); scheduler.start(t); },
    onStop: () => { clock.stop(); scheduler.stop(); strip.render(); },
    getPlaying: () => clock.isPlaying(),
    getBar: () => Math.floor(clock.currentStep() / STEPS_PER_BAR) + 1,
  });
  const doUndo = () => {
    state.pattern = undo(state.pattern);
    if (state.selectedClipId && !state.pattern.vocals.some((v) => v.id === state.selectedClipId)) {
      state.selectedClipId = null; waveform.setClip(null, state.buffer);
    }
    const bpmIn = refs.transport.querySelector('[data-role=bpm]');
    if (bpmIn) bpmIn.value = String(state.pattern.bpm);
    strip.render(); refresh();
  };
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button'; undoBtn.dataset.role = 'undo'; undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', doUndo);
  refs.transport.querySelector('.transport')?.appendChild(undoBtn);
  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' && e.target.type !== 'range') return;
      e.preventDefault(); doUndo();
    }
  };
  document.addEventListener('keydown', onKey);

  let lastStep = -2, raf = 0;
  const rootStyle = document.documentElement.style;
  function frame() {
    const t = now();
    clock.tick(t);
    scheduler.onTick(t);
    const playing = clock.isPlaying();
    // --vc-phase is phase within the current beat (pulse.css contract).
    const beats = clock.phase01() * state.pattern.bars * 4;
    rootStyle.setProperty('--vc-phase', String(playing ? beats - Math.floor(beats) : 0));
    rootStyle.setProperty('--vc-playing', playing ? '1' : '0');
    const s = curStep();
    if (s !== lastStep) { lastStep = s; transport.refresh(); strip.render(); }
    raf = requestAnimationFrame(frame);
  }
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame);
  const stopLoop = () => { cancelAnimationFrame?.(raf); document.removeEventListener('keydown', onKey); };

  root.addEventListener('pointerdown', unlock, { once: true });
  syncBanner();
  try { getAudioContext().addEventListener?.('statechange', syncBanner); } catch { /* no audio */ }
  return { banner, chopHint, drop, state, kit, moog, waveform, exportPanel, glow, clock, scheduler, strip, transport, undo: doUndo, frame, stopLoop };
}
