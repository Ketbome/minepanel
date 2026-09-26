'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Fragment, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { cue } from './end-audio';
import { useEndGame } from './end-game-store';
import { PILLAR_TOP_Y, pointerCursor } from './EndWorld';
import { createRays } from './shaders';
import { clamp01, easeInOut, kit, sizedBox } from './voxels';

// Built from the game's own model proportions, in model pixels (16 per block):
// a 24x24x64 body, five neck and twelve tail segments with spikes, a jawed head and
// two-part wings with gray bones and sawtooth membranes. Forward is +z.

const PX = 1 / 16;
const SCALE = 0.8;
const ORBIT_RADIUS = 30;
const ORBIT_HEIGHT = 19;
const ORBIT_SPEED = 0.17;
const FLYBY_AT = 2.4;
const DIE_S = 6.2;
const PERCH = new THREE.Vector3(0, PILLAR_TOP_Y + 5.4, 0);

const MEMBRANE = new THREE.PlaneGeometry(56 * PX, 56 * PX).rotateX(-Math.PI / 2).translate(28 * PX, 0, -28 * PX);
const HIT_BODY = new THREE.SphereGeometry(58 * PX, 10, 8);
const HIT_HEAD = new THREE.SphereGeometry(22 * PX, 8, 6);

type Mode = 'circle' | 'flyby' | 'land' | 'perch' | 'die' | 'gone';
type Vec3 = readonly [number, number, number];

interface DragonMaterials {
  readonly scales: THREE.MeshLambertMaterial;
  readonly bone: THREE.MeshLambertMaterial;
  readonly membrane: THREE.MeshLambertMaterial;
  readonly eye: THREE.MeshBasicMaterial;
  readonly glow: THREE.SpriteMaterial;
}

function Part({ size, at = [0, 0, 0], material }: { readonly size: Vec3; readonly at?: Vec3; readonly material: THREE.Material }) {
  return <mesh geometry={sizedBox(size[0] * PX, size[1] * PX, size[2] * PX)} material={material} position={[at[0] * PX, at[1] * PX, at[2] * PX]} />;
}

function orbitPoint(angle: number, time: number, out: THREE.Vector3) {
  return out.set(Math.cos(angle) * ORBIT_RADIUS, ORBIT_HEIGHT + Math.sin(time * 0.5) * 2.5, Math.sin(angle) * ORBIT_RADIUS);
}

// module-level so a parent re-render never snaps the dragon back to its spawn point
const SPAWN = orbitPoint(Math.PI * 1.05, 0, new THREE.Vector3());

function Spine({
  count,
  direction,
  links,
  materials,
  children,
  index = 0,
}: {
  readonly count: number;
  readonly direction: 1 | -1;
  readonly links: RefObject<(THREE.Group | null)[]>;
  readonly materials: DragonMaterials;
  readonly children?: ReactNode;
  readonly index?: number;
}) {
  if (index >= count) return <>{children}</>;
  return (
    <group
      ref={(link) => {
        links.current[index] = link;
      }}
      position={[0, 0, index === 0 ? 0 : direction * 10 * PX]}
    >
      <Part size={[10, 10, 10]} at={[0, 0, direction * 5]} material={materials.scales} />
      <Part size={[2, 4, 6]} at={[0, 7, direction * 5]} material={materials.bone} />
      <Spine count={count} direction={direction} links={links} materials={materials} index={index + 1}>
        {children}
      </Spine>
    </group>
  );
}

const LEGS = [
  { at: [10, -10, 20], upper: [8, 24, 8], lower: [6, 24, 6], foot: [8, 4, 16] },
  { at: [-10, -10, 20], upper: [8, 24, 8], lower: [6, 24, 6], foot: [8, 4, 16] },
  { at: [12, -8, -20], upper: [16, 32, 16], lower: [12, 32, 12], foot: [18, 6, 24] },
  { at: [-12, -8, -20], upper: [16, 32, 16], lower: [12, 32, 12], foot: [18, 6, 24] },
] as const;

interface EnderDragonProps {
  readonly report: THREE.Vector3;
  readonly onHit: () => void;
  readonly onPerched: () => void;
  readonly onVanish: () => void;
}

