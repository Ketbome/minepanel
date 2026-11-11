// Synthesized with Web Audio: no files to ship. Each sound follows a click or a keypress.
let ctx;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// sleigh bells shaken in a rhythm, then gone
export function jingle() {
  const a = audio();
  for (let beat = 0; beat < 8; beat++) {
    const at = a.currentTime + beat * 0.22 + (beat % 2) * 0.03;
    const buffer = a.createBuffer(1, a.sampleRate * 0.2, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buffer;
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
