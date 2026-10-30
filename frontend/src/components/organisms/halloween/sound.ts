// Synthesized with Web Audio: no files to ship or license. Every sound starts from a user
// gesture (a click, the Konami code), so the context is allowed to play.
let ctx: AudioContext | null = null;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noise(a: AudioContext, seconds: number) {
  const buffer = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function envelope(a: AudioContext, peak: number, attack: number, release: number) {
  const gain = a.createGain();
  const now = a.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
  gain.connect(a.destination);
  return gain;
}

function burst(frequency: number, q: number, peak: number, release: number) {
  const a = audio();
  const src = a.createBufferSource();
  src.buffer = noise(a, release + 0.05);
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;
  src.connect(filter).connect(envelope(a, peak, 0.004, release));
  src.start();
}

// the lantern switch
export const click = () => burst(2400, 4, 0.18, 0.05);

// a jack o'lantern flaring up
export const hiss = () => burst(3200, 0.8, 0.09, 0.45);

// something was found in the dark
export function chime() {
  const a = audio();
  for (const [freq, delay] of [[784, 0], [1175, 0.09]]) {
    const osc = a.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = a.createGain();
    const at = a.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.07, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    osc.connect(gain).connect(a.destination);
    osc.start(at);
    osc.stop(at + 0.55);
  }
}

// the Rake, startled by the light
export function screech() {
  const a = audio();
  const out = envelope(a, 0.1, 0.02, 1);
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 1.2;
  filter.connect(out);
  const now = a.currentTime;
  for (const detune of [-18, 0, 23]) {
    const osc = a.createOscillator();
    osc.type = 'sawtooth';
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(480, now + 1);
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + 1.05);
  }
}

// wind under the door while the lights are out; returns the way to stop it
export function wind() {
  const a = audio();
  const src = a.createBufferSource();
  src.buffer = noise(a, 4);
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 420;
  filter.Q.value = 3;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.13;
  const depth = a.createGain();
  depth.gain.value = 260;
  lfo.connect(depth).connect(filter.frequency);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 1.5);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
  lfo.start();
  return () => {
    gain.gain.setTargetAtTime(0.0001, a.currentTime, 0.2);
    src.stop(a.currentTime + 1);
    lfo.stop(a.currentTime + 1);
  };
}
