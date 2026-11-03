import { describe, it, expect, beforeEach } from 'vitest';
import { decodeSample } from '../../src/audio/sample-buffer.js';
import { _resetContextForTests } from '../../src/audio/context.js';

// jsdom has no Web Audio; minimal stub that parses a PCM WAV header.
class FakeAudioBuffer {
  constructor({ numberOfChannels, length, sampleRate }) {
    Object.assign(this, { numberOfChannels, length, sampleRate });
  }
}
class FakeAudioContext {
  constructor() { this.state = 'suspended'; }
  async resume() { this.state = 'running'; }
  async decodeAudioData(buf) {
    this.lastDecoded = buf;
    const v = new DataView(buf);
    const numberOfChannels = v.getUint16(22, true);
    const sampleRate = v.getUint32(24, true);
    const bits = v.getUint16(34, true);
    const dataLen = v.getUint32(40, true);
    return new FakeAudioBuffer({ numberOfChannels, sampleRate, length: dataLen / (numberOfChannels * bits / 8) });
  }
}
if (!window.AudioContext || !window.AudioContext.prototype.decodeAudioData) {
  window.AudioContext = FakeAudioContext;
  window.AudioBuffer = FakeAudioBuffer;
}

function makeWav(samples = 16, sampleRate = 8000) {
  const dataLen = samples * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataLen, true);
  return buf;
}

describe('decodeSample', () => {
  beforeEach(() => _resetContextForTests());

  it('decodes a WAV ArrayBuffer to an AudioBuffer', async () => {
    const wav = makeWav();
    const ab = await decodeSample(wav);
    expect(ab).toBeInstanceOf(window.AudioBuffer);
    expect(ab.numberOfChannels).toBeGreaterThanOrEqual(1);
    expect(wav.byteLength).toBe(76); // original not detached (44 hdr + 32 data)
  });
});
