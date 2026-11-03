import { mountShell } from './ui/theme-shell.js';
import { mountDropZone } from './ui/drop-zone.js';
import { mountWaveform } from './ui/waveform-view.js';
import { mountDrumPads } from './ui/drum-pads.js';
import { mountKeyboard } from './ui/keyboard.js';
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

export function bootApp(root) {
  const { refs } = mountShell(root);
  const state = { buffer: null, markers: [0] };

  const kit = new DrumKit();
  const exportPanel = mountExportPanel(refs.export, {
    getSlices: () => buildSlices(state.buffer, state.markers),
    getKitBuffers: () => PADS.map((name) => ({ name, buffer: kit.getBuffer(name) })).filter((p) => p.buffer),
  });
  const refresh = () => exportPanel?.refresh?.();

  const waveform = mountWaveform(refs.wave, {
    onMarkersChange: (m) => { state.markers = m; refresh(); },
  });

  mountDropZone(refs.drop, {
    onFile: async (file) => {
      try {
        await unlockAudio();
        state.buffer = await decodeSample(await file.arrayBuffer());
        state.markers = [0];
        waveform.setBuffer(state.buffer);
        refresh();
      } catch (err) {
        console.error('VOIDCHOP: failed to load sample', err);
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

  root.addEventListener('pointerdown', () => { unlockAudio().catch(() => {}); }, { once: true });
  return { state, kit, moog, waveform, exportPanel };
}
