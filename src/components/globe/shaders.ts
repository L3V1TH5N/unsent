// src/components/globe/shaders.ts

// ── GLOBE ─────────────────────────────────────────────────────────────
export const globeVS = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNorm;
attribute vec2 aUV;
uniform mat4 uMVP;
uniform mat3 uNorm;
varying vec2 vUV;
varying float vFacing;
varying vec3 vNorm;
void main(){
  gl_Position = uMVP * vec4(aPos, 1.0);
  vUV = aUV;
  vNorm = normalize(uNorm * aNorm);
  vFacing = clamp(vNorm.z, 0.0, 1.0);
}`

export const globeFS = `
precision highp float;
varying vec2 vUV;
varying float vFacing;
varying vec3 vNorm;

// High-quality hash using 3D position to avoid seam
float hash3(vec3 p){
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.19);
  return fract(p.x * p.y * p.z);
}

// 3D noise — no UV seam since it works in 3D space
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash3(i),           hash3(i+vec3(1,0,0)), u.x),
        mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),u.x), u.y),
    mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),u.x),
        mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),u.x), u.y),
    u.z);
}

float fbm3(vec3 p){
  float v=0.0, a=0.5;
  for(int i=0;i<7;i++){v+=a*noise3(p);p*=2.07;a*=0.48;}
  return v;
}

void main(){
  // Use 3D sphere position for ALL noise — eliminates seam completely
  vec3 sp = vNorm; // unit sphere position

  // Land mask in 3D
  float lm = smoothstep(0.44, 0.50, fbm3(sp * 2.8 + 0.7));

  // ── Ocean ──
  float oDetail = fbm3(sp * 5.0 + 3.1);
  float oShallow = fbm3(sp * 11.0 + 8.2);
  vec3 oceanDeep    = vec3(0.03, 0.14, 0.48);
  vec3 oceanMid     = vec3(0.07, 0.28, 0.65);
  vec3 oceanShallow = vec3(0.14, 0.48, 0.78);
  vec3 ocean = mix(oceanDeep, oceanMid, oDetail * 0.8);
  ocean = mix(ocean, oceanShallow, oShallow * 0.25);

  // ── Land biomes ──
  float moisture = fbm3(sp * 4.2 + 9.1);
  float temp     = fbm3(sp * 3.5 + 5.7);
  float elev     = fbm3(sp * 7.0 + 2.2);

  vec3 tropical  = vec3(0.12, 0.42, 0.08);  // rainforest
  vec3 temperate = vec3(0.24, 0.48, 0.14);  // temperate forest
  vec3 grassland = vec3(0.48, 0.58, 0.22);  // savanna/grass
  vec3 desert    = vec3(0.76, 0.64, 0.32);  // sand
  vec3 arid      = vec3(0.62, 0.50, 0.26);  // scrub
  vec3 mountain  = vec3(0.46, 0.40, 0.36);  // rock
  vec3 snowcap   = vec3(0.90, 0.92, 0.94);  // snow

  vec3 land = mix(tropical, temperate, smoothstep(0.3, 0.6, temp));
  land = mix(land, grassland, smoothstep(0.5, 0.7, temp) * 0.7);
  land = mix(land, arid,     smoothstep(0.55, 0.75, moisture) * 0.8);
  land = mix(land, desert,   smoothstep(0.65, 0.85, moisture));
  land = mix(land, mountain, smoothstep(0.60, 0.78, elev) * 0.6);
  land = mix(land, snowcap,  smoothstep(0.72, 0.86, elev) * 0.5);

  // Polar ice — use Y component of sphere normal, not UV
  float pole = smoothstep(0.74, 0.95, abs(sp.y));
  land  = mix(land,  snowcap, pole);
  ocean = mix(ocean, vec3(0.82,0.90,0.96), pole * 0.8);

  vec3 base = mix(ocean, land, lm);

  // ── Lighting ──
  float brightness = 0.62 + 0.38 * vFacing;
  vec3 col = base * brightness;

  // Ocean specular using vFacing
  float spec = pow(vFacing, 55.0) * (1.0 - lm) * (1.0 - pole) * 0.4;
  col += vec3(0.55, 0.80, 1.0) * spec;

  gl_FragColor = vec4(col, 1.0);
}`

// ── ATMOSPHERE ────────────────────────────────────────────────────────
export const atmVS = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNorm;
uniform mat4 uMVP;
uniform mat3 uNorm;
varying float vRim;
void main(){
  gl_Position = uMVP * vec4(aPos, 1.0);
  vec3 vn = normalize(uNorm * aNorm);
  vRim = pow(1.0 - abs(vn.z), 3.5);
}`

export const atmFS = `
precision highp float;
varying float vRim;
void main(){
  vec3 col = mix(vec3(0.08, 0.30, 0.85), vec3(0.42, 0.78, 1.0), vRim);
  gl_FragColor = vec4(col, vRim * 0.62);
}`

// ── MARKERS ───────────────────────────────────────────────────────────
export const markerVS = `
precision highp float;
attribute vec3 aPos;
attribute float aSz;
attribute float aMat;
uniform mat4 uMVP;
uniform float uT;
varying float vPulse;
varying float vMat;
void main(){
  float p = 0.5 + 0.5 * sin(uT * 1.8 + aSz * 6.28);
  vPulse = p; vMat = aMat;
  vec4 clip = uMVP * vec4(aPos, 1.0);
  float sz = (aSz * 5.0 + 5.0) * (400.0 / clip.w);
  gl_PointSize = clamp(sz, 5.0, 32.0);
  gl_Position = clip;
}`

export const markerFS = `
precision highp float;
varying float vPulse;
varying float vMat;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if(d > 0.5) discard;
  float core = smoothstep(0.15, 0.0, d);
  float glow = smoothstep(0.5, 0.0, d) * (0.4 + 0.6*vPulse) * 0.6;
  vec3 col = mix(vec3(0.3,0.6,1.0), vec3(1.0,0.96,0.80), core);
  gl_FragColor = vec4(col, clamp(core + glow, 0.0, 1.0));
}`

// ── STARS ─────────────────────────────────────────────────────────────
export const starVS = `
precision highp float;
attribute vec2 aPos;
attribute float aSz;
attribute float aPh;
uniform float uT;
varying float vA;
varying float vSz;
void main(){
  float tw = 0.5 + 0.5 * abs(sin(uT * 0.35 + aPh));
  vA = tw; vSz = aSz;
  gl_PointSize = aSz * tw;
  gl_Position = vec4(aPos, 0.999, 1.0);
}`

export const starFS = `
precision highp float;
varying float vA;
varying float vSz;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if(d > 0.5) discard;
  float core = smoothstep(0.18, 0.0, d);
  float halo = smoothstep(0.5, 0.05, d);
  vec3 col = mix(vec3(1.0,0.88,0.62), vec3(0.86,0.94,1.0), smoothstep(0.4,2.2,vSz));
  gl_FragColor = vec4(col, clamp((core*0.9 + halo*0.35)*vA, 0.0, 1.0));
}`