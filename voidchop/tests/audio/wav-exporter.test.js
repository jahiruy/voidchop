import { describe, it, expect } from 'vitest';
import { audioBufferToWav, sliceBuffer } from '../../src/audio/wav-exporter.js';

function fakeBuffer(len, sr = 44100, chans = 2, fill = 0) {
  const data = Array.from({ length: chans }, () => new Float32Array(len).fill(fill));
  return { length: len, sampleRate: sr, numberOfChannels: chans, duration: len / sr,
    getChannelData: (c) => data[c] };
}
const str = (v, o) => String.fromCharCode(...new Uint8Array(v.buffer, o, 4));

describe('audioBufferToWav', () => {
  it('writes RIFF/WAVE header, little-endian', () => {
    const v = new DataView(audioBufferToWav(fakeBuffer(100)));
    expect(str(v, 0)).toBe('RIFF');
    expect(str(v, 8)).toBe('WAVE');
    expect(str(v, 12)).toBe('fmt ');
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint16(34, true)).toBe(24);
    expect(str(v, 36)).toBe('data');
  });
  it('bitDepth changes data chunk size', () => {
    const b = fakeBuffer(100);
    const d24 = new DataView(audioBufferToWav(b)).getUint32(40, true);
    const d16 = new DataView(audioBufferToWav(b, { bitDepth: 16 })).getUint32(40, true);
    expect(d24).toBe(100 * 2 * 3);
    expect(d16).toBe(100 * 2 * 2);
  });
  it('total length = 44 + data; RIFF size consistent', () => {
    const ab = audioBufferToWav(fakeBuffer(1000, 44100, 1), { bitDepth: 16 });
    expect(ab.byteLength).toBe(44 + 2000);
    expect(new DataView(ab).getUint32(4, true)).toBe(ab.byteLength - 8);
  });
  it('encodes full-scale samples', () => {
    const v = new DataView(audioBufferToWav(fakeBuffer(1, 44100, 1, 1), { bitDepth: 16 }));
    expect(v.getInt16(44, true)).toBe(32767);
  });
  it('resamples to target rate', () => {
    const ab = audioBufferToWav(fakeBuffer(48000, 48000, 1), { bitDepth: 16 });
    expect(ab.byteLength).toBe(44 + 44100 * 2);
  });
});

describe('sliceBuffer', () => {
  it('copies a time range', () => {
    const b = fakeBuffer(44100, 44100, 2);
    b.getChannelData(0)[22050] = 0.5;
    const s = sliceBuffer(b, 0.5, 0.75);
    expect(s.length).toBe(11025);
    expect(s.numberOfChannels).toBe(2);
    expect(s.sampleRate).toBe(44100);
    expect(s.getChannelData(0)[0]).toBe(0.5);
  });
});
