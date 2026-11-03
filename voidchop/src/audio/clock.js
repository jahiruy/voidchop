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
