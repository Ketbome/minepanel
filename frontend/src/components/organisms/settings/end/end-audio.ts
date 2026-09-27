import type { LoreKey } from './lore/en';
import { useEndGame } from './store';

// Recorded CC0 clips (public/sounds/CREDITS.md) cover the big moments; everything else
// is synthesized here so the easter egg ships no extra audio assets.

const MUTED_KEY = 'minepanel:end-muted';

type Synth = (audio: AudioContext, out: AudioNode) => void;

interface CueDef {
  readonly volume: number;
  readonly file?: string;
  readonly rate?: readonly [number, number];
  readonly synth?: Synth;
  readonly caption?: LoreKey;
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

const chest: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sawtooth', { from: 140, to: 95, peak: 0.12, attack: 0.02, release: 0.32 });
  noiseSweep(ctx, out, 'bandpass', { from: 700, to: 380, peak: 0.25, attack: 0.02, release: 0.3 });
  hit(ctx, out);
};

const page: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'highpass', { from: 1800, to: 5200, peak: 0.3, attack: 0.03, release: 0.16 });
};

const craft: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'bandpass', { from: 1200, to: 500, peak: 0.35, attack: 0.003, release: 0.08 });
  toneSweep(ctx, out, 'triangle', { from: 260, to: 150, peak: 0.3, attack: 0.003, release: 0.1 });
};

const pick: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 900, to: 260, peak: 0.4, attack: 0.002, release: 0.06 });
};

const dirt: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 1400, to: 160, peak: 0.6, attack: 0.004, release: 0.28 });
  toneSweep(ctx, out, 'sine', { from: 140, to: 55, peak: 0.35, attack: 0.004, release: 0.2 });
};

const whoosh: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'bandpass', { from: 300, to: 2400, peak: 0.4, attack: 0.25, release: 0.5 });
};

const shatter: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'highpass', { from: 3000, to: 6000, peak: 0.35, attack: 0.002, release: 0.35 });
  [2900, 3700, 4400].forEach((pitch, index) => {
    toneSweep(ctx, out, 'sine', { from: pitch, to: pitch * 0.97, peak: 0.12, attack: 0.002, release: 0.3, delay: index * 0.04 });
  });
};

// breath through a narrow band, fluttering like speech just below the threshold of words
const whisper: Synth = (ctx, out) => {
  const start = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1900;
  band.Q.value = 6;
  const flutter = ctx.createGain();
  flutter.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 7;
  const depth = ctx.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(flutter.gain);
  source.connect(band).connect(flutter).connect(envelope(ctx, 0.6, 0.35, 1.4)).connect(out);
  source.start(start, Math.random() * 0.5);
  lfo.start(start);
  source.stop(start + 1.9);
  lfo.stop(start + 1.9);
};

const bird: Synth = (ctx, out) => {
  const pitch = 2600 + Math.random() * 1400;
  const notes = 2 + Math.floor(Math.random() * 3);
  for (let note = 0; note < notes; note += 1) {
    toneSweep(ctx, out, 'sine', { from: pitch, to: pitch * (1.25 + Math.random() * 0.2), peak: 0.1, attack: 0.01, release: 0.09, delay: note * 0.13 });
  }
};

const thump: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sine', { from: 70, to: 38, peak: 0.9, attack: 0.01, release: 0.25 });
  toneSweep(ctx, out, 'sine', { from: 64, to: 36, peak: 0.6, attack: 0.01, release: 0.25, delay: 0.22 });
};

const roar: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 500, to: 120, peak: 0.8, attack: 0.15, release: 1.4 });
  toneSweep(ctx, out, 'sawtooth', { from: 90, to: 45, peak: 0.25, attack: 0.1, release: 1.3 });
};

const shriek: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sawtooth', { from: 900, to: 1400, peak: 0.12, attack: 0.3, release: 1.4 });
  noiseSweep(ctx, out, 'bandpass', { from: 2000, to: 3500, peak: 0.25, attack: 0.3, release: 1.2 });
};

const click: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'bandpass', { from: 2400, to: 1600, peak: 0.35, attack: 0.002, release: 0.05 });
};

