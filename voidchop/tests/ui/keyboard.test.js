// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { blackKeyPattern, mountKeyboard } from '../../src/ui/keyboard.js';

describe('blackKeyPattern', () => {
  it('one octave: black keys at offsets 1,3,6,8,10 only (2 then 3)', () => {
    const p = blackKeyPattern(1);
    expect(p).toHaveLength(12);
    expect(p.map((b, i) => (b ? i : -1)).filter((i) => i >= 0)).toEqual([1, 3, 6, 8, 10]);
  });
  it('two octaves repeat pattern, 24 keys, 10 black', () => {
    const p = blackKeyPattern(2);
    expect(p).toHaveLength(24);
    expect(p.slice(12)).toEqual(p.slice(0, 12));
    expect(p.filter(Boolean)).toHaveLength(10);
  });
  it('no black key between E-F or B-C', () => {
    const p = blackKeyPattern(1);
    expect(p[4]).toBe(false); expect(p[5]).toBe(false); expect(p[11]).toBe(false); expect(p[0]).toBe(false);
  });
});

describe('mountKeyboard', () => {
  it('renders 14 white + 10 black with correct MIDI, and plays on pointer events', () => {
    const el = document.createElement('div');
    const moog = { noteOn: vi.fn(), noteOff: vi.fn() };
    mountKeyboard(el, moog);
    const keys = [...el.querySelectorAll('[data-midi]')];
    expect(keys).toHaveLength(24);
    const black = keys.filter((k) => k.classList.contains('black')).map((k) => +k.dataset.midi);
    expect(black).toEqual([37, 39, 42, 44, 46, 49, 51, 54, 56, 58]);
    expect(el.querySelectorAll('.white')).toHaveLength(14);
    const cs = el.querySelector('[data-midi="37"]');
    cs.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(moog.noteOn).toHaveBeenCalledWith(37);
    cs.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect(moog.noteOff).toHaveBeenCalledWith(37);
  });

  it('non-C startMidi (40 = E): black keys follow MIDI pitch class', () => {
    const el = document.createElement('div');
    mountKeyboard(el, { noteOn() {}, noteOff() {} }, { startMidi: 40, octaves: 1 });
    const keys = [...el.querySelectorAll('[data-midi]')];
    expect(keys.map((k) => +k.dataset.midi)).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]);
    const black = keys.filter((k) => k.classList.contains('black')).map((k) => +k.dataset.midi);
    expect(black).toEqual([42, 44, 46, 49, 51]);
    expect(el.querySelectorAll('.white')).toHaveLength(7);
    // first key E is white; F# black sits after E,F (2 whites)
    expect(keys[0].classList.contains('white')).toBe(true);
    expect(el.querySelector('[data-midi="42"]').style.left).toMatch(/^2\d\.\d+%|^2[0-9.]*%/);
  });
  it('blackKeyPattern(1, 40) matches E-based pitch classes', () => {
    expect(blackKeyPattern(1, 40).map((b, i) => (b ? 40 + i : -1)).filter((m) => m >= 0)).toEqual([42, 44, 46, 49, 51]);
  });
});
