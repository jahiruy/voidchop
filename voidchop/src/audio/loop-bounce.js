import { createScheduler } from './scheduler.js';
import { loopDurationSec, stepDurationSec, TOTAL_STEPS } from './pattern-state.js';

export function patternHasContent(state) {
  if (!state) return false;
  return Object.values(state.drums || {}).some((c) => c.some(Boolean)) || (state.vocals || []).length > 0;
}

/** Render one sequencer loop offline. Returns the rendered AudioBuffer. */
export async function bounceLoop({ state, kit, getBuffer, sampleRate = 44100 }) {
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Offline) throw new Error('OfflineAudioContext unavailable');
  const length = Math.ceil(loopDurationSec(state.bpm) * sampleRate);
  const ctx = new Offline(2, length, sampleRate);
  const destination = ctx.destination;
  const outKit = { trigger: (pad, when) => kit.trigger(pad, when, { ctx, destination }) };
  const sched = createScheduler({ getState: () => state, kit: outKit, getBuffer, ctx, destination, lookAheadSec: 0 });
  sched.start(0);
  const sd = stepDurationSec(state.bpm);
  for (let i = 0; i < TOTAL_STEPS; i++) sched.onTick(i * sd);
  sched.stop();
  return ctx.startRendering();
}
