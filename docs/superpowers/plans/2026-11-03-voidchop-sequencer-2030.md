# VOIDCHOP Sequencer + 2030 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 16-bar session strip (stock 909 step grid + warped vocal clips), master tempo default 130 BPM, alien soft-pulse lighting, and redeploy GitHub Pages.

**Architecture:** Extend the existing Vite + Web Audio app. New `PatternState` + `Clock` + `Warp` + `Scheduler` drive playback. `SessionStripUI` + `Transport` + extended waveform edit clips. `DrumKit.trigger(pad, when, out)` schedules hits (also used for offline bounce). CSS glow follows transport phase. No backend; session-only memory.

**Tech Stack:** Vite, vanilla ES modules, Web Audio API, JSZip, Vitest, existing VOIDCHOP modules.

**Spec:** `docs/superpowers/specs/2026-11-03-voidchop-sequencer-2030-design.md`

## Global Constraints

- Master tempo default **130 BPM** (editable)
- Loop: **16 bars**, **32 steps** total (`stepsPerBar: 2`) — each step spans **2 beats** (half-note columns). Jay called this "8th notes (32 steps)"; do **not** expand to 128 true-eighth steps in this pass
- Loop length seconds: `16 * 4 * (60 / bpm)`
- Drum lanes: stock 909 only — `PADS = ['kick','snare','clap','cymbal']`
- Stop returns playhead to start
- Single-level undo for last grid/clip edit
- Glow / pulse: `pointer-events: none` (must not block clicks)
- Session-only pattern memory (no cloud / localStorage pattern save)
- Pure browser; Pages base `/voidchop/`
- YAGNI: no multi-track arrangement beyond one loop, no 16th/triplet grids, no clip automation envelopes beyond warp

## Timing note (locked)

`TOTAL_STEPS = 32`, `BARS = 16`, `STEPS_PER_BAR = 2`, `STEP_BEATS = 2`.  
`stepDurationSec(bpm) = (60 / bpm) * STEP_BEATS`.  
`loopDurationSec(bpm) = 16 * 4 * (60 / bpm)`.

## File Map

```
voidchop/
  src/
    audio/
      pattern-state.js     # NEW
      clock.js             # NEW
      warp.js              # NEW (autoWarp + segment rates)
      scheduler.js         # NEW
      loop-bounce.js       # NEW offline one-loop render
      drum-kit.js          # MODIFY trigger(pad, when?, out?)
    ui/
      transport.js         # NEW
      session-strip.js     # NEW
      toast.js             # NEW
      waveform-view.js     # MODIFY warp markers
      theme-shell.js       # MODIFY regions + glow hook
    styles/
      pulse.css            # MODIFY beat-locked alien glow
      shell.css            # MODIFY strip/transport layout
    app.js                 # MODIFY wire transport/strip/scheduler/export
  tests/
    audio/
      pattern-state.test.js
      clock.test.js
      warp.test.js
      scheduler.test.js
      loop-bounce.test.js
      drum-kit.test.js     # extend
    ui/
      transport.test.js
      session-strip.test.js
      toast.test.js
      waveform-view.test.js  # extend
      theme-shell.test.js    # extend regions
```

### Spec coverage

| Spec requirement | Task |
|------------------|------|
| PatternState drums + vocals + BPM | 1 |
| Clock / 16-bar loop / stop→start | 2 |
| Warp auto-warp on drop; BPM remaps | 3 |
| Scheduled 909 hits | 4–5 |
| Offline bounce one loop in export | 6 |
| Errors → toast; audio unlock gate | 7 |
| Session strip UI | 8 |
| Waveform in/out + warp drag | 9 |
| Alien soft pulse / glow | 10 |
| App wiring + undo | 11 |
| Pages rebuild + deploy | 12 |

---

### Task 1: PatternState + timing constants + undo

**Files:**
- Create: `voidchop/src/audio/warp.js` (minimal `autoWarp` used by `addClip`)
- Create: `voidchop/src/audio/pattern-state.js`
- Test: `voidchop/tests/audio/pattern-state.test.js`

