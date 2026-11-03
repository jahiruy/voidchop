// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/audio/transient-detector.js', () => ({ detectTransients: vi.fn((b, s) => (s > 0.7 ? [0, 0.2, 0.4, 0.6] : [0, 0.5])) }));
import { detectTransients } from '../../src/audio/transient-detector.js';
import { mountWaveform } from '../../src/ui/waveform-view.js';

const buf = { length: 44100, sampleRate: 44100, duration: 1, numberOfChannels: 1, getChannelData: () => new Float32Array(44100) };
const ctx = { clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), strokeStyle: '' };
const ptr = (el, type, x) => el.dispatchEvent(Object.assign(new Event(type), { clientX: x, pointerId: 1 }));

describe('waveform view', () => {
  let el, onMarkersChange, api;
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = () => ctx;
    el = document.createElement('div'); onMarkersChange = vi.fn();
    api = mountWaveform(el, { onMarkersChange });
    api.canvas.getBoundingClientRect = () => ({ left: 0, width: 1000 });
  });

  it('setBuffer runs detector, draws cyan, emits', () => {
    api.setBuffer(buf);
    expect(api.getMarkers()).toEqual([0, 0.5]);
    expect(onMarkersChange).toHaveBeenCalledWith([0, 0.5]);
    expect(ctx.strokeStyle).toBeTruthy();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('setMarkers sorts, keeps 0, enforces min gap', () => {
    api.setBuffer(buf);
    api.setMarkers([0.3, 0.32, 0.1, 2]);
    expect(api.getMarkers()).toEqual([0, 0.1, 0.3, 1]);
    api.setMarkers([]);
    expect(api.getMarkers()).toEqual([0]);
  });

  it('sensitivity slider re-runs detection', () => {
    api.setBuffer(buf);
    api.slider.value = '0.9';
    api.slider.dispatchEvent(new Event('input'));
    expect(detectTransients).toHaveBeenLastCalledWith(buf, 0.9);
    expect(api.getMarkers()).toEqual([0, 0.2, 0.4, 0.6]);
  });

  it('drags a marker clamped by neighbors; 0 is fixed', () => {
    api.setBuffer(buf);
    api.setMarkers([0, 0.2, 0.4]);
    onMarkersChange.mockClear();
    ptr(api.canvas, 'pointerdown', 200); ptr(api.canvas, 'pointermove', 390); ptr(api.canvas, 'pointerup', 390);
    expect(api.getMarkers()[1]).toBeCloseTo(0.35);
    expect(onMarkersChange).toHaveBeenCalledTimes(1);
    ptr(api.canvas, 'pointerdown', 0); ptr(api.canvas, 'pointermove', 500); ptr(api.canvas, 'pointerup', 500);
    expect(api.getMarkers()[0]).toBe(0);
  });
});
