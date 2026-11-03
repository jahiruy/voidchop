import { detectTransients } from '../audio/transient-detector.js';

const MIN_GAP = 0.05; // seconds, matches detector spacing
const HIT_PX = 6;

/**
 * Mount waveform chop view.
 * @param {HTMLElement} el
 * @param {{ onMarkersChange?: (m: number[]) => void }} opts
 */
export function mountWaveform(el, { onMarkersChange } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'vc-wave';
  canvas.width = 800;
  canvas.height = 160;
  const slider = document.createElement('input');
  Object.assign(slider, { type: 'range', min: '0', max: '1', step: '0.01', value: '0.5' });
  slider.className = 'vc-sensitivity';
  slider.setAttribute('aria-label', 'Sensitivity');
  el.append(canvas, slider);

  let buffer = null;
  let markers = [0];
  let drag = -1;
  const dur = () => (buffer ? buffer.duration || buffer.length / buffer.sampleRate : 0);
  const emit = () => onMarkersChange?.(markers.slice());

  function normalize(list) {
    const d = dur();
    const sorted = [...new Set(list.filter(Number.isFinite).map((t) => Math.max(0, d ? Math.min(d, t) : t)))].sort((a, b) => a - b);
    const out = [0];
    for (const t of sorted) if (t - out[out.length - 1] >= MIN_GAP) out.push(t);
    return out;
  }

  function draw() {
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    if (!buffer) return;
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.strokeStyle = '#00f0ff';
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let lo = 1, hi = -1;
      const s = x * step;
      for (let i = s; i < Math.min(data.length, s + step); i++) { if (data[i] < lo) lo = data[i]; if (data[i] > hi) hi = data[i]; }
      if (hi < lo) continue;
      ctx.moveTo(x + 0.5, ((1 - hi) * h) / 2);
      ctx.lineTo(x + 0.5, ((1 - lo) * h) / 2);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ff2bd6';
    const d = dur();
    for (const t of markers) {
      const x = (t / d) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
  }

  const toTime = (e) => {
    const r = canvas.getBoundingClientRect();
    const rw = r.width || canvas.width;
    return ((e.clientX - r.left) / rw) * dur();
  };
  const pxPerSec = () => (canvas.getBoundingClientRect().width || canvas.width) / (dur() || 1);

  canvas.addEventListener('pointerdown', (e) => {
    if (!buffer) return;
    const t = toTime(e);
    let best = -1, bd = Infinity;
    markers.forEach((m, i) => { const dd = Math.abs(m - t) * pxPerSec(); if (i > 0 && dd < bd) { bd = dd; best = i; } });
    if (best > 0 && bd <= HIT_PX) { drag = best; canvas.setPointerCapture?.(e.pointerId); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag < 1) return;
    const prev = markers[drag - 1] + MIN_GAP;
    const next = drag + 1 < markers.length ? markers[drag + 1] - MIN_GAP : dur();
    markers[drag] = Math.min(next, Math.max(prev, toTime(e)));
    draw();
  });
  const end = () => { if (drag > 0) { drag = -1; emit(); } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  slider.addEventListener('input', () => {
    if (!buffer) return;
    markers = normalize(detectTransients(buffer, Number(slider.value)));
    draw(); emit();
  });

  return {
    canvas, slider,
    setBuffer(b) {
      buffer = b;
      markers = b ? normalize(detectTransients(b, Number(slider.value))) : [0];
      draw(); emit();
    },
    setMarkers(list) { markers = normalize(list || []); draw(); },
    getMarkers: () => markers.slice(),
  };
}
