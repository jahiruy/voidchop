import { describe, it, expect, beforeEach } from 'vitest';
import { MoogSub } from '../../src/audio/moog-sub.js';

const param = (v = 0) => ({ value: v, calls: [],
  setValueAtTime(x, t) { this.calls.push(['set', x, t]); this.value = x; },
  linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]); this.value = x; },
  setTargetAtTime(x, t, c) { this.calls.push(['target', x, t, c]); this.value = x; },
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); } });
const node = (extra) => ({ connected: [], connect(n) { this.connected.push(n); return n; }, disconnect() {}, ...extra });

class FakeCtx {
  constructor() { this.currentTime = 1; this.destination = node(); this.oscs = []; this.filters = []; this.gains = []; }
  createOscillator() { const o = node({ type: 'sine', frequency: param(440), started: null, stopped: null,
    start(t) { this.started = t; }, stop(t) { this.stopped = t; } }); this.oscs.push(o); return o; }
  createBiquadFilter() { const f = node({ type: 'lowpass', frequency: param(350), Q: param(1) }); this.filters.push(f); return f; }
  createGain() { const g = node({ gain: param(1) }); this.gains.push(g); return g; }
}

describe('MoogSub', () => {
  let ctx, s;
  beforeEach(() => { ctx = new FakeCtx(); s = new MoogSub(ctx); });

  it('noteOn builds saw -> lowpass -> gain -> destination at midi pitch', () => {
    s.noteOn(33);
    const [o] = ctx.oscs, [f] = ctx.filters;
    const g = ctx.gains.at(-1);
    expect(o.type).toBe('sawtooth');
    expect(o.frequency.value).toBeCloseTo(55, 3);
    expect(f.type).toBe('lowpass');
    expect(o.connected).toContain(f);
    expect(f.connected).toContain(g);
    expect(g.connected.length).toBe(1);
    expect(o.started).toBe(1);
    expect(g.gain.calls.some(c => c[0] === 'lin' && c[1] === 1)).toBe(true);
  });

  it('knobs map to filter params', () => {
    s.setCutoff(0); s.setResonance(1); s.noteOn(40);
    expect(ctx.filters[0].frequency.value).toBeLessThan(100);
    expect(ctx.filters[0].Q.value).toBeGreaterThan(10);
    s.setCutoff(1); s.noteOn(41);
    expect(ctx.filters[1].frequency.value).toBeGreaterThan(5000);
  });

  it('noteOff releases and stops the voice; unknown note is a no-op', () => {
    s.noteOn(36);
    ctx.currentTime = 2;
    s.noteOff(36);
    const g = ctx.gains.at(-1);
    expect(g.gain.calls.at(-1)[0]).toBe('target');
    expect(g.gain.calls.at(-1)[1]).toBe(0);
    expect(ctx.oscs[0].stopped).toBeGreaterThan(2);
    expect(() => s.noteOff(99)).not.toThrow();
  });

  it('decay knob lengthens decay; values clamp', () => {
    s.setDecay(5); expect(s.decay).toBe(1);
    s.setDecay(-1); expect(s.decay).toBe(0);
  });
});
