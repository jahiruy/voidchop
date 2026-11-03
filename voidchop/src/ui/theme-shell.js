const REGIONS = [
  ['drop', 'Drop Sample', 'main'],
  ['wave', 'Waveform', 'main'],
  ['pads', 'Drum Pads', 'main'],
  ['sub', 'Sub Bass', 'main'],
  ['export', 'Export', 'side'],
];

export function mountShell(root) {
  root.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'vc-shell';
  const header = document.createElement('header');
  header.className = 'vc-header';
  header.innerHTML = '<h1 class="vc-title">VOIDCHOP</h1>';
  const main = document.createElement('div');
  main.className = 'vc-main';
  const side = document.createElement('aside');
  side.className = 'vc-side';
  const refs = {};
  for (const [key, label, col] of REGIONS) {
    const panel = document.createElement('section');
    panel.className = `vc-panel vc-${key} pulse-edge`;
    panel.dataset.region = key;
    panel.innerHTML = `<h2 class="vc-label">${label}</h2>`;
    const mount = document.createElement('div');
    mount.className = 'vc-mount';
    panel.appendChild(mount);
    refs[key] = mount;
    (col === 'side' ? side : main).appendChild(panel);
  }
  shell.append(header, main, side);
  root.appendChild(shell);
  return { refs };
}
