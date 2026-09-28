'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bfuunyLaughs } from '../acts/props';
import { cue } from '../end-audio';
import { countOf, ITEMS, type ItemId } from '../items';
import { CRACK_STAGES, overworldKit } from '../overworld-voxels';
import { MAX_HP, useEndGame } from '../store';
import { tickClock } from './clock';
import { consumeEdges, held, input, pressLeft, pressRight, releaseAll } from './input';
import { canStepUp, cellsInBody, GRAVITY, HALF_WIDTH, HEIGHT, JUMP_SPEED, move } from './physics';
import { aimable, castBlocks, castTargets } from './raycast';
import { cellKey, BLOCKS } from './world';
import { EYE_HEIGHT, runtime, SNEAK_EYE, type Target } from './runtime';

const SENSITIVITY = 0.0023;
const MELEE_REACH = 3.6;
const USE_REACH = 5;
export const WALK = 4.3;
const SPRINT = 5.6;
const SNEAK = 1.3;
const OUTLINE = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
const CRACK = new THREE.BoxGeometry(1.006, 1.006, 1.006);
const SIZE = new THREE.Vector3();
const CENTER = new THREE.Vector3();
const SPOT = new THREE.Vector3();
// holding right click keeps placing, a little slower than the game's four ticks
const PLACE_REPEAT_S = 0.25;

const DAMAGE: Partial<Record<ItemId, number>> = { sword: 7, pickaxe: 5 };

// the hand's action for a held item when the crosshair is on nothing usable
function applyHeld(item: ItemId | undefined, look: THREE.Vector3, eye: THREE.Vector3) {
  if (!item) return;
  if (runtime.hooks.useItem?.(item)) return;
  const game = useEndGame.getState();
  if (item === 'map') game.openPanel({ kind: 'map' });
  else if (item === 'note') game.openPanel({ kind: 'book', id: 'note' });
  else if (item === 'register') game.openPanel({ kind: 'book', id: 'register' });
  else if (item === 'helmet' && !game.helmet) {
    game.wearHelmet();
    cue('equip');
  }
  else if (item === 'pearl' && game.spend('pearl')) {
    cue('throw');
    runtime.projectiles.push({
      kind: 'pearl',
      pos: eye.clone().addScaledVector(look, 0.6),
      vel: look.clone().multiplyScalar(22),
      gravity: 16,
      fromPlayer: true,
      damage: 0,
      cause: 'fall',
      age: 0,
      done: false,
      // like the game: you land where it lands, and it stings a little
      onLand: (at) => {
        runtime.player.pos.copy(at).setY(at.y + 0.05);
        runtime.player.vel.set(0, 0, 0);
        runtime.player.peak = runtime.player.pos.y;
        cue('enderman');
        useEndGame.getState().hurt(2, 'fall');
        if (Math.random() < 1 / 20) runtime.hooks.pearl?.(at.clone());
      },
    });
  }
}