export function EnderDragon({ report, onHit, onPerched, onVanish }: EnderDragonProps) {
  const root = useRef<THREE.Group>(null);
  const neck = useRef<(THREE.Group | null)[]>([]);
  const tail = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const tips = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const shins = useRef<(THREE.Group | null)[]>([]);
  const jaw = useRef<THREE.Group>(null);
  const raysGroup = useRef<THREE.Mesh>(null);

  const materials = useMemo<DragonMaterials>(() => {
    const { tex } = kit();
    return {
      scales: new THREE.MeshLambertMaterial({ map: tex.scales }),
      bone: new THREE.MeshLambertMaterial({ map: tex.bone }),
      membrane: new THREE.MeshLambertMaterial({ map: tex.membrane, side: THREE.DoubleSide, alphaTest: 0.5 }),
      eye: new THREE.MeshBasicMaterial({ color: '#e25cff' }),
      glow: new THREE.SpriteMaterial({ map: tex.glow, color: '#d946ef', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
  }, []);
  const rays = useMemo(() => createRays(64), []);

  const run = useRef({
    t: 0,
    mode: 'circle' as Mode,
    modeT: 0,
    angle: Math.PI * 1.05,
    flown: false,
    curve: null as THREE.CatmullRomCurve3 | null,
    curveS: 1,
    phase: 0,
    hurt: 0,
    growlAt: 6,
    neckYaw: 0,
    riseFrom: new THREE.Vector3(),
    fade: 1,
    perchTurn: new THREE.Quaternion(),
    pathTurn: new THREE.Quaternion(),
  });
  const scratch = useMemo(() => ({ ahead: new THREE.Vector3(), local: new THREE.Vector3(), inverse: new THREE.Quaternion() }), []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      rays.geometry.dispose();
      rays.material.dispose();
    },
    [materials, rays]
  );

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const r = run.current;
    const dt = Math.min(delta, 0.1);
    r.t += dt;
    r.modeT += dt;
    const { ahead, local, inverse } = scratch;
    const stage = useEndGame.getState().stage;
    const camera = state.camera;
    const loudness = Math.min(1, Math.max(0.3, 1.2 - camera.position.distanceTo(group.position) / 70));

    if (r.mode === 'circle' && !r.flown && r.t > FLYBY_AT) {
      r.flown = true;
      r.angle = 0.95;
      r.curve = new THREE.CatmullRomCurve3([
        group.position.clone(),
        new THREE.Vector3(30, 16, -22),
        new THREE.Vector3(46, 7, -9),
        new THREE.Vector3(47, 10, 11),
        new THREE.Vector3(28, 17, 24),
        orbitPoint(r.angle, r.t + 5.5, new THREE.Vector3()),
      ]);
      r.curveS = 5.5;
      r.mode = 'flyby';
      r.modeT = 0;
      r.growlAt = r.t + 1.8;
    }
    if (stage === 'dragon' && (r.mode === 'circle' || r.mode === 'flyby')) {
      const from = group.position.clone();
      r.curve = new THREE.CatmullRomCurve3([
        from,
        new THREE.Vector3(from.x * 0.55, 17, from.z * 0.55),
        new THREE.Vector3(PERCH.x + 9, PERCH.y + 4, PERCH.z + 5),
        new THREE.Vector3(PERCH.x + 3, PERCH.y + 0.8, PERCH.z + 1),
        PERCH.clone(),
      ]);
      r.curveS = 4.8;
      r.mode = 'land';
      r.modeT = 0;
      // land side-on to whoever is watching, so the whole body reads; the neck then turns to face them
      const facing = new THREE.Object3D();
      facing.position.copy(PERCH);
      const toward = Math.atan2(camera.position.x - PERCH.x, camera.position.z - PERCH.z) + 1.2;
      facing.lookAt(PERCH.x + Math.sin(toward), PERCH.y, PERCH.z + Math.cos(toward));
      r.perchTurn.copy(facing.quaternion);
    }
    if (stage === 'victory' && r.mode !== 'die' && r.mode !== 'gone') {
      r.mode = 'die';
      r.modeT = 0;
      r.riseFrom.copy(group.position);
      cue('death');
      [materials.scales, materials.bone, materials.membrane].forEach((material) => {
        material.transparent = true;
        material.needsUpdate = true;
      });
    }

    let flap = 0.12;
    let tipFlap = 0.1;
    let neckPitch = -0.03;
    let tailPitch = 0.02;
    let legSwing = 1;
    let jawOpen = 0.08 + Math.max(0, Math.sin(r.t * 0.8)) * 0.22;

    if (r.mode === 'circle') {
      r.angle += ORBIT_SPEED * dt;
      orbitPoint(r.angle, r.t, group.position);
      group.lookAt(orbitPoint(r.angle + 0.1, r.t + 0.6, ahead));
      group.rotateZ(0.32);
    } else if ((r.mode === 'flyby' || r.mode === 'land') && r.curve) {
      const u = r.mode === 'land' ? easeInOut(clamp01(r.modeT / r.curveS)) : clamp01(r.modeT / r.curveS);
      group.position.copy(r.curve.getPointAt(u));
      if (u < 1) {
        group.lookAt(r.curve.getPointAt(Math.min(1, u + 0.01)));
        if (r.mode === 'land') {
          r.pathTurn.copy(group.quaternion);
          group.quaternion.slerpQuaternions(r.pathTurn, r.perchTurn, clamp01((u - 0.7) / 0.3));
        }
      }
      if (u >= 1) {
        r.mode = r.mode === 'land' ? 'perch' : 'circle';
        r.modeT = 0;
        if (r.mode === 'perch') {
          r.growlAt = r.t + 0.4;
          onPerched();
        }
      }
    } else if (r.mode === 'perch') {
      group.position.copy(PERCH);
      group.position.y += Math.sin(r.t * 1.2) * 0.35;
      group.quaternion.copy(r.perchTurn);
      group.rotateX(0.2);
      neckPitch = 0.16;
      tailPitch = 0.06;
      legSwing = 0.2;
    } else if (r.mode === 'die') {
      const k = r.modeT / DIE_S;
      group.position.copy(r.riseFrom);
      group.position.x += (Math.random() - 0.5) * 0.12;
      group.position.y += r.modeT * 0.9;
      group.rotateY(dt * 0.3);
      neckPitch = -0.14;
      jawOpen = 0.65;
      legSwing = 0.5;
      r.fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      if (r.modeT >= DIE_S) {
        r.mode = 'gone';
        group.visible = false;
        onVanish();
      }
    }

    if (r.mode !== 'die' && r.mode !== 'gone' && r.t > r.growlAt) {
      cue('growl', loudness);
      r.growlAt = r.t + (r.mode === 'perch' ? 6 + Math.random() * 3 : 9 + Math.random() * 8);
    }

    const perching = r.mode === 'perch';
    r.phase += dt * (perching ? 3.2 : 4.6);
    if (r.mode === 'die') {
      flap = 0.5 + Math.sin(r.t * 30) * 0.04;
      tipFlap = 0.2;
    } else if (perching) {
      flap = 0.35 + Math.sin(r.phase) * 0.45;
      tipFlap = -0.2 + Math.sin(r.phase - 0.8) * 0.35;
    } else {
      flap = 0.12 + Math.sin(r.phase) * 0.62;
      tipFlap = 0.1 + Math.sin(r.phase - 0.8) * 0.5;
    }
    wings.current.forEach((wing, index) => wing?.rotation.set(0, 0, index === 0 ? flap : -flap));
    tips.current.forEach((tip) => tip?.rotation.set(0, 0, tipFlap));

    // perched, the head follows the camera around the island
    let yawTarget = 0;
    if (perching) {
      inverse.copy(group.quaternion).invert();
      local.copy(camera.position).sub(group.position).applyQuaternion(inverse);
      yawTarget = Math.max(-1.1, Math.min(1.1, Math.atan2(local.x, local.z)));
    }
    r.neckYaw += (yawTarget - r.neckYaw) * (1 - Math.exp(-dt * 2));
    neck.current.forEach((link, index) =>
      link?.rotation.set(neckPitch + Math.sin(r.t * 0.9 - index * 0.5) * 0.05, r.neckYaw / 5 + Math.sin(r.t * 0.7 - index * 0.6) * 0.06, 0)
    );
    tail.current.forEach((link, index) =>
      link?.rotation.set(tailPitch + Math.sin(r.t * 0.8 - index * 0.35) * 0.03, Math.sin(r.t * 1.3 - index * 0.45) * 0.09, 0)
    );
    legs.current.forEach((leg) => leg?.rotation.set(legSwing, 0, 0));
    shins.current.forEach((shin) => shin?.rotation.set(legSwing * 0.4, 0, 0));
    if (jaw.current) jaw.current.rotation.x += (jawOpen - jaw.current.rotation.x) * Math.min(1, dt * 6);

    r.hurt = Math.max(0, r.hurt - dt);
    const red = r.hurt > 0 ? 0.85 : 0;
    materials.scales.emissive.setRGB(0.012 + red, 0.004, 0.022);
    materials.membrane.emissive.setRGB(0.008 + red, 0.003, 0.015);
    materials.bone.emissive.setRGB(red, 0, 0);
    [materials.scales, materials.bone, materials.membrane, materials.eye].forEach((material) => {
      material.opacity = r.fade;
    });

    const beams = raysGroup.current;
    if (beams) {
      const dying = r.mode === 'die';
      const k = dying ? r.modeT / DIE_S : 1;
      beams.visible = dying || (r.mode === 'gone' && rays.material.uniforms.uAlpha.value > 0);
      beams.position.copy(group.position);
      beams.rotation.set(r.t * 0.4, r.t * 0.3, r.t * 0.15);
      rays.material.uniforms.uProgress.value = dying ? k * 1.1 : 1.1;
      rays.material.uniforms.uLength.value = 5 + k * 11;
      if (r.mode === 'gone') rays.material.uniforms.uAlpha.value = Math.max(0, rays.material.uniforms.uAlpha.value - dt * 2.5);
    }

    report.copy(group.position);
  });

  const hit = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const r = run.current;
    if (event.delta > 8 || r.mode === 'die' || r.mode === 'gone') return;
    if (useEndGame.getState().stage === 'arrival') return;
    r.hurt = 0.3;
    onHit();
  };

  return (
    <>
      <group ref={root} position={SPAWN}>
        <group scale={SCALE}>
          <Part size={[24, 24, 64]} material={materials.scales} />
          {[-20, 0, 20].map((z) => (
            <Part key={z} size={[2, 6, 12]} at={[0, 15, z]} material={materials.bone} />
          ))}
          <mesh geometry={HIT_BODY} material={kit().mat.hitbox} onClick={hit} {...pointerCursor} />

          <group position={[0, 4 * PX, 32 * PX]}>
            <Spine count={5} direction={1} links={neck} materials={materials}>
              <group position={[0, 0, 10 * PX]}>
                <Part size={[16, 16, 16]} at={[0, 0, 8]} material={materials.scales} />
                <Part size={[12, 5, 16]} at={[0, -2.5, 24]} material={materials.scales} />
                {[-3, 3].map((x) => (
                  <Fragment key={x}>
                    <Part size={[2, 2, 4]} at={[x, 1, 29]} material={materials.scales} />
                    <Part size={[2, 4, 6]} at={[x, 10, 4]} material={materials.bone} />
                  </Fragment>
                ))}
                <group ref={jaw} position={[0, -5 * PX, 16 * PX]}>
                  <Part size={[12, 4, 16]} at={[0, -2, 8]} material={materials.scales} />
                </group>
                {[-1, 1].map((side) => (
                  <Fragment key={side}>
                    <Part size={[0.6, 2, 5]} at={[side * 8.2, 3, 12]} material={materials.eye} />
                    <sprite material={materials.glow} scale={1.6} position={[side * 8.6 * PX, 3 * PX, 12 * PX]} />
                  </Fragment>
                ))}
                <mesh geometry={HIT_HEAD} material={kit().mat.hitbox} position={[0, 0, 14 * PX]} onClick={hit} {...pointerCursor} />
              </group>
            </Spine>
          </group>

          <group position={[0, 0, -32 * PX]}>
            <Spine count={12} direction={-1} links={tail} materials={materials} />
          </group>

          {LEGS.map((leg, index) => (
            <group
              key={index}
              ref={(el) => {
                legs.current[index] = el;
              }}
              position={[leg.at[0] * PX, leg.at[1] * PX, leg.at[2] * PX]}
            >
              <Part size={leg.upper} at={[0, -leg.upper[1] / 2, 0]} material={materials.scales} />
              <group
                ref={(el) => {
                  shins.current[index] = el;
                }}
                position={[0, -leg.upper[1] * PX, 0]}
              >
                <Part size={leg.lower} at={[0, -leg.lower[1] / 2, 0]} material={materials.scales} />
                <Part size={leg.foot} at={[0, -leg.lower[1] - leg.foot[1] / 2, leg.foot[2] / 2 - 4]} material={materials.scales} />
              </group>
            </group>
          ))}

          {[1, -1].map((side, index) => (
            <group
              key={side}
              ref={(el) => {
                wings.current[index] = el;
              }}
              position={[side * 12 * PX, 8 * PX, 18 * PX]}
              scale={[side, 1, 1]}
            >
              <Part size={[56, 8, 8]} at={[28, 0, 0]} material={materials.bone} />
              <mesh geometry={MEMBRANE} material={materials.membrane} />
              <group
                ref={(el) => {
                  tips.current[index] = el;
                }}
                position={[56 * PX, 0, 0]}
              >
                <Part size={[56, 4, 4]} at={[28, 0, 0]} material={materials.bone} />
                <mesh geometry={MEMBRANE} material={materials.membrane} />
              </group>
            </group>
          ))}
        </group>
      </group>
      <mesh ref={raysGroup} geometry={rays.geometry} material={rays.material} visible={false} renderOrder={3} />
    </>
  );
}
