// Moog-style monophonic-ish sub bass: saw -> lowpass -> ADSR gain.
const clamp = (n) => Math.min(1, Math.max(0, Number(n) || 0));
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class MoogSub {
  constructor(ctx) {
    this.ctx = ctx;
    this.cutoff = 0.4; this.resonance = 0.3; this.decay = 0.4;
    this.voices = new Map();
    this.out = ctx.createGain();
    this.out.gain.value = 0.6;
    this.out.connect(ctx.destination);
  }
  setCutoff(n) { this.cutoff = clamp(n); }
  setResonance(n) { this.resonance = clamp(n); }
  setDecay(n) { this.decay = clamp(n); }

  noteOn(midi) {
    this.noteOff(midi);
    const { ctx } = this, t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = midiToHz(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 40 * Math.pow(200, this.cutoff); // 40Hz..8kHz exp
    filter.Q.value = 0.5 + this.resonance * 19.5;
    const amp = ctx.createGain();
    const g = amp.gain, decaySec = 0.05 + this.decay * 1.5;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(1, t + 0.005);
    g.setTargetAtTime(0.15, t + 0.005, decaySec / 3);
    osc.connect(filter); filter.connect(amp); amp.connect(this.out);
    osc.start(t);
    this.voices.set(midi, { osc, amp });
  }

  noteOff(midi) {
    const v = this.voices.get(midi);
    if (!v) return;
    this.voices.delete(midi);
    const t = this.ctx.currentTime, release = 0.08;
    v.amp.gain.cancelScheduledValues(t);
    v.amp.gain.setTargetAtTime(0, t, release / 3);
    v.osc.stop(t + release * 2);
  }
}
