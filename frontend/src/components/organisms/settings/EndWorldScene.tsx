'use client';

import { Instance, Instances, Sparkles, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const OCTAHEDRON = new THREE.OctahedronGeometry(1, 0);
// beam geometry points down +Z and starts at the origin, so a mesh can be
// placed on the emitter, aimed with lookAt() and stretched with scale.z
const BEAM = new THREE.CylinderGeometry(1, 1, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5);

const END_STONE_SHADES = ['#e8e2b4', '#dcd5a4', '#cec692', '#bdb47c', '#a89f6b'];
const CHORUS_SHADES = ['#9a63b4', '#84509c', '#6d4083'];
const BEDROCK_SHADES = ['#3a3a42', '#2c2c33', '#22222a'];

const MAIN_ISLAND_LAYERS = [10, 9.7, 9, 7.9, 6.4, 4.8, 3.2, 1.8];
const FAR_ISLAND_LAYERS = [4.4, 4, 3.2, 2.1, 1];

const PILLARS = [
  { angle: 0.2, radius: 8.8, height: 9, crystal: true, light: true },
  { angle: 0.95, radius: 9.4, height: 6, crystal: false, light: false },
  { angle: 1.8, radius: 8.6, height: 11, crystal: true, light: false },
  { angle: 2.6, radius: 9.2, height: 7, crystal: false, light: false },
  { angle: 3.4, radius: 8.9, height: 10, crystal: true, light: true },
  { angle: 4.2, radius: 9.3, height: 6.5, crystal: false, light: false },
  { angle: 5.05, radius: 8.7, height: 12, crystal: true, light: false },
  { angle: 5.8, radius: 9.4, height: 8, crystal: false, light: false },
] as const;

const DRAGON_ORBIT = 17;
const DRAGON_HEIGHT = 15;

function hash2(x: number, z: number, seed: number) {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function pick<T>(list: readonly T[], value: number) {
  return list[Math.min(list.length - 1, Math.floor(value * list.length))];
}

interface Voxel {
  readonly key: string;
  readonly position: [number, number, number];
  readonly color: string;
  readonly scale?: [number, number, number];
}

function buildIsland(layers: readonly number[], seed: number): Voxel[] {
  const blocks: Voxel[] = [];
  layers.forEach((radius, depth) => {
    const inner = layers[depth + 1] ?? 0;
    const limit = Math.ceil(radius);
    for (let x = -limit; x <= limit; x += 1) {
      for (let z = -limit; z <= limit; z += 1) {
        const distance = Math.hypot(x, z) + (hash2(x, z, seed) - 0.5) * 1.6;
        if (distance > radius) continue;
        if (depth > 0 && distance < inner - 1.2) continue;
        blocks.push({
          key: `${depth}:${x}:${z}`,
          position: [x, -depth, z],
          color: pick(END_STONE_SHADES, hash2(x + depth * 13, z - depth * 7, seed + 3)),
        });
      }
    }
  });
  return blocks;
}

function buildChorus(seed: number): Voxel[] {
  const blocks: Voxel[] = [];
  for (let plant = 0; plant < 9; plant += 1) {
    const angle = hash2(plant, 1, seed) * Math.PI * 2;
    const radius = 6 + hash2(plant, 2, seed) * 3.5;
    const x = Math.round(Math.cos(angle) * radius);
    const z = Math.round(Math.sin(angle) * radius);
    const height = 1 + Math.floor(hash2(plant, 3, seed) * 3);
    for (let step = 0; step < height; step += 1) {
      blocks.push({
        key: `${plant}:${step}`,
        position: [x, 0.9 + step, z],
        color: pick(CHORUS_SHADES, hash2(plant, step, seed + 5)),
        scale: [0.7, 1, 0.7],
      });
    }
    blocks.push({ key: `${plant}:flower`, position: [x, 0.9 + height, z], color: '#e0b6ef', scale: [0.9, 0.8, 0.9] });
  }
  return blocks;
}

function VoxelField({ blocks, position }: { readonly blocks: Voxel[]; readonly position?: [number, number, number] }) {
  return (
    <group position={position}>
      <Instances limit={blocks.length} range={blocks.length} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial roughness={1} metalness={0} />
        {blocks.map((block) => (
          <Instance key={block.key} position={block.position} color={block.color} scale={block.scale} />
        ))}
      </Instances>
    </group>
  );
}

function Island({ layers, seed, position, scale = 1, chorus }: { readonly layers: readonly number[]; readonly seed: number; readonly position: [number, number, number]; readonly scale?: number; readonly chorus?: boolean }) {
  const blocks = useMemo(() => buildIsland(layers, seed), [layers, seed]);
  const plants = useMemo(() => (chorus ? buildChorus(seed) : []), [chorus, seed]);

  return (
    <group position={position} scale={scale}>
      <VoxelField blocks={blocks} position={[0, -0.5, 0]} />
      {plants.length > 0 && <VoxelField blocks={plants} position={[0, -0.5, 0]} />}
    </group>
  );
}

function EndCrystal({ position, dragon, light }: { readonly position: [number, number, number]; readonly dragon: THREE.Vector3; readonly light: boolean }) {
  const cage = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const origin = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (cage.current) {
      cage.current.rotation.y = time * 0.9;
      cage.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.25;
    }
    if (beam.current) {
      beam.current.position.copy(origin);
      beam.current.position.y = cage.current?.position.y ?? position[1];
      beam.current.lookAt(dragon);
      beam.current.scale.set(0.09, 0.09, beam.current.position.distanceTo(dragon));
      const material = beam.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.28 + Math.sin(time * 9 + position[0]) * 0.08;
    }
  });

  return (
    <>
      <group ref={cage} position={position}>
        <mesh geometry={OCTAHEDRON} scale={0.55}>
          <meshStandardMaterial color="#2a0c33" emissive="#f0abfc" emissiveIntensity={3.2} roughness={0.2} />
        </mesh>
        <mesh geometry={OCTAHEDRON} scale={1.15}>
          <meshBasicMaterial color="#d946ef" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        {light && <pointLight color="#e879f9" intensity={26} distance={16} decay={2} />}
      </group>
      <mesh ref={beam} geometry={BEAM} scale={[0.09, 0.09, 1]} renderOrder={2} raycast={() => null}>
        <meshBasicMaterial color="#f5d0fe" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function ObsidianPillar({ angle, radius, height, crystal, light, dragon }: { readonly angle: number; readonly radius: number; readonly height: number; readonly crystal: boolean; readonly light: boolean; readonly dragon: THREE.Vector3 }) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return (
    <>
      <group position={[x, 0, z]}>
        <mesh geometry={UNIT_BOX} position={[0, height / 2, 0]} scale={[2, height, 2]}>
          <meshStandardMaterial color="#150c22" roughness={0.55} metalness={0.1} />
        </mesh>
        <mesh geometry={UNIT_BOX} position={[0, height + 0.15, 0]} scale={[2.6, 0.3, 2.6]}>
          <meshStandardMaterial color="#2b2b33" roughness={0.9} />
        </mesh>
        {crystal &&
          [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ].map(([bx, bz]) => (
            <mesh key={`${bx}${bz}`} geometry={UNIT_BOX} position={[bx, height + 1.5, bz]} scale={[0.16, 2.4, 0.16]}>
              <meshStandardMaterial color="#4a4a56" roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
      </group>
      {crystal && <EndCrystal position={[x, height + 1.6, z]} dragon={dragon} light={light} />}
    </>
  );
}

const PORTAL_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PORTAL_FRAGMENT = `
  uniform float uTime;
  uniform float uBoost;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  vec3 starLayer(vec2 uv, float scale, float speed, vec3 tint, float seed) {
    vec2 p = uv * scale + vec2(uTime * speed, uTime * speed * 0.7) + seed;
    float h = hash(floor(p) + seed);
    vec2 f = fract(p) - 0.5;
    float star = 1.0 - smoothstep(0.0, 0.36, length(f) + h * 0.3);
    return tint * star * (0.35 + 0.65 * h);
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float r = length(uv) * 2.0;
    vec3 color = vec3(0.015, 0.004, 0.04);
    color += starLayer(uv, 16.0, 0.03, vec3(0.62, 0.36, 0.98), 1.0);
    color += starLayer(uv, 10.0, -0.045, vec3(0.32, 0.86, 0.72), 7.0);
    color += starLayer(uv, 6.0, 0.06, vec3(0.96, 0.88, 1.0), 13.0);
    color += vec3(0.36, 0.12, 0.58) * (1.0 - smoothstep(0.15, 1.0, r)) * (0.45 + uBoost);
    gl_FragColor = vec4(color * (1.0 + uBoost * 2.0), 1.0 - smoothstep(0.86, 1.0, r));
  }
`;

const BEAM_VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const BEAM_FRAGMENT = `
  uniform float uTime;
  uniform float uBoost;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float fade = pow(1.0 - vUv.y, 2.2);
    float pulse = 0.82 + 0.18 * sin(uTime * 2.6 - vUv.y * 14.0);
    float core = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.4);
    vec3 color = mix(vec3(0.86, 0.62, 1.0), vec3(0.36, 0.06, 0.78), vUv.y);
    gl_FragColor = vec4(color, fade * pulse * core * (0.38 + uBoost));
  }
`;

function buildBedrockRing(): Voxel[] {
  const blocks: Voxel[] = [];
  for (let x = -5; x <= 5; x += 1) {
    for (let z = -5; z <= 5; z += 1) {
      const distance = Math.hypot(x, z);
      if (distance < 3.4 || distance > 4.9) continue;
      blocks.push({ key: `${x}:${z}`, position: [x, 0.5, z], color: pick(BEDROCK_SHADES, hash2(x, z, 9)) });
    }
  }
  [
    [-4, -4],
    [-4, 4],
    [4, -4],
    [4, 4],
  ].forEach(([x, z]) => {
    blocks.push({ key: `post:${x}:${z}:1`, position: [x, 1.5, z], color: BEDROCK_SHADES[1] });
    blocks.push({ key: `post:${x}:${z}:2`, position: [x, 2.5, z], color: BEDROCK_SHADES[0] });
  });
  return blocks;
}

function ExitPortal({ onActivate, returning }: { readonly onActivate: () => void; readonly returning: boolean }) {
  const [hovered, setHovered] = useState(false);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uBoost: { value: 0 } }), []);
  const ring = useMemo(() => buildBedrockRing(), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.getElapsedTime();
    const target = returning ? 2.4 : hovered ? 0.45 : 0;
    uniforms.uBoost.value += (target - uniforms.uBoost.value) * Math.min(1, delta * 4);
  });

  return (
    <group
      position={[0, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (!returning) onActivate();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <VoxelField blocks={ring} />
      {[
        [-4, -4],
        [-4, 4],
        [4, -4],
        [4, 4],
      ].map(([x, z]) => (
        <mesh key={`torch${x}${z}`} geometry={UNIT_BOX} position={[x, 3.2, z]} scale={0.4}>
          <meshStandardMaterial color="#fff2c2" emissive="#fbbf24" emissiveIntensity={2.4} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.05, 0]}>
        <circleGeometry args={[3.6, 40]} />
        <shaderMaterial vertexShader={PORTAL_VERTEX} fragmentShader={PORTAL_FRAGMENT} uniforms={uniforms} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 19, 0]} renderOrder={3} raycast={() => null}>
        <cylinderGeometry args={[1.0, 1.7, 38, 20, 1, true]} />
        <shaderMaterial
          vertexShader={BEAM_VERTEX}
          fragmentShader={BEAM_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight position={[0, 3, 0]} color="#a855f7" intensity={returning ? 220 : 40} distance={30} decay={2} />
    </group>
  );
}

interface BoxProps {
  readonly size: [number, number, number];
  readonly position?: [number, number, number];
  readonly rotation?: [number, number, number];
  readonly material: THREE.Material;
  readonly children?: React.ReactNode;
}

function Box({ size, position, rotation, material, children }: BoxProps) {
  return (
    <mesh geometry={UNIT_BOX} material={material} scale={size} position={position} rotation={rotation}>
      {children}
    </mesh>
  );
}

function Dragon({ report }: { readonly report: THREE.Vector3 }) {
  const root = useRef<THREE.Group>(null);
  const neck = useRef<(THREE.Group | null)[]>([]);
  const tail = useRef<(THREE.Group | null)[]>([]);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const wingTips = useRef<(THREE.Group | null)[]>([]);
  const jaw = useRef<THREE.Group>(null);

  const materials = useMemo(() => {
    const scales = new THREE.MeshStandardMaterial({ color: '#332b45', roughness: 0.8, emissive: '#22103a', emissiveIntensity: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: '#211b2e', roughness: 0.9, emissive: '#170a28', emissiveIntensity: 0.45 });
    const membrane = new THREE.MeshStandardMaterial({
      color: '#3b2e54',
      roughness: 0.95,
      side: THREE.DoubleSide,
      emissive: '#2a1042',
      emissiveIntensity: 0.5,
    });
    const eye = new THREE.MeshStandardMaterial({ color: '#2a0733', emissive: '#e879f9', emissiveIntensity: 4 });
    return { scales, dark, membrane, eye };
  }, []);

  useEffect(() => {
    const owned = Object.values(materials);
    return () => owned.forEach((material) => material.dispose());
  }, [materials]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const orbit = time * 0.16;
    const group = root.current;
    if (!group) return;

    const x = Math.cos(orbit) * DRAGON_ORBIT;
    const z = Math.sin(orbit) * DRAGON_ORBIT;
    group.position.set(x, DRAGON_HEIGHT + Math.sin(time * 0.55) * 2.2, z);
    group.rotation.y = Math.atan2(-Math.cos(orbit), -Math.sin(orbit));
    group.rotation.z = -0.22 + Math.sin(time * 0.55) * 0.1;
    group.rotation.x = Math.sin(time * 0.55 + Math.PI / 2) * 0.08;
    report.copy(group.position);

    const flap = Math.sin(time * 1.7);
    wings.current.forEach((wing, index) => {
      if (!wing) return;
      wing.rotation.x = (index === 0 ? -1 : 1) * (0.15 + flap * 0.55);
    });
    wingTips.current.forEach((tip, index) => {
      if (!tip) return;
      tip.rotation.x = (index === 0 ? -1 : 1) * (0.2 + Math.sin(time * 1.7 - 0.55) * 0.45);
    });
    neck.current.forEach((segment, index) => {
      if (!segment) return;
      segment.rotation.y = Math.sin(time * 1.1 - index * 0.6) * 0.09;
      segment.rotation.z = -0.16 + Math.sin(time * 0.9 - index * 0.5) * 0.05;
    });
    tail.current.forEach((segment, index) => {
      if (!segment) return;
      segment.rotation.y = Math.sin(time * 1.3 - index * 0.75) * 0.16;
      segment.rotation.z = Math.sin(time * 0.8 - index * 0.4) * 0.05;
    });
    if (jaw.current) jaw.current.rotation.z = 0.18 + Math.sin(time * 0.7) * 0.16;
  });

  const { scales, dark, membrane, eye } = materials;

  return (
    <group ref={root} scale={0.55}>
      <Box size={[6.4, 2.4, 2.8]} material={scales} />
      <Box size={[4.6, 1.2, 3.4]} position={[-0.4, -0.6, 0]} material={dark} />
      {[-2.4, -1.2, 0, 1.2, 2.4].map((offset) => (
        <Box key={offset} size={[0.5, 0.9, 0.4]} position={[offset, 1.5, 0]} material={dark} />
      ))}

      <group ref={(el) => { neck.current[0] = el; }} position={[3, 0.6, 0]}>
        <Box size={[2.2, 1.5, 1.5]} position={[1.1, 0, 0]} material={scales} />
        <Box size={[0.4, 0.7, 0.35]} position={[1.1, 0.95, 0]} material={dark} />
        <group ref={(el) => { neck.current[1] = el; }} position={[2.2, 0, 0]}>
          <Box size={[2, 1.3, 1.3]} position={[1, 0, 0]} material={scales} />
          <Box size={[0.4, 0.65, 0.35]} position={[1, 0.85, 0]} material={dark} />
          <group ref={(el) => { neck.current[2] = el; }} position={[2, 0, 0]}>
            <Box size={[1.8, 1.2, 1.2]} position={[0.9, 0, 0]} material={scales} />
            <group position={[2.6, 0.1, 0]}>
              <Box size={[2.4, 1.8, 2]} material={scales} />
              <Box size={[1.3, 1, 1.4]} position={[1.7, -0.25, 0]} material={dark} />
              <group ref={jaw} position={[0.9, -0.75, 0]}>
                <Box size={[2, 0.45, 1.6]} position={[0.7, -0.2, 0]} material={dark} />
              </group>
              {[1, -1].map((side) => (
                <Box key={side} size={[0.6, 0.35, 0.12]} position={[0.6, 0.35, side * 1.02]} material={eye} />
              ))}
              {[1, -1].map((side) => (
                <Box key={`horn${side}`} size={[1.1, 0.4, 0.4]} position={[-0.5, 1, side * 0.6]} rotation={[0, 0, 0.25]} material={dark} />
              ))}
            </group>
          </group>
        </group>
      </group>

      {[1, -1].map((side, index) => (
        <group key={side} ref={(el) => { wings.current[index] = el; }} position={[0.2, 0.9, side * 1.3]} rotation={[0, side * -0.22, 0]}>
          <Box size={[1.6, 0.5, 4.6]} position={[0, 0, side * 2.3]} material={scales} />
          <Box size={[4.4, 0.18, 4.4]} position={[-1.4, -0.1, side * 2.4]} material={membrane} />
          <Box size={[4.6, 0.24, 0.24]} position={[-1.4, 0, side * 1.1]} material={dark} />
          <Box size={[4, 0.24, 0.24]} position={[-1.6, 0, side * 3.4]} material={dark} />
          <group ref={(el) => { wingTips.current[index] = el; }} position={[0, 0, side * 4.6]}>
            <Box size={[1.2, 0.4, 4]} position={[-0.2, 0, side * 2]} material={scales} />
            <Box size={[3.6, 0.16, 3.8]} position={[-1.9, -0.08, side * 2]} material={membrane} />
            <Box size={[3.8, 0.2, 0.2]} position={[-1.8, 0, side * 3.6]} material={dark} />
          </group>
        </group>
      ))}

      <group ref={(el) => { tail.current[0] = el; }} position={[-3.2, 0.2, 0]}>
        <Box size={[2.2, 1.6, 1.6]} position={[-1.1, 0, 0]} material={scales} />
        <Box size={[0.4, 0.8, 0.35]} position={[-1.1, 1, 0]} material={dark} />
        <group ref={(el) => { tail.current[1] = el; }} position={[-2.2, 0, 0]}>
          <Box size={[2, 1.3, 1.3]} position={[-1, 0, 0]} material={scales} />
          <Box size={[0.4, 0.7, 0.3]} position={[-1, 0.85, 0]} material={dark} />
          <group ref={(el) => { tail.current[2] = el; }} position={[-2, 0, 0]}>
            <Box size={[1.8, 1, 1]} position={[-0.9, 0, 0]} material={scales} />
            <Box size={[0.35, 0.6, 0.28]} position={[-0.9, 0.7, 0]} material={dark} />
            <group ref={(el) => { tail.current[3] = el; }} position={[-1.8, 0, 0]}>
              <Box size={[1.6, 0.8, 0.8]} position={[-0.8, 0, 0]} material={dark} />
              <group ref={(el) => { tail.current[4] = el; }} position={[-1.6, 0, 0]}>
                <Box size={[1.4, 0.55, 0.55]} position={[-0.7, 0, 0]} material={dark} />
                <Box size={[1, 0.9, 0.2]} position={[-1.4, 0.2, 0]} material={membrane} />
              </group>
            </group>
          </group>
        </group>
      </group>

      <pointLight position={[7, 0.4, 0]} color="#e879f9" intensity={12} distance={9} decay={2} />
      <Sparkles count={26} scale={[9, 3, 4]} position={[-3, 0, 0]} size={4} speed={0.5} color="#e879f9" opacity={0.7} />
    </group>
  );
}

function CameraRig({ returning }: { readonly returning: boolean }) {
  const { camera, pointer } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    if (returning) {
      desired.set(0, 2, 0);
      camera.position.lerp(desired, 1 - Math.exp(-delta * 1.8));
      focus.set(0, 0, 0);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov += (105 - camera.fov) * delta * 1.6;
        camera.updateProjectionMatrix();
      }
    } else {
      const angle = 0.6 + time * 0.05 + pointer.x * 0.22;
      const radius = 40 - pointer.y * 3;
      desired.set(Math.cos(angle) * radius, 15 + pointer.y * 4 + Math.sin(time * 0.22) * 1.6, Math.sin(angle) * radius);
      camera.position.lerp(desired, 1 - Math.exp(-delta * 2.2));
      focus.set(pointer.x * 1.5, 5 + pointer.y * 1.2, 0);
    }
    camera.lookAt(focus);
  });

  return null;
}

