'use client';

import { Sparkles } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const STONE = '#d3c985';
const STONE_DARK = '#8c8555';
const OBSIDIAN = '#1a1029';
const PURPUR = '#9d6faf';
const PORTAL_FRAME = [
  [-1, -2], [0, -2], [1, -2],
  [-1, 2], [0, 2], [1, 2],
  [-2, -1], [-2, 0], [-2, 1],
  [2, -1], [2, 0], [2, 1],
] as const;

function CameraDrift({ returning }: { readonly returning: boolean }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const portalPosition = useMemo(() => new THREE.Vector3(0.2, -1.1, -18.2), []);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    if (returning) {
      camera.position.lerp(portalPosition, 1 - Math.exp(-delta * 1.5));
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov += (34 - camera.fov) * delta * 2;
        camera.updateProjectionMatrix();
      }
      target.copy(portalPosition);
    } else {
      camera.position.x += (pointer.x * 1.8 - camera.position.x) * delta * 1.4;
      camera.position.y += (1.8 + pointer.y * 0.8 - camera.position.y) * delta * 1.4;
      camera.position.z = 13 - Math.sin(time * 0.1) * 1.5;
      target.set(pointer.x * 1.1, pointer.y * 0.5, -18);
    }
    camera.lookAt(target);
  });

  return null;
}

function EndIsland({ position, scale }: { readonly position: [number, number, number]; readonly scale: number }) {
  const blocks = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const angle = index * 2.4;
        const radius = 0.4 + (index % 7) * 0.19;
        return {
          key: index,
          position: [Math.cos(angle) * radius, -Math.floor(index / 9) * 0.35, Math.sin(angle) * radius] as const,
          size: 0.45 + (index % 3) * 0.12,
        };
      }),
    []
  );

  return (
    <group position={position} scale={scale}>
      {blocks.map((block) => (
        <mesh key={block.key} position={block.position} castShadow receiveShadow>
          <boxGeometry args={[block.size, block.size, block.size]} />
          <meshStandardMaterial color={block.key % 4 === 0 ? STONE_DARK : STONE} roughness={1} />
        </mesh>
      ))}
      {[[-0.7, 0.2, 0.1], [0.3, 0.35, -0.35], [0.7, 0.2, 0.35]].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <boxGeometry args={[0.14, 0.8 + index * 0.15, 0.14]} />
          <meshStandardMaterial color={PURPUR} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

function EndCrystal({ position }: { readonly position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.getElapsedTime() * 0.8;
    group.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.6) * 0.16;
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#f0c5ff" emissive="#c026d3" emissiveIntensity={2.5} roughness={0.15} />
      </mesh>
      <pointLight color="#d946ef" intensity={4} distance={6} />
    </group>
  );
}

function ObsidianPillar({ position, height, crystal }: { readonly position: [number, number, number]; readonly height: number; readonly crystal?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.62, height, 0.62]} />
        <meshStandardMaterial color={OBSIDIAN} roughness={0.9} />
      </mesh>
      <mesh position={[0, height + 0.04, 0]}>
        <boxGeometry args={[0.78, 0.12, 0.78]} />
        <meshStandardMaterial color="#34204f" roughness={0.8} />
      </mesh>
      {crystal && <EndCrystal position={[0, height + 0.7, 0]} />}
    </group>
  );
}

