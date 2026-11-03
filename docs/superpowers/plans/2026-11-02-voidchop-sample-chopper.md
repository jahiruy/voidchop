# VOIDCHOP Sample Chopper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pure-browser sample chopper (VOIDCHOP) with transient chops, swappable 909 pads, Moog-style sub + on-screen keyboard, Ableton WAV zip export, and soft-pulsing spacecraft UI.

**Architecture:** Vite + vanilla JS single-page app. Web Audio for decode/play/synth; client-side transient detection; WAV encode + JSZip download. No backend. Session state in memory; optional pad swaps in `localStorage`.

**Tech Stack:** Vite, vanilla ES modules, Web Audio API, JSZip, Vitest (unit), Playwright (smoke). CSS for spacecraft shell + idle pulse.

**Spec:** `docs/superpowers/specs/2026-11-02-voidchop-sample-chopper-design.md`

## Global Constraints

- Pure browser only — no accounts, no server APIs
- Primary targets: iMac Opera GX / Chrome / Safari; usable on iPhone
- Export: WAV zip at 44.1 kHz, 16-bit or 24-bit
- Pads: Kick, Snare, Clap, Cymbal (cymbal icon, never fedora)
- Idle soft pulse on panel edges (slow spacecraft breath, not strobe)
- Keyboard: real piano layout (black keys groups of 2 then 3), ~2 octaves
- YAGNI: no DAW timeline, no cloud kits, no Max for Live

## File Map

```
voidchop/
  package.json
  vite.config.js
  index.html
  public/kits/909/          # kick.wav snare.wav clap.wav cymbal.wav (or generated stubs)
  src/
    main.js
    app.js
    audio/
      context.js            # shared AudioContext unlock
      sample-buffer.js
      transient-detector.js
      drum-kit.js
      moog-sub.js
      wav-exporter.js
      zip-bundler.js
    ui/
      drop-zone.js
      waveform-view.js
      drum-pads.js
      keyboard.js
      export-panel.js
      theme-shell.js
    styles/
      shell.css
      pulse.css
  tests/
    audio/
      sample-buffer.test.js
      transient-detector.test.js
      wav-exporter.test.js
      moog-sub.test.js
      drum-kit.test.js
    ui/
      keyboard.test.js
```

---

### Task 1: Scaffold Vite app + test runner

**Files:**
- Create: `voidchop/package.json`
- Create: `voidchop/vite.config.js`
- Create: `voidchop/index.html`
- Create: `voidchop/src/main.js`
- Create: `voidchop/src/styles/shell.css`
- Create: `voidchop/src/styles/pulse.css`

**Interfaces:**
- Consumes: nothing
- Produces: `npm run dev`, `npm test`, empty `#app` mount

- [ ] **Step 1: Create package.json**

```json
{
  "name": "voidchop",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^25.0.1",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  },
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
```

- [ ] **Step 3: Create index.html + main.js stub**

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VOIDCHOP</title>
    <link rel="stylesheet" href="/src/styles/shell.css" />
    <link rel="stylesheet" href="/src/styles/pulse.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`src/main.js`:
```js
document.getElementById('app').innerHTML = '<p class="boot">VOIDCHOP</p>';
```

Minimal `shell.css` / `pulse.css` with dark background and a `@keyframes soft-pulse` on `.pulse-edge`.

- [ ] **Step 4: Install and verify**

```bash
cd voidchop && npm install && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add voidchop && git commit -m "chore: scaffold VOIDCHOP Vite app"
```

---

### Task 2: AudioContext unlock helper

**Files:**
- Create: `voidchop/src/audio/context.js`
- Create: `voidchop/tests/audio/context.test.js`

**Interfaces:**
- Produces: `getAudioContext(): AudioContext`, `unlockAudio(): Promise<void>`

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { getAudioContext, unlockAudio, _resetContextForTests } from '../../src/audio/context.js';

