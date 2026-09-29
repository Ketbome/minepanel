import * as THREE from 'three';

// What the shader-pack look adds to the plain materials: a clock for the wind and the water,
// glowing things pushed past white so only they bloom, and foliage that sways.

export const shaderTime = { value: 0 };
// 1 while the bloom pass runs; shaders scale their glow by it
export const bloomOn = { value: 0 };

type Glowing = THREE.Material & { color: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number };

const glowing = new Map<Glowing, { readonly base: THREE.Color; readonly boost: number }>();

function brighten(material: Glowing, { base, boost }: { readonly base: THREE.Color; readonly boost: number }) {
  const k = bloomOn.value ? boost : 1;
  // a lit material glows through its emissive; an unlit one through its color
  if (material.emissive) material.emissiveIntensity = k;
  else material.color.copy(base).multiplyScalar(k);
}

// Without the bloom pass the colors stay exactly as painted: values past 1 would only clip.
export function glow<T extends Glowing>(material: T, boost: number) {
  const entry = { base: material.color.clone(), boost };
  glowing.set(material, entry);
  brighten(material, entry);
  return material;
}

export function setBloom(on: boolean) {
  bloomOn.value = on ? 1 : 0;
  glowing.forEach((entry, material) => brighten(material, entry));
}

// see-through things (glass, ice, ghosts) would cast a solid shadow
export const castsShadow = (material: THREE.Material | readonly THREE.Material[]) => ![material].flat().some((entry) => entry.transparent);

// Leaves drift as a whole block and plants bend from their roots. The offset depends only on
// where a vertex sits in the world, so touching leaf blocks move together and never crack open.
export function sway<T extends THREE.MeshLambertMaterial>(material: T, kind: 'leaves' | 'plant') {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = shaderTime;
    shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 windAt = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
      #else
        vec3 windAt = (modelMatrix * vec4(position, 1.0)).xyz;
      #endif
      float windWeight = ${kind === 'plant' ? 'step(0.0, position.y)' : '1.0'};
      float gust = 0.6 + 0.4 * sin(uWindTime * 0.35 + windAt.x * 0.05 + windAt.z * 0.04);
      transformed.x += (sin(uWindTime * 1.6 + windAt.x * 0.55 + windAt.z * 0.3) * 0.045 + sin(uWindTime * 3.7 + windAt.y * 1.9 + windAt.z) * 0.012) * windWeight * gust;
      transformed.z += (sin(uWindTime * 1.3 + windAt.z * 0.5 - windAt.x * 0.25) * 0.035 + sin(uWindTime * 4.1 + windAt.y * 1.5 + windAt.x) * 0.01) * windWeight * gust;`
    );
  };
  material.customProgramCacheKey = () => `sway-${kind}`;
  return material;
}

// Hand-written shaders pick their colors in sRGB. Linearised and then encoded for the target,
// they look the same drawn straight to the screen and inside the post-processing buffers.
export const OUTPUT_GLSL = /* glsl */ `
  vec4 outputColor(vec3 srgb, float alpha, float boost) {
    return linearToOutputTexel(vec4(sRGBTransferEOTF(vec4(srgb, 1.0)).rgb * boost, alpha));
  }
`;
