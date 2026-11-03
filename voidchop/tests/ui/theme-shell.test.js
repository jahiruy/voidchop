// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mountShell } from '../../src/ui/theme-shell.js';

describe('mountShell', () => {
  it('returns five region refs inside root, in layout order', () => {
    const root = document.createElement('div');
    const { refs } = mountShell(root);
    const keys = ['drop', 'wave', 'pads', 'sub', 'export'];
    expect(Object.keys(refs)).toEqual(keys);
    for (const k of keys) {
      expect(refs[k]).toBeInstanceOf(HTMLElement);
      expect(root.contains(refs[k])).toBe(true);
      expect(refs[k].closest('.pulse-edge')).not.toBeNull();
    }
    expect([...root.querySelectorAll('.vc-main > .vc-panel')].map(p => p.dataset.region)).toEqual(keys.slice(0, 4));
    expect(root.querySelector('.vc-side [data-region="export"]')).not.toBeNull();
  });
});
