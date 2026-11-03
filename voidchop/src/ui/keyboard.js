// On-screen piano keyboard driving MoogSub. Real layout: black keys C# D# | F# G# A#.
const BLACK_OFFSETS = new Set([1, 3, 6, 8, 10]);

/** Boolean per semitone (from C) for `octaves` octaves: true = black key. */
export function blackKeyPattern(octaves) {
  return Array.from({ length: octaves * 12 }, (_, i) => BLACK_OFFSETS.has(i % 12));
}

export function mountKeyboard(el, moog, { startMidi = 36, octaves = 2 } = {}) {
  const pattern = blackKeyPattern(octaves);
  const wrap = document.createElement('div');
  wrap.className = 'keyboard';
  wrap.style.cssText = 'position:relative;display:flex;height:120px;user-select:none;touch-action:none';
  const whiteCount = pattern.filter((b) => !b).length;
  const whiteW = 100 / whiteCount;
  const held = new Set();
  let whiteIdx = 0;

  pattern.forEach((isBlack, i) => {
    const midi = startMidi + i;
    const k = document.createElement('div');
    k.dataset.midi = String(midi);
    if (isBlack) {
      k.className = 'key black';
      k.style.cssText = `position:absolute;top:0;height:62%;width:${whiteW * 0.6}%;left:${whiteIdx * whiteW - whiteW * 0.3}%;background:#111;z-index:2;border-radius:0 0 3px 3px`;
    } else {
      k.className = 'key white';
      k.style.cssText = `flex:1;height:100%;background:#eee;border:1px solid #333;box-sizing:border-box`;
      whiteIdx++;
    }
    const on = (e) => {
      if (e.pointerId != null && k.setPointerCapture) try { k.setPointerCapture(e.pointerId); } catch {}
      if (held.has(midi)) return;
      held.add(midi); k.classList.add('active'); moog.noteOn(midi);
    };
    const off = () => {
      if (!held.has(midi)) return;
      held.delete(midi); k.classList.remove('active'); moog.noteOff(midi);
    };
    k.addEventListener('pointerdown', on);
    k.addEventListener('pointerup', off);
    k.addEventListener('pointercancel', off);
    k.addEventListener('pointerleave', off);
    wrap.appendChild(k);
  });
  el.appendChild(wrap);
  return wrap;
}
