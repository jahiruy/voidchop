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
