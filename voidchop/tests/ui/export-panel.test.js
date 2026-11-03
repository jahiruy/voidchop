// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/audio/zip-bundler.js', () => ({ buildExportZip: vi.fn(async () => new Blob(['z'])) }));
import { buildExportZip } from '../../src/audio/zip-bundler.js';
import { mountExportPanel } from '../../src/ui/export-panel.js';

const flush = () => new Promise((r) => setTimeout(r));
const buf = (n = 4410) => { const d = new Float32Array(n); return { length: n, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => d }; };

describe('export panel', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('div'); document.body.appendChild(el);
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
    buildExportZip.mockClear();
  });
  it('disabled with message when empty', () => {
    mountExportPanel(el, { getSlices: () => [] });
    expect(el.querySelector('button').disabled).toBe(true);
    expect(el.textContent).toMatch(/Load a sample/);
  });
  it('builds zip with named slices and downloads', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mountExportPanel(el, { getSlices: () => [{ buffer: buf(), startSec: 0, endSec: 0.05 }, { buffer: buf() }],
      getKitBuffers: () => [{ name: 'kick', buffer: buf() }], bitDepth: 16 });
    el.querySelector('button').click(); await flush();
    const files = buildExportZip.mock.calls[0][0];
    expect(files.map((f) => f.name)).toEqual(['slice_01.wav', 'slice_02.wav', 'kit/kick.wav']);
    expect(new DataView(files[0].data).getUint16(34, true)).toBe(16);
    expect(new DataView(files[0].data).getUint32(40, true)).toBe(2205 * 2);
    expect(click).toHaveBeenCalled();
  });
  it('24-bit default', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mountExportPanel(el, { getSlices: () => [{ buffer: buf() }] });
    el.querySelector('button').click(); await flush();
    expect(new DataView(buildExportZip.mock.calls[0][0][0].data).getUint16(34, true)).toBe(24);
  });
});
