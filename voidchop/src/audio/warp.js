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

/**
 * Markers are stored in beats, so a BPM change requires no marker rewrite.
 * Identity (returns a shallow copy).
 */
export function markersForBpmChange(markers) {
  return markers.map((m) => ({ ...m }));
}
