# VOIDCHOP — Sample Chopper Design Spec

**Date:** 2026-11-02  
**Owner:** Jay (Jahir Yu)  
**Status:** Approved for implementation planning

## Purpose

A pure-browser music sketchpad for capturing ideas when Jay is away from Ableton (or on the iMac / Opera GX before opening Live). Drop a sample, chop it, layer stock 909 drums and a Moog-style sub bass, then export WAVs for Ableton.

## Goals / Success Criteria

- Open a URL, drop a sample, get usable chops in under a minute
- Works on iMac (primary), Opera GX, Safari/Chrome; usable on phone for quick ideas
- No account, no server — everything stays in the tab
- Export is Ableton-ready: 16-bit or 24-bit / 44.1 kHz WAV zip
- Looks like a soft-lit alien spacecraft console (idle soft pulse)

## Non-Goals (v1)

- Accounts, cloud sync, online kit store
- Full arrangement / DAW timeline / recording multi-track sessions
- Max for Live / Ableton plugin
- Hosted sample library (kits are bundled + local swap only)

## Approach

**Pure browser (Web Audio API + static hosting).** Single-page app. Bundled 909 one-shots and a Web Audio Moog-style sub synth. Transient detection client-side. WAV encoding + zip download in-browser.

## Architecture

```
┌─────────────────────────────────────────┐
│ UI (dark spacecraft shell, CSS pulse)   │
├─────────────────────────────────────────┤
│ Audio Engine (Web Audio)                │
│  - SampleBuffer / decoder               │
│  - TransientDetector → SliceMarkers     │
│  - DrumKit (Kick/Snare/Clap/Cymbal)     │
│  - MoogSubSynth + on-screen keyboard    │
│  - WavExporter + ZipBundler             │
└─────────────────────────────────────────┘
```

All state lives in memory for the session. Optional: remember last kit swaps in `localStorage` only.

## Core Flow

1. Open site → soft pulsing idle UI
2. Drop or pick sample (WAV / AIFF / MP3)
3. Auto-chop on transients; drag markers to adjust; slice-sensitivity slider
4. Tap Kick / Snare / Clap / Cymbal (stock 909); drop a WAV on a pad to swap
5. Play Moog-style sub on on-screen 2-octave keyboard (Cutoff / Resonance / Decay knobs)
6. Export WAVs → zip of slices + optional pad one-shots used this session

## UI Layout

Top → bottom:

1. **Drop zone** — dashed soft-glow border
2. **Waveform** — cyan glow, numbered slice markers (draggable)
3. **Drum pads** — Kick, Snare, Clap, Cymbal (cymbal icon, not a fedora/hat)
4. **Sub bass** — Moog-style knobs + proper piano keyboard (2+3 black-key groups)
5. **Export panel** (right) — slice count, bit depth/sample rate, Export WAVs

### Visual language

- Dark charcoal hull panels
- Soft purple + cyan edge lighting
- **Idle soft pulse** on panel edges / pad rings even when unused (slow, calm spacecraft breath — not club strobe)
- Frosted glass panels, soft bloom
- Name in mockups: VOIDCHOP (working title; rename OK later)

## Components

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| DropZone | File pick / drag-drop | SampleBuffer |
| WaveformView | Draw buffer, markers, drag | SliceMarkers |
| TransientDetector | Auto slice points | SampleBuffer |
| DrumPad | Trigger + pad-swap | DrumKit |
| DrumKit | Load/play 909 + user WAVs | Web Audio |
| MoogSubSynth | Subtractive sub (saw/square → filter → amp) | Web Audio |
| Keyboard | Correct 2-octave piano UI + pointer/touch | MoogSubSynth |
| WavExporter | Encode AudioBuffers → WAV | — |
| ZipBundler | Package files for download | WavExporter |
| ThemeShell | Pulse lighting, layout chrome | CSS |

## Audio Details

### Chopping

- Decode via `AudioContext.decodeAudioData`
- Transient detection: envelope / spectral flux style peak picking
- Sensitivity slider remaps threshold and re-runs detection
- Manual add/remove/drag markers
- Each slice = copy of buffer region → own AudioBuffer

### Drums

- Bundled: classic 909-style Kick, Snare, Clap, Cymbal (hi-hat/cymbal glyph)
- Trigger: one-shot buffer playback
- Swap: drop WAV onto pad → replace that slot for the session (persist to `localStorage` if small enough)

### Moog sub

- Simple analog-style: oscillator (saw preferred) → low-pass filter (cutoff + resonance) → ADSR with emphasis on Decay
- On-screen keyboard: **real piano layout** (black keys in 2 then 3), ~2 octaves, mouse/touch; computer keyboard mapping optional stretch
- Knobs: Cutoff, Resonance, Decay

### Export

- Default: 24-bit / 44.1 kHz (match mock) with 16-bit option
- Zip contents: `slice_01.wav` … plus optional `kick.wav` etc. if pads were used
- Filename prefix configurable (simple text field)

## Error Handling

- Unsupported file type → clear inline message, keep drop zone ready
- Decode failure → “Couldn’t read that file” + retry
- Auto-chop finds 0/1 slices → keep full buffer as one slice; nudge sensitivity hint
- Export with no sample → disable button / explain
- AudioContext suspended (browser autoplay policy) → first tap unlocks; show “Tap to enable audio” if needed

## Platforms

- **Primary:** iMac — Opera GX (Chromium), also Safari / Chrome
- **Secondary:** iPhone for jotting ideas (touch drop/chop/pads/keys; export still works)

## Testing (manual v1)

- Drop short vocal/loop → markers sensible at mid sensitivity
- Drag markers, re-export, open in Ableton → timing matches
- Swap snare WAV → pad plays new sound
- Moog keys: correct pitches, filter knobs audible
- Idle UI: soft pulse visible without interacting
- Opera GX + Safari smoke test on iMac

## Open Decisions (resolved)

| Topic | Decision |
|-------|----------|
| Platform | Pure browser |
| Look | Dark soft-glow spacecraft + idle pulse |
| Drums | Stock 909, pad-swap by dropping WAV |
| Bass | Moog-style sub, on-screen keyboard |
| Export | WAV zip for Ableton |
| Hat icon | Cymbal, not fedora |

## Out of Scope Reminder

No accounts, no cloud kits, no full DAW, no Max for Live in v1.
