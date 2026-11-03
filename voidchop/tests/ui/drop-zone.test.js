// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/audio/context.js', () => ({ unlockAudio: vi.fn(async () => {}) }));
import { unlockAudio } from '../../src/audio/context.js';
import { mountDropZone, isSupportedFile } from '../../src/ui/drop-zone.js';

const drop = (el, files) => {
  const e = new Event('drop', { bubbles: true, cancelable: true });
  e.dataTransfer = { files };
  el.dispatchEvent(e);
};
const flush = () => new Promise((r) => setTimeout(r));

describe('drop zone', () => {
  let el, onFile;
  beforeEach(() => { el = document.createElement('div'); onFile = vi.fn(); unlockAudio.mockClear(); });

  it('fires onFile for a dropped wav and unlocks audio once', async () => {
    mountDropZone(el, { onFile });
    const f = new File(['x'], 'kick.wav', { type: 'audio/wav' });
    drop(el, [f]); drop(el, [f]);
    await flush();
    expect(onFile).toHaveBeenCalledWith(f);
    expect(unlockAudio).toHaveBeenCalledTimes(1);
  });

  it('skips unsupported types', () => {
    mountDropZone(el, { onFile });
    drop(el, [new File(['x'], 'a.txt', { type: 'text/plain' })]);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('fires onFile from file input change', () => {
    const { input } = mountDropZone(el, { onFile });
    const f = new File(['x'], 'loop.aiff');
    Object.defineProperty(input, 'files', { value: [f], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(onFile).toHaveBeenCalledWith(f);
  });

  it('click unlocks audio', async () => {
    mountDropZone(el, { onFile });
    el.click(); await flush();
    expect(unlockAudio).toHaveBeenCalled();
  });

  it('accepts by extension or mime', () => {
    expect(isSupportedFile({ name: 'a.MP3', type: '' })).toBe(true);
    expect(isSupportedFile({ name: 'a', type: 'audio/mpeg' })).toBe(true);
    expect(isSupportedFile({ name: 'a.aif', type: '' })).toBe(true);
    expect(isSupportedFile({ name: 'a.ogg', type: 'audio/ogg' })).toBe(false);
  });
});
