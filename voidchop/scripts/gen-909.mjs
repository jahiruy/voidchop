// Generates short synthetic 909-style one-shots (16-bit mono PCM WAV).
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 44100;
const dir = new URL('../public/kits/909/', import.meta.url);
mkdirSync(dir, { recursive: true });
let seed = 1; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const pads = {
  kick: { dur: 0.4, f: (t) => Math.sin(2 * Math.PI * (50 * t + 60 * (1 - Math.exp(-t * 30)) / 30 * 30 / (2 * Math.PI) )) * Math.exp(-t * 8) },
  snare: { dur: 0.25, f: (t) => (0.5 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 20) + 0.6 * noise() * Math.exp(-t * 14)) },
  clap: { dur: 0.3, f: (t) => noise() * (t < 0.03 ? Math.exp(-((t % 0.01) * 300)) : Math.exp(-(t - 0.03) * 18)) * 0.8 },
  cymbal: { dur: 0.8, f: (t) => { const a = noise(), b = noise(); return (a - b) * 0.4 * Math.exp(-t * 5); } },
};
for (const [name, { dur, f }] of Object.entries(pads)) {
  const n = Math.floor(SR * dur), buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, f(i / SR))) * 32000), 44 + i * 2);
  writeFileSync(new URL(`${name}.wav`, dir), buf);
}
