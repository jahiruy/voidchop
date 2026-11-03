// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { showToast } from '../../src/ui/toast.js';

describe('toast', () => {
  it('shows a message and removes it after timeout', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    showToast(root, 'Hello');
    const t = root.querySelector('.toast');
    expect(t.textContent).toBe('Hello');
    expect(t.getAttribute('role')).toBe('status');
    vi.advanceTimersByTime(5000);
    expect(root.querySelector('.toast')).toBeNull();
    vi.useRealTimers();
  });
});
