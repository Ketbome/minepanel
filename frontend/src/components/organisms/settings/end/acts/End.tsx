'use client';

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cue, prefetch, startAmbience, stopAmbience } from '../end-audio';
import { spawnEffect } from '../engine/Effects';
import { spawnProjectile } from '../engine/Projectiles';
import { playerCenter, runtime } from '../engine/runtime';
import { Sun } from '../engine/Sun';
import { World } from '../engine/world';
import { WorldMesh } from '../engine/WorldMesh';
import { countOf } from '../items';
import { EnderDragon, type DragonMode } from '../mobs/dragon';
import { DragonEgg, EndCrystal, EndGateway, Enderman, HealingBeam, XpOrbs } from '../mobs/end';
import { useRespawns } from '../mobs/parts';
import { BLASTER, CRYSTAL_COUNT, DRAGON_MAX_HP, saveDragonEgg, useEndGame } from '../store';
import { kit, VoxelMesh } from '../voxels';
import { buildMainIsland, cageBars, EndSky, ExitPortal, PILLAR_TOP_Y, PILLARS, PLATFORM, surfaceY, TOMB, type SceneFx } from './end-world';
import { Sign, Torch } from './props';

// The End on foot: shoot the crystals, strike the dragon when it lands on the portal, dodge its
// fireballs, its dives and the purple breath they leave. Then choose: the exit portal, or a pearl into the gateway.