export function Player() {
  const { camera, gl } = useThree();
  const outline = useRef<THREE.LineSegments>(null);
  const crack = useRef<THREE.Mesh>(null);
  const cracks = overworldKit().mat.cracks;
  const state = useRef({ spawned: -1, zone: '', breathAt: 0, mining: -1, progress: 0, cooldown: 0, charge: 0, eating: 0, stride: 0, regenAt: 0, hp: MAX_HP, fov: 70, placeAt: 0 });
  const scratch = useMemo(() => ({ wish: new THREE.Vector3(), delta: new THREE.Vector3(), forward: new THREE.Vector3(), right: new THREE.Vector3() }), []);

  useEffect(() => {
    const canvas = gl.domElement;
    runtime.canvas = canvas;
    input.touch = matchMedia('(pointer: coarse)').matches;
    const locked = () => document.pointerLockElement === canvas;
    const playing = () => {
      const game = useEndGame.getState();
      return !game.panel && !game.dead && !game.paused && !game.transition;
    };
    let escapeDown = false;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') escapeDown = true;
      if (!playing()) return;
      input.keys.add(event.code);
      // Ctrl is sprint: without this Ctrl+S or Ctrl+D open the browser's save or bookmark dialog mid-run
      if (event.ctrlKey && /^Key[WASD]$/.test(event.code)) event.preventDefault();
      if (event.code === 'Space') {
        input.jumpPressed = true;
        event.preventDefault();
      }
      if (/^Digit[1-9]$/.test(event.code)) useEndGame.getState().select(Number(event.code.slice(5)) - 1);
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') escapeDown = false;
      input.keys.delete(event.code);
    };
    const blur = () => {
      escapeDown = false;
      releaseAll();
    };
    const mousedown = (event: MouseEvent) => {
      if (!locked()) return;
      if (event.button === 0) pressLeft(true);
      if (event.button === 2) pressRight(true);
    };
    const mouseup = (event: MouseEvent) => {
      if (event.button === 0) pressLeft(false);
      if (event.button === 2) pressRight(false);
    };
    const mousemove = (event: MouseEvent) => {
      if (!locked()) return;
      input.dx += event.movementX;
      input.dy += event.movementY;
    };
    const wheel = (event: WheelEvent) => {
      if (locked()) input.wheel += Math.sign(event.deltaY);
    };
    const click = () => {
      if (!input.touch && !locked() && playing()) void Promise.resolve(canvas.requestPointerLock()).catch(lockError);
    };
    // losing the lock mid-game (Escape, alt-tab) pauses instead of leaving the run
    let lockedAt = 0;
    let relock = 0;
    const lockChange = () => {
      releaseAll();
      const game = useEndGame.getState();
      if (locked()) {
        lockedAt = performance.now();
        game.setResume(false);
      } else if (!input.touch && playing() && !game.resume) {
        // a lock lost the moment it came back is the browser taking the key that closed a
        // window as "leave the lock", not the player pausing
        if (performance.now() - lockedAt < 500) game.setResume(true);
        else game.setPaused(true);
      }
    };
    // the browser may refuse to take the pointer back without a click (after Escape closed a
    // window): ask for that click instead of pausing
    const lockError = () => {
      if (!input.touch && playing()) useEndGame.getState().setResume(true);
    };
    // right click is the game's "use": no browser menu anywhere over the game, not only on the
    // canvas (HUD layers sit on top of it, and some browsers deliver the click there)
    const menu = (event: Event) => event.preventDefault();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('mousedown', mousedown);
    document.addEventListener('mouseup', mouseup);
    document.addEventListener('mousemove', mousemove);
    window.addEventListener('wheel', wheel, { passive: true });
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('pointerlockerror', lockError);
    canvas.addEventListener('click', click);
    document.addEventListener('contextmenu', menu, true);
    // the panel, death screen and pause menu all need the cursor back
    const unsubscribe = useEndGame.subscribe((game, previous) => {
      const blocked = Boolean(game.panel || game.dead || game.paused);
      const was = Boolean(previous.panel || previous.dead || previous.paused);
      if (blocked && !was && locked()) document.exitPointerLock();
      if (!blocked && was && !input.touch && !locked()) {
        // only once the Escape that closed the window is back up, or the browser takes that same
        // key as "leave the lock" and drops the lock it just gave back
        const since = performance.now();
        const attempt = () => {
          if (escapeDown && performance.now() - since < 1500) {
            relock = window.setTimeout(attempt, 50);
            return;
          }
          if (!locked() && playing()) void Promise.resolve(canvas.requestPointerLock()).catch(lockError);
        };
        window.clearTimeout(relock);
        relock = window.setTimeout(attempt, 120);
      }
    });
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousedown', mousedown);
      document.removeEventListener('mouseup', mouseup);
      document.removeEventListener('mousemove', mousemove);
      window.removeEventListener('wheel', wheel);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('pointerlockerror', lockError);
      canvas.removeEventListener('click', click);
      document.removeEventListener('contextmenu', menu, true);
      unsubscribe();
      window.clearTimeout(relock);
      if (locked()) document.exitPointerLock();
      runtime.canvas = null;
      releaseAll();
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    runtime.time += dt;
    const world = runtime.world;
    const game = useEndGame.getState();
    if (game.flags.started && !game.panel && !game.dead && !game.paused && !game.transition) tickClock(dt);
    const s = state.current;
    const p = runtime.player;
    if (!world || !game.checkpoint) return;

    if (s.spawned !== game.spawnId || s.zone !== game.zone) {
      const [x, y, z, yaw] = game.checkpoint;
      p.pos.set(x, y, z);
      p.vel.set(0, 0, 0);
      p.yaw = yaw;
      p.pitch = 0;
      p.peak = y;
      p.gliding = false;
      s.spawned = game.spawnId;
      s.zone = game.zone;
    }

    const active = !game.panel && !game.dead && !game.paused && !game.transition && (input.touch || document.pointerLockElement === gl.domElement);
    const edges = consumeEdges();
    // the dead and the travelling do not fall
    if (game.dead || game.transition) {
      p.vel.set(0, 0, 0);
      return;
    }
    if (active) {
      p.yaw -= edges.dx * SENSITIVITY;
      p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch - edges.dy * SENSITIVITY));
      if (edges.wheel) game.cycle(edges.wheel);
    }

    const forward = active ? Math.max(-1, Math.min(1, Number(held('KeyW')) - Number(held('KeyS')) - input.stickY)) : 0;
    const strafe = active ? Math.max(-1, Math.min(1, Number(held('KeyD')) - Number(held('KeyA')) + input.stickX)) : 0;
    p.sneaking = active && (held('ShiftLeft') || held('ShiftRight') || input.touchSneak);
    const sprintKey = held('ControlLeft') || held('ControlRight') || input.touchSprint;
    p.sprinting = active && forward > 0.5 && !p.sneaking && (sprintKey || p.sprinting);
    const speed = p.sneaking ? SNEAK : p.sprinting ? SPRINT : WALK;
    const { wish, delta: step, forward: ahead, right } = scratch;
    ahead.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    wish.copy(ahead).multiplyScalar(forward).addScaledVector(right, strafe);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(speed);

    const now = performance.now();
    const elytra = Boolean(game.flags.elytra);
    const jumpHeld = held('Space') || input.touchJump;
    if (active && elytra && !p.onGround && !p.gliding && edges.jump && p.vel.y < 1) p.gliding = true;

    if (p.gliding) {
      // diving trades height for speed, pulling up bleeds it off, like the game's elytra
      const look = p.look;
      let glide = p.vel.length();
      glide = Math.max(3, Math.min(32, glide + (-look.y * 20 - 3) * dt));
      p.vel.copy(look).multiplyScalar(glide);
      p.vel.y -= 1.6;
    } else {
      const accel = p.onGround ? 14 : 3.5;
      p.vel.x += (wish.x - p.vel.x) * (1 - Math.exp(-accel * dt));
      p.vel.z += (wish.z - p.vel.z) * (1 - Math.exp(-accel * dt));
      if (now < game.levitateUntil) {
        p.vel.y = 2.4;
        p.lastLevitation = now;
      } else {
        p.vel.y = Math.max(-48, p.vel.y - GRAVITY * dt);
        if (active && p.onGround && (edges.jump || jumpHeld)) {
          p.vel.y = JUMP_SPEED;
          runtime.hooks.vibration?.(p.pos, 6);
        }
      }
    }

    const wasOnGround = p.onGround;
    const height = p.sneaking ? HEIGHT - 0.3 : HEIGHT;
    const moved = move(world, p.pos, step.copy(p.vel).multiplyScalar(dt), height);
    const horizontal = Math.hypot(p.vel.x, p.vel.z);
    if (p.gliding && (moved.hitX || moved.hitZ) && horizontal > 9) game.hurt(Math.round((horizontal - 9) * 1.2), 'elytra');
    if (moved.hitX) p.vel.x = 0;
    if (moved.hitZ) p.vel.z = 0;
    if (moved.hitCeiling && p.vel.y > 0) p.vel.y = 0;
    if (moved.onGround && p.vel.y <= 0) {
      const fall = p.peak - p.pos.y;
      if (!wasOnGround && fall > 3.4 && !p.gliding) game.hurt(Math.round(fall - 3), now - p.lastLevitation < 6000 ? 'shulker' : 'fall');
      if (!wasOnGround && fall > 1) {
        cue('land', Math.min(1, fall / 6));
        runtime.hooks.vibration?.(p.pos, Math.min(24, fall * 4));
      }
      p.vel.y = 0;
      p.peak = p.pos.y;
      p.gliding = false;
    } else {
      p.peak = Math.max(p.peak, p.pos.y);
    }
    if (active && p.onGround && (moved.hitX || moved.hitZ) && wish.lengthSq() > 0.5 && canStepUp(world, p.pos, wish.x, wish.z)) p.vel.y = JUMP_SPEED;
    p.onGround = moved.onGround;

    if (cellsInBody(p.pos, (x, y, z) => world.get(x, y, z) === 'lava')) {
      game.hurt(4, 'lava');
      p.vel.multiplyScalar(0.5);
    }
    if (p.pos.y < runtime.voidY) game.hurt(999, 'void');
    runtime.clouds = runtime.clouds.filter((cloud) => cloud.until > runtime.time);
    // dragon's breath stings once a second, so stepping out of it in time is always possible
    if (now > s.breathAt && runtime.clouds.some((cloud) => Math.hypot(cloud.pos.x - p.pos.x, cloud.pos.z - p.pos.z) < cloud.radius && Math.abs(cloud.pos.y - p.pos.y) < 2.5)) {
      s.breathAt = now + 1000;
      game.hurt(2, 'breath');
    }
    if (game.hp < MAX_HP && !game.dead && now - game.hurtAt > 6000 && now > s.regenAt) {
      game.heal(1);
      s.regenAt = now + 2500;
    }

    // camera
    const eyeHeight = p.sneaking ? SNEAK_EYE : EYE_HEIGHT;
    if (p.onGround && horizontal > 0.5) s.stride += horizontal * dt;
    const bob = p.onGround && !runtime.reducedMotion ? Math.sin(s.stride * Math.PI) * 0.045 * Math.min(1, horizontal / WALK) : 0;
    p.eye.set(p.pos.x, p.pos.y + eyeHeight + Math.abs(bob), p.pos.z);
    camera.position.copy(p.eye);
    camera.rotation.set(p.pitch, p.yaw, bob * 0.15, 'YXZ');
    p.look.set(0, 0, -1).applyEuler(camera.rotation);
    const cam = camera as THREE.PerspectiveCamera;
    // drawing the bow narrows the view, like the game's zoom
    const fov = runtime.reducedMotion ? 70 : 70 + (p.sprinting ? 8 : 0) + (p.gliding ? 14 : 0) - s.charge * 10;
    s.fov += (fov - s.fov) * (1 - Math.exp(-dt * 6));
    if (Math.abs(cam.fov - s.fov) > 0.01) {
      cam.fov = s.fov;
      cam.updateProjectionMatrix();
    }
    if (p.onGround && s.stride > 1.9 && active) {
      s.stride -= 1.9;
      const below = world.get(Math.round(p.pos.x), Math.round(p.pos.y - 0.5), Math.round(p.pos.z));
      if (!p.sneaking) cue(below === 'grass' || below === 'dirt' || below === 'path' || below === 'leaves' ? 'stepGrass' : 'stepStone', 0.5);
    }

    // aim: the nearest of a usable thing or a visible block within reach
    const aimed = castTargets(p.eye, p.look, USE_REACH + 1, (target) => Boolean(target.use || target.hit));
    const block = castBlocks(world, p.eye, p.look, USE_REACH, aimable(world));
    const target: Target | null = aimed && aimed.distance <= (aimed.target.reach ?? USE_REACH) && (!block || aimed.distance <= block.distance + 0.01) ? aimed.target : null;
    const onBlock = !target && block ? block : null;
    game.setAim(active && target?.label ? target.label() : null);
    const gaze = castTargets(p.eye, p.look, 64, (candidate) => Boolean(candidate.watch));
    if (active && gaze) {
      const wall = castBlocks(world, p.eye, p.look, gaze.distance, aimable(world));
      if (!wall) gaze.target.watch?.(dt);
    }

    if (outline.current) {
      outline.current.visible = active && Boolean(onBlock || (target?.use && !target.hit));
      if (onBlock) {
        outline.current.position.set(...onBlock.cell);
        outline.current.scale.set(1, 1, 1);
      } else if (target) {
        target.box.getCenter(CENTER);
        target.box.getSize(SIZE);
        outline.current.position.copy(CENTER);
        outline.current.scale.copy(SIZE);
      }
    }

    // actions
    const item = game.inventory[game.selected]?.item;
    s.cooldown -= dt;
    let mining = false;
    if (active && (input.left || edges.left)) {
      if (target?.hit && aimed!.distance <= MELEE_REACH) {
        if (s.cooldown <= 0) {
          target.hit(DAMAGE[item as ItemId] ?? 1, 'melee');
          s.cooldown = 0.5;
          game.bump();
          cue('swing');
          runtime.hooks.vibration?.(p.pos, 5);
        }
      } else if (onBlock) {
        const [x, y, z] = onBlock.cell;
        const id = world.get(x, y, z);
        const def = id ? BLOCKS[id] : undefined;
        const seconds = def && (item === 'pickaxe' ? (def.pick ?? def.mine) : def.mine);
        if (seconds) {
          mining = true;
          const key = cellKey(x, y, z);
          if (s.mining !== key) {
            s.mining = key;
            s.progress = 0;
          }
          s.progress += dt / seconds;
          if (Math.floor(s.progress * 4) !== Math.floor((s.progress - dt / seconds) * 4)) {
            cue('pick');
            game.bump();
          }
          if (s.progress >= 1) {
            world.remove(x, y, z);
            cue('dirt');
            if (def?.drop) game.give(def.drop, def.drops ?? 1);
            runtime.hooks.mined?.(x, y, z);
            runtime.hooks.vibration?.(SPOT.set(x, y, z), 12);
            s.mining = -1;
            mining = false;
          }
        }
      }
      if (edges.left && !mining && !target?.hit) game.bump();
    }
    if (!mining) {
      s.mining = -1;
      s.progress = 0;
    }
    if (crack.current) {
      crack.current.visible = mining && s.progress > 0.05;
      if (mining && onBlock) {
        crack.current.position.set(...onBlock.cell);
        crack.current.material = cracks[Math.min(CRACK_STAGES - 1, Math.floor(s.progress * CRACK_STAGES))];
      }
    }

    const placeable = item && ITEMS[item].block;
    if (active && edges.right && target?.use) {
      // the same click must not also place a block against what it just used (a portal gap's obsidian)
      s.placeAt = runtime.time + PLACE_REPEAT_S;
      target.use();
      game.bump();
    } else if (active && placeable && onBlock && (edges.right || (input.right && runtime.time > s.placeAt))) {
      // a block goes against the face you aim at, never into yourself
      s.placeAt = runtime.time + PLACE_REPEAT_S;
      const cx = onBlock.cell[0] + onBlock.normal[0];
      const cy = onBlock.cell[1] + onBlock.normal[1];
      const cz = onBlock.cell[2] + onBlock.normal[2];
      const there = world.get(cx, cy, cz);
      const reach = 0.5 + HALF_WIDTH - 0.001;
      const inside = Math.abs(cx - p.pos.x) < reach && Math.abs(cz - p.pos.z) < reach && cy + 0.5 > p.pos.y + 0.001 && cy - 0.5 < p.pos.y + height;
      if (onBlock.normal.some(Boolean) && (!there || there === 'water') && !inside) {
        world.place(cx, cy, cz, placeable);
        game.consumeHeld();
        game.bump();
        cue('place');
        runtime.hooks.placed?.(cx, cy, cz, placeable);
        runtime.hooks.vibration?.(SPOT.set(cx, cy, cz), 10);
        // Bfuuny's "treasure" turns out to be useful after all
        if (placeable === 'dirt' && !game.flags.bfuunyDirt) {
          game.setFlag('bfuunyDirt');
          bfuunyLaughs('bfuunyDirt');
        }
      }
    } else if (active && edges.right && item !== 'bow' && item !== 'apple') {
      applyHeld(item, p.look, p.eye);
      game.bump();
    }
    // the bow draws while held and fires on release; the apple is eaten while held
    if (item === 'bow' && active && input.right && countOf(game.inventory, 'arrow') > 0) {
      if (s.charge === 0) cue('bowDraw');
      s.charge = Math.min(1, s.charge + dt);
      game.setCharge(s.charge);
    } else if (s.charge > 0) {
      if (s.charge > 0.2 && game.spend('arrow')) {
        cue('bowShoot');
        game.bump();
        runtime.hooks.vibration?.(p.pos, 4);
        runtime.projectiles.push({
          kind: 'arrow',
          pos: p.eye.clone().addScaledVector(p.look, 0.5),
          vel: p.look.clone().multiplyScalar(10 + s.charge * 34),
          gravity: 14,
          fromPlayer: true,
          damage: Math.round(3 + s.charge * 6),
          cause: 'fall',
          age: 0,
          done: false,
        });
      }
      s.charge = 0;
      game.setCharge(0);
    }
    if (item === 'apple' && active && input.right && game.hp < MAX_HP) {
      if (Math.floor(s.eating * 4) !== Math.floor((s.eating + dt) * 4)) cue('eat');
      s.eating += dt;
      game.setCharge(Math.min(1, s.eating / 1.4));
      if (s.eating >= 1.4 && game.spend('apple')) {
        game.heal(8);
        s.eating = 0;
        game.setCharge(0);
      }
    } else if (s.eating > 0) {
      s.eating = 0;
      game.setCharge(0);
    }

    if (game.hp < s.hp && !game.dead) cue('hurt');
    if (game.dead && s.hp > 0) cue('death');
    s.hp = game.hp;
  });

  return (
    <>
      <lineSegments ref={outline} geometry={OUTLINE} visible={false}>
        <lineBasicMaterial color="#000000" transparent opacity={0.55} />
      </lineSegments>
      <mesh ref={crack} geometry={CRACK} material={cracks[0]} visible={false} />
    </>
  );
}
