import type { TranslationKey } from '@/lib/translations';
import { useEndGame } from './end-game-store';

// Recorded CC0 clips (public/sounds/CREDITS.md) cover the big moments; everything else
// is synthesized here so the easter egg ships no extra audio assets.

const MUTED_KEY = 'minepanel:end-muted';

type Synth = (audio: AudioContext, out: AudioNode) => void;

interface CueDef {
  readonly volume: number;
  readonly file?: string;
  readonly rate?: readonly [number, number];
  readonly synth?: Synth;
  readonly caption?: TranslationKey;
}

let audio: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let ambience: { gain: GainNode; sources: AudioScheduledSourceNode[] } | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function context() {
  if (!audio || !master) {
    audio = new AudioContext();
    master = audio.createGain();
    master.gain.value = isMuted() ? 0 : 1;
    master.connect(audio.destination);
  }
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
  return { audio, master };
}

function noiseBuffer(ctx: AudioContext) {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function envelope(ctx: AudioContext, peak: number, attack: number, release: number, delay = 0) {
  const gain = ctx.createGain();
  const start = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  return gain;
}

interface Sweep {
  readonly from: number;
  readonly to: number;
  readonly peak: number;
  readonly attack: number;
  readonly release: number;
  readonly delay?: number;
}

function noiseSweep(ctx: AudioContext, out: AudioNode, type: BiquadFilterType, sweep: Sweep) {
  const start = ctx.currentTime + (sweep.delay ?? 0);
  const end = start + sweep.attack + sweep.release;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(sweep.from, start);
  filter.frequency.exponentialRampToValueAtTime(sweep.to, end);
  source.connect(filter).connect(envelope(ctx, sweep.peak, sweep.attack, sweep.release, sweep.delay)).connect(out);
  source.start(start, Math.random() * 0.3);
  source.stop(end + 0.05);
}

function toneSweep(ctx: AudioContext, out: AudioNode, type: OscillatorType, sweep: Sweep) {
  const start = ctx.currentTime + (sweep.delay ?? 0);
  const end = start + sweep.attack + sweep.release;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(sweep.from, start);
  osc.frequency.exponentialRampToValueAtTime(sweep.to, end);
  osc.connect(envelope(ctx, sweep.peak, sweep.attack, sweep.release, sweep.delay)).connect(out);
  osc.start(start);
  osc.stop(end + 0.05);
}

const explosion: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 3200, to: 140, peak: 0.9, attack: 0.008, release: 1.5 });
  toneSweep(ctx, out, 'sine', { from: 120, to: 34, peak: 0.8, attack: 0.005, release: 0.55 });
};

const hit: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 1600, to: 300, peak: 0.5, attack: 0.004, release: 0.14 });
  toneSweep(ctx, out, 'sine', { from: 170, to: 60, peak: 0.5, attack: 0.004, release: 0.16 });
};

const xp: Synth = (ctx, out) => {
  const pitch = 1300 + Math.random() * 800;
  toneSweep(ctx, out, 'triangle', { from: pitch, to: pitch * 1.02, peak: 0.2, attack: 0.004, release: 0.22 });
  toneSweep(ctx, out, 'sine', { from: pitch * 2, to: pitch * 2, peak: 0.05, attack: 0.004, release: 0.12 });
};

const lava: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'bandpass', { from: 900, to: 420, peak: 0.3, attack: 0.004, release: 0.07 });
  toneSweep(ctx, out, 'sine', { from: 220, to: 70, peak: 0.2, attack: 0.004, release: 0.09 });
};

const deathRise: Synth = (ctx, out) => {
  const start = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + 2.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 6.6);
  filter.connect(gain).connect(out);
  [0, 7].forEach((detune) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(58, start);
    osc.frequency.exponentialRampToValueAtTime(520, start + 6.4);
    osc.connect(filter);
    osc.start(start);
    osc.stop(start + 6.7);
  });
};

const gateway: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sine', { from: 72, to: 38, peak: 0.7, attack: 0.02, release: 1.3 });
  noiseSweep(ctx, out, 'bandpass', { from: 200, to: 2600, peak: 0.35, attack: 0.4, release: 1.1 });
};

const rumble: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 280, to: 80, peak: 0.45, attack: 0.7, release: 2.4 });
};

