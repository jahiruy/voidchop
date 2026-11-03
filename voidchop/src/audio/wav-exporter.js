function makeBuffer(chans, length, sampleRate) {
  if (typeof AudioBuffer !== 'undefined') {
    return new AudioBuffer({ numberOfChannels: chans, length: Math.max(1, length), sampleRate });
  }
  const data = Array.from({ length: chans }, () => new Float32Array(length));
  return { length, sampleRate, numberOfChannels: chans, duration: length / sampleRate,
    getChannelData: (c) => data[c] };
}

/** Copy [startSec, endSec) of an AudioBuffer into a new buffer. */
export function sliceBuffer(buffer, startSec, endSec) {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.min(buffer.length, Math.round(startSec * sr)));
  const end = Math.max(start, Math.min(buffer.length, Math.round(endSec * sr)));
  const out = makeBuffer(buffer.numberOfChannels, end - start, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(start, end));
  }
  return out;
}

function resample(data, from, to) {
  if (from === to) return data;
  const len = Math.round((data.length * to) / from);
  const out = new Float32Array(len);
  const ratio = from / to;
  for (let i = 0; i < len; i++) {
    const p = i * ratio, i0 = Math.floor(p), f = p - i0;
    const a = data[i0] ?? 0, b = data[i0 + 1] ?? a;
    out[i] = a + (b - a) * f;
  }
  return out;
}

/** Encode AudioBuffer as little-endian PCM WAV. */
export function audioBufferToWav(buffer, { sampleRate = 44100, bitDepth = 24 } = {}) {
  const chans = buffer.numberOfChannels;
  const data = [];
  for (let c = 0; c < chans; c++) data.push(resample(buffer.getChannelData(c), buffer.sampleRate, sampleRate));
  const frames = data[0]?.length ?? 0;
  const bps = bitDepth / 8;
  const dataSize = frames * chans * bps;
  const ab = new ArrayBuffer(44 + dataSize);
  const v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, chans, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * chans * bps, true); v.setUint16(32, chans * bps, true);
  v.setUint16(34, bitDepth, true);
  w(36, 'data'); v.setUint32(40, dataSize, true);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chans; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      if (bitDepth === 16) {
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      } else {
        const x = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
        v.setUint8(o, x & 0xff); v.setUint8(o + 1, (x >> 8) & 0xff); v.setUint8(o + 2, (x >> 16) & 0xff); o += 3;
      }
    }
  }
  return ab;
}
