'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, startAmbience, stopAmbience } from './end-audio';
import { saveDragonEgg, useEndGame } from './end-game-store';
import { DragonEgg, EndCrystal, EndGateway, Enderman, Explosion, HealingBeam, PortalBurst, XpOrbs } from './EndEntities';
import { EnderDragon } from './EnderDragon';
import { EndSky, ExitPortal, MainIsland, PILLARS, PLATFORM, PORTAL_SURFACE_Y, type SceneFx } from './EndWorld';
import { clamp01, easeIn, easeInOut } from './voxels';

const ARRIVAL_S = 7.5;
const ORBIT_START = 0.15;
const ENDERMEN = [3, 8, 13, 21, 34, 55];

const UP = new THREE.Vector3(0, 1, 0);
const NORTH = new THREE.Vector3(0, 0, -1);
const PLATFORM_EYE = new THREE.Vector3(PLATFORM.x, PLATFORM.y + 2.1, PLATFORM.z);
const ARRIVAL_BEND = new THREE.Vector3(62, 8, 16);
const ISLAND_LOOK = new THREE.Vector3(0, 4, 0);
// dive between the central pillar and the rim so the camera never clips the bedrock
const ABOVE_PORTAL = new THREE.Vector3(1.8, 30, 0.4);
const INTO_PORTAL = new THREE.Vector3(1.8, 0.4, 0.05);
const PORTAL_LOOK = new THREE.Vector3(1.8, -2, 0);

interface Effect {
  readonly id: number;
  readonly at: THREE.Vector3;
}

let lastEffect = 0;

function EndCamera({ dragon, fx }: { readonly dragon: THREE.Vector3; readonly fx: SceneFx }) {
  const { camera, gl, size, pointer } = useThree();
  const rig = useMemo(
    () => ({
      t: 0,
      yaw: 0,
      pitch: 0,
      drag: null as { x: number; y: number } | null,
      exitT: -1,
      exitFrom: new THREE.Vector3(),
      crossed: false,
      placed: false,
      look: new THREE.Vector3().copy(ISLAND_LOOK),
      fine: typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
    }),
    []
  );
  const scratch = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), a: new THREE.Vector3() }), []);

  // drag anywhere to swing around the island; a short tap still counts as a click
  useEffect(() => {
    const canvas = gl.domElement;
    const down = (event: PointerEvent) => {
      rig.drag = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!rig.drag) return;
      rig.yaw -= (event.clientX - rig.drag.x) * 0.005;
      rig.pitch = Math.max(-0.5, Math.min(0.8, rig.pitch + (event.clientY - rig.drag.y) * 0.003));
      rig.drag = { x: event.clientX, y: event.clientY };
    };
    const up = () => {
      rig.drag = null;
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl, rig]);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.1);
    rig.t += dt;
    const { stage, portalOpen, setAct } = useEndGame.getState();
    const portrait = size.width / size.height < 0.9;
    const radius = portrait ? 66 : 50;
    const baseFov = portrait ? 64 : 50;
    const px = rig.fine ? pointer.x : 0;
    const py = rig.fine ? pointer.y : 0;
    const { pos, look, up, a } = scratch;

    if (!rig.placed) {
      rig.placed = true;
      cam.position.copy(PLATFORM_EYE);
      cam.up.copy(UP);
      cam.fov = baseFov;
    }

    const angle = ORBIT_START + Math.max(0, rig.t - ARRIVAL_S) * 0.03 + rig.yaw + px * 0.12;
    pos.set(Math.cos(angle) * radius, 19 + rig.pitch * 14 + py * 2.5, Math.sin(angle) * radius);
    look.set(px * 2, 6 + py, 0);
    up.copy(UP);
    let fov = baseFov;
    let follow = 3;

    if (stage === 'exit') {
      if (rig.exitT < 0) {
        rig.exitT = 0;
        rig.exitFrom.copy(cam.position);
      }
      rig.exitT += dt;
      const rise = easeInOut(clamp01(rig.exitT / 1.3));
      const dive = easeIn(clamp01((rig.exitT - 1.3) / 1.3));
      pos.lerpVectors(rig.exitFrom, ABOVE_PORTAL, rise).lerp(INTO_PORTAL, dive);
      look.lerp(PORTAL_LOOK, rise);
      up.lerpVectors(UP, NORTH, rise).normalize();
      fov += dive * 45;
      follow = 30;
      if (!rig.crossed && dive > 0 && cam.position.y < PORTAL_SURFACE_Y + 0.35) {
        rig.crossed = true;
        setAct('poem');
      }
    } else if (rig.t < ARRIVAL_S) {
      // a quadratic bezier from the obsidian platform up into the orbit
      const k = easeInOut(clamp01((rig.t - 0.6) / (ARRIVAL_S - 0.6)));
      a.copy(PLATFORM_EYE).multiplyScalar((1 - k) ** 2).addScaledVector(ARRIVAL_BEND, 2 * (1 - k) * k).addScaledVector(pos, k * k);
      pos.copy(a);
      look.lerpVectors(ISLAND_LOOK, look, k);
      follow = 8;
    } else if (stage === 'dragon' || stage === 'victory') {
      // the fight moves to the fountain: climb above the pillar tops so they stop hiding it
      pos.multiplyScalar(0.85).setY(31 + rig.pitch * 14 + py * 2.5);
      if (stage === 'victory' && portalOpen) look.set(0, 2, 0);
      else look.lerp(dragon, stage === 'victory' ? 0.85 : 0.6);
      follow = 1.6;
    }

    cam.position.lerp(pos, 1 - Math.exp(-dt * follow));
    rig.look.lerp(look, 1 - Math.exp(-dt * follow));
    cam.up.lerp(up, 1 - Math.exp(-dt * follow)).normalize();
    if (fx.shake > 0.001) {
      cam.position.x += (Math.random() - 0.5) * fx.shake;
      cam.position.y += (Math.random() - 0.5) * fx.shake;
      fx.shake *= Math.exp(-dt * 6);
    }
    cam.lookAt(rig.look);
    cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 5));
    cam.updateProjectionMatrix();
  });

  return null;
}

