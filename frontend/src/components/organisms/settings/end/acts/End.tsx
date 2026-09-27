'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { spawnProjectile } from '../engine/Projectiles';
import { playerCenter, runtime } from '../engine/runtime';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { countOf } from '../items';
import { EnderDragon } from '../mobs/dragon';
import { DragonEgg, EndCrystal, EndGateway, Enderman, HealingBeam, XpOrbs } from '../mobs/end';
import { CRYSTAL_COUNT, saveDragonEgg, saveGhost, useEndGame } from '../store';
import { kit, VoxelMesh } from '../voxels';
import { buildMainIsland, cageBars, EndSky, ExitPortal, PILLARS, PLATFORM, surfaceY, TOMB, type SceneFx } from './end-world';
import { Sign, Torch } from './props';

// The End on foot: shoot the crystals, strike the dragon when it lands on the portal, dodge its
// fireballs and the purple breath they leave. Then choose: the exit portal, or a pearl into the gateway.

const ENDERMEN = [3, 8, 13, 21, 34];
// the sixth keeps watch over the tomb, still holding a block of grass from the Overworld
const KEEPER_HOME = new THREE.Vector3(22.8, surfaceY(22.8, 2.6), 2.6);
const KEEPER_FACING = Math.atan2(TOMB.x - KEEPER_HOME.x, TOMB.z - KEEPER_HOME.z);
const BREATH = new THREE.CylinderGeometry(1, 1, 0.8, 16, 1, true);
const center = new THREE.Vector3();

// the purple clouds the dragon leaves; standing in one hurts
function BreathClouds() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c34dff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    meshes.current.forEach((mesh, index) => {
      const cloud = runtime.clouds[index];
      if (!mesh) return;
      mesh.visible = Boolean(cloud);
      if (!cloud) return;
      mesh.position.copy(cloud.pos).setY(cloud.pos.y + 0.4);
      mesh.scale.set(cloud.radius, 1 + Math.sin(runtime.time * 4) * 0.1, cloud.radius);
    });
  });
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          geometry={BREATH}
          material={material}
          visible={false}
        />
      ))}
    </>
  );
}

