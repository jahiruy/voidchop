import { describe, it, expect } from 'vitest';
import { detectTransients } from '../../src/audio/transient-detector.js';

function fakeBuffer(channels, sampleRate = 44100) {
  const length = channels[0].length;
  return {
    sampleRate, length, numberOfChannels: channels.length,
    duration: length / sampleRate,
    getChannelData: (i) => channels[i],
  };
}

function impulses(times, dur = 2, sr = 44100) {
  const d = new Float32Array(dur * sr);
  for (const t of times) {
    const s = Math.floor(t * sr);
    for (let i = 0; i < 2000; i++) d[s + i] = Math.exp(-i / 300) * (i % 2 ? -1 : 1);
  }
  return d;
}

describe('detectTransients', () => {
  it('finds two impulses at mid sensitivity', () => {
    const buf = fakeBuffer([impulses([0.5, 1.2]), impulses([0.5, 1.2])]);
    const m = detectTransients(buf, 0.5);
    expect(m[0]).toBe(0);
    expect(m.some((t) => Math.abs(t - 0.5) < 0.03)).toBe(true);
    expect(m.some((t) => Math.abs(t - 1.2) < 0.03)).toBe(true);
    expect([...m].sort((a, b) => a - b)).toEqual(m);
  });
  it('silent buffer returns [0]', () => {
    expect(detectTransients(fakeBuffer([new Float32Array(44100)]), 0.5)).toEqual([0]);
  });
  it('empty buffer returns [0]', () => {
    expect(detectTransients(fakeBuffer([new Float32Array(0)]), 0.5)).toEqual([0]);
  });
  it('defaults sensitivity', () => {
    expect(detectTransients(fakeBuffer([impulses([0.5])])).length).toBeGreaterThanOrEqual(2);
  });
});
