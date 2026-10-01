'use client';

import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { QUALITY, useQuality } from './quality';
import { runtime } from './runtime';

// half the side of the square of world around the player that gets shadows, in blocks
const SPAN = 36;
const UP = new THREE.Vector3(0, 1, 0);
const EAST = new THREE.Vector3(1, 0, 0);
const along = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();

type SunProps = Omit<ThreeElements['directionalLight'], 'ref'> & { readonly light?: React.RefObject<THREE.DirectionalLight | null> };

// A zone's sun that casts shadows. Its position is only a direction: light and target ride a group
// that follows the player in whole shadow texels across the light's view, so the shadows do not
// shimmer as you walk. The shadow camera also reaches behind the light, so nothing tall is clipped.
export function Sun({ light, ...props }: SunProps) {
  const size = useQuality((state) => QUALITY[state.quality].shadows);
  const own = useRef<THREE.DirectionalLight>(null);
  const sun = light ?? own;
  const follow = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const current = sun.current;
    if (!current) return;
    current.target = target;
    // a new resolution needs a new shadow map
    current.shadow.map?.dispose();
    current.shadow.map = null;
  }, [sun, target, size]);

  useFrame(() => {
    const group = follow.current;
    const current = sun.current;
    if (!group || !current || !size) return;
    along.copy(current.position).normalize();
    right.crossVectors(along, Math.abs(along.y) > 0.99 ? EAST : UP).normalize();
    up.crossVectors(right, along);
    const texel = (SPAN * 2) / size;
    const at = runtime.player.pos;
    const snap = (axis: THREE.Vector3) => Math.round(at.dot(axis) / texel) * texel;
    group.position.copy(right).multiplyScalar(snap(right)).addScaledVector(up, snap(up)).addScaledVector(along, at.dot(along));
  });

  return (
    <group ref={follow}>
      <directionalLight
        ref={sun}
        castShadow={size > 0}
        shadow-mapSize={[size || 1, size || 1]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-SPAN}
        shadow-camera-right={SPAN}
        shadow-camera-top={SPAN}
        shadow-camera-bottom={-SPAN}
        shadow-camera-near={-120}
        shadow-camera-far={160}
        {...props}
      />
      <primitive object={target} />
    </group>
  );
}
