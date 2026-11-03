import { pushUndo, toggleStep, addClip, updateClip, TOTAL_STEPS } from '../audio/pattern-state.js';
import { PADS } from '../audio/drum-kit.js';

const LABELS = { kick: 'Kick', snare: 'Snare', clap: 'Clap', cymbal: 'Cymbal' };
const cols = `grid-template-columns: repeat(${TOTAL_STEPS}, 1fr)`;

export function mountSessionStrip(el, { getState, setState, getCurrentStep = () => -1, onSelectClip } = {}) {
  const stepAt = (lane, clientX) => {
    const r = lane.getBoundingClientRect();
    const w = r.width || 1;
    return Math.max(0, Math.min(TOTAL_STEPS - 1, Math.floor(((clientX - r.left) / w) * TOTAL_STEPS)));
  };

  function render() {
    const s = getState();
    const cur = getCurrentStep();
    el.innerHTML = '';
    el.classList.add('session-strip');
    for (const pad of PADS) {
      const row = document.createElement('div');
      row.className = 'ss-row'; row.dataset.row = pad;
      row.innerHTML = `<span class="ss-label">${LABELS[pad] || pad}</span>`;
      const grid = document.createElement('div');
      grid.className = 'ss-grid'; grid.style.cssText = `display:grid;${cols}`;
      for (let i = 0; i < TOTAL_STEPS; i++) {
        const c = document.createElement('button');
        c.type = 'button'; c.className = 'ss-cell';
        c.dataset.pad = pad; c.dataset.step = String(i);
        if (s.drums[pad]?.[i]) c.classList.add('on');
        if (i === cur) c.classList.add('playhead');
        c.addEventListener('click', () => { setState(toggleStep(pushUndo(getState()), pad, i)); render(); });
        grid.appendChild(c);
      }
      row.appendChild(grid); el.appendChild(row);
    }
    const lane = document.createElement('div');
    lane.className = 'ss-lane'; lane.style.cssText = `display:grid;${cols};position:relative`;
    lane.addEventListener('click', (e) => {
      if (e.target !== lane) return;
      const chop = window.__voidchopPendingChop;
      if (!chop || !chop.slice) return;
      setState(addClip(pushUndo(getState()), {
        bufferId: chop.bufferId, slice: chop.slice, lengthSteps: chop.lengthSteps || 2,
        startStep: stepAt(lane, e.clientX),
      }));
      render();
    });
    for (const clip of s.vocals) {
      const b = document.createElement('div');
      b.className = 'ss-clip'; b.dataset.id = clip.id;
      b.dataset.start = String(clip.startStep); b.dataset.length = String(clip.lengthSteps);
      b.style.gridColumn = `${clip.startStep + 1} / span ${clip.lengthSteps}`;
      b.textContent = `${clip.startStep + 1}·${clip.lengthSteps}`;
      b.addEventListener('click', () => onSelectClip?.(clip.id));
      for (const edge of ['l', 'r']) {
        const h = document.createElement('span');
        h.className = `ss-edge ss-edge-${edge}`;
        h.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          let snapped = false;
          const move = (ev) => {
            const st = stepAt(lane, ev.clientX);
            const c = getState().vocals.find((v) => v.id === clip.id); if (!c) return;
            const end = c.startStep + c.lengthSteps;
            const patch = edge === 'r'
              ? { lengthSteps: Math.max(1, Math.min(TOTAL_STEPS - c.startStep, st + 1 - c.startStep)) }
              : { startStep: Math.min(st, end - 1), lengthSteps: end - Math.min(st, end - 1) };
            const base = snapped ? getState() : pushUndo(getState()); snapped = true;
            setState(updateClip(base, clip.id, patch)); render();
          };
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        });
        b.appendChild(h);
      }
      lane.appendChild(b);
    }
    el.appendChild(lane);
  }
  render();
  return { render };
}
