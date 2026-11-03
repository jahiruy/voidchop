const HOP = 512;
const WINDOW = 16; // frames in rolling mean (~186ms @44.1k)
const MIN_SPACING = 0.05;
const SILENCE = 1e-6;

/**
 * Detect transient onsets in an AudioBuffer.
 * @param {AudioBuffer} buffer
 * @param {number} sensitivity 0..1, higher = more slices
 * @returns {number[]} sorted onset times in seconds, always starting with 0
 */
export function detectTransients(buffer, sensitivity = 0.5) {
  const out = [0];
  const len = buffer?.length ?? 0;
  if (!len) return out;
  const sr = buffer.sampleRate;
  const chans = buffer.numberOfChannels;
  const data = [];
  for (let c = 0; c < chans; c++) data.push(buffer.getChannelData(c));

  const frames = Math.ceil(len / HOP);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const end = Math.min(len, (f + 1) * HOP);
    for (let i = f * HOP; i < end; i++) {
      let m = 0;
      for (let c = 0; c < chans; c++) m += data[c][i];
      m /= chans;
      sum += m * m;
    }
    energy[f] = sum / HOP;
  }

  const s = Math.min(1, Math.max(0, Number.isFinite(sensitivity) ? sensitivity : 0.5));
  const threshold = 1.5 + (1 - s) * 8.5; // s=1 → 1.5x, s=0 → 10x
  const minFrames = Math.ceil((MIN_SPACING * sr) / HOP);
  let last = 0;
  for (let f = 1; f < frames; f++) {
    if (energy[f] < SILENCE) continue;
    let mean = 0;
    const start = Math.max(0, f - WINDOW);
    for (let k = start; k < f; k++) mean += energy[k];
    mean /= f - start;
    const isPeak = energy[f] > energy[f - 1];
    if (isPeak && energy[f] > mean * threshold + SILENCE && f - last >= minFrames) {
      out.push((f * HOP) / sr);
      last = f;
    }
  }
  return out;
}