const twang: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'triangle', { from: 330, to: 180, peak: 0.35, attack: 0.002, release: 0.25 });
  whoosh(ctx, out);
};

const squeak: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'square', { from: 2400, to: 3200, peak: 0.06, attack: 0.005, release: 0.08 });
};

const zap: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'square', { from: 1800, to: 500, peak: 0.08, attack: 0.005, release: 0.2 });
};

const hum: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sawtooth', { from: 160, to: 140, peak: 0.12, attack: 0.05, release: 0.35 });
};

const pop: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sine', { from: 500, to: 1200, peak: 0.25, attack: 0.005, release: 0.09 });
};

const snort: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 900, to: 280, peak: 0.55, attack: 0.02, release: 0.22 });
  toneSweep(ctx, out, 'sawtooth', { from: 150, to: 95, peak: 0.12, attack: 0.02, release: 0.22 });
  noiseSweep(ctx, out, 'lowpass', { from: 800, to: 260, peak: 0.4, attack: 0.02, release: 0.18, delay: 0.26 });
};

const rattle: Synth = (ctx, out) => {
  for (let tap = 0; tap < 4; tap += 1) noiseSweep(ctx, out, 'bandpass', { from: 2800, to: 1900, peak: 0.3, attack: 0.002, release: 0.04, delay: tap * 0.06 });
};

const clink: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'triangle', { from: 1500, to: 1300, peak: 0.2, attack: 0.002, release: 0.25 });
  toneSweep(ctx, out, 'triangle', { from: 2250, to: 2000, peak: 0.1, attack: 0.002, release: 0.2, delay: 0.05 });
};

const screech: Synth = (ctx, out) => {
  toneSweep(ctx, out, 'sawtooth', { from: 1900, to: 650, peak: 0.16, attack: 0.02, release: 0.9 });
  toneSweep(ctx, out, 'square', { from: 1960, to: 700, peak: 0.07, attack: 0.02, release: 0.9 });
  noiseSweep(ctx, out, 'bandpass', { from: 3200, to: 1100, peak: 0.3, attack: 0.02, release: 0.8 });
};

// slow, wet breaths, close behind you
const breath: Synth = (ctx, out) => {
  noiseSweep(ctx, out, 'lowpass', { from: 500, to: 900, peak: 0.35, attack: 0.5, release: 0.5 });
  noiseSweep(ctx, out, 'lowpass', { from: 900, to: 380, peak: 0.28, attack: 0.25, release: 0.7, delay: 1.1 });
};

