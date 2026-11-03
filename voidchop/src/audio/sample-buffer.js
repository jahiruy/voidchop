import { getAudioContext } from './context.js';

export async function decodeSample(arrayBuffer) {
  const ctx = getAudioContext();
  // copy: decodeAudioData may detach the buffer
  const copy = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(copy);
}
