# VOIDCHOP

Browser-only sample chopper and groove box (pure Web Audio, no accounts, no cloud, no Max). Drop a sample, auto-chop it on transients, drag markers, play 909-style pads (swap any pad's WAV), play a Moog-style sub bass from the keyboard, and export the slices as a WAV zip for Ableton.

## Run

```bash
npm install && npm run dev   # dev server (Vite)
npm test                     # unit tests (Vitest)
npm run build                # production build -> dist/
```

## Export

- Format: WAV, 44.1 kHz, zipped (one file per slice) — drag straight into Ableton.
- Bit depth: **24-bit default**; 16-bit selectable in the export panel.

## Browsers

Primary target is the iMac in **Opera GX** (Chromium — behaves like Chrome); Safari and Chrome also supported, iPhone secondary. Audio starts only after a click/keypress (browser autoplay policy). If Opera GX's tab RAM/CPU limiters are on, disable them for this tab if audio glitches.

## Smoke checklist (manual v1)

| Check | Status (2026-11-03) |
|---|---|
| App loads, UI wired | ✅ verified (Chromium, dev box) |
| Drop sample → waveform drawn | ✅ verified with kick.wav |
| Drop short vocal/loop → markers sensible at mid sensitivity | ⬜ not yet verified |
| Drag markers, re-export, open in Ableton → timing matches | ⬜ not verified (no Ableton on dev box) |
| Swap snare WAV → pad plays new sound | ⬜ not yet verified |
| Moog keys: correct pitches, filter knobs audible | ⬜ not yet verified (needs audio output) |
| Idle UI: soft pulse visible without interacting | ⬜ not yet verified |
| Opera GX + Safari on iMac | ⬜ not verified |
| iPhone | ⬜ not verified |
