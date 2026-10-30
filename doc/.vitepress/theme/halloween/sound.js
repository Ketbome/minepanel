// Synthesized with Web Audio: no files to ship. Each sound follows a click or a keypress.
let ctx;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function burst(frequency, q, peak, release, delay = 0) {
  const a = audio();
  const at = a.currentTime + delay;
  const buffer = a.createBuffer(1, a.sampleRate * (release + 0.05), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + release);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(at);
}

// a burst of wings
export function flutter() {
  for (let i = 0; i < 9; i++) burst(900 + Math.random() * 700, 2, 0.08, 0.05, i * 0.045 + Math.random() * 0.02);
}

// the ghost's "boo": a sliding, breathy hoot
export function boo() {
  const a = audio();
  const now = a.currentTime;
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(330, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.7);
  const vibrato = a.createOscillator();
  vibrato.frequency.value = 6;
  const depth = a.createGain();
  depth.gain.value = 9;
  vibrato.connect(depth).connect(osc.frequency);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  osc.connect(gain).connect(a.destination);
  osc.start(now);
  vibrato.start(now);
  osc.stop(now + 0.85);
  vibrato.stop(now + 0.85);
}
