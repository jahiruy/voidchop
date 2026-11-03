# VOIDCHOP — 16-Bar Sequencer + 2030 UI Design Spec

**Date:** 2026-11-03  
**Owner:** Jay (Jahir Yu)  
**Status:** Approved for implementation planning  
**Builds on:** `2026-11-02-voidchop-sample-chopper-design.md`  
**Live app:** https://jahiruy.github.io/voidchop/

## Purpose

Add an Ableton-like 16-bar session strip so Jay can program stock 909 drums and place warped vocal chops on a timeline, then restyle the shell as soft alien-aircraft lighting that pulses with the clock — without leaving the browser or needing Node on his machine.

## Goals / Success Criteria

- 16-bar loop at master tempo **130 BPM** (editable), eighth-note grid (**32 steps**)
- Stock 909 pads appear as drum lanes on the grid; tap cells to toggle hits
- Vocal lane under the drums: place chops, see them as clips, trim edges, edit warp markers on the waveform (Ableton-style in/out + drag points); dropped samples **auto-warp to master tempo**
- Soft alien-aircraft lighting that pulses with the beat (stronger when playing, idle breath when stopped)
- Export still bounces what you hear (existing WAV / zip path)
- Redeploy to GitHub Pages so the shareable link updates

## Non-Goals (this pass)

- Full multi-track arrangement beyond one 16-bar loop
- Extra drum lanes beyond stock 909 pads
- Offline / Ableton Live sync
- Cloud save of patterns
- 16th-note or triplet grids
- Clip automation envelopes beyond warp markers

## Decisions Locked in Brainstorm

| Topic | Choice |
|-------|--------|
| Grid | 8th notes → 32 steps across 16 bars |
| Vocal placement | Visible sample + Ableton-style select/drag warp; clips on lane |
| Tempo | Master tempo, default **130 BPM**; samples auto-warp on drop |
| Drum lanes | Stock 909 pads only |
| Look | Alien aircraft soft lighting that pulses |
| Approach | **A — Session strip**: step matrix for 909 + warped clip lane for vocals |

## Approach

**Session strip (Approach A).** One transport-driven 16-bar Arrangement-style strip. Drum rows = step sequencer for bundled 909 pads. Vocal row = clip lane with time-stretch to master BPM. Existing waveform panel becomes the detail editor for the selected vocal clip. CSS-driven soft bloom / pulse tied to transport phase. Pure browser; no new backend.

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Transport (play/stop, BPM default 130, bar #)   │
├──────────────────────────────────────────────────┤
│ Session strip (16 bars / 32 8th steps)           │
│  · 909 drum rows — step cells                    │
│  · Vocal lane — warped clips                     │
├──────────────────────────────────────────────────┤
│ Waveform detail (selected vocal clip)            │
│  · in/out + warp markers (drag)                  │
├──────────────────────────────────────────────────┤
│ Existing pads / drop zone / export / sub (kept)  │
└──────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ Clock → Scheduler → Web Audio voices             │
│ PatternState (drums + clips + BPM + warp maps)   │
└──────────────────────────────────────────────────┘
```

### New / extended modules (logical)

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `Transport` / `Clock` | Master BPM, play/stop, 16-bar loop phase, step index | AudioContext |
| `PatternState` | Drum matrix (pad × 32), vocal clip list, BPM | — |
| `Scheduler` | Schedule drum hits + warped clip playback for upcoming steps | Clock, DrumKit, SampleBuffer |
| `Warp` | Map clip buffer time ↔ timeline at master BPM (auto-warp on drop) | SampleBuffer |
| `SessionStripUI` | Grid + vocal lane rendering, cell/clip hit-testing | PatternState, Clock |
| `WaveformDetail` | Extend current waveform for in/out + warp-marker drag; push edits into selected clip | Warp, PatternState |
| `GlowTheme` | Alien soft pulse CSS vars driven by transport phase | Clock |

Existing `DrumKit`, `SampleBuffer`, transient slices, export, and audio unlock stay; scheduler plays through them.

## Layout & Visual

- **Top:** transport — play/stop, BPM (default 130, editable), bar counter.
- **Middle:** full-width 16-bar strip — 909 rows as 32-step cells; vocal lane under with clip blocks.
- **Bottom / side:** waveform detail for the selected vocal clip.
- **Look:** dark aircraft glass; soft cyan/violet bloom. Playhead and current step / firing pads light up. Idle soft breath when stopped; stronger pulse locked to the beat when playing. Glow must not block clicks.

## Interaction

1. Tap a 909 cell → toggle hit on/off.
2. Select a vocal chop (slice or waveform selection) → drop or click onto the vocal lane → clip snaps to eighth grid and **auto-warps to master tempo**.
3. Drag clip edges to trim length on the lane.
4. Double-click (or select) a clip → waveform detail shows Ableton-style warp markers; drag points / set in-out; changes write back to the clip.
5. Play loops exactly 16 bars; stop returns playhead to start.
6. Change BPM → clips remain warped to the new master tempo (recompute stretch).
7. Undo covers the last grid or clip edit (single-level is enough for this pass).
8. Bad drop / decode failure → toast; pattern unchanged. Audio unlock banner behavior unchanged.

## Data Model

```
PatternState {
  bpm: number                 // default 130
  bars: 16
  stepsPerBar: 2              // 8th notes → 32 steps total
  drums: Record<PadId, boolean[32]>
  vocals: VocalClip[]
}

VocalClip {
  id: string
  startStep: number           // 0..31
  lengthSteps: number
  bufferId: string            // decoded sample
  slice: { in: number, out: number }  // seconds in buffer
  warpMarkers: { bufferTime: number, timelineBeat: number }[]
}
```

Session-only (in-memory). No pattern persistence this pass. Export renders the audible mix via the existing WAV/zip pipeline (scheduler offline bounce or realtime capture — implementation plan picks one; prefer offline render of one loop for clean Ableton WAVs).

## Error Handling

- Invalid / empty drop on vocal lane → toast, no clip created
- Warp with degenerate markers → fall back to linear stretch in→out across clip length
- Kit pad missing sample → silent skip for that hit (existing kit resilience)
- AudioContext locked → existing unlock banner; transport does not start until unlocked

## Testing

- Unit: step toggle updates `PatternState`; clip snap to 8th grid; auto-warp produces markers consistent with BPM; 16-bar loop length in seconds at 130 BPM = `16 * 4 * (60/130)`
- Unit: BPM change recomputes clip timeline mapping
- UI smoke: glow/pulse does not intercept pointer events; playhead advances while playing
- Regression: drop sample, 909 pads, export zip still work on Pages build (`base: '/voidchop/'`)

## Out of Scope Reminder

Do not rebuild the whole app. Pads, chop detection, Moog sub, and export stay. This pass adds transport + session strip + warp detail + theme pulse, then redeploys Pages.

## Implementation Follow-Up

After this spec is user-approved, write an implementation plan (`writing-plans`) covering: Clock/PatternState/Scheduler/Warp, SessionStripUI, waveform warp UX, GlowTheme, tests, Pages rebuild/deploy.
