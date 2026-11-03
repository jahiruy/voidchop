import { describe, it, expect } from 'vitest';
import {
  BARS, TOTAL_STEPS, DEFAULT_BPM, STEP_BEATS,
  stepDurationSec, loopDurationSec,
  createPatternState, toggleStep, addClip, setBpm, pushUndo, undo,
} from '../../src/audio/pattern-state.js';
import { PADS } from '../../src/audio/drum-kit.js';

describe('PatternState', () => {
  it('locks 16 bars / 32 steps / default 130 / STEP_BEATS 2', () => {
    expect(BARS).toBe(16);
    expect(TOTAL_STEPS).toBe(32);
    expect(DEFAULT_BPM).toBe(130);
    expect(STEP_BEATS).toBe(2);
    expect(loopDurationSec(130)).toBeCloseTo(16 * 4 * (60 / 130));
    expect(stepDurationSec(130)).toBeCloseTo((60 / 130) * 2);
  });

  it('toggleStep flips a pad cell and supports single-level undo', () => {
    let s = createPatternState();
    PADS.forEach((p) => expect(s.drums[p]).toHaveLength(32));
    s = pushUndo(s);
    s = toggleStep(s, 'kick', 0);
    expect(s.drums.kick[0]).toBe(true);
    s = undo(s);
    expect(s.drums.kick[0]).toBe(false);
  });

  it('addClip snaps startStep and attaches autoWarp markers', () => {
    let s = createPatternState();
    s = addClip(s, {
      bufferId: 'b1',
      startStep: 1.4,
      lengthSteps: 4,
      slice: { in: 0, out: 1 },
    });
    expect(s.vocals[0].startStep).toBe(1);
    expect(s.vocals[0].warpMarkers.length).toBeGreaterThanOrEqual(2);
    s = setBpm(s, 140);
    expect(s.bpm).toBe(140);
  });
});
