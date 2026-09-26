import type { RootState } from '@react-three/fiber';
import * as THREE from 'three';

const SCREEN_VERTEX = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The game draws End portals in screen space: fifteen layers of one speck texture,
// each rotated, scaled, drifting and tinted from a fixed palette, so the surface reads
// as a window into space rather than a painted floor. Same layer math, same palette.
const PORTAL_FRAGMENT = /* glsl */ `
  uniform sampler2D uSpecks;
  uniform float uTime;
  uniform float uHeight;
  uniform float uFlash;
  uniform float uOpacity;

  const vec3 COLORS[16] = vec3[16](
    vec3(0.022087, 0.098399, 0.110818), vec3(0.011892, 0.095924, 0.089485),
    vec3(0.027636, 0.101689, 0.100326), vec3(0.046564, 0.109883, 0.114838),
    vec3(0.064901, 0.117696, 0.097189), vec3(0.063761, 0.086895, 0.123646),
    vec3(0.084817, 0.111994, 0.166380), vec3(0.097489, 0.154120, 0.091064),
    vec3(0.106152, 0.131144, 0.195191), vec3(0.097721, 0.110188, 0.187229),
    vec3(0.133516, 0.138278, 0.148582), vec3(0.070006, 0.243332, 0.235792),
    vec3(0.196766, 0.142899, 0.214696), vec3(0.047281, 0.315338, 0.321970),
    vec3(0.204675, 0.390010, 0.302066), vec3(0.080955, 0.314821, 0.661491)
  );

  mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 screen = gl_FragCoord.xy / uHeight;
    vec3 color = COLORS[0] * 1.4;
    for (int i = 1; i < 16; i++) {
      float layer = float(i);
      vec2 uv = screen + vec2(17.0 / layer, (2.0 + layer / 1.5) * uTime * 0.015);
      uv = rotate(radians((layer * layer * 4321.0 + layer * 9.0) * 2.0)) * uv;
      uv *= (4.5 - layer / 4.0) * 2.0;
      color += texture2D(uSpecks, uv).rgb * COLORS[i] * 1.8;
    }
    color = mix(color, vec3(0.78, 1.0, 0.93), uFlash);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export function createPortalMaterial(specks: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSpecks: { value: specks },
      uTime: { value: 0 },
      uHeight: { value: 1000 },
      uFlash: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: SCREEN_VERTEX,
    fragmentShader: PORTAL_FRAGMENT,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export function tickPortal(material: THREE.ShaderMaterial, state: RootState) {
  material.uniforms.uTime.value = state.clock.elapsedTime;
  material.uniforms.uHeight.value = state.size.height * state.gl.getPixelRatio();
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Box-projected pixel noise like the game's End sky, plus a directional purple flash.
const SKY_FRAGMENT = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uFlash;
  uniform vec3 uFlashDir;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    vec3 a = abs(d);
    vec2 uv = a.y > max(a.x, a.z) ? d.xz / a.y : (a.x > a.z ? d.zy / a.x : d.xy / a.z);
    float n = texture2D(uNoise, uv * 3.0).r;
    vec3 color = mix(vec3(0.035, 0.024, 0.05), vec3(0.09, 0.066, 0.115), n);
    color += vec3(0.05, 0.02, 0.08) * pow(1.0 - a.y, 4.0);
    float glow = pow(max(dot(d, uFlashDir), 0.0), 5.0);
    color += uFlash * (vec3(0.6, 0.3, 0.95) * glow + vec3(0.08, 0.04, 0.12));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createSkyMaterial(noise: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uNoise: { value: noise },
      uFlash: { value: 0 },
      uFlashDir: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

const RAYS_VERTEX = /* glsl */ `
  attribute float aTip;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uLength;
  varying float vTip;
  varying float vOn;

  void main() {
    vTip = aTip;
    vOn = step(aSeed, uProgress);
    float grow = clamp((uProgress - aSeed) * 4.0, 0.0, 1.0);
    vec3 p = position * uLength * grow * vOn;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// Death rays fade from a white core to transparent magenta tips, as in the game.
const RAYS_FRAGMENT = /* glsl */ `
  uniform float uAlpha;
  varying float vTip;
  varying float vOn;

  void main() {
    vec3 color = mix(vec3(1.0), vec3(1.0, 0.0, 1.0), vTip);
    gl_FragColor = vec4(color, (1.0 - vTip) * uAlpha * vOn);
  }
`;

export function createRays(count: number) {
  const positions: number[] = [];
  const tips: number[] = [];
  const seeds: number[] = [];
  const dir = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let ray = 0; ray < count; ray += 1) {
    dir.randomDirection();
    u.set(dir.y, -dir.x, 0.3).cross(dir).normalize();
    v.crossVectors(dir, u).normalize();
    const length = 0.55 + Math.random() * 0.45;
    const width = 0.05 + Math.random() * 0.05;
    const tip = dir.clone().multiplyScalar(length);
    const corners = [0, 1, 2].map((corner) => {
      const angle = (corner / 3) * Math.PI * 2;
      return tip.clone().addScaledVector(u, Math.cos(angle) * width).addScaledVector(v, Math.sin(angle) * width);
    });
    const seed = ray / count;
    corners.forEach((corner, index) => {
      const next = corners[(index + 1) % 3];
      positions.push(0, 0, 0, corner.x, corner.y, corner.z, next.x, next.y, next.z);
      tips.push(0, 1, 1);
      seeds.push(seed, seed, seed);
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aTip', new THREE.Float32BufferAttribute(tips, 1));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uProgress: { value: 0 }, uLength: { value: 1 }, uAlpha: { value: 1 } },
    vertexShader: RAYS_VERTEX,
    fragmentShader: RAYS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  return { geometry, material };
}
