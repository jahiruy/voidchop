// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mountShell } from '../../src/ui/theme-shell.js';

describe('mountShell', () => {
  it('returns seven region refs inside root, in layout order', () => {
    const root = document.createElement('div');
    const { refs } = mountShell(root);
    const keys = ['drop', 'wave', 'pads', 'sub', 'transport', 'sessionStrip', 'export'];
    expect(Object.keys(refs)).toEqual(keys);
    for (const k of keys) {
      expect(refs[k]).toBeInstanceOf(HTMLElement);
      expect(root.contains(refs[k])).toBe(true);
      expect(refs[k].closest('.pulse-edge')).not.toBeNull();
    }
    expect([...root.querySelectorAll('.vc-main > .vc-panel')].map(p => p.dataset.region)).toEqual(keys.slice(0, 6));
    expect(root.querySelector('.vc-side [data-region="export"]')).not.toBeNull();
  });

  it('renders a glow layer that never blocks clicks', () => {
    const css = readFileSync(resolve(__dirname, '../../src/styles/pulse.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { glow } = mountShell(root);
    expect(glow).toBeInstanceOf(HTMLElement);
    expect(root.querySelector('.glow-layer')).toBe(glow);
    expect(getComputedStyle(glow).pointerEvents).toBe('none');
    expect(css).toMatch(/--vc-phase/);
    expect(css).toMatch(/--vc-playing/);
    style.remove(); root.remove();
  });
});
