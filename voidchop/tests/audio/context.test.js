import { describe, it, expect, beforeEach } from 'vitest';
import { getAudioContext, unlockAudio, _resetContextForTests } from '../../src/audio/context.js';

// jsdom has no Web Audio; minimal stub so the singleton can be constructed.
class FakeAudioContext {
  constructor() { this.state = 'suspended'; }
  async resume() { this.state = 'running'; }
}
if (!window.AudioContext) window.AudioContext = FakeAudioContext;

describe('context', () => {
  beforeEach(() => _resetContextForTests());

  it('returns a singleton AudioContext', () => {
    const a = getAudioContext();
    const b = getAudioContext();
    expect(a).toBe(b);
  });

  it('unlockAudio resumes a suspended context', async () => {
    await unlockAudio();
    expect(getAudioContext().state).toBe('running');
  });
});