**Interfaces:**
- Consumes: nothing external
- Produces:
  - `BARS=16`, `STEPS_PER_BAR=2`, `TOTAL_STEPS=32`, `STEP_BEATS=2`, `DEFAULT_BPM=130`
  - `stepDurationSec(bpm)`, `loopDurationSec(bpm)`
  - `createPatternState()`, `toggleStep(state, pad, step)`, `addClip(state, clipInput)`, `updateClip(state, id, patch)`, `removeClip(state, id)`, `setBpm(state, bpm)`, `pushUndo(state)`, `undo(state)`
  - `autoWarp({ sliceIn, sliceOut, lengthSteps, bpm }) → warpMarkers[]`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd voidchop && npm test -- tests/audio/pattern-state.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

`voidchop/src/audio/warp.js`:
```js
export function autoWarp({ sliceIn, sliceOut, lengthSteps, bpm }) {
  const dur = Math.max(1e-6, sliceOut - sliceIn);
  const timelineBeats = lengthSteps * 2; // STEP_BEATS
  return [
    { bufferTime: sliceIn, timelineBeat: 0 },
    { bufferTime: sliceOut, timelineBeat: timelineBeats },
  ];
}

/** playbackRate for a segment so buffer Δt maps to timeline Δbeats at bpm */
export function segmentPlaybackRate(markerA, markerB, bpm) {
  const bufDt = markerB.bufferTime - markerA.bufferTime;
  const beatDt = markerB.timelineBeat - markerA.timelineBeat;
  if (bufDt <= 0 || beatDt <= 0) return 1;
  const timelineSec = beatDt * (60 / bpm);
  return bufDt / timelineSec;
}
```

`voidchop/src/audio/pattern-state.js`:
```js
import { PADS } from './drum-kit.js';
import { autoWarp } from './warp.js';

export const BARS = 16;
export const STEPS_PER_BAR = 2;
export const TOTAL_STEPS = BARS * STEPS_PER_BAR; // 32
export const STEP_BEATS = 2;
export const DEFAULT_BPM = 130;

export function stepDurationSec(bpm) {
  return (60 / bpm) * STEP_BEATS;
}
export function loopDurationSec(bpm) {
  return BARS * 4 * (60 / bpm);
}

function emptyDrums() {
  return Object.fromEntries(PADS.map((p) => [p, Array(TOTAL_STEPS).fill(false)]));
}

export function createPatternState() {
  return { bpm: DEFAULT_BPM, bars: BARS, stepsPerBar: STEPS_PER_BAR, drums: emptyDrums(), vocals: [], _undo: null };
}

function clone(s) {
  return {
    ...s,
    drums: Object.fromEntries(Object.entries(s.drums).map(([k, v]) => [k, v.slice()])),
    vocals: s.vocals.map((c) => ({ ...c, slice: { ...c.slice }, warpMarkers: c.warpMarkers.map((m) => ({ ...m })) })),
    _undo: s._undo,
  };
}

export function pushUndo(state) {
  const snap = clone(state);
  snap._undo = null;
  return { ...state, _undo: snap };
}

export function undo(state) {
  if (!state._undo) return state;
  return { ...state._undo, _undo: null };
}

export function toggleStep(state, pad, step) {
  if (!state.drums[pad] || step < 0 || step >= TOTAL_STEPS) return state;
  const next = clone(state);
  next.drums[pad][step] = !next.drums[pad][step];
  return next;
}

let _id = 0;
export function addClip(state, { bufferId, startStep, lengthSteps, slice }) {
  const start = Math.max(0, Math.min(TOTAL_STEPS - 1, Math.round(startStep)));
  const len = Math.max(1, Math.round(lengthSteps));
  const clip = {
    id: `c${++_id}`,
    startStep: start,
    lengthSteps: len,
    bufferId,
    slice: { in: slice.in, out: slice.out },
    warpMarkers: autoWarp({ sliceIn: slice.in, sliceOut: slice.out, lengthSteps: len, bpm: state.bpm }),
  };
  const next = clone(state);
  next.vocals = next.vocals.concat(clip);
  return next;
}

export function updateClip(state, id, patch) {
  const next = clone(state);
  next.vocals = next.vocals.map((c) => {
    if (c.id !== id) return c;
    const merged = { ...c, ...patch, slice: { ...c.slice, ...(patch.slice || {}) } };
    if (patch.warpMarkers) merged.warpMarkers = patch.warpMarkers.map((m) => ({ ...m }));
    return merged;
  });
  return next;
}

export function removeClip(state, id) {
  const next = clone(state);
  next.vocals = next.vocals.filter((c) => c.id !== id);
  return next;
}

export function setBpm(state, bpm) {
  const v = Math.max(40, Math.min(300, Number(bpm) || DEFAULT_BPM));
  return { ...state, bpm: v };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd voidchop && npm test -- tests/audio/pattern-state.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /workspace
git add voidchop/src/audio/pattern-state.js voidchop/src/audio/warp.js voidchop/tests/audio/pattern-state.test.js
GIT_AUTHOR_NAME='Grok Bot' GIT_AUTHOR_EMAIL='grokbot@localhost' GIT_COMMITTER_NAME='Grok Bot' GIT_COMMITTER_EMAIL='grokbot@localhost' \
  git commit -m "feat(voidchop): PatternState, timing constants, autoWarp stub"
```