const CUES = {
  eye: { file: 'eye-place.ogg', volume: 0.45, rate: [0.9, 1.15], caption: 'dangerEggSubEye' },
  portal: { file: 'portal-activate.ogg', volume: 0.7, caption: 'dangerEggSubPortal' },
  travel: { file: 'portal-travel.ogg', volume: 0.55, caption: 'dangerEggSubTravel' },
  lava: { synth: lava, volume: 0.35, caption: 'dangerEggSubLava' },
  growl: { file: 'dragon-growl.ogg', volume: 0.5, rate: [0.95, 1.05], caption: 'dangerEggSubGrowl' },
  hurt: { file: 'dragon-growl.ogg', volume: 0.35, rate: [1.45, 1.7], caption: 'dangerEggSubHurt' },
  hit: { synth: hit, volume: 0.6 },
  death: { file: 'dragon-growl.ogg', volume: 0.7, rate: [0.55, 0.6], synth: deathRise, caption: 'dangerEggSubDeath' },
  explode: { synth: explosion, volume: 0.8, caption: 'dangerEggSubCrystal' },
  vanish: { synth: explosion, volume: 0.9 },
  enderman: { file: 'teleport.ogg', volume: 0.45, rate: [0.85, 1.1], caption: 'dangerEggSubEnderman' },
  egg: { file: 'teleport.ogg', volume: 0.5, rate: [1.1, 1.25], caption: 'dangerEggSubEgg' },
  xp: { synth: xp, volume: 0.5, caption: 'dangerEggSubXp' },
  gateway: { synth: gateway, volume: 0.6, caption: 'dangerEggSubGateway' },
  flash: { synth: rumble, volume: 0.5 },
  toast: { file: 'levelup.ogg', volume: 0.4 },
} satisfies Record<string, CueDef>;

export type CueName = keyof typeof CUES;

function load(file: string) {
  let buffer = buffers.get(file);
  if (!buffer) {
    buffer = fetch(`/sounds/${file}`)
      .then((response) => response.arrayBuffer())
      .then((data) => context().audio.decodeAudioData(data))
      .catch(() => null);
    buffers.set(file, buffer);
  }
  return buffer;
}

// call from a click handler: Safari only lets an AudioContext start inside a user gesture
export function unlockAudio() {
  context();
}

export function preloadSounds() {
  Object.values(CUES).forEach((def: CueDef) => {
    if (def.file) void load(def.file);
  });
}

export function cue(name: CueName, gain = 1) {
  const def: CueDef = CUES[name];
  if (def.caption) useEndGame.getState().caption(def.caption);
  const { audio: ctx, master: bus } = context();
  const out = ctx.createGain();
  out.gain.value = def.volume * gain;
  out.connect(bus);
  if (def.file) {
    void load(def.file).then((buffer) => {
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (def.rate) source.playbackRate.value = def.rate[0] + Math.random() * (def.rate[1] - def.rate[0]);
      source.connect(out);
      source.start();
    });
  }
  def.synth?.(ctx, out);
}

export function startAmbience(kind: 'stronghold' | 'end') {
  stopAmbience();
  const { audio: ctx, master: bus } = context();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  gain.connect(bus);

  const bed = ctx.createBufferSource();
  bed.buffer = noiseBuffer(ctx);
  bed.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = kind === 'stronghold' ? 150 : 420;
  const bedGain = ctx.createGain();
  bedGain.gain.value = kind === 'stronghold' ? 0.2 : 0.07;
  bed.connect(filter).connect(bedGain).connect(gain);
  const sources: AudioScheduledSourceNode[] = [bed];

  if (kind === 'end') {
    // slow wind: the filter cutoff breathes instead of the volume
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 200;
    lfo.connect(depth).connect(filter.frequency);
    sources.push(lfo);
  }

  (kind === 'stronghold' ? [49, 49.35] : [55, 55.3, 82.5]).forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;
    const level = ctx.createGain();
    level.gain.value = 0.035;
    osc.connect(level).connect(gain);
    sources.push(osc);
  });

  sources.forEach((source) => source.start());
  ambience = { gain, sources };
}

export function stopAmbience() {
  if (!ambience || !audio) return;
  const { gain, sources } = ambience;
  ambience = null;
  const now = audio.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0, now, 0.35);
  sources.forEach((source) => source.stop(now + 1.6));
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {
    // private mode: the choice only lasts this visit
  }
  if (audio && master) master.gain.setTargetAtTime(muted ? 0 : 1, audio.currentTime, 0.05);
  useEndGame.setState({ muted });
}
