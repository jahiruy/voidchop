// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountSessionStrip } from '../../src/ui/session-strip.js';
import { createPatternState, addClip, TOTAL_STEPS } from '../../src/audio/pattern-state.js';
import { PADS } from '../../src/audio/drum-kit.js';

describe('session strip', () => {
  let el, state, api;
  beforeEach(() => {
    el = document.createElement('div'); state = createPatternState(); delete window.__voidchopPendingChop;
    api = mountSessionStrip(el, { getState: () => state, setState: (s) => { state = s; }, getCurrentStep: () => 3 });
  });
  it('renders 4 pad rows x 32 columns', () => {
    for (const p of PADS) expect(el.querySelectorAll(`[data-pad="${p}"][data-step]`)).toHaveLength(TOTAL_STEPS);
    expect(el.querySelectorAll('.ss-cell.playhead')).toHaveLength(PADS.length);
  });
  it('click toggles step with undo', () => {
    el.querySelector('[data-pad="snare"][data-step="5"]').click();
    expect(state.drums.snare[5]).toBe(true);
    expect(state._undo.drums.snare[5]).toBe(false);
    expect(el.querySelector('[data-pad="snare"][data-step="5"]').classList.contains('on')).toBe(true);
  });
  it('clip appears after addClip', () => {
    state = addClip(state, { bufferId: 'b', startStep: 4, lengthSteps: 6, slice: { in: 0, out: 1 } });
    api.render();
    const c = el.querySelector('.ss-clip');
    expect(c).not.toBeNull();
    expect(c.dataset.start).toBe('4'); expect(c.dataset.length).toBe('6');
  });
  it('lane click places pending chop, ignores otherwise', () => {
    const lane = el.querySelector('.ss-lane');
    lane.getBoundingClientRect = () => ({ left: 0, width: 320 });
    lane.dispatchEvent(new MouseEvent('click', { clientX: 100, bubbles: true }));
    expect(state.vocals).toHaveLength(0);
    window.__voidchopPendingChop = { bufferId: 'b', slice: { in: 0, out: 0.5 }, lengthSteps: 2 };
    el.querySelector('.ss-lane').getBoundingClientRect = () => ({ left: 0, width: 320 });
    el.querySelector('.ss-lane').dispatchEvent(new MouseEvent('click', { clientX: 100, bubbles: true }));
    expect(state.vocals[0].startStep).toBe(10);
  });
  it('right-edge drag survives re-render; single undo; no trailing select', () => {
    let selected = null;
    el = document.createElement('div');
    state = addClip(createPatternState(), { bufferId: 'b', startStep: 4, lengthSteps: 2, slice: { in: 0, out: 1 } });
    mountSessionStrip(el, { getState: () => state, setState: (s) => { state = s; }, onSelectClip: (id) => { selected = id; } });
    el.querySelector('.ss-lane').getBoundingClientRect = () => ({ left: 0, width: 320 });
    const before = state;
    el.querySelector('.ss-edge-r').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 85 }));
    expect(state.vocals[0].lengthSteps).toBe(5);
    const afterFirst = state._undo;
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 125 }));
    expect(state.vocals[0].lengthSteps).toBe(9);
    expect(state.vocals[0].startStep).toBe(4);
    expect(state._undo).toBe(afterFirst);
    expect(state._undo.vocals[0].lengthSteps).toBe(before.vocals[0].lengthSteps);
    window.dispatchEvent(new MouseEvent('pointerup'));
    el.querySelector('.ss-clip').click();
    expect(selected).toBeNull();
    el.querySelector('.ss-clip').click();
    expect(selected).toBe(state.vocals[0].id);
  });
});
