import { getAudioContext } from './context.js';
import { decodeSample } from './sample-buffer.js';

export const PADS = ['kick', 'snare', 'clap', 'cymbal'];
export const STORAGE_KEY = 'voidchop.kit.swaps';
const MAX_PERSIST_BYTES = 1.5 * 1024 * 1024;
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const BASE_URL = `${BASE}kits/909/`;

function toBase64(ab) {
  const u = new Uint8Array(ab);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}

function assertPad(pad) {
  if (!PADS.includes(pad)) throw new Error(`Unknown pad: ${pad}`);
}

export class DrumKit {
  constructor() {
    this.buffers = Object.fromEntries(PADS.map((p) => [p, null]));
    this.swaps = {}; // pad -> raw ArrayBuffer (session)
  }

  async loadDefaults() {
    await Promise.allSettled(PADS.map(async (pad) => {
      const res = await fetch(`${BASE_URL}${pad}.wav`);
      if (!res.ok) throw new Error(`Failed to load ${pad}.wav`);
      this.buffers[pad] = await decodeSample(await res.arrayBuffer());
    }));
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { saved = {}; }
    let dropped = false;
    for (const pad of PADS) {
      if (typeof saved[pad] !== 'string') continue;
      try {
        const raw = fromBase64(saved[pad]);
        const buffer = await decodeSample(raw);
        this.swaps[pad] = raw;
        this.buffers[pad] = buffer;
      } catch {
        dropped = true; // corrupt swap: keep default buffer
      }
    }
    if (dropped) this._persist();
  }

  trigger(pad) {
    assertPad(pad);
    const buffer = this.buffers[pad];
    if (!buffer) return;
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  }

  async swapPad(pad, arrayBuffer) {
    assertPad(pad);
    this.buffers[pad] = await decodeSample(arrayBuffer);
    this.swaps[pad] = arrayBuffer.slice(0);
    this._persist();
  }

  getBuffer(pad) {
    return this.buffers[pad] ?? null;
  }

  _persist() {
    const total = Object.values(this.swaps).reduce((n, b) => n + b.byteLength, 0);
    try {
      if (total >= MAX_PERSIST_BYTES) { localStorage.removeItem(STORAGE_KEY); return; }
      const out = {};
      for (const [pad, b] of Object.entries(this.swaps)) out[pad] = toBase64(b);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch { /* quota/unavailable: session-only */ }
  }
}
