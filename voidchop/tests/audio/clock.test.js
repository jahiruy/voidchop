import { describe, it, expect } from 'vitest';
import { createClock } from '../../src/audio/clock.js';
import { loopDurationSec, stepDurationSec, TOTAL_STEPS } from '../../src/audio/pattern-state.js';

describe('Clock', () => {
  it('play advances steps; stop resets to 0', () => {
    const steps = [];
    const clock = createClock({ getBpm: () => 130, onStep: (i) => steps.push(i) });
    expect(clock.isPlaying()).toBe(false);
    clock.play(0);
    const stepDur = stepDurationSec(130);
    clock.tick(stepDur * 2.1);
    expect(clock.currentStep()).toBe(2);
    expect(steps.length).toBeGreaterThan(0);
    clock.stop();
    expect(clock.isPlaying()).toBe(false);
    expect(clock.currentStep()).toBe(0);
  });

  it('phase wraps over one loop', () => {
    const clock = createClock({ getBpm: () => 130, onStep: () => {} });
    clock.play(0);
    const loop = loopDurationSec(130);
    clock.tick(loop + 0.001);
    expect(clock.phase01()).toBeGreaterThanOrEqual(0);
    expect(clock.phase01()).toBeLessThan(1);
    expect(clock.currentStep()).toBeLessThan(TOTAL_STEPS);
  });
});
