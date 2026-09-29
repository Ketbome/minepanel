import * as THREE from 'three';
import { bloomOn, shaderTime } from './shading';
import { BLOCKS, type World } from './world';

// Water drawn the way shader packs draw it: a surface that rolls, ripples that catch the light,
// the sky mirrored more the flatter you look, a glint of sun, and shallows you can see into.

// what the surface reflects and the sun it glints with; the zone keeps them in step with its sky
export const waterSky = {
  uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
  uSunColor: { value: new THREE.Color('#fff1d6') },
  uHorizon: { value: new THREE.Color('#b8d4f2') },
  uZenith: { value: new THREE.Color('#6b9be6') },
  uDay: { value: 1 },
};

// for a zone whose sky never changes
export function setWaterSky(sun: THREE.Vector3Tuple, sunColor: string, horizon: string, zenith: string) {
  waterSky.uSun.value.set(...sun).normalize();
  waterSky.uSunColor.value.set(sunColor);
  waterSky.uHorizon.value.set(horizon);
  waterSky.uZenith.value.set(zenith);
  waterSky.uDay.value = 1;
}

const VERTEX = /* glsl */ `
  attribute float aSurface;
  attribute float aDepth;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  #include <common>
  #include <fog_pars_vertex>

  float swell(vec2 p, float t) {
    return sin(dot(p, vec2(0.8, 0.6)) * 0.9 + t * 1.1) * 0.5
      + sin(dot(p, vec2(-0.45, 0.9)) * 1.6 + t * 1.7) * 0.3
      + sin(dot(p, vec2(0.25, -1.0)) * 2.7 + t * 2.3) * 0.2;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // the surface only ever dips, so it never rises through the block beside it
    world.y += (swell(world.xz, uTime) - 1.0) * 0.035 * aSurface;
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vDepth = aDepth;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uBloom;
  uniform vec3 uSun;
  uniform vec3 uSunColor;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform float uDay;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  #include <common>
  #include <fog_pars_fragment>

  vec3 linear(vec3 srgb) {
    return sRGBTransferEOTF(vec4(srgb, 1.0)).rgb;
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // big slow swells plus two layers of ripples drifting across each other
  float surface(vec2 p) {
    float t = uTime;
    return sin(dot(p, vec2(0.8, 0.6)) * 0.9 + t * 1.1) * 0.25
      + noise(p * 1.9 + vec2(t * 0.45, t * 0.3)) * 0.5
      + noise(p * 4.3 - vec2(t * 0.6, -t * 0.4)) * 0.22
      + noise(p * 9.0 + vec2(-t * 0.9, t * 0.7)) * 0.08;
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (n.y > 0.5) {
      float e = 0.06;
      float h = surface(vWorld.xz);
      vec2 slope = vec2(surface(vWorld.xz + vec2(e, 0.0)) - h, surface(vWorld.xz + vec2(0.0, e)) - h) / e;
      n = normalize(vec3(-slope.x * 0.22, 1.0, -slope.y * 0.22));
    }
    if (!gl_FrontFacing) n = -n;
    vec3 view = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(n, view), 0.0, 1.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);

    vec3 bounce = reflect(-view, n);
    vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, bounce.y));
    // shallows show the sand through a clear green-blue, deep water turns navy
    float deep = smoothstep(0.0, 4.0, vDepth);
    vec3 shallow = mix(linear(vec3(0.3, 0.72, 0.76)), linear(vec3(0.2, 0.46, 0.72)), deep);
    vec3 body = mix(shallow, linear(vec3(0.07, 0.2, 0.42)), deep * 0.8) * (0.2 + 0.8 * uDay);
    vec3 color = mix(body, sky, fresnel);

    float sun = max(dot(bounce, uSun), 0.0);
    float glint = pow(sun, 420.0) * 6.0 + pow(sun, 60.0) * 0.35;
    color += uSunColor * glint * step(0.0, uSun.y) * (0.6 + 0.4 * uBloom);

    float alpha = mix(mix(0.35, 0.8, deep), 1.0, fresnel);
    gl_FragColor = vec4(color, clamp(alpha + glint, 0.0, 1.0));
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

let material: THREE.ShaderMaterial | null = null;

export function waterMaterial() {
  if (material) return material;
  material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  // shared objects, so the zone and the clock update every chunk's water at once
  Object.assign(material.uniforms, waterSky, { uTime: shaderTime, uBloom: bloomOn });
  return material;
}

// the game's still water stands 14 pixels high
const SURFACE = 14 / 16 - 0.5;

// the faces a cube shows, as [normal, four corners] from -0.5 to 0.5; corners wind counter-clockwise
const FACES = [
  [[1, 0, 0], [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]]],
  [[-1, 0, 0], [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]]],
  [[0, 1, 0], [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]]],
  [[0, -1, 0], [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]]],
  [[0, 0, 1], [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
  [[0, 0, -1], [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]]],
] as const;

// Only the faces that touch something other than water, so the inside of a lake draws nothing
// and see-through layers never stack up into dark bands.
export function waterGeometry(world: World, cells: readonly { readonly x: number; readonly y: number; readonly z: number }[]) {
  const isWater = (x: number, y: number, z: number) => world.get(x, y, z) === 'water';
  const hides = (x: number, y: number, z: number) => {
    const id = world.get(x, y, z);
    return id !== undefined && (id === 'water' || (BLOCKS[id].solid && BLOCKS[id].visible !== false && !BLOCKS[id].clear));
  };
  const columns = new Map<string, number>();
  // how much water stands under a surface cell, down to the bed
  const depth = (x: number, y: number, z: number) => {
    if (!isWater(x, y, z)) return 0;
    const key = `${x}:${y}:${z}`;
    let d = columns.get(key);
    if (d === undefined) {
      d = 0;
      while (d < 8 && isWater(x, y - d, z)) d += 1;
      columns.set(key, d);
    }
    return d;
  };
  const positions: number[] = [];
  const normals: number[] = [];
  const surfaces: number[] = [];
  const depths: number[] = [];
  const index: number[] = [];

  cells.forEach(({ x, y, z }) => {
    const top = !isWater(x, y + 1, z);
    FACES.forEach(([normal, corners]) => {
      if (hides(x + normal[0], y + normal[1], z + normal[2])) return;
      if (normal[1] === 1 && !top) return;
      const base = positions.length / 3;
      corners.forEach(([cx, cy, cz]) => {
        const high = cy > 0;
        positions.push(x + cx, y + (high && top ? SURFACE : cy), z + cz);
        normals.push(...normal);
        surfaces.push(high && top ? 1 : 0);
        // a corner's depth blends the four columns around it, so the shore fades out smoothly
        const sx = Math.sign(cx);
        const sz = Math.sign(cz);
        depths.push((depth(x, y, z) + depth(x + sx, y, z) + depth(x, y, z + sz) + depth(x + sx, y, z + sz)) / 4);
      });
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('aSurface', new THREE.Float32BufferAttribute(surfaces, 1));
  geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}
