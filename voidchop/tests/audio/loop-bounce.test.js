import { describe, it, expect, vi } from 'vitest';
import { bounceLoop, patternHasContent } from '../../src/audio/loop-bounce.js';
import { createPatternState, toggleStep, loopDurationSec } from '../../src/audio/pattern-state.js';

class FakeOffline {
  constructor(ch, length, sampleRate) { Object.assign(this, { ch, length, sampleRate }); this.starts = []; this.destination = {}; FakeOffline.last = this; }
  createBufferSource() { const self = this; return { buffer: null, playbackRate: { value: 1 }, connect() {}, start(...a) { self.starts.push(a); } }; }
  async startRendering() { return { numberOfChannels: this.ch, length: this.length, sampleRate: this.sampleRate, duration: this.length / this.sampleRate }; }
}

describe('bounceLoop', () => {
  it('renders one loop of correct duration and schedules drum hits', async () => {
    globalThis.OfflineAudioContext = FakeOffline;
    let st = toggleStep(createPatternState(), 'kick', 0);
    st = toggleStep(st, 'kick', 4);
    const kit = { trigger: vi.fn((pad, when, out) => out.ctx.createBufferSource().start(when)) };
    const buf = await bounceLoop({ state: st, kit, getBuffer: () => null });
    expect(buf.duration).toBeCloseTo(loopDurationSec(130), 3);
    expect(buf.numberOfChannels).toBeGreaterThanOrEqual(1);
    expect(kit.trigger).toHaveBeenCalledTimes(2);
    expect(kit.trigger.mock.calls[0][2].ctx).toBe(FakeOffline.last);
    expect(patternHasContent(st)).toBe(true);
    expect(patternHasContent(createPatternState())).toBe(false);
  });
});
