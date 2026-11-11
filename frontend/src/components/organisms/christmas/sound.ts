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

// a small glockenspiel bar: a few inharmonic partials that die fast
function bell(freq: number, delay = 0, peak = 0.06) {
  const a = audio();
  const at = a.currentTime + delay;
  for (const [ratio, level] of [[1, 1], [2.76, 0.35], [5.4, 0.15]]) {
    const osc = a.createOscillator();
    osc.frequency.value = freq * ratio;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak * level, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9 / ratio + 0.2);
    osc.connect(gain).connect(a.destination);
    osc.start(at);
    osc.stop(at + 1.2);
  }
}

// one note per bauble, climbing a major scale up to the star
const SCALE = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];
export const note = (step: number) => bell(SCALE[step % SCALE.length]);

// a gift opening: a quick arpeggio
export function chime() {
  [1568, 2093, 2637].forEach((freq, i) => bell(freq, i * 0.07, 0.05));
}

// sleigh bells shaken in a rhythm, then gone
export function jingle() {
  const a = audio();
  for (let beat = 0; beat < 8; beat++) {
    const at = a.currentTime + beat * 0.22 + (beat % 2) * 0.03;
    const src = a.createBufferSource();
    src.buffer = noise(a, 0.2);
    const filter = a.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 7000 + Math.random() * 1500;
    filter.Q.value = 2;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(beat % 4 === 0 ? 0.12 : 0.07, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(at);
  }
}

// the storm's wind; returns the way to stop it
export function blizzard() {
  const a = audio();
  const src = a.createBufferSource();
  src.buffer = noise(a, 4);
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 700;
  filter.Q.value = 1.4;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.21;
  const depth = a.createGain();
  depth.gain.value = 380;
  lfo.connect(depth).connect(filter.frequency);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, a.currentTime + 1.5);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
  lfo.start();
  return () => {
    gain.gain.setTargetAtTime(0.0001, a.currentTime, 0.2);
    src.stop(a.currentTime + 1);
    lfo.stop(a.currentTime + 1);
  };
}