export function End() {
  const world = useMemo(() => {
    const island = new World();
    buildMainIsland(island);
    return island;
  }, []);
  const bars = useMemo(() => cageBars(), []);
  const dragon = useMemo(() => new THREE.Vector3(-30, 19, -5), []);
  const fx = useMemo<SceneFx>(() => ({ shake: 0, flash: 0, light: 0, lightAt: new THREE.Vector3() }), []);
  const [orbs, setOrbs] = useState<THREE.Vector3 | null>(null);
  const [gateway, setGateway] = useState(false);
  const leaving = useEndGame((state) => state.exitTo === 'gateway');
  const timers = useRef<number[]>([]);
  const director = useRef({ t: 0, titled: false, announced: false, greeted: false, started: false, warned: false, perched: false, whispered: false, fireAt: 10, breathAt: 0, crossed: false, pearlHint: false });
  const ambient = useRef<THREE.AmbientLight>(null);
  const fxLight = useRef<THREE.PointLight>(null);

  useEffect(() => {
    runtime.world = world;
    runtime.voidY = -40;
    useEndGame.getState().setCheckpoint(PLATFORM.x + 0.5, PLATFORM.y + 0.5, PLATFORM.z + 0.5, Math.PI / 2);
    startAmbience('end');
    prefetch(['growl', 'dragonHurt', 'explode', 'arrowHit', 'bowShoot', 'enderman']);
    const pending = timers.current;
    return () => {
      stopAmbience();
      pending.forEach((timer) => window.clearTimeout(timer));
      runtime.world = null;
      runtime.clouds = [];
    };
  }, [world]);

  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const burst = useCallback((at: THREE.Vector3) => spawnEffect('burst', at), []);

  const explode = (at: THREE.Vector3, shake: number) => {
    spawnEffect('explosion', at);
    fx.light = 1;
    fx.lightAt.copy(at);
    fx.shake += shake;
  };

  const breakCrystal = useCallback(
    (index: number) => {
      const game = useEndGame.getState();
      if ((game.stage !== 'crystals' && game.stage !== 'arrival') || !game.crystals[index]) return;
      if (game.crystals.filter(Boolean).length === CRYSTAL_COUNT) later(1500, () => useEndGame.getState().say('ghostCrystal'));
      game.destroyCrystal(index);
      explode(PILLARS[index].crystal, 0.6);
      cue('explode');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const hitDragon = (damage: number) => {
    const game = useEndGame.getState();
    if (game.stage === 'crystals') {
      game.damageDragon(damage);
      game.showActionBar('hintHealing');
      later(1200, () => useEndGame.getState().healDragon());
    } else if (game.stage === 'dragon') {
      game.damageDragon(damage);
    } else {
      return;
    }
    cue('dragonHurt');
  };

  const onVanish = () => {
    explode(dragon, 1);
    cue('vanish');
    setOrbs(dragon.clone());
    const game = useEndGame.getState();
    game.advance('goal', 'advFreeEnd', 'dragon');
    later(1300, () => {
      useEndGame.getState().openPortal();
      cue('portal');
    });
    later(2200, () => useEndGame.getState().say('ghostVictory'));
    later(2800, () => {
      setGateway(true);
      cue('gateway');
    });
    later(3800, () => useEndGame.getState().showActionBar('hintPortal'));
    later(4800, () => useEndGame.getState().voices('voiceAlmost', 'voiceChoose'));
    later(6600, () => {
      const state = useEndGame.getState();
      if (state.stage !== 'victory') return;
      state.say('ghostGateway');
      state.setFlag('gatewayHinted');
      state.showActionBar(countOf(state.inventory, 'pearl') ? 'hintGatewayPearl' : 'hintNoPearl');
    });
  };

  const onCaught = () => {
    const game = useEndGame.getState();
    saveDragonEgg();
    game.catchEgg();
    game.give('egg');
    game.advance('goal', 'advNextGen', 'egg');
  };

  // crossing is the choice: from here on, the next run's note and diary carry your name
  const onGatewayPearl = useCallback(() => {
    const game = useEndGame.getState();
    if (game.stage !== 'victory') return;
    game.exit('gateway');
    saveGhost(game.player);
    cue('travel');
    game.travel('endcity', 'arrive', 'portal');
  }, []);

  const onNotice = () => {
    if (director.current.warned) return;
    director.current.warned = true;
    useEndGame.getState().showActionBar('hintEnderman');
  };

  const onWatched = () => {
    if (director.current.whispered) return;
    director.current.whispered = true;
    useEndGame.getState().say('ghostNotYet');
  };

  const onPerched = () => {
    const game = useEndGame.getState();
    game.showActionBar('hintPerch');
    director.current.breathAt = director.current.t + 3;
    if (director.current.perched) return;
    director.current.perched = true;
    game.say('ghostPerch');
  };

  useFrame((_, delta) => {
    const run = director.current;
    const game = useEndGame.getState();
    if (!game.checkpoint) return;
    const dt = Math.min(delta, 0.1);
    run.t += dt;
    if (!run.titled && run.t > 0.9) {
      run.titled = true;
      game.showTitle('endTitle', 'endTagline');
    }
    if (!run.announced && run.t > 2) {
      run.announced = true;
      game.advance('task', 'advEnterEnd', 'pearl');
    }
    if (!run.greeted && run.t > 3.6) {
      run.greeted = true;
      game.say('ghostArrival');
    }
    if (!run.started && run.t > 6) {
      run.started = true;
      if (game.stage === 'arrival') game.setStage('crystals');
      game.showActionBar('hintCrystalsBow');
    }

    // the dragon spits a fireball now and then; where it lands, a breath cloud lingers
    if ((game.stage === 'crystals' || game.stage === 'dragon') && !game.dead && run.t > run.fireAt && !run.perched) {
      run.fireAt = run.t + 8 + Math.random() * 4;
      playerCenter(center);
      const from = dragon.clone();
      const dir = center.clone().sub(from).normalize();
      spawnProjectile({
        kind: 'dragonball',
        pos: from.addScaledVector(dir, 3),
        vel: dir.multiplyScalar(13),
        gravity: 0,
        fromPlayer: false,
        damage: 4,
        cause: 'dragon',
        onLand: (at) => {
          spawnEffect('burst', at, '#c34dff');
          runtime.clouds.push({ pos: at.clone(), radius: 3, until: runtime.time + 6 });
        },
      });
      cue('fireball');
    }
    // perched, it breathes over the fountain every few seconds
    if (game.stage === 'dragon' && run.perched && run.t > run.breathAt) {
      run.breathAt = run.t + 7;
      runtime.clouds.push({ pos: new THREE.Vector3(Math.random() * 4 - 2, surfaceY(0, 0), Math.random() * 4 - 2), radius: 3.5, until: runtime.time + 4 });
      cue('growl');
    }
    // flying low past you, it knocks you back
    if ((game.stage === 'crystals' || game.stage === 'dragon') && !run.perched) {
      playerCenter(center);
      if (center.distanceTo(dragon) < 3.5) {
        game.hurt(5, 'dragon');
        runtime.player.vel.add(center.clone().sub(dragon).normalize().multiplyScalar(10)).setY(8);
      }
    }

    // the exit portal, once open, is a pool you step into
    const p = runtime.player.pos;
    if (game.portalOpen && game.stage === 'victory' && !run.crossed && Math.hypot(p.x, p.z) < 2.6 && Math.hypot(p.x, p.z) > 0.6 && p.y < 1.4) {
      run.crossed = true;
      game.exit('portal');
      cue('travel');
      game.travel('poem', 'arrive', 'white');
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
      <fog attach="fog" args={['#130e1b', 60, 220]} />
      <ambientLight ref={ambient} intensity={1.9} color="#ddd3ea" />
      <directionalLight position={[20, 50, 12]} intensity={1.5} color="#fff4e0" />
      <pointLight ref={fxLight} color="#ffd9f5" intensity={0} distance={50} decay={1.4} />

      <EndSky fx={fx} />
      <WorldMesh world={world} />
      <VoxelMesh blocks={bars} material={kit().mat.iron} />
      <ExitPortal />
      {[
        [0.62, 3.1, 0],
        [-0.62, 3.1, 0],
        [0, 3.1, 0.62],
        [0, 3.1, -0.62],
      ].map((position) => (
        <Torch key={position.join(':')} position={position as [number, number, number]} />
      ))}
      {PILLARS.map((pillar, index) => (
        <EndCrystal key={`${pillar.x}:${pillar.z}`} index={index} onBreak={breakCrystal} />
      ))}
      <HealingBeam dragon={dragon} />
      <EnderDragon report={dragon} onHit={hitDragon} onPerched={onPerched} onVanish={onVanish} />
      {ENDERMEN.map((seed) => (
        <Enderman key={seed} seed={seed} onTeleport={burst} onNotice={onNotice} />
      ))}
      <Enderman seed={55} carrying={{ home: KEEPER_HOME, facing: KEEPER_FACING, holding: true, leave: leaving }} onTeleport={burst} onNotice={onWatched} />
      <Sign id="tomb" at={[TOMB.x, surfaceY(TOMB.x, TOMB.z) + 0.5, TOMB.z]} facing={Math.PI / 2} />
      <DragonEgg onTeleport={burst} onCaught={onCaught} />
      <BreathClouds />
      {orbs && <XpOrbs from={orbs} onCollect={(share) => useEndGame.getState().setXp(share)} />}
      {gateway && <EndGateway onPearl={onGatewayPearl} />}

      <Sparkles count={60} scale={[90, 30, 90]} position={[0, 10, 0]} size={2.5} speed={0.25} color="#d8b4fe" opacity={0.5} />
    </>
  );
}
