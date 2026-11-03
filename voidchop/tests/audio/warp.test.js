import { describe, it, expect } from 'vitest';
import { autoWarp, segmentPlaybackRate, markersForBpmChange } from '../../src/audio/warp.js';

describe('Warp', () => {
  it('autoWarp bookends slice across timeline beats', () => {
    const m = autoWarp({ sliceIn: 0, sliceOut: 2, lengthSteps: 4, bpm: 130 });
    expect(m[0]).toEqual({ bufferTime: 0, timelineBeat: 0 });
    expect(m[1].timelineBeat).toBe(8); // 4 steps * 2 beats
  });

  it('segmentPlaybackRate stretches buffer into timeline at bpm', () => {
    const a = { bufferTime: 0, timelineBeat: 0 };
    const b = { bufferTime: 1, timelineBeat: 2 }; // 2 beats at 120bpm = 1.0s → rate 1
    expect(segmentPlaybackRate(a, b, 120)).toBeCloseTo(1);
    expect(segmentPlaybackRate(a, b, 60)).toBeCloseTo(0.5);
  });

  it('markersForBpmChange is identity (markers are in beats)', () => {
    const m = [{ bufferTime: 0, timelineBeat: 0 }, { bufferTime: 1, timelineBeat: 2 }];
    expect(markersForBpmChange(m)).toEqual(m);
  });
});
