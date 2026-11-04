// Triplanar mapping for the housing's tileable materials (public/materials, scripts/gillenwebsite/materials.py):
// albedo, roughness and normal are sampled from the three axis planes of the surface position and blended by the
// surface normal, so the Tripo mesh's UVs play no part. One tile is TILE_M metres. Static parts are mapped in world
// space; parts that turn (the knobs) in their own space at world scale, so the texture turns with them.
// The normal map is blended with the "whiteout" method per plane, in the mapping space, then taken to view space.
import * as THREE from "three";

export const TILE_M = 0.25;

export type Triplanar = { map: THREE.Texture; roughnessMap: THREE.Texture; normalMap: THREE.Texture };

const VERT_DECL = /* glsl */ `
varying vec3 vTriPos;
varying vec3 vTriNormal;
varying vec3 vTriX;
varying vec3 vTriY;
varying vec3 vTriZ;
uniform float triScale;
uniform bool triObject;
`;
const VERT_MAIN = /* glsl */ `
#include <worldpos_vertex>
{
  // object space at world scale: the model matrix's column lengths
  vec3 sc = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  vTriPos = (triObject ? position * sc : (modelMatrix * vec4(position, 1.0)).xyz) * triScale;
  vTriNormal = triObject ? normalize(normal / sc) : normalize(mat3(modelMatrix) * normal);
  // the mapping space's axes in view space, for taking the blended normal to view space in the fragment shader
  vTriX = normalize(triObject ? normalMatrix * vec3(1.0, 0.0, 0.0) : mat3(viewMatrix) * vec3(1.0, 0.0, 0.0));
  vTriY = normalize(triObject ? normalMatrix * vec3(0.0, 1.0, 0.0) : mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));
  vTriZ = normalize(triObject ? normalMatrix * vec3(0.0, 0.0, 1.0) : mat3(viewMatrix) * vec3(0.0, 0.0, 1.0));
}
`;
const FRAG_DECL = /* glsl */ `
varying vec3 vTriPos;
varying vec3 vTriNormal;
varying vec3 vTriX;
varying vec3 vTriY;
varying vec3 vTriZ;
vec3 triWeights(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }
vec4 triSample(sampler2D t, vec3 p, vec3 w) {
  return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
}
`;

export function triplanar<T extends THREE.MeshStandardMaterial>(mat: T, maps: Triplanar, opts: { object?: boolean; normalScale?: number; tint?: THREE.ColorRepresentation } = {}) {
  mat.map = maps.map;
  mat.roughnessMap = maps.roughnessMap;
  mat.normalMap = maps.normalMap;
  mat.normalScale.setScalar(opts.normalScale ?? 1);
  if (opts.tint !== undefined) mat.color.set(opts.tint);
  mat.roughness = 1; // the roughness map carries the value (levelled to the old roughness, materials.py)
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.triScale = { value: 1 / TILE_M };
    sh.uniforms.triObject = { value: !!opts.object };
    sh.vertexShader = VERT_DECL + sh.vertexShader.replace("#include <worldpos_vertex>", VERT_MAIN);
    sh.fragmentShader = FRAG_DECL + sh.fragmentShader
      .replace("#include <map_fragment>", /* glsl */ `
        vec3 triW = triWeights(vTriNormal);
        diffuseColor *= triSample(map, vTriPos, triW);
      `)
      .replace("#include <roughnessmap_fragment>", /* glsl */ `
        float roughnessFactor = roughness * triSample(roughnessMap, vTriPos, triW).g;
      `)
      .replace("#include <normal_fragment_maps>", /* glsl */ `
        {
          // whiteout blend: each plane's tangent-space normal swizzled onto its axis, then summed by weight
          vec3 nG = normalize(vTriNormal) * faceDirection;
          vec3 tx = texture2D(normalMap, vTriPos.zy).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(normalMap, vTriPos.xz).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(normalMap, vTriPos.xy).xyz * 2.0 - 1.0;
          tx.xy *= normalScale; ty.xy *= normalScale; tz.xy *= normalScale;
          tx = vec3(tx.xy + nG.zy, abs(tx.z) * nG.x);
          ty = vec3(ty.xy + nG.xz, abs(ty.z) * nG.y);
          tz = vec3(tz.xy + nG.xy, abs(tz.z) * nG.z);
          vec3 nT = normalize(tx.zyx * triW.x + ty.xzy * triW.y + tz.xyz * triW.z);
          // to view space, through the mapping space's axes
          normal = normalize(nT.x * vTriX + nT.y * vTriY + nT.z * vTriZ);
        }
      `);
  };
  // the same patch for every material that uses it: one program per (material type, object flag)
  mat.customProgramCacheKey = () => `triplanar-${opts.object ? "o" : "w"}`;
  mat.needsUpdate = true;
  return mat;
}

// the files of the three materials, in the order materialsFrom() reads them (loaded with useLoader, so the housing
// waits for them and never draws untextured)
export const MATERIAL_NAMES = ["enamel", "bakelite", "chrome"] as const;
export const MATERIAL_URLS = MATERIAL_NAMES.flatMap((n) => [`/materials/${n}-albedo.jpg`, `/materials/${n}-rough.png`, `/materials/${n}-normal.png`]);
export function materialsFrom(gl: THREE.WebGLRenderer, tex: THREE.Texture[]) {
  const prep = (t: THREE.Texture, color: boolean) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const out = {} as Record<(typeof MATERIAL_NAMES)[number], Triplanar>;
  MATERIAL_NAMES.forEach((n, k) => { out[n] = { map: prep(tex[k * 3], true), roughnessMap: prep(tex[k * 3 + 1], false), normalMap: prep(tex[k * 3 + 2], false) }; });
  return out;
}
