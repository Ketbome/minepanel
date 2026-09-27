'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cue, prefetch } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { surface } from '../engine/physics';
import { castBlocks, solidCell } from '../engine/raycast';
import { runtime } from '../engine/runtime';
import { BFUUNY, BLASTER, season, useEndGame, type Zone } from '../store';
import { PX, useDamage, useMobTarget } from './parts';
import { Box, sides, useSkin, type SkinArt } from './skins';

// every zone with ground to walk on; in the End City only until the admins' ending starts
const HAUNTS: readonly Zone[] = ['overworld', 'nether', 'ancient', 'stronghold', 'end', 'endcity'];
// seconds before it first shows up in a zone, and between one visit and the next
const FIRST: readonly [number, number] = [30, 90];
const AGAIN: readonly [number, number] = [120, 240];
// how long it follows you unseen before giving up, and how far back it keeps
const STALK_S = 45;
const STALK_DISTANCE = 11;
const STALK_SPEED = 9;
// looking at it: within this cone of the view, this close, with nothing in between
const SEEN_COS = Math.cos((28 * Math.PI) / 180);
const SEEN_RANGE = 28;
// once seen it covers its face and screams for a while, then runs
const PANIC_S = 3.5;
const CHASE_S = 18;
// a hair slower than a sprint: running is the way out
const SPEED = 5.2;
const HP = 30;
// the model is drawn at this scale: close to three blocks tall
const SCALE = 1.15;
const HEIGHT = 2.95;
const toward = new THREE.Vector3();
const goal = new THREE.Vector3();
const eyeTo = new THREE.Vector3();

type Phase = 'gone' | 'stalking' | 'panic' | 'chasing';

const between = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);

// the creepypasta, drawn tall and starved like the SCP it borrows from: grey-white skin over ribs,
// black eyes with a pinprick of light, a mouth full of teeth, and arms that reach its knees
const RAKE: SkinArt = {
  palette: {
    p: ['#cfcfc6', '#c6c6bd', '#d8d8cf', '#c2c2b9'],
    r: ['#9d9d94', '#a6a69d'],
    k: '#050505',
    w: '#e8e8e8',
    m: ['#1a0303', '#260505'],
    t: '#e9e4d2',
    c: '#2b2b28',
  },
  boxes: {
    head: { size: [6, 7, 6], base: 'p', faces: { front: ['rppppr', 'kkppkk', 'kwppwk', 'kkppkk', 'rkppkr', 'tmtmtm', 'mtmtmt'] } },
    torso: {
      size: [7, 14, 3],
      base: 'p',
      faces: sides(['ppppppp', 'prrprrp', 'ppppppp', 'prrprrp', 'ppppppp', 'prrprrp', 'ppppppp', 'pprrrpp', 'ppppppp', 'ppprppp', 'ppppppp', 'ppprppp', 'ppppppp', 'rrrrrrr']),
    },
    upper: { size: [2, 16, 2], base: 'p', faces: sides(Array.from({ length: 16 }, (_, row) => (row === 15 ? 'rr' : 'pp'))) },
    forearm: { size: [2, 16, 2], base: 'p', faces: { ...sides([...Array.from({ length: 11 }, () => 'pp'), 'cc', 'cc', 'cc', 'cc', 'cc']), bottom: ['cc', 'cc'] } },
    leg: { size: [3, 20, 3], base: 'p', faces: { ...sides([...Array.from({ length: 18 }, (_, row) => (row === 9 ? 'rrr' : 'ppp')), 'ccc', 'ccc']), bottom: ['ccc', 'ccc', 'ccc'] } },
  },
};

