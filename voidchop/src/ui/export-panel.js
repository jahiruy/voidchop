import { audioBufferToWav, sliceBuffer } from '../audio/wav-exporter.js';
import { buildExportZip } from '../audio/zip-bundler.js';

const pad = (n) => String(n).padStart(2, '0');
const safe = (s) => String(s).replace(/[^\w.-]+/g, '_');

/**
 * getSlices(): { buffer, startSec?, endSec? }[] — if startSec/endSec given, buffer is sliced.
 * getKitBuffers(): { name, buffer }[] (optional) — exported as kit/<name>.wav.
 * getLoop(): Promise<AudioBuffer|null> (optional) — exported as voidchop-loop.wav.
 */
export function mountExportPanel(el, { getSlices = () => [], getKitBuffers = () => [], getLoop = null, hasLoop = () => false, bitDepth = 24 } = {}) {
  el.innerHTML = `<div class="export-panel">
    <label>Bit depth <select data-role="depth"><option value="24">24-bit</option><option value="16">16-bit</option></select></label>
    <button data-role="export">Export WAV zip</button>
    <span data-role="msg"></span></div>`;
  const sel = el.querySelector('[data-role=depth]');
  const btn = el.querySelector('[data-role=export]');
  const msg = el.querySelector('[data-role=msg]');
  sel.value = String(bitDepth === 16 ? 16 : 24);

  const collect = () => {
    const slices = (getSlices() || []).filter((s) => s && s.buffer);
    const kit = (getKitBuffers?.() || []).filter((k) => k && k.buffer);
    return { slices, kit };
  };
  const refresh = () => {
    const { slices, kit } = collect();
    const empty = !slices.length && !kit.length && !hasLoop();
    btn.disabled = empty;
    msg.textContent = empty ? 'Load a sample to export' : '';
  };

  btn.addEventListener('click', async () => {
    const { slices, kit } = collect();
    if (!slices.length && !kit.length && !hasLoop()) return refresh();
    const opts = { sampleRate: 44100, bitDepth: Number(sel.value) };
    const files = slices.map((s, i) => {
      const b = s.startSec != null && s.endSec != null ? sliceBuffer(s.buffer, s.startSec, s.endSec) : s.buffer;
      return { name: `slice_${pad(i + 1)}.wav`, data: audioBufferToWav(b, opts) };
    });
    kit.forEach((k, i) => files.push({ name: `kit/${safe(k.name || `pad_${pad(i + 1)}`)}.wav`, data: audioBufferToWav(k.buffer, opts) }));
    btn.disabled = true; msg.textContent = 'Exporting…';
    try {
      const loop = getLoop ? await getLoop() : null;
      if (loop) files.push({ name: 'voidchop-loop.wav', data: audioBufferToWav(loop, opts) });
      const blob = await buildExportZip(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'voidchop-export.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      msg.textContent = `Exported ${files.length} file(s)`;
    } catch (e) {
      msg.textContent = 'Export failed';
    } finally { btn.disabled = false; }
  });

  refresh();
  return { refresh, destroy: () => { el.innerHTML = ''; } };
}
