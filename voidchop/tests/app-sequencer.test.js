// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const node = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, frequency: { value: 0, setValueAtTime() {} }, Q: { value: 0 }, playbackRate: { value: 1 } });
class FakeAC { constructor() { this.state = 'running'; this.currentTime = 0; this.destination = node(); }
  createGain() { return node(); } createOscillator() { return node(); } createBiquadFilter() { return node(); } createBufferSource() { return node(); }
  resume() { return Promise.resolve(); } addEventListener() {} }

describe('bootApp sequencer wiring', () => {
  let app, root;
  beforeEach(async () => {
    vi.resetModules();
    window.AudioContext = FakeAC;
    globalThis.fetch = vi.fn(async () => ({ ok: false }));
    globalThis.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = vi.fn();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app');
    const { bootApp } = await import('../src/app.js');
    app = bootApp(root);
  });
  it('mounts transport and session strip', () => {
    expect(root.querySelector('.vc-transport [data-role=play]')).not.toBeNull();
    expect(root.querySelector('.vc-sessionStrip .ss-cell')).not.toBeNull();
    expect(app.state.pattern.bpm).toBe(130);
  });
  it('toggling a cell updates state.pattern, enables export, and undo reverts', () => {
    expect(root.querySelector('[data-role=export]').disabled).toBe(true);
    root.querySelector('[data-pad="kick"][data-step="0"]').click();
    expect(app.state.pattern.drums.kick[0]).toBe(true);
    expect(root.querySelector('[data-role=export]').disabled).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    expect(app.state.pattern.drums.kick[0]).toBe(false);
  });
  it('play + frame sets glow vars and playhead', () => {
    root.querySelector('[data-role=play]').click();
    expect(app.clock.isPlaying()).toBe(true);
    app.frame();
    expect(document.documentElement.style.getPropertyValue('--vc-playing')).toBe('1');
    expect(root.querySelectorAll('.ss-cell.playhead').length).toBe(4);
    root.querySelector('[data-role=stop]').click();
    app.frame();
    expect(document.documentElement.style.getPropertyValue('--vc-playing')).toBe('0');
  });
  it('waveform click arms chop; lane click places it once (no window global)', () => {
    app.state.buffer = { duration: 1, length: 44100, sampleRate: 44100 };
    app.state.bufferId = 'b1';
    const cv = app.waveform.canvas;
    cv.getBoundingClientRect = () => ({ left: 0, width: 100 });
    cv.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, bubbles: true }));
    cv.dispatchEvent(new MouseEvent('click', { clientX: 10, bubbles: true }));
    expect(window.__voidchopPendingChop).toBeUndefined();
    const lane = root.querySelector('.ss-lane');
    lane.getBoundingClientRect = () => ({ left: 0, width: 320 });
    lane.dispatchEvent(new MouseEvent('click', { clientX: 100, bubbles: true }));
    expect(app.state.pattern.vocals).toHaveLength(1);
    expect(app.state.pattern.vocals[0]).toMatchObject({ bufferId: 'b1', startStep: 10 });
    const lane2 = root.querySelector('.ss-lane');
    lane2.getBoundingClientRect = () => ({ left: 0, width: 320 });
    lane2.dispatchEvent(new MouseEvent('click', { clientX: 200, bubbles: true }));
    expect(app.state.pattern.vocals).toHaveLength(1);
  });
  it('frame step changes update playhead without rebuilding strip DOM', () => {
    const cell = root.querySelector('[data-pad="kick"][data-step="0"]');
    root.querySelector('[data-role=play]').click();
    app.frame();
    expect(root.querySelector('[data-pad="kick"][data-step="0"]')).toBe(cell);
    expect(cell.classList.contains('playhead')).toBe(true);
  });
});
