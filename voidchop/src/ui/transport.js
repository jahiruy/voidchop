import { getAudioContext } from '../audio/context.js';
import { showToast } from './toast.js';

export function mountTransport(el, { getBpm = () => 130, setBpm = () => {}, onPlay = () => {}, onStop = () => {}, getPlaying = () => false, getBar = () => 1 } = {}) {
  el.innerHTML = `<div class="transport">
    <button data-role="play">Play</button>
    <button data-role="stop">Stop</button>
    <label>BPM <input data-role="bpm" type="number" min="40" max="300" step="1"></label>
    <span data-role="bar"></span></div>`;
  const play = el.querySelector('[data-role=play]');
  const stop = el.querySelector('[data-role=stop]');
  const bpm = el.querySelector('[data-role=bpm]');
  const bar = el.querySelector('[data-role=bar]');
  bpm.value = String(getBpm() ?? 130);

  const refresh = () => {
    bar.textContent = `Bar ${getBar()}`;
    const p = !!getPlaying();
    play.classList.toggle('active', p);
    play.setAttribute('aria-pressed', String(p));
  };

  bpm.addEventListener('change', () => {
    const v = Number(bpm.value);
    if (Number.isFinite(v) && v > 0) setBpm(v); else bpm.value = String(getBpm() ?? 130);
  });
  play.addEventListener('click', () => {
    let ctx;
    try { ctx = getAudioContext(); } catch { ctx = null; }
    if (!ctx || ctx.state !== 'running') { showToast(el, 'Audio not started — drop a sample or click to enable audio'); return; }
    onPlay(); refresh();
  });
  stop.addEventListener('click', () => { onStop(); refresh(); });

  refresh();
  return { refresh, destroy: () => { el.innerHTML = ''; } };
}