---

### Task 2: Clock

**Files:**
- Create: `voidchop/src/audio/clock.js`
- Test: `voidchop/tests/audio/clock.test.js`

**Interfaces:**
- Consumes: `loopDurationSec`, `stepDurationSec`, `TOTAL_STEPS` from pattern-state
- Produces: `createClock({ getBpm, onStep })` → `{ play(), stop(), isPlaying(), currentStep(), phase01(), tick(nowSec) }`  
  `stop()` resets step to 0. `phase01` in `[0,1)` over the loop.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test — expect FAIL**

`cd voidchop && npm test -- tests/audio/clock.test.js`

- [ ] **Step 3: Implement**

```js
import { loopDurationSec, stepDurationSec, TOTAL_STEPS } from './pattern-state.js';

export function createClock({ getBpm, onStep }) {
  let playing = false;
  let origin = 0;
  let step = 0;
  let lastEmitted = -1;

  function phase01(now = origin) {
    const loop = loopDurationSec(getBpm());
    if (loop <= 0) return 0;
    const t = playing ? (now - origin) : 0;
    const mod = ((t % loop) + loop) % loop;
    return mod / loop;
  }

  function currentStep(now) {
    if (!playing) return 0;
    const sd = stepDurationSec(getBpm());
    const t = now - origin;
    const loop = loopDurationSec(getBpm());
    const mod = ((t % loop) + loop) % loop;
    return Math.floor(mod / sd) % TOTAL_STEPS;
  }

  return {
    play(nowSec) { playing = true; origin = nowSec; step = 0; lastEmitted = -1; onStep?.(0); lastEmitted = 0; },
    stop() { playing = false; step = 0; lastEmitted = -1; },
    isPlaying() { return playing; },
    currentStep() { return step; },
    phase01() { return phase01(origin); },
    tick(nowSec) {
      if (!playing) return;
      step = currentStep(nowSec);
      // expose phase using now
      this.phase01 = () => phase01(nowSec);
      if (step !== lastEmitted) {
        lastEmitted = step;
        onStep?.(step);
      }
    },
  };
}
```

Fix: store `now` for phase — cleaner version:

```js
import { loopDurationSec, stepDurationSec, TOTAL_STEPS } from './pattern-state.js';

export function createClock({ getBpm, onStep }) {
  let playing = false;
  let origin = 0;
  let now = 0;
  let lastEmitted = -1;

  function modTime() {
    const loop = loopDurationSec(getBpm());
    const t = playing ? (now - origin) : 0;
    return loop > 0 ? ((t % loop) + loop) % loop : 0;
  }

  return {
    play(nowSec) {
      playing = true; origin = nowSec; now = nowSec; lastEmitted = -1;
      onStep?.(0); lastEmitted = 0;
    },
    stop() { playing = false; now = origin; lastEmitted = -1; },
    isPlaying() { return playing; },
    currentStep() {
      if (!playing) return 0;
      const sd = stepDurationSec(getBpm());
      return Math.floor(modTime() / sd) % TOTAL_STEPS;
    },
    phase01() {
      const loop = loopDurationSec(getBpm());
      return loop > 0 ? modTime() / loop : 0;
    },
    tick(nowSec) {
      if (!playing) return;
      now = nowSec;
      const s = this.currentStep();
      if (s !== lastEmitted) { lastEmitted = s; onStep?.(s); }
    },
  };
}
```

- [ ] **Step 4: PASS** — `cd voidchop && npm test -- tests/audio/clock.test.js`
- [ ] **Step 5: Commit** — `feat(voidchop): transport clock with 16-bar loop`

---

### Task 3: Warp segment rates

**Files:**
- Modify: `voidchop/src/audio/warp.js`
- Test: `voidchop/tests/audio/warp.test.js`

**Interfaces:**
- Produces: `autoWarp`, `segmentPlaybackRate(a,b,bpm)`, `markersForBpmChange(markers)` (markers already in beats — identity; document that BPM change needs no marker rewrite)

- [ ] **Step 1: Failing test**

```js
import { describe, it, expect } from 'vitest';
import { autoWarp, segmentPlaybackRate } from '../../src/audio/warp.js';

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
});
```

- [ ] **Step 2–4:** Implement any missing bits in `warp.js` (already stubbed in Task 1); PASS; commit `feat(voidchop): warp playbackRate helpers`

---

### Task 4: DrumKit.trigger(pad, when, out)

**Files:**
- Modify: `voidchop/src/audio/drum-kit.js`
- Modify: `voidchop/tests/audio/drum-kit.test.js`

**Interfaces:**
- Produces: `trigger(pad, when = ctx.currentTime, out = null)`  
  If `out` is `{ ctx, destination }`, use that context/destination (offline bounce). Else `getAudioContext()`.

- [ ] **Step 1: Extend test**

```js
it('trigger accepts when and optional out destination', async () => {
  const kit = new DrumKit();
  await kit.loadDefaults();
  const dest = {};
  const starts = [];
  const fakeCtx = {
    currentTime: 10,
    destination: dest,
    createBufferSource() {
      return {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn((when) => starts.push(when)),
      };
    },
  };
  kit.trigger('kick', 12, { ctx: fakeCtx, destination: dest });
  expect(starts[0]).toBe(12);
});
```

- [ ] **Step 3: Implementation change**

Replace `trigger` with:
```js
trigger(pad, when, out) {
  assertPad(pad);
  const buffer = this.buffers[pad];
  if (!buffer) return;
  const ctx = out?.ctx || getAudioContext();
  const destination = out?.destination || ctx.destination;
  const t = when == null ? ctx.currentTime : when;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(destination);
  src.start(t);
}
```

- [ ] **Step 4–5:** PASS existing + new tests; commit `feat(voidchop): schedule DrumKit.trigger(when, out)`

---

### Task 5: Scheduler

**Files:**
- Create: `voidchop/src/audio/scheduler.js`
- Test: `voidchop/tests/audio/scheduler.test.js`

**Interfaces:**
- Consumes: PatternState, Clock, DrumKit.trigger, Warp, buffer lookup `getBuffer(bufferId) → AudioBuffer|null`
- Produces: `createScheduler({ getState, kit, getBuffer, lookAheadSec=0.1 })` → `{ start(ctx), stop(), onTick(ctxNow) }`  
  Schedules drum hits for upcoming steps; schedules vocal clip segments with `playbackRate` from warp.

- [ ] **Step 1: Failing test** (use FakeCtx + kit mock)