// Recorded clips play when their file is present; each falls back to its synth otherwise.
const CUES = {
  eye: { file: 'eye-place.ogg', volume: 0.45, rate: [0.9, 1.15], caption: 'subEye' },
  portal: { file: 'portal-activate.ogg', volume: 0.7, caption: 'subPortal' },
  netherPortal: { file: 'portal-activate.ogg', volume: 0.6, rate: [1.2, 1.3], caption: 'subNetherPortal' },
  travel: { file: 'portal-travel.ogg', volume: 0.55, caption: 'subTravel' },
  lava: { synth: lava, volume: 0.35, caption: 'subLava' },
  growl: { file: 'dragon-growl.ogg', volume: 0.5, rate: [0.95, 1.05], caption: 'subGrowl' },
  dragonHurt: { file: 'dragon-growl.ogg', volume: 0.35, rate: [1.45, 1.7], caption: 'subHurt' },
  hit: { synth: hit, volume: 0.6 },
  dragonDeath: { file: 'dragon-growl.ogg', volume: 0.7, rate: [0.55, 0.6], synth: deathRise, caption: 'subDeath' },
  explode: { file: 'explosion.ogg', synth: explosion, volume: 0.8, caption: 'subCrystal' },
  boom: { file: 'explosion.ogg', synth: explosion, volume: 0.8, caption: 'subExplosion' },
  vanish: { synth: explosion, volume: 0.9 },
  enderman: { file: 'teleport.ogg', volume: 0.45, rate: [0.85, 1.1], caption: 'subEnderman' },
  egg: { file: 'teleport.ogg', volume: 0.5, rate: [1.1, 1.25], caption: 'subEgg' },
  xp: { synth: xp, volume: 0.5, caption: 'subXp' },
  gateway: { synth: gateway, volume: 0.6, caption: 'subGateway' },
  flash: { synth: rumble, volume: 0.5 },
  toast: { file: 'levelup.ogg', volume: 0.4 },
  chest: { file: 'chest-open.ogg', synth: chest, volume: 0.6, caption: 'subChest' },
  page: { file: 'page.ogg', synth: page, volume: 0.5, caption: 'subPage' },
  craft: { synth: craft, volume: 0.6 },
  pick: { synth: pick, volume: 0.5 },
  dirt: { file: 'dirt.ogg', synth: dirt, volume: 0.6, caption: 'subBreak' },
  place: { file: 'dirt.ogg', synth: dirt, volume: 0.45, rate: [0.8, 0.9] },
  throw: { synth: whoosh, volume: 0.5, caption: 'subThrow' },
  shatter: { synth: shatter, volume: 0.55, caption: 'subShatter' },
  whisper: { synth: whisper, volume: 0.5, caption: 'subWhisper' },
  bird: { synth: bird, volume: 0.4 },
  land: { synth: hit, volume: 0.5 },
  swing: { synth: whoosh, volume: 0.25 },
  stepGrass: { file: 'step-grass.ogg', synth: pick, volume: 0.35, rate: [0.9, 1.1] },
  stepStone: { file: 'step-stone.ogg', synth: pick, volume: 0.35, rate: [0.9, 1.1] },
  bowDraw: { file: 'bow-draw.ogg', synth: craft, volume: 0.4 },
  bowShoot: { file: 'bow-shoot.ogg', synth: twang, volume: 0.5, caption: 'subBow' },
  arrowHit: { file: 'arrow-hit.ogg', synth: hit, volume: 0.5, caption: 'subArrow' },
  eat: { file: 'eat.ogg', synth: pick, volume: 0.5, rate: [0.9, 1.1], caption: 'subEat' },
  hurt: { file: 'hurt.ogg', synth: hit, volume: 0.6, rate: [0.9, 1.1], caption: 'subHurtPlayer' },
  death: { file: 'death.ogg', synth: roar, volume: 0.6 },
  villager: { file: 'villager-hmm.ogg', synth: hum, volume: 0.6, rate: [0.9, 1.1], caption: 'subVillager' },
  villagerNo: { file: 'villager-hmm.ogg', synth: hum, volume: 0.6, rate: [1.25, 1.35], caption: 'subVillager' },
  baa: { file: 'baa.ogg', synth: hum, volume: 0.5, rate: [0.9, 1.15], caption: 'subSheep' },
  oink: { file: 'oink.ogg', synth: hum, volume: 0.5, rate: [0.9, 1.15], caption: 'subPig' },
  hiss: { file: 'hiss.ogg', synth: whisper, volume: 0.6, caption: 'subHiss' },
  flint: { file: 'flint.ogg', synth: click, volume: 0.6, caption: 'subFlint' },
  fireball: { file: 'fireball.ogg', synth: whoosh, volume: 0.6, caption: 'subFireball' },
  blaze: { file: 'blaze-breath.ogg', synth: whisper, volume: 0.4, caption: 'subBlaze' },
  ghast: { file: 'ghast.ogg', synth: shriek, volume: 0.5, caption: 'subGhast' },
  heartbeat: { file: 'warden-heartbeat.ogg', synth: thump, volume: 0.7, caption: 'subHeartbeat' },
  roar: { file: 'warden-roar.ogg', synth: roar, volume: 0.8, caption: 'subRoar' },
  shriek: { file: 'shriek.ogg', synth: shriek, volume: 0.6, caption: 'subShriek' },
  sculk: { file: 'sculk-click.ogg', synth: click, volume: 0.45, rate: [0.9, 1.2], caption: 'subSculk' },
  squeak: { file: 'squeak.ogg', synth: squeak, volume: 0.45, rate: [0.9, 1.3], caption: 'subSqueak' },
  zap: { file: 'magic-zap.ogg', synth: zap, volume: 0.4, caption: 'subZap' },
  levitate: { file: 'levitate.ogg', synth: zap, volume: 0.45, caption: 'subLevitate' },
  wind: { file: 'wind.ogg', synth: whoosh, volume: 0.5 },
  pop: { synth: pop, volume: 0.35 },
  equip: { synth: clink, volume: 0.5, caption: 'subEquip' },
  piglin: { synth: snort, volume: 0.6, caption: 'subPiglin' },
  bones: { synth: rattle, volume: 0.5, caption: 'subSkeleton' },
  rake: { file: 'rake-shriek.ogg', synth: screech, volume: 0.7, rate: [0.9, 1.08], caption: 'subRake' },
  scream: { file: 'rake-scream.ogg', synth: screech, volume: 0.9, caption: 'subRake' },
  breath: { file: 'rake-breath.ogg', synth: breath, volume: 0.55, rate: [0.92, 1.05], caption: 'subBreath' },
} satisfies Record<string, CueDef>;