describe('context', () => {
  beforeEach(() => _resetContextForTests());

  it('returns a singleton AudioContext', () => {
    const a = getAudioContext();
    const b = getAudioContext();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

`npm test -- tests/audio/context.test.js`

- [ ] **Step 3: Implement**

```js
let ctx = null;

export function getAudioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export async function unlockAudio() {
  const c = getAudioContext();
  if (c.state === 'suspended') await c.resume();
}

export function _resetContextForTests() {
  ctx = null;
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add voidchop/src/audio/context.js voidchop/tests/audio/context.test.js
git commit -m "feat: AudioContext singleton and unlock"
```

---

### Task 3: SampleBuffer decode

**Files:**
- Create: `voidchop/src/audio/sample-buffer.js`
- Create: `voidchop/tests/audio/sample-buffer.test.js`

**Interfaces:**
- Consumes: `getAudioContext()`
- Produces: `decodeSample(arrayBuffer: ArrayBuffer): Promise<AudioBuffer>`

- [ ] **Step 1: Write failing test** — create a tiny valid WAV ArrayBuffer fixture inline (44-byte header + silence) and assert `decodeSample` returns `AudioBuffer` with `numberOfChannels >= 1`.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```js
import { getAudioContext } from './context.js';

export async function decodeSample(arrayBuffer) {
  const ctx = getAudioContext();
  // copy: decodeAudioData may detach the buffer
  const copy = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(copy);
}
```

- [ ] **Step 4: PASS + commit** `feat: decode dropped samples to AudioBuffer`

---

### Task 4: Transient detector + slice markers

**Files:**
- Create: `voidchop/src/audio/transient-detector.js`
- Create: `voidchop/tests/audio/transient-detector.test.js`

**Interfaces:**
- Produces:
  - `detectTransients(buffer: AudioBuffer, sensitivity: number): number[]` — times in seconds, sorted, always includes `0`
  - `sensitivity` range `0..1` (0.5 default); higher = more slices

- [ ] **Step 1: Failing test** — synthetic buffer with two impulses → expect at least 2 markers near those times at mid sensitivity; empty/silent buffer → `[0]` only.

Algorithm sketch for implementation:
1. Mix to mono
2. Frame energy (hop ~512)
3. Peak-pick where energy exceeds rolling mean * threshold mapped from sensitivity
4. Enforce min spacing (~50ms)
5. Always prepend 0; optionally append duration if last gap large

- [ ] **Step 2–4: TDD implement + commit** `feat: transient detection for auto-chop`

---

### Task 5: WAV exporter

**Files:**
- Create: `voidchop/src/audio/wav-exporter.js`
- Create: `voidchop/tests/audio/wav-exporter.test.js`

**Interfaces:**
- Produces: `audioBufferToWav(buffer: AudioBuffer, opts?: { sampleRate?: number, bitDepth?: 16 | 24 }): ArrayBuffer`
- Default: `sampleRate = 44100`, `bitDepth = 24`
- Produces: `sliceBuffer(buffer, startSec, endSec): AudioBuffer` using OfflineAudioContext or manual copy

- [ ] **Step 1: Test** — silence buffer → WAV starts with `RIFF` / `WAVE`; bitDepth 16 vs 24 changes data chunk size; round-trip length sane.

- [ ] **Step 2–4: Implement PCM encode (little-endian) + commit** `feat: WAV encode for Ableton export`

---

### Task 6: Zip bundler

**Files:**
- Create: `voidchop/src/audio/zip-bundler.js`
- Create: `voidchop/tests/audio/zip-bundler.test.js`

**Interfaces:**
- Produces: `async buildExportZip(files: { name: string, data: ArrayBuffer }[]): Promise<Blob>`
- Uses JSZip; names like `slice_01.wav`

- [ ] **Step 1–4: TDD + commit** `feat: zip WAV export bundle`

---

### Task 7: DrumKit + pad swap

**Files:**
- Create: `voidchop/src/audio/drum-kit.js`
- Create: `voidchop/tests/audio/drum-kit.test.js`
- Create: `voidchop/public/kits/909/kick.wav` (and snare, clap, cymbal) — generate short synthetic one-shots via a Node script if no CC0 files yet

**Interfaces:**
- Produces:
  - `class DrumKit { async loadDefaults(); trigger(pad: 'kick'|'snare'|'clap'|'cymbal'); async swapPad(pad, arrayBuffer); getBuffer(pad): AudioBuffer | null }`
- Persist swaps: `localStorage` key `voidchop.kit.swaps` storing base64 only if size &lt; 1.5MB total; else session-only

- [ ] **Step 1: Script to generate stub WAVs** (short noise bursts shaped per pad) into `public/kits/909/`

- [ ] **Step 2: Tests for trigger and swap**

- [ ] **Step 3: Implement + commit** `feat: 909 drum kit with pad swap`

---

### Task 8: Moog-style sub synth

**Files:**
- Create: `voidchop/src/audio/moog-sub.js`
- Create: `voidchop/tests/audio/moog-sub.test.js`

**Interfaces:**
- Produces:
  - `class MoogSub { constructor(ctx); setCutoff(n:0..1); setResonance(n:0..1); setDecay(n:0..1); noteOn(midi:number); noteOff(midi:number) }`
- Voice: sawtooth → BiquadFilter `lowpass` → Gain ADSR (fast attack, decay from knob, low sustain)

- [ ] **Step 1–4: TDD noteOn creates nodes / noteOff releases; commit** `feat: Moog-style sub bass synth`

---

### Task 9: Theme shell + idle pulse CSS

**Files:**
- Modify: `voidchop/src/styles/shell.css`
- Modify: `voidchop/src/styles/pulse.css`
- Create: `voidchop/src/ui/theme-shell.js`

**Interfaces:**
- Produces: `mountShell(root: HTMLElement): { refs }` with regions: drop, wave, pads, sub, export
- CSS: charcoal panels, purple/cyan glow, `.pulse-edge { animation: soft-pulse 4s ease-in-out infinite }`

- [ ] **Step 1: Implement layout HTML structure matching spec (drop → waveform → pads → Moog+keyboard → export sidebar)**

- [ ] **Step 2: Visual check in `npm run dev` — idle pulse visible with no interaction**

- [ ] **Step 3: Commit** `feat: spacecraft shell UI with idle soft pulse`

---

### Task 10: Drop zone UI

**Files:**
- Create: `voidchop/src/ui/drop-zone.js`

**Interfaces:**
- Produces: `mountDropZone(el, { onFile: (File) => void })`
- Accepts drag-drop + click file input; types WAV/AIFF/MP3

- [ ] **Step 1: Implement + wire unlockAudio on first gesture**

- [ ] **Step 2: Manual test drop → callback fires**

- [ ] **Step 3: Commit** `feat: sample drop zone`

---

### Task 11: Waveform view + marker drag

**Files:**
- Create: `voidchop/src/ui/waveform-view.js`

**Interfaces:**
- Produces: `mountWaveform(el, { onMarkersChange })` with `setBuffer(AudioBuffer)`, `setMarkers(number[])`, `getMarkers()`, sensitivity slider binding that calls detector and redraws
- Canvas draw cyan waveform; markers draggable; min gap enforced

- [ ] **Step 1–3: Implement, manual drag test, commit** `feat: waveform chop view with draggable markers`

---

### Task 12: Drum pads UI (cymbal icon)

**Files:**
- Create: `voidchop/src/ui/drum-pads.js`

**Interfaces:**
- Produces: `mountDrumPads(el, kit: DrumKit)`
- Labels Kick/Snare/Clap/Cymbal; SVG cymbal (not hat); drop WAV on pad → `kit.swapPad`

- [ ] **Step 1–3: Implement + commit** `feat: drum pads with cymbal icon and swap`

---

### Task 13: On-screen piano keyboard

**Files:**
- Create: `voidchop/src/ui/keyboard.js`
- Create: `voidchop/tests/ui/keyboard.test.js`

**Interfaces:**
- Produces: `mountKeyboard(el, moog: MoogSub, { startMidi = 36, octaves = 2 })`
- **Layout rule:** for each octave, black keys only on C# D# and F# G# A# (indices relative to C)
- Pointer down/up → noteOn/noteOff; touch support

- [ ] **Step 1: Unit test `blackKeyPattern(octaves)` returns correct MIDI black-key set**

- [ ] **Step 2: Render DOM keys with correct pattern**

- [ ] **Step 3: Commit** `feat: correct 2-octave Moog keyboard`

---

### Task 14: Export panel

**Files:**
- Create: `voidchop/src/ui/export-panel.js`

**Interfaces:**
- Produces: `mountExportPanel(el, { getSlices, getKitBuffers, bitDepth })` → button builds zip via wav-exporter + zip-bundler and triggers download `voidchop-export.zip`
- Disabled with message when no sample

- [ ] **Step 1–3: Implement + commit** `feat: Ableton WAV zip export panel`

---

### Task 15: App wiring

**Files:**
- Create: `voidchop/src/app.js`
- Modify: `voidchop/src/main.js`

**Interfaces:**
- Wire: drop → decode → detect → waveform; pads ↔ kit; knobs ↔ MoogSub; keyboard ↔ MoogSub; export ↔ slices/kit

- [ ] **Step 1: Implement `bootApp(root)`**

- [ ] **Step 2: Manual happy path on Opera GX / Chrome: drop → chop → pads → keys → export → open in Ableton**

- [ ] **Step 3: Commit** `feat: wire VOIDCHOP end-to-end`

---

### Task 16: Error states + audio unlock banner

**Files:**
- Modify: `voidchop/src/app.js`, `voidchop/src/ui/drop-zone.js`, `voidchop/src/styles/shell.css`

- [ ] **Step 1: Unsupported type / decode fail / zero-slice hint / tap-to-enable-audio banner**

- [ ] **Step 2: Commit** `fix: user-visible audio and file error states`

---

### Task 17: Smoke checklist + README

**Files:**
- Create: `voidchop/README.md`

- [ ] **Step 1: Document `npm install && npm run dev`, export settings, Opera GX note**

- [ ] **Step 2: Run full manual checklist from spec Testing section**

- [ ] **Step 3: Commit** `docs: VOIDCHOP README and smoke notes`

---

## Spec Coverage Check

| Spec item | Task |
|-----------|------|
| Pure browser Web Audio | 1–8, 15 |
| Drop + auto-chop + drag markers + sensitivity | 4, 10, 11 |
| 909 pads + cymbal icon + swap | 7, 12 |
| Moog sub + knobs + real keyboard | 8, 13 |
| WAV zip 16/24-bit 44.1k | 5, 6, 14 |
| Spacecraft soft idle pulse | 9 |
| iMac / Opera GX / phone | 15–17 |
| Error handling | 16 |
| No accounts / no cloud / no Max | Global constraints |

## Placeholder / Consistency Review

- No TBD steps; interfaces named consistently (`DrumKit`, `MoogSub`, `detectTransients`, `audioBufferToWav`, `buildExportZip`)
- Bit depth default 24 to match mock; 16 selectable in export panel