```js
import { describe, it, expect, vi } from 'vitest';
import { createPatternState, toggleStep, addClip, stepDurationSec } from '../../src/audio/pattern-state.js';
import { createScheduler } from '../../src/audio/scheduler.js';

describe('Scheduler', () => {
  it('schedules kick at step times', () => {
    let state = createPatternState();
    state = toggleStep(state, 'kick', 0);
    state = toggleStep(state, 'kick', 2);
    const calls = [];
    const kit = { trigger: (pad, when) => calls.push({ pad, when }) };
    const sched = createScheduler({
      getState: () => state,
      kit,
      getBuffer: () => null,
      lookAheadSec: 10,
    });
    const origin = 100;
    sched.start(origin);
    sched.onTick(origin + 0.001);
    expect(calls.some((c) => c.pad === 'kick' && Math.abs(c.when - origin) < 1e-6)).toBe(true);
  });
});
```

- [ ] **Step 3: Implement** `createScheduler` that tracks `nextStepIndex` relative to `origin`, for each due step in look-ahead calls `kit.trigger(pad, origin + step * stepDurationSec(bpm))` for active cells; for vocals, create BufferSource per segment with rate from `segmentPlaybackRate`. Deduplicate already-scheduled step indices until stop/start.

- [ ] **Step 4–5:** PASS; commit `feat(voidchop): pattern scheduler for drums and clips`

---

### Task 6: Offline loop bounce → export zip

**Files:**
- Create: `voidchop/src/audio/loop-bounce.js`
- Modify: `voidchop/src/ui/export-panel.js` and/or `voidchop/src/app.js` to include `loop.wav` in zip when pattern has content
- Test: `voidchop/tests/audio/loop-bounce.test.js`

**Interfaces:**
- Produces: `async function bounceLoop({ state, kit, getBuffer, sampleRate=44100 }) → AudioBuffer`  
  Uses `OfflineAudioContext`, runs scheduler math once over `loopDurationSec(state.bpm)`.

- [ ] **Step 1: Test** that bounce duration matches `loopDurationSec(130)` and channel count ≥ 1 (may use stub OfflineAudioContext in test env — if jsdom lacks it, polyfill a minimal Offline that records `start` calls and returns empty buffer of correct length).

- [ ] **Step 3: Implement bounce**; wire export to add `voidchop-loop.wav` via existing wav-exporter + zip-bundler when user exports.

- [ ] **Step 5: Commit** `feat(voidchop): offline bounce of one sequencer loop`

---

### Task 7: Toast + Transport UI

**Files:**
- Create: `voidchop/src/ui/toast.js`
- Create: `voidchop/src/ui/transport.js`
- Test: `voidchop/tests/ui/toast.test.js`, `voidchop/tests/ui/transport.test.js`

**Interfaces:**
- `showToast(root, message)` — ephemeral message
- `mountTransport(el, { getBpm, setBpm, onPlay, onStop, getPlaying, getBar })`  
  Play/Stop, BPM number input default 130, bar readout. **Play no-ops / shows toast if AudioContext not running** (call `getAudioContext` / unlock helper).

- [ ] **Step 1–5:** TDD mount buttons; BPM change calls `setBpm`; play blocked when ctx.state !== 'running'; commit `feat(voidchop): transport bar and toast`

---

### Task 8: SessionStripUI

**Files:**
- Create: `voidchop/src/ui/session-strip.js`
- Test: `voidchop/tests/ui/session-strip.test.js`

**Interfaces:**
- `mountSessionStrip(el, { getState, setState, getCurrentStep, onSelectClip })`  
  Renders 4 pad rows × 32 cells + vocal lane. Click cell → `pushUndo` + `toggleStep`. Click lane places selected chop if `window.__voidchopPendingChop` or callback provides chop; else ignore. Clip blocks show start/length; edge drag updates `lengthSteps` / `startStep`.

- [ ] **Step 1: Test** that clicking cell toggles state; 32 columns exist; vocal clip element appears after `addClip`.

- [ ] **Step 3: Implement** grid with CSS grid; cells `data-pad` `data-step`; playhead column class from `getCurrentStep()`.