function Dragon() {
  const dragon = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!dragon.current) return;
    const time = clock.getElapsedTime() * 0.32;
    dragon.current.position.set(Math.sin(time) * 8, 2.8 + Math.sin(time * 1.8) * 0.7, -9 + Math.cos(time) * 3);
    dragon.current.rotation.set(Math.sin(time * 1.8) * 0.08, -time + Math.PI, Math.cos(time * 1.8) * 0.12);
  });

  return (
    <group ref={dragon} scale={0.9}>
      <mesh castShadow>
        <boxGeometry args={[2.3, 0.55, 0.72]} />
        <meshStandardMaterial color="#211a2c" roughness={0.85} />
      </mesh>
      <mesh position={[1.45, 0.04, 0]} castShadow>
        <boxGeometry args={[0.75, 0.44, 0.48]} />
        <meshStandardMaterial color="#16121d" roughness={0.9} />
      </mesh>
      <mesh position={[-1.65, 0, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[1.3, 0.22, 0.28]} />
        <meshStandardMaterial color="#17121f" roughness={0.9} />
      </mesh>
      <mesh position={[-0.15, 0.05, 1.05]} rotation={[0.1, 0, -0.18]}>
        <boxGeometry args={[1.55, 0.08, 1.8]} />
        <meshStandardMaterial color="#36234a" roughness={0.85} />
      </mesh>
      <mesh position={[-0.15, 0.05, -1.05]} rotation={[-0.1, 0, -0.18]}>
        <boxGeometry args={[1.55, 0.08, 1.8]} />
        <meshStandardMaterial color="#36234a" roughness={0.85} />
      </mesh>
      <pointLight position={[1.75, 0.1, 0.28]} color="#f0abfc" intensity={1.2} distance={3} />
    </group>
  );
}

function ReturnPortal({ onActivate, returning }: { readonly onActivate: () => void; readonly returning: boolean }) {
  const portal = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const previousCursor = document.body.style.cursor;
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, []);

  useFrame(({ clock }) => {
    if (!portal.current) return;
    const time = clock.getElapsedTime();
    const scale = returning ? 4 + time % 0.5 : hovered ? 1.22 : 1;
    portal.current.scale.setScalar(scale + Math.sin(time * 2.5) * 0.05);
  });

  return (
    <group
      ref={portal}
      position={[0.2, -1.1, -18.2]}
      onClick={() => !returning && onActivate()}
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
      {PORTAL_FRAME.map(([x, z], index) => (
        <group key={index} position={[x * 0.72, 0, z * 0.72]}>
          <mesh>
            <boxGeometry args={[0.68, 0.28, 0.68]} />
            <meshStandardMaterial color="#71875f" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.42, 0.05, 0.42]} />
            <meshStandardMaterial color="#315c37" emissive="#14351d" emissiveIntensity={0.8} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <planeGeometry args={[2.05, 2.05]} />
        <meshBasicMaterial color="#16051f" transparent opacity={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <planeGeometry args={[1.82, 1.82]} />
        <meshBasicMaterial color="#5b1172" transparent opacity={0.55} />
      </mesh>
      <pointLight color="#a855f7" intensity={returning ? 20 : 4} distance={8} />
    </group>
  );
}

function EndWorld({ onReturn }: { readonly onReturn: () => void }) {
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (!returning) return;
    const timer = window.setTimeout(onReturn, 1500);
    return () => window.clearTimeout(timer);
  }, [onReturn, returning]);

  return (
    <>
      <color attach="background" args={['#08030f']} />
      <fog attach="fog" args={['#08030f', 8, 46]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 8, 6]} color="#d8b4fe" intensity={1.8} castShadow />
      <pointLight position={[-4, 2, -5]} color="#7e22ce" intensity={15} distance={16} />
      <CameraDrift returning={returning} />
      <Sparkles count={120} scale={[28, 12, 38]} size={2} speed={0.35} color="#e9d5ff" opacity={0.85} />
      <EndIsland position={[-5.4, -2.3, -8]} scale={2.4} />
      <EndIsland position={[5.6, -1.4, -13]} scale={1.6} />
      <EndIsland position={[0.2, -3.1, -20]} scale={3.3} />
      <ObsidianPillar position={[-4.1, -2.5, -8.2]} height={5.2} crystal />
      <ObsidianPillar position={[5.2, -1.7, -13]} height={3.8} crystal />
      <ObsidianPillar position={[0.6, -3.2, -19]} height={6.8} />
      <Dragon />
      <ReturnPortal onActivate={() => setReturning(true)} returning={returning} />
    </>
  );
}

export default function EndWorldScene({ onReturn }: { readonly onReturn: () => void }) {
  return (
    <Canvas
      aria-hidden
      camera={{ fov: 55, position: [0, 1.8, 13] }}
      className="absolute inset-0"
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      shadows
    >
      <EndWorld onReturn={onReturn} />
    </Canvas>
  );
}