// After the button in the ancient city, The Rake is loose. Every so often, in any zone, it comes up
// behind you and follows, always at your back: you only hear it breathe. Turn around and look at
// it and it screams in your face, then covers its eyes with its hands, shaking and wailing, and
// then it runs you down. Sprint and it cannot catch you; enough hits and it flees; if it reaches
// you, that is the end of that life. Never look, and after a while it loses interest.
export function Rake() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const { skin, material } = useSkin(RAKE);
  const materials = useMemo(() => [material], [material]);
  const damage = useDamage(root, materials, HEIGHT);
  const state = useRef({ nextAt: -1, phase: 'gone' as Phase, since: 0, hp: HP, soundAt: 0, stride: 0 });

  // its clips only load once it is loose
  useEffect(() => {
    if (useEndGame.getState().flags.buttonPressed) prefetch(['rake', 'scream', 'breath']);
  }, []);

  // `survived`: it gave up or fled, rather than getting you
  const vanish = (survived = true) => {
    const s = state.current;
    const group = root.current;
    if (s.phase === 'gone' || !group) return;
    const seen = s.phase !== 'stalking';
    s.phase = 'gone';
    group.visible = false;
    s.nextAt = runtime.time + between(AGAIN) / (season() === 'halloween' ? 2 : 1);
    if (!seen) return;
    spawnEffect('poof', group.position.clone().setY(group.position.y + 1.4));
    const game = useEndGame.getState();
    if (survived && !game.dead && !game.flags.rakeSurvived) {
      game.setFlag('rakeSurvived');
      game.advance('goal', 'advRake', 'totem');
      window.setTimeout(() => useEndGame.getState().say('lineRake', BFUUNY), game.flags.rakeMet ? 1500 : 5500);
    }
    if (game.flags.rakeMet) return;
    game.setFlag('rakeMet');
    window.setTimeout(() => useEndGame.getState().say('rakeBfuuny', BFUUNY), 1500);
    window.setTimeout(() => useEndGame.getState().say('rakeBlaster', BLASTER), 3500);
  };

  useMobTarget(root, [0.9, HEIGHT, 0.9], {
    label: () => null,
    solid: true,
    hit: (amount) => {
      const s = state.current;
      if (s.phase !== 'panic' && s.phase !== 'chasing') return;
      s.hp -= amount;
      damage.hurt();
      cue('rake', 0.5);
      if (s.hp <= 0) vanish();
    },
  });

  // the pose: arms hanging, hands over the face, or flailing as it runs
  const pose = (phase: Phase, age: number) => {
    const s = state.current;
    const [right, left] = arms.current;
    const [rightElbow, leftElbow] = elbows.current;
    const shake = phase === 'panic' ? Math.sin(runtime.time * 60) * 0.04 : 0;
    if (body.current) {
      body.current.rotation.x = phase === 'chasing' ? 0.35 : phase === 'panic' ? 0.25 : 0.12;
      body.current.position.x = shake;
    }
    if (head.current) head.current.rotation.set(phase === 'panic' ? 0.35 : 0, 0, phase === 'stalking' ? 0.35 + Math.sin(runtime.time * 0.7) * 0.05 : 0);
    if (phase === 'panic') {
      // both hands come up over the eyes within half a second: elbows out front, forearms folded up
      const up = Math.min(1, age / 0.5);
      right?.rotation.set(-0.7 * up + shake, 0, 0.5 * up);
      left?.rotation.set(-0.7 * up - shake, 0, -0.5 * up);
      rightElbow?.rotation.set(-2.6 * up, 0, 0);
      leftElbow?.rotation.set(-2.6 * up, 0, 0);
    } else if (phase === 'chasing') {
      right?.rotation.set(Math.sin(s.stride) * 1.3 - 0.4, 0, -0.25);
      left?.rotation.set(-Math.sin(s.stride) * 1.3 - 0.4, 0, 0.25);
      rightElbow?.rotation.set(-0.4, 0, 0);
      leftElbow?.rotation.set(-0.4, 0, 0);
    } else {
      right?.rotation.set(Math.sin(runtime.time * 0.9) * 0.06, 0, -0.05);
      left?.rotation.set(-Math.sin(runtime.time * 0.9) * 0.06, 0, 0.05);
      rightElbow?.rotation.set(0, 0, 0);
      leftElbow?.rotation.set(0, 0, 0);
    }
    legs.current.forEach((leg, index) => leg?.rotation.set(phase === 'panic' ? 0 : Math.sin(s.stride + index * Math.PI) * (phase === 'chasing' ? 0.9 : 0.4), 0, 0));
  };

  useFrame((_, delta) => {
    const group = root.current;
    const world = runtime.world;
    const s = state.current;
    const game = useEndGame.getState();
    if (!group || !world || !game.checkpoint || !game.flags.buttonPressed || !HAUNTS.includes(game.zone)) return;
    if (s.nextAt < 0) s.nextAt = runtime.time + between(FIRST);
    const p = runtime.player;
    const ending = game.zone === 'endcity' && game.flags.keeperMet;
    if (s.phase === 'gone') {
      group.visible = false;
      if (ending || runtime.time < s.nextAt || game.paused || game.dead || game.transition || game.panel) return;
      s.phase = 'stalking';
      s.since = runtime.time;
      s.soundAt = runtime.time + 2;
      s.hp = HP;
      group.visible = true;
    }
    if (game.dead || game.transition || ending) {
      vanish();
      return;
    }
    if (game.paused || game.panel) return;
    const dt = Math.min(delta, 0.05);
    const age = runtime.time - s.since;
    toward.set(p.pos.x - group.position.x, 0, p.pos.z - group.position.z);
    const distance = toward.length();
    group.rotation.y = Math.atan2(toward.x, toward.z);

    if (s.phase === 'stalking') {
      // it keeps to your back, moving only where you are not looking
      goal.set(p.pos.x + Math.sin(p.yaw) * STALK_DISTANCE, 0, p.pos.z + Math.cos(p.yaw) * STALK_DISTANCE);
      if (age < 0.05) group.position.copy(goal);
      eyeTo.set(group.position.x, group.position.y + 2.4, group.position.z).sub(p.eye);
      const range = eyeTo.length();
      eyeTo.normalize();
      const seen = range < SEEN_RANGE && eyeTo.dot(p.look) > SEEN_COS && !castBlocks(world, p.eye, eyeTo, range - 0.8, solidCell(world));
      if (seen && age > 1) {
        // the screamer, then the fit
        s.phase = 'panic';
        s.since = runtime.time;
        s.soundAt = runtime.time + 0.9;
        game.scare();
        cue('scream');
        return;
      }
      if (!seen) {
        const gap = Math.hypot(goal.x - group.position.x, goal.z - group.position.z);
        if (gap > 0.1) {
          group.position.lerp(goal.setY(group.position.y), Math.min(1, (STALK_SPEED * dt) / gap));
          s.stride += dt * 6;
        }
        group.position.y = surface(world, group.position.x, group.position.z, p.pos.y);
      }
      // you only hear it: breathing just behind you
      if (runtime.time > s.soundAt) {
        s.soundAt = runtime.time + 3 + Math.random() * 3;
        cue('breath', 0.6 + Math.random() * 0.3);
      }
      pose('stalking', age);
      if (age > STALK_S) vanish();
      return;
    }

    if (s.phase === 'panic') {
      // hands over its eyes, wailing, before it comes for you
      if (runtime.time > s.soundAt) {
        s.soundAt = runtime.time + 2.2 + Math.random() * 0.4;
        cue('rake', 0.9);
      }
      pose('panic', age);
      if (age > PANIC_S) {
        s.phase = 'chasing';
        s.since = runtime.time;
        s.soundAt = runtime.time + 2;
      }
      return;
    }

    if (distance > 0.9) {
      const step = Math.min(distance - 0.9, SPEED * dt);
      group.position.addScaledVector(toward.normalize(), step);
      group.position.y = surface(world, group.position.x, group.position.z, group.position.y);
      s.stride += dt * 11;
    }
    pose('chasing', age);
    if (runtime.time > s.soundAt) {
      s.soundAt = runtime.time + 3.5 + Math.random() * 1.5;
      cue('rake', 0.7);
    }
    if (distance < 1.3 && Math.abs(p.pos.y - group.position.y) < 2) {
      cue('rake', 1.2);
      game.hurt(999, 'rake');
      vanish(false);
    } else if (age > CHASE_S) vanish();
  });

  return (
    <group ref={root} visible={false}>
      <group scale={SCALE}>
        {[-2.5, 2.5].map((x, index) => (
          <group
            key={x}
            ref={(leg) => {
              legs.current[index] = leg;
            }}
            position={[x * PX, 20 * PX, 0]}
          >
            <Box skin={skin} name="leg" at={[0, -10, 0]} material={material} />
          </group>
        ))}
        {/* the upper body leans from the hips, a little hunched even at rest */}
        <group ref={body} position={[0, 20 * PX, 0]}>
          <Box skin={skin} name="torso" at={[0, 7, 0]} material={material} />
          {[-5, 5].map((x, index) => (
            <group
              key={x}
              ref={(arm) => {
                arms.current[index] = arm;
              }}
              position={[x * PX, 13 * PX, 0]}
            >
              <Box skin={skin} name="upper" at={[0, -8, 0]} material={material} />
              <group
                ref={(elbow) => {
                  elbows.current[index] = elbow;
                }}
                position={[0, -16 * PX, 0]}
              >
                <Box skin={skin} name="forearm" at={[0, -8, 0]} material={material} />
              </group>
            </group>
          ))}
          <group ref={head} position={[0, 14 * PX, 0.5 * PX]}>
            <Box skin={skin} name="head" at={[0, 3.5, 0]} material={material} />
          </group>
        </group>
      </group>
    </group>
  );
}