- [ ] **Step 5: Commit** `feat(voidchop): session strip drum + vocal lane UI`

---

### Task 9: Waveform warp markers

**Files:**
- Modify: `voidchop/src/ui/waveform-view.js`
- Modify: `voidchop/tests/ui/waveform-view.test.js`

**Interfaces:**
- Extend `mountWaveform(el, { onMarkersChange, onWarpChange })`  
  When a vocal clip is selected via `setClip(clip, buffer)`, draw warp markers; drag updates `warpMarkers` and calls `onWarpChange`. Keep existing transient marker behavior when no clip selected.

- [ ] **Step 1–5:** TDD drag updates; commit `feat(voidchop): Ableton-style warp markers on waveform`

---

### Task 10: GlowTheme (alien soft pulse)

**Files:**
- Modify: `voidchop/src/styles/pulse.css`
- Modify: `voidchop/src/ui/theme-shell.js`
- Modify: `voidchop/tests/ui/theme-shell.test.js`

**Interfaces:**
- Shell exposes regions: existing + `transport`, `sessionStrip` (update test that expected 5 regions — now 7 or whatever count after add).
- CSS: `.glow-layer { pointer-events: none; }` beat pulse via `--vc-phase` / `--vc-playing` set from app rAF. Idle breath when stopped; stronger when playing. Cyan/violet bloom.

- [ ] **Step 1: Test** `pointer-events` computed style is `none` on glow layer; region count includes transport + strip.

- [ ] **Step 5: Commit** `feat(voidchop): alien aircraft beat-locked glow`

---

### Task 11: Wire app.js

**Files:**
- Modify: `voidchop/src/app.js`
- Modify: `voidchop/src/styles/shell.css` as needed
- Optional smoke: `voidchop/tests/app-sequencer.test.js` (mount bootApp, toggle cell, assert DOM)

**Interfaces:**
- Boot creates PatternState, Clock, Scheduler, mounts Transport + SessionStrip + Waveform + Toast.
- rAF: `clock.tick(ctx.currentTime); scheduler.onTick(ctx.currentTime); set glow CSS vars from clock.phase01() / isPlaying()`.
- Drop chop onto lane / place selected slice → `addClip` with autoWarp.
- Undo: keyboard `Meta+Z` / button calling `undo`.
- Export includes loop bounce (Task 6).

- [ ] **Step 1–5:** Manual smoke checklist in commit message; automated mount test if feasible; commit `feat(voidchop): wire sequencer transport into app`

---

### Task 12: Pages build + deploy

**Files:** none new (build artifacts)

- [ ] **Step 1: Build**

```bash
cd /workspace/voidchop && npm test && npm run build
```

Expected: tests PASS; `dist/` updated with `base: '/voidchop/'`.

- [ ] **Step 2: Local preview sanity** — `npm run preview` and confirm transport + strip render (computerUse or curl `dist/index.html`).

- [ ] **Step 3: Deploy to gh-pages** (**ask Jay before push** — public)

```bash
cd /workspace/voidchop
# if gh-pages exists:
git push origin $(git subtree split --prefix dist HEAD):gh-pages --force
# else create orphan gh-pages from dist with .nojekyll
```

Include `.nojekyll` at dist root.

- [ ] **Step 4: Live check** — fetch `https://jahiruy.github.io/voidchop/` and confirm 200 + new assets.

- [ ] **Step 5: Commit any script/README deploy notes** if changed: `docs(voidchop): sequencer Pages deploy notes`

---

## Self-review (plan)

- Spec coverage table maps every requirement to a task — OK
- No TBD/TODO placeholders — OK
- Grid naming: STEP_BEATS=2 locked (32 steps / 16 bars) — OK; do not expand to 128
- `DrumKit.trigger(pad, when, out)` sole drum path — OK
- Warp markers in beats → BPM change needs no rewrite — OK
- Toast + audio-lock play gate — OK
- Glow `pointer-events: none` — OK
- Deploy gated on Jay’s go-ahead — OK