function EndWorld({ onReturn }: { readonly onReturn: () => void }) {
  const [returning, setReturning] = useState(false);
  const dragonPosition = useMemo(() => new THREE.Vector3(DRAGON_ORBIT, DRAGON_HEIGHT, 0), []);

  useEffect(() => {
    if (!returning) return;
    const timer = window.setTimeout(onReturn, 1600);
    return () => window.clearTimeout(timer);
  }, [onReturn, returning]);

  return (
    <>
      <color attach="background" args={['#07030f']} />
      <fog attach="fog" args={['#0b0618', 45, 175]} />
      <ambientLight intensity={1.1} color="#b9a7e0" />
      <hemisphereLight args={['#c4b5fd', '#2a1b3d', 1.2]} />
      <directionalLight position={[14, 22, 10]} color="#efe6ff" intensity={2.2} />
      <directionalLight position={[-16, 8, -12]} color="#7c3aed" intensity={1.6} />
      <Stars radius={140} depth={70} count={1400} factor={5} saturation={0.7} fade speed={0.5} />
      <Sparkles count={90} scale={[70, 34, 70]} position={[0, 8, 0]} size={3.5} speed={0.3} color="#e9d5ff" opacity={0.7} />
      <CameraRig returning={returning} />
      <Island layers={MAIN_ISLAND_LAYERS} seed={1} position={[0, 0, 0]} chorus />
      <Island layers={FAR_ISLAND_LAYERS} seed={4} position={[-62, 10, -54]} scale={2.2} chorus />
      <Island layers={FAR_ISLAND_LAYERS} seed={9} position={[70, -12, -30]} scale={1.8} />
      <Island layers={FAR_ISLAND_LAYERS} seed={13} position={[18, 22, -92]} scale={3} chorus />
      <Island layers={FAR_ISLAND_LAYERS} seed={21} position={[-40, -20, 62]} scale={2} />
      {PILLARS.map((pillar) => (
        <ObsidianPillar key={pillar.angle} {...pillar} dragon={dragonPosition} />
      ))}
      <ExitPortal onActivate={() => setReturning(true)} returning={returning} />
      <Dragon report={dragonPosition} />
    </>
  );
}

export default function EndWorldScene({ onReturn }: { readonly onReturn: () => void }) {
  return (
    <Canvas
      aria-hidden
      camera={{ fov: 52, position: [26, 11, 18], near: 0.1, far: 260 }}
      // the canvas wrapper defaults to position: relative inline, which would push the overlay UI out of view
      style={{ position: 'absolute', inset: 0 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <EndWorld onReturn={onReturn} />
    </Canvas>
  );
}
