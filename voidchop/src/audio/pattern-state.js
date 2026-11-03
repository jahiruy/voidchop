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