// the island's endermen; a new one turns up a while after one dies, so pearls never run out
const ENDERMEN = [3, 8, 13, 21, 34];
// the sixth keeps watch over the tomb, still holding a block of grass from the Overworld
const KEEPER_HOME = new THREE.Vector3(22.8, surfaceY(22.8, 2.6), 2.6);
const KEEPER_FACING = Math.atan2(TOMB.x - KEEPER_HOME.x, TOMB.z - KEEPER_HOME.z);
const BREATH = new THREE.CylinderGeometry(1, 1, 0.8, 16, 1, true);
const CLOUDS = 12;
const UP = new THREE.Vector3(0, 1, 0);
const center = new THREE.Vector3();
const aim = new THREE.Vector3();

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
      {Array.from({ length: CLOUDS }, (_, index) => (
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
  const director = useRef({
    t: 0,
    titled: false,
    announced: false,
    greeted: false,
    started: false,
    warned: false,
    perched: false,
    whispered: false,
    enraged: false,
    mode: 'circle' as DragonMode,
    fireAt: 10,
    breathAt: 0,
    breathFire: 0,
    buffetAt: 0,
    crossed: false,
    pearlHint: false,
  });
  const ambient = useRef<THREE.AmbientLight>(null);
  const fxLight = useRef<THREE.PointLight>(null);
  const endermen = useRespawns(25);

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
    if (!game.flags.endermanKilled) {
      later(3500, () => {
        const state = useEndGame.getState();
        state.advance('goal', 'advPacifist', 'pearl');
        state.say('linePacifist', BLASTER);
      });
    }
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
    later(4800, () => useEndGame.getState().say('victoryKetbome'));
    later(6000, () => useEndGame.getState().say('victoryBlaster', BLASTER));
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

  // the gateway leads to the admins' islet
  const onGatewayPearl = useCallback(() => {
    const game = useEndGame.getState();
    if (game.stage !== 'victory') return;
    game.exit('gateway');
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

  const onDragonMode = (mode: DragonMode) => {
    const run = director.current;
    const game = useEndGame.getState();
    run.mode = mode;
    if (mode === 'takeoff') {
      run.breathFire = 0;
      game.showActionBar('hintTakeoff');
    }
    if (mode === 'charge') game.showActionBar('hintCharge');
    if (mode !== 'perch') return;
    game.showActionBar('hintPerch');
    run.breathAt = run.t + 3;
    if (run.perched) return;
    run.perched = true;
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
      // the crystals need a bow, and the bow is crafted now: whoever comes without one gets his
      if (!countOf(game.inventory, 'bow')) {
        game.give('bow');
        if (!countOf(game.inventory, 'arrow')) game.give('arrow', 16);
        game.say('blasterBow', BLASTER);
      }
      game.showActionBar('hintCrystalsBow');
    }

    const enraged = game.stage === 'dragon' && game.dragonHp <= DRAGON_MAX_HP / 2;
    if (enraged && !run.enraged) {
      run.enraged = true;
      game.showActionBar('hintEnraged');
      cue('growl', 1);
      fx.light = 1;
      fx.lightAt.copy(dragon);
      fx.shake += 0.8;
    }
    const perched = run.mode === 'perch';

    // circling, the dragon spits fireballs; where they land, a breath cloud lingers. Enraged it
    // fires three at once, faster, at where you are about to be
    if ((game.stage === 'crystals' || game.stage === 'dragon') && !game.dead && run.t > run.fireAt && (run.mode === 'circle' || run.mode === 'flyby')) {
      run.fireAt = run.t + (game.stage === 'crystals' ? 8 + Math.random() * 4 : enraged ? 3 + Math.random() * 1.5 : 4.5 + Math.random() * 2);
      const speed = enraged ? 16 : 13;
      playerCenter(center);
      if (enraged) center.addScaledVector(aim.copy(runtime.player.vel).setY(0), Math.min(1.5, center.distanceTo(dragon) / speed));
      const dir = center.clone().sub(dragon).normalize();
      (enraged ? [-0.14, 0, 0.14] : [0]).forEach((spread) => {
        const heading = dir.clone().applyAxisAngle(UP, spread);
        spawnProjectile({
          kind: 'dragonball',
          pos: dragon.clone().addScaledVector(heading, 3),
          vel: heading.multiplyScalar(speed),
          gravity: 0,
          fromPlayer: false,
          damage: 4,
          cause: 'dragon',
          onLand: (at) => {
            spawnEffect('burst', at, '#c34dff');
            runtime.clouds.push({ pos: at.clone(), radius: 3, until: runtime.time + 6 });
          },
        });
      });
      cue('fireball');
    }
    // perched, it growls, then breathes a line of clouds toward you
    if (game.stage === 'dragon' && perched && !run.breathFire && run.t > run.breathAt) {
      run.breathAt = run.t + (enraged ? 4.5 : 7);
      run.breathFire = run.t + 0.8;
      cue('growl');
    }
    if (game.stage === 'dragon' && perched && run.breathFire && run.t > run.breathFire) {
      run.breathFire = 0;
      const p = runtime.player.pos;
      aim.set(p.x, 0, p.z);
      if (aim.length() < 0.5) aim.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      aim.normalize();
      [2, 5, 8, 11].forEach((reach) => {
        const x = aim.x * reach;
        const z = aim.z * reach;
        const at = new THREE.Vector3(x, surfaceY(x, z), z);
        runtime.clouds.push({ pos: at, radius: 2.2, until: runtime.time + 5 });
        spawnEffect('burst', at, '#c34dff');
      });
    }
    // perched, its wings throw back whoever gets under it
    if (game.stage === 'dragon' && perched && !game.dead && run.t > run.buffetAt) {
      const p = runtime.player.pos;
      const away = Math.hypot(p.x, p.z);
      if (away < 4 && p.y < PILLAR_TOP_Y + 4) {
        run.buffetAt = run.t + 1.5;
        aim.set(p.x, 0, p.z);
        if (away < 0.1) aim.set(1, 0, 0);
        aim.normalize();
        game.hurt(3, 'dragon');
        runtime.player.vel.set(aim.x * 13, 7, aim.z * 13);
        cue('wind');
      }
    }
    // flying low past you, it knocks you back; a dive hits harder
    if ((game.stage === 'crystals' || game.stage === 'dragon') && !perched) {
      playerCenter(center);
      if (center.distanceTo(dragon) < 3.5) {
        const charging = run.mode === 'charge';
        game.hurt(charging ? 8 : 5, 'dragon');
        runtime.player.vel.add(center.clone().sub(dragon).normalize().multiplyScalar(charging ? 16 : 10)).setY(charging ? 10 : 8);
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
    if (ambient.current) ambient.current.intensity = 1.3 + fx.flash * 1.4;
  });

  return (
    <>
      <color attach="background" args={['#130e1b']} />
      <fog attach="fog" args={['#130e1b', 60, 220]} />
      <ambientLight ref={ambient} intensity={1.3} color="#ddd3ea" />
      <Sun position={[20, 50, 12]} intensity={2.3} color="#fff4e0" />
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
      <EnderDragon report={dragon} onHit={hitDragon} onMode={onDragonMode} onVanish={onVanish} />
      {ENDERMEN.map((seed) => {
        const life = endermen.life(String(seed));
        return <Enderman key={`${seed}:${life}`} seed={seed + life * 101} onTeleport={burst} onNotice={onNotice} onDeath={() => {
              useEndGame.getState().setFlag('endermanKilled');
              endermen.died(String(seed));
            }}
          />;
      })}
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
