const PADS = [
  ['kick', 'Kick'],
  ['snare', 'Snare'],
  ['clap', 'Clap'],
  ['cymbal', 'Cymbal'],
];

// Crash cymbal: tilted elliptical disc on a stand. Never a hat glyph.
const CYMBAL_SVG = `<svg class="cymbal-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
<ellipse cx="12" cy="8" rx="9" ry="2.5" transform="rotate(-8 12 8)"/>
<ellipse cx="12" cy="8" rx="2" ry="0.8" transform="rotate(-8 12 8)"/>
<line x1="12" y1="9" x2="12" y2="20"/>
<line x1="12" y1="20" x2="8" y2="22"/><line x1="12" y1="20" x2="16" y2="22"/>
</svg>`;

const isWav = (f) => f && (/\.wav$/i.test(f.name) || /wav/i.test(f.type || ''));

export function mountDrumPads(el, kit) {
  el.classList.add('drum-pads');
  el.innerHTML = '';
  for (const [pad, label] of PADS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drum-pad';
    btn.dataset.pad = pad;
    btn.innerHTML = `${pad === 'cymbal' ? CYMBAL_SVG : ''}<span class="pad-label">${label}</span>`;
    btn.addEventListener('click', () => kit.trigger(pad));
    btn.addEventListener('dragover', (e) => { e.preventDefault(); });
    btn.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (!isWav(file)) return;
      try { await kit.swapPad(pad, await file.arrayBuffer()); } catch (err) { console.error(err); }
    });
    el.appendChild(btn);
  }
  return el;
}