export function EndAct() {
  const dragon = useMemo(() => new THREE.Vector3(-30, 19, -5), []);
  const fx = useMemo<SceneFx>(() => ({ shake: 0, flash: 0, light: 0, lightAt: new THREE.Vector3() }), []);
  const [explosions, setExplosions] = useState<Effect[]>([]);
  const [bursts, setBursts] = useState<Effect[]>([]);
  const [orbs, setOrbs] = useState<THREE.Vector3 | null>(null);
  const [gateway, setGateway] = useState(false);
  const timers = useRef<number[]>([]);
  const director = useRef({ t: 0, titled: false, announced: false, started: false, warned: false });
  const ambient = useRef<THREE.AmbientLight>(null);
  const fxLight = useRef<THREE.PointLight>(null);

  useEffect(() => {
    startAmbience('end');
    const pending = timers.current;
    return () => {
      stopAmbience();
      pending.forEach((timer) => window.clearTimeout(timer));
      document.body.style.cursor = '';
    };
  }, []);

  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const burst = useCallback((at: THREE.Vector3) => setBursts((list) => [...list, { id: ++lastEffect, at }]), []);

  const explode = (at: THREE.Vector3, shake: number) => {
    setExplosions((list) => [...list, { id: ++lastEffect, at: at.clone() }]);
    fx.light = 1;
    fx.lightAt.copy(at);
    fx.shake += shake;
  };

  const breakCrystal = (index: number) => {
    const game = useEndGame.getState();
    if (game.stage !== 'crystals' || !game.crystals[index]) return;
    document.body.style.cursor = '';
    game.destroyCrystal(index);
    explode(PILLARS[index].crystal, 0.6);
    cue('explode');
  };

  const hitDragon = () => {
    const game = useEndGame.getState();
    if (game.stage === 'crystals') {
      game.damageDragon(24);
      game.showActionBar('dangerEggHintHealing');
      later(1200, () => useEndGame.getState().healDragon());
    } else if (game.stage === 'dragon') {
      game.damageDragon(30 + Math.round(Math.random() * 16));
    } else {
      return;
    }
    cue('hit');
    cue('hurt');
    fx.shake += 0.15;
    if (useEndGame.getState().stage === 'victory') document.body.style.cursor = '';
  };

  const onVanish = () => {
    explode(dragon, 1);
    cue('vanish');
    setOrbs(dragon.clone());
    useEndGame.getState().advance('goal', 'dangerEggAdvFreeEnd', 'dragon');
    later(1300, () => {
      useEndGame.getState().openPortal();
      cue('portal');
      fx.shake += 0.3;
    });
    later(2800, () => {
      setGateway(true);
      cue('gateway');
    });
    later(3800, () => useEndGame.getState().showActionBar('dangerEggHintPortal'));
  };

  const onCaught = () => {
    const game = useEndGame.getState();
    saveDragonEgg();
    game.catchEgg();
    game.advance('goal', 'dangerEggAdvNextGen', 'egg');
  };

  const enterPortal = () => {
    const game = useEndGame.getState();
    if (game.stage !== 'victory' || !game.portalOpen) return;
    document.body.style.cursor = '';
    game.setStage('exit');
    cue('travel');
  };

  const onNotice = () => {
    if (director.current.warned) return;
    director.current.warned = true;
    useEndGame.getState().showActionBar('dangerEggHintEnderman');
  };

  useFrame((_, delta) => {
    const run = director.current;
    const dt = Math.min(delta, 0.1);
    run.t += dt;
    const game = useEndGame.getState();
    if (!run.titled && run.t > 0.9) {
      run.titled = true;
      game.showTitle('dangerEggEndTitle', 'dangerEggEndTagline');
    }
    if (!run.announced && run.t > 2) {
      run.announced = true;
      game.advance('task', 'dangerEggAdvEnterEnd', 'pearl');
    }
    if (!run.started && run.t > ARRIVAL_S) {
      run.started = true;
      game.setStage('crystals');
      game.showActionBar('dangerEggHintCrystals');
    }
    if (fxLight.current) {
      fxLight.current.position.copy(fx.lightAt);
      fxLight.current.intensity = fx.light * 900;
    }
    fx.light *= Math.exp(-dt * 5);
    if (ambient.current) ambient.current.intensity = 1.9 + fx.flash * 1.4;
  });

  return (
    <>
      <color attach="background" args={['#130e1b']} />
      <fog attach="fog" args={['#130e1b', 80, 260]} />
      <ambientLight ref={ambient} intensity={1.9} color="#ddd3ea" />
      <directionalLight position={[20, 50, 12]} intensity={1.5} color="#fff4e0" />
      <pointLight ref={fxLight} color="#ffd9f5" intensity={0} distance={50} decay={1.4} />

      <EndSky fx={fx} />
      <MainIsland />
      <ExitPortal onEnter={enterPortal} />
      {PILLARS.map((pillar, index) => (
        <EndCrystal key={`${pillar.x}:${pillar.z}`} index={index} onBreak={breakCrystal} />
      ))}
      <HealingBeam dragon={dragon} />
      <EnderDragon report={dragon} onHit={hitDragon} onPerched={() => useEndGame.getState().showActionBar('dangerEggHintPerch')} onVanish={onVanish} />
      {ENDERMEN.map((seed) => (
        <Enderman key={seed} seed={seed} onTeleport={burst} onNotice={onNotice} />
      ))}
      <DragonEgg onTeleport={burst} onCaught={onCaught} />

      {explosions.map((effect) => (
        <Explosion key={effect.id} at={effect.at} onDone={() => setExplosions((list) => list.filter((item) => item.id !== effect.id))} />
      ))}
      {bursts.map((effect) => (
        <PortalBurst key={effect.id} at={effect.at} onDone={() => setBursts((list) => list.filter((item) => item.id !== effect.id))} />
      ))}
      {orbs && <XpOrbs from={orbs} onCollect={(share) => useEndGame.getState().setXp(share)} />}
      {gateway && <EndGateway />}

      <Sparkles count={60} scale={[90, 30, 90]} position={[0, 10, 0]} size={2.5} speed={0.25} color="#d8b4fe" opacity={0.5} />
      <EndCamera dragon={dragon} fx={fx} />
    </>
  );
}
