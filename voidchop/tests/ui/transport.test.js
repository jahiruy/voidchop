// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
const fake = { state: 'running' };
vi.mock('../../src/audio/context.js', () => ({ getAudioContext: () => fake }));
import { mountTransport } from '../../src/ui/transport.js';

describe('transport', () => {
  let el, o, playing;
  beforeEach(() => {
    fake.state = 'running'; playing = false;
    el = document.createElement('div');
    o = { getBpm: () => 130, setBpm: vi.fn(), onPlay: vi.fn(() => { playing = true; }), onStop: vi.fn(() => { playing = false; }), getPlaying: () => playing, getBar: () => 3 };
  });
  it('renders play/stop, bpm 130 default, bar readout', () => {
    mountTransport(el, { ...o, getBpm: undefined });
    expect(el.querySelector('[data-role=play]')).not.toBeNull();
    expect(el.querySelector('[data-role=stop]')).not.toBeNull();
    expect(el.querySelector('[data-role=bpm]').value).toBe('130');
    mountTransport(el, o);
    expect(el.querySelector('[data-role=bar]').textContent).toContain('3');
  });
  it('bpm change calls setBpm', () => {
    mountTransport(el, o);
    const i = el.querySelector('[data-role=bpm]');
    i.value = '140'; i.dispatchEvent(new Event('change'));
    expect(o.setBpm).toHaveBeenCalledWith(140);
  });
  it('play/stop call handlers when running', () => {
    mountTransport(el, o);
    el.querySelector('[data-role=play]').click();
    expect(o.onPlay).toHaveBeenCalled();
    el.querySelector('[data-role=stop]').click();
    expect(o.onStop).toHaveBeenCalled();
  });
  it('play blocked with toast when ctx not running', () => {
    fake.state = 'suspended';
    mountTransport(el, o);
    el.querySelector('[data-role=play]').click();
    expect(o.onPlay).not.toHaveBeenCalled();
    expect(el.querySelector('.toast')).not.toBeNull();
  });
});
