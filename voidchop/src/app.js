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
  const { refs } = mountShell(root);
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
  const state = { buffer: null, markers: [0] };

  const kit = new DrumKit();
  const exportPanel = mountExportPanel(refs.export, {
    getSlices: () => buildSlices(state.buffer, state.markers),
    getKitBuffers: () => PADS.map((name) => ({ name, buffer: kit.getBuffer(name) })).filter((p) => p.buffer),
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
  });
  refs.wave.appendChild(chopHint);

  const drop = mountDropZone(refs.drop, {
    onFile: async (file) => {
      try {
        await unlock();
        state.buffer = await decodeSample(await file.arrayBuffer());
        state.markers = [0];
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

  root.addEventListener('pointerdown', unlock, { once: true });
  syncBanner();
  try { getAudioContext().addEventListener?.('statechange', syncBanner); } catch { /* no audio */ }
  return { banner, chopHint, drop, state, kit, moog, waveform, exportPanel };
}
