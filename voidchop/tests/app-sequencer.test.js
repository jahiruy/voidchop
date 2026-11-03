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
});
