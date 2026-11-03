import { stepDurationSec, TOTAL_STEPS } from './pattern-state.js';
import { segmentPlaybackRate } from './warp.js';
import { getAudioContext } from './context.js';

export function createScheduler({ getState, kit, getBuffer, lookAheadSec = 0.1, ctx = null, destination = null }) {
  let origin = null;
  const done = new Set();

  function scheduleVocals(state, step, when) {
    const clips = state.vocals.filter((c) => c.startStep === step);
    if (!clips.length) return;
    const ac = ctx || getAudioContext();
    const beatSec = 60 / state.bpm;
    for (const clip of clips) {
      const buf = getBuffer(clip.bufferId);
      if (!buf) continue;
      const m = clip.warpMarkers;
      for (let i = 0; i < m.length - 1; i++) {
        const a = m[i], b = m[i + 1];
        const bufDt = b.bufferTime - a.bufferTime;
        if (bufDt <= 0) continue;
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = segmentPlaybackRate(a, b, state.bpm);
        src.connect(destination || ac.destination);
        src.start(when + a.timelineBeat * beatSec, a.bufferTime, bufDt);
      }
    }
  }

  function onTick(now) {
    if (origin == null) return;
    const state = getState();
    const sd = stepDurationSec(state.bpm);
    const horizon = now + lookAheadSec;
    const first = Math.max(0, Math.floor((now - origin) / sd));
    for (let step = first; origin + step * sd <= horizon; step++) {
      if (done.has(step)) continue;
      done.add(step);
      const when = origin + step * sd;
      const idx = step % TOTAL_STEPS;
      for (const [pad, cells] of Object.entries(state.drums)) if (cells[idx]) kit.trigger(pad, when);
      scheduleVocals(state, idx, when);
    }
  }

  return {
    start(originSec) { origin = originSec; done.clear(); },
    stop() { origin = null; done.clear(); },
    onTick,
  };
}
