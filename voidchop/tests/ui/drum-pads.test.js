// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountDrumPads } from '../../src/ui/drum-pads.js';

const flush = () => new Promise((r) => setTimeout(r));
const drop = (el, files) => {
  const e = new Event('drop', { bubbles: true, cancelable: true });
  e.dataTransfer = { files };
  el.dispatchEvent(e);
};

describe('drum pads', () => {
  let el, kit;
  beforeEach(() => {
    el = document.createElement('div');
    kit = { trigger: vi.fn(), swapPad: vi.fn(async () => {}) };
    mountDrumPads(el, kit);
  });

  it('renders Kick/Snare/Clap/Cymbal labels', () => {
    expect([...el.querySelectorAll('.pad-label')].map((n) => n.textContent))
      .toEqual(['Kick', 'Snare', 'Clap', 'Cymbal']);
  });

  it('cymbal pad has an SVG cymbal icon, no hat/fedora', () => {
    const svg = el.querySelector('[data-pad="cymbal"] svg.cymbal-icon');
    expect(svg).not.toBeNull();
    expect(el.innerHTML).not.toMatch(/hat|fedora|🎩|👒/i);
  });

  it('click triggers the pad', () => {
    el.querySelector('[data-pad="snare"]').click();
    expect(kit.trigger).toHaveBeenCalledWith('snare');
  });

  it('dropping a wav swaps the pad', async () => {
    const f = { name: 'x.wav', type: 'audio/wav', arrayBuffer: async () => new ArrayBuffer(3) };
    drop(el.querySelector('[data-pad="clap"]'), [f]);
    await flush();
    expect(kit.swapPad).toHaveBeenCalledTimes(1);
    expect(kit.swapPad.mock.calls[0][0]).toBe('clap');
    expect(kit.swapPad.mock.calls[0][1].byteLength).toBe(3);
  });

  it('ignores non-wav drops', async () => {
    drop(el.querySelector('[data-pad="kick"]'), [new File(['x'], 'a.txt', { type: 'text/plain' })]);
    await flush();
    expect(kit.swapPad).not.toHaveBeenCalled();
  });
});
