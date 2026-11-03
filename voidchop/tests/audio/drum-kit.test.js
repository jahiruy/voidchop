import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrumKit, PADS, STORAGE_KEY } from '../../src/audio/drum-kit.js';
import { _resetContextForTests } from '../../src/audio/context.js';

const started = [];
class FakeCtx {
  constructor() { this.state = 'running'; this.destination = {}; this.currentTime = 0; }
  async resume() {}
  async decodeAudioData(buf) { return { tag: new Uint8Array(buf)[0], byteLength: buf.byteLength }; }
  createBufferSource() {
    const src = { buffer: null, connect: vi.fn(), start: vi.fn(() => started.push(src.buffer)) };
    return src;
  }
}
window.AudioContext = FakeCtx;

const ab = (tag, size = 8) => { const u = new Uint8Array(size); u[0] = tag; return u.buffer; };

beforeEach(() => {
  _resetContextForTests();
  started.length = 0;
  localStorage.clear();
  globalThis.fetch = vi.fn(async (url) => ({ ok: true, arrayBuffer: async () => ab(PADS.indexOf(url.match(/(\w+)\.wav$/)[1]) + 1) }));
});

describe('DrumKit', () => {
  it('has the four 909 pads', () => {
    expect(PADS).toEqual(['kick', 'snare', 'clap', 'cymbal']);
  });

  it('loadDefaults fetches each pad wav and decodes it', async () => {
    const kit = new DrumKit();
    expect(kit.getBuffer('kick')).toBeNull();
    await kit.loadDefaults();
    expect(fetch).toHaveBeenCalledWith('/voidchop/kits/909/kick.wav');
    expect(kit.getBuffer('snare').tag).toBe(2);
    expect(kit.getBuffer('cymbal').tag).toBe(4);
  });

  it('trigger plays the pad buffer; unknown/unloaded pads are no-ops', async () => {
    const kit = new DrumKit();
    kit.trigger('kick');
    expect(started).toHaveLength(0);
    await kit.loadDefaults();
    kit.trigger('clap');
    expect(started[0].tag).toBe(3);
    expect(() => kit.trigger('fedora')).toThrow();
  });

  it('swapPad replaces buffer and persists base64 to localStorage', async () => {
    const kit = new DrumKit();
    await kit.loadDefaults();
    await kit.swapPad('kick', ab(99));
    expect(kit.getBuffer('kick').tag).toBe(99);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(typeof saved.kick).toBe('string');
    const kit2 = new DrumKit();
    await kit2.loadDefaults();
    expect(kit2.getBuffer('kick').tag).toBe(99);
    expect(kit2.getBuffer('snare').tag).toBe(2);
  });

  it('swaps >= 1.5MB total stay session-only', async () => {
    const kit = new DrumKit();
    await kit.loadDefaults();
    await kit.swapPad('snare', ab(50, 1.6 * 1024 * 1024));
    expect(kit.getBuffer('snare').tag).toBe(50);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('corrupt saved swaps are skipped, defaults kept, and pruned from storage', async () => {
    const kit = new DrumKit();
    await kit.loadDefaults();
    await kit.swapPad('clap', ab(77));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    saved.kick = '!!!not base64!!!';
    saved.snare = btoa('\xff');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const ctxDecode = FakeCtx.prototype.decodeAudioData;
    FakeCtx.prototype.decodeAudioData = async function (buf) {
      if (new Uint8Array(buf)[0] === 0xff) throw new Error('bad audio');
      return ctxDecode.call(this, buf);
    };
    try {
      const kit2 = new DrumKit();
      await expect(kit2.loadDefaults()).resolves.toBeUndefined();
      expect(kit2.getBuffer('kick').tag).toBe(1);
      expect(kit2.getBuffer('snare').tag).toBe(2);
      expect(kit2.getBuffer('clap').tag).toBe(77);
      const after = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(Object.keys(after)).toEqual(['clap']);
    } finally {
      FakeCtx.prototype.decodeAudioData = ctxDecode;
    }
  });
  it('one missing stock sample still loads the rest and applies swaps', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (url.endsWith('snare.wav')) return { ok: false, status: 404, arrayBuffer: async () => ab(0) };
      const pad = url.match(/(\w+)\.wav$/)[1];
      return { ok: true, arrayBuffer: async () => ab(PADS.indexOf(pad) + 1) };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ clap: btoa(String.fromCharCode(88)) }));
    const kit = new DrumKit();
    await kit.loadDefaults();
    expect(kit.getBuffer('kick').tag).toBe(1);
    expect(kit.getBuffer('snare')).toBeNull();
    expect(kit.getBuffer('clap').tag).toBe(88);
    expect(kit.getBuffer('cymbal').tag).toBe(4);
  });

});