export type CueName = keyof typeof CUES;

function load(file: string) {
  let buffer = buffers.get(file);
  if (!buffer) {
    buffer = fetch(`/sounds/${file}`)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(file))))
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

// zones warm up the clips they are about to use, so the first one plays on time
export function prefetch(names: readonly CueName[]) {
  names.forEach((name) => {
    const def: CueDef = CUES[name];
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
  if (!def.file) {
    def.synth?.(ctx, out);
    return;
  }
  void load(def.file).then((buffer) => {
    if (!buffer) {
      def.synth?.(ctx, out);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (def.rate) source.playbackRate.value = def.rate[0] + Math.random() * (def.rate[1] - def.rate[0]);
    source.connect(out);
    source.start();
    // the dragon's death keeps its synthesized rise under the recorded growl
    if (name === 'dragonDeath') def.synth?.(ctx, out);
  });
}

type Ambience = 'overworld' | 'stronghold' | 'end' | 'nether' | 'ancient';

// filtered noise for air, a few sine drones for dread; the Nether adds its recorded rumble
const BEDS: Record<Ambience, { readonly cutoff: number; readonly level: number; readonly breathe: boolean; readonly drones: readonly number[]; readonly loop?: string }> = {
  overworld: { cutoff: 650, level: 0.05, breathe: true, drones: [] },
  stronghold: { cutoff: 150, level: 0.2, breathe: false, drones: [49, 49.35] },
  end: { cutoff: 420, level: 0.07, breathe: true, drones: [55, 55.3, 82.5] },
  nether: { cutoff: 220, level: 0.16, breathe: true, drones: [36, 36.4, 54], loop: 'nether-ambience.ogg' },
  ancient: { cutoff: 120, level: 0.12, breathe: false, drones: [41, 41.25] },
};

export function startAmbience(kind: Ambience) {
  stopAmbience();
  const { audio: ctx, master: bus } = context();
  const bedDef = BEDS[kind];
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  gain.connect(bus);

  const bed = ctx.createBufferSource();
  bed.buffer = noiseBuffer(ctx);
  bed.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = bedDef.cutoff;
  const bedGain = ctx.createGain();
  bedGain.gain.value = bedDef.level;
  bed.connect(filter).connect(bedGain).connect(gain);
  const sources: AudioScheduledSourceNode[] = [bed];

  if (bedDef.breathe) {
    // slow wind: the filter cutoff breathes instead of the volume
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = Math.min(200, bedDef.cutoff * 0.6);
    lfo.connect(depth).connect(filter.frequency);
    sources.push(lfo);
  }

  bedDef.drones.forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;
    const level = ctx.createGain();
    level.gain.value = 0.035;
    osc.connect(level).connect(gain);
    sources.push(osc);
  });

  sources.forEach((source) => source.start());
  const current = { gain, sources };
  ambience = current;
  if (bedDef.loop) {
    void load(bedDef.loop).then((buffer) => {
      if (!buffer || ambience !== current) return;
      const loop = ctx.createBufferSource();
      loop.buffer = buffer;
      loop.loop = true;
      const level = ctx.createGain();
      level.gain.value = 0.5;
      loop.connect(level).connect(gain);
      loop.start();
      current.sources.push(loop);
    });
  }
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
