import { describe, it, expect } from 'vitest';
import { createPatternState, toggleStep, addClip, stepDurationSec } from '../../src/audio/pattern-state.js';
import { createScheduler } from '../../src/audio/scheduler.js';

describe('Scheduler', () => {
  it('schedules kick at step times', () => {
    let state = createPatternState();
    state = toggleStep(state, 'kick', 0);
    state = toggleStep(state, 'kick', 2);
    const calls = [];
    const kit = { trigger: (pad, when) => calls.push({ pad, when }) };
    const sched = createScheduler({ getState: () => state, kit, getBuffer: () => null, lookAheadSec: 10 });
    const origin = 100;
    sched.start(origin);
    sched.onTick(origin + 0.001);
    expect(calls.some((c) => c.pad === 'kick' && Math.abs(c.when - origin) < 1e-6)).toBe(true);
    const n = calls.length;
    sched.onTick(origin + 0.002);
    expect(calls.length).toBe(n); // dedup
    const at2 = origin + 2 * stepDurationSec(state.bpm);
    expect(calls.some((c) => Math.abs(c.when - at2) < 1e-6)).toBe(stepDurationSec(state.bpm) * 2 <= 10.001);
  });

  it('schedules vocal segments with warp playbackRate', () => {
    let state = addClip(createPatternState(), { bufferId: 'b', startStep: 0, lengthSteps: 1, slice: { in: 0, out: 1 } });
    const started = [];
    const ctx = { destination: {}, createBufferSource: () => { const s = { playbackRate: { value: 1 }, connect() {}, start: (w, o, d) => started.push({ s, w, o, d }) }; return s; } };
    const sched = createScheduler({ getState: () => state, kit: { trigger() {} }, getBuffer: () => ({}), lookAheadSec: 0.1, ctx });
    sched.start(5);
    sched.onTick(5);
    expect(started.length).toBe(1);
    expect(started[0].s.playbackRate.value).toBeCloseTo(1 / stepDurationSec(130), 6);
  });
});
