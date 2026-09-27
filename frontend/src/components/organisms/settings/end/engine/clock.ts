import * as THREE from 'three';
import { DIG } from '../acts/overworld-layout';
import { runtime } from './runtime';

// The game's day squeezed into ten minutes of play: the sun is up for the first 390 s (sunrise at
// 0, noon at 195, sunset at 390) and night takes the rest. Pause, windows and death stop it; it
// keeps running in the other dimensions, like the game's.
export const DAY = 600;
const DUSK_END = 390;
// a new run starts a minute after sunrise, so the camp is in daylight
const START = 60;
// the sun sets toward the stronghold, like the frozen sunset did before the cycle
const WEST = new THREE.Vector3(DIG.x, 0, DIG.z).normalize();
// the horizontal axis square suns and moons are drawn against (the sun passes overhead)
export const SUN_SIDE = new THREE.Vector3().crossVectors(WEST, new THREE.Vector3(0, 1, 0));

export function resetClock() {
  runtime.clock = START;
}

export function dayTime() {
  return ((runtime.clock % DAY) + DAY) % DAY;
}

function sunAngle(t: number) {
  return t < DUSK_END ? (Math.PI * t) / DUSK_END : Math.PI + (Math.PI * (t - DUSK_END)) / (DAY - DUSK_END);
}

export function sunDirection(out: THREE.Vector3, t = dayTime()) {
  const angle = sunAngle(t);
  return out.copy(WEST).multiplyScalar(-Math.cos(angle)).setY(Math.sin(angle)).normalize();
}

// hostiles come out once the sky has gone dark, and burn once the sun is well up
export function isNight(t = dayTime()) {
  return Math.sin(sunAngle(t)) < -0.05;
}

export function isBright(t = dayTime()) {
  return Math.sin(sunAngle(t)) > 0.15;
}

export function skipNight() {
  runtime.clock += (DAY - dayTime()) % DAY;
}

// 1 at day, 0 at night; `dusk` peaks while the sun sits low on the horizon
export function light(t = dayTime()) {
  const up = Math.sin(sunAngle(t));
  const day = THREE.MathUtils.smoothstep(up, -0.12, 0.2);
  const dusk = Math.max(0, 1 - Math.abs(up - 0.08) / 0.22);
  return { day, dusk };
}
