// src/components/globe/shaders.ts
// ── GLOBE ─────────────────────────────────────────────────────────────
export const globeVS = `
precision mediump float;
attribute vec3 aPos; attribute vec3 aNorm; attribute vec2 aUV;
uniform mat4 uMVP; uniform mat3 uNorm;
varying vec3 vN; varying vec2 vUV;
void main(){
  gl_Position=uMVP*vec4(aPos,1.0);
  vN=normalize(uNorm*aNorm); vUV=aUV;
}`

// Photorealistic daytime Earth matching reference photo:
// vivid blue ocean, pink-tan continents, thick white clouds, deep space bg.
export const globeFS = `
precision mediump float;
varying vec3 vN; varying vec2 vUV;
uniform float uT;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.1;a*=0.5;}return v;}
void main(){
  float lm = smoothstep(0.43,0.54,fbm(vUV*4.4+1.3));

  // ── Ocean: vivid satellite blue ──────────────────────────────────
  vec3 oceanDeep    = vec3(0.05, 0.18, 0.48);
  vec3 oceanMid     = vec3(0.10, 0.32, 0.62);
  vec3 oceanShallow = vec3(0.18, 0.48, 0.75);
  float od = fbm(vUV*5.0+5.0);
  vec3 ocean = mix(oceanDeep, mix(oceanMid, oceanShallow, od), od*0.7);

  // ── Land: pink-tan-brown like the reference ──────────────────────
  vec3 landDesert  = vec3(0.72, 0.52, 0.38); // Arabian peninsula / Sahara pink-tan
  vec3 landArid    = vec3(0.62, 0.46, 0.32); // dry scrubland
  vec3 landGreen   = vec3(0.32, 0.42, 0.20); // forest/vegetation
  vec3 landMtn     = vec3(0.58, 0.50, 0.44); // grey-brown mountain rock

  float arid    = smoothstep(0.45,0.72,fbm(vUV*5.0+9.0));
  float green   = smoothstep(0.35,0.60,fbm(vUV*7.0+1.5));
  float mtn     = smoothstep(0.62,0.80,fbm(vUV*12.0+3.3));

  vec3 land = mix(landGreen, landArid, green*0.5);
  land = mix(land, landDesert, arid*0.85);
  land = mix(land, landMtn, mtn*0.55);

  // ── Combine ocean + land ─────────────────────────────────────────
  vec3 base = mix(ocean, land, lm);

  // Polar ice — bright blue-white
  float pole = smoothstep(0.75,0.92,abs(vN.y));
  base = mix(base, vec3(0.82,0.90,0.96), pole);

  // ── Lighting: sun upper-left, wide and bright ────────────────────
  vec3 L = normalize(vec3(-0.4, 0.7, 1.0));
  float d = max(dot(vN,L), 0.0);
  float ambient = 0.12;
  float diffuse = pow(d, 0.65); // spread wide
  vec3 lit = base * (ambient + (1.0-ambient)*diffuse);

  // Ocean specular — bright white glint
  vec3 H = normalize(L + vec3(0,0,1));
  float spec = pow(max(dot(vN,H),0.0),55.0) * (1.0-lm) * (1.0-pole) * 0.7;
  lit += vec3(0.75,0.88,1.0)*spec;

  // ── Clouds: thick, bright white like the reference ───────────────
  float c1 = fbm(vUV*3.2+vec2(uT*0.003, 0.0));
  float c2 = fbm(vUV*5.8+vec2(uT*0.002+2.1, 0.5));
  float c3 = fbm(vUV*8.5+vec2(uT*0.0015+4.3, 1.2));
  float cloudMask = smoothstep(0.46,0.62,c1)*0.8
                  + smoothstep(0.50,0.65,c2)*0.5
                  + smoothstep(0.54,0.68,c3)*0.3;
  cloudMask = clamp(cloudMask, 0.0, 1.0);
  // Clouds are brightly lit on day side, dark on terminator
  vec3 cloudCol = vec3(0.90,0.93,0.97) * (ambient + (1.0-ambient)*pow(d,0.5));
  lit = mix(lit, cloudCol, cloudMask*0.88);

  // ── Terminator: hard shadow on night side ────────────────────────
  float term = smoothstep(0.0, 0.09, d);
  lit *= mix(0.02, 1.0, term);

  gl_FragColor = vec4(lit, 1.0);
}`

// ── ATMOSPHERE (unchanged) ───────────────────────────────────────────
export const atmVS = `
precision mediump float;
attribute vec3 aPos; attribute vec3 aNorm;
uniform mat4 uMVP; uniform mat3 uNorm;
varying vec3 vN;
void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNorm*aNorm);}`
export const atmFS = `
precision mediump float;
varying vec3 vN;
void main(){
  float rim=pow(1.0-abs(dot(vN,vec3(0,0,1))),2.2);
  // Bright cyan-blue atmospheric scattering like the reference
  gl_FragColor=vec4(mix(vec3(0.10,0.40,0.90),vec3(0.50,0.82,1.0),rim),rim*0.65);
}`

// ── MESSAGE MARKERS — small glowing dot per letter ────────────────────
export const markerVS = `
precision mediump float;
attribute vec3 aPos; attribute float aSz; attribute float aMat;
uniform mat4 uMVP; uniform float uT;
varying float vPulse;
void main(){
  float p=0.5+0.5*sin(uT*2.0+aSz*6.28);
  vPulse=p;
  vec4 clip=uMVP*vec4(aPos,1.0);
  float sz=(aSz*6.0+4.0)*(380.0/clip.w);
  gl_PointSize=clamp(sz,4.0,28.0);
  gl_Position=clip;
}`
export const markerFS = `
precision mediump float;
varying float vPulse;
void main(){
  vec2 p=gl_PointCoord-0.5;
  float d=length(p);
  if(d>0.5)discard;
  // Soft glow falloff
  float core=smoothstep(0.18,0.0,d);
  float glow=smoothstep(0.5,0.05,d)*(0.5+0.5*vPulse);
  // Warm white-blue dot, like a city light from space
  vec3 col=mix(vec3(0.4,0.65,1.0),vec3(1.0,0.95,0.85),core);
  float alpha=clamp(core*0.95+glow*0.55,0.0,1.0);
  gl_FragColor=vec4(col,alpha);
}`

// ── STARS + MILKY WAY — deep space background like Google Earth ───────
export const starVS = `
precision mediump float;
attribute vec2 aPos; attribute float aSz; attribute float aPh;
uniform float uT;
varying float vA; varying float vSz;
void main(){
  float tw=0.4+0.6*abs(sin(uT*0.5+aPh));
  vA=tw; vSz=aSz;
  gl_PointSize=aSz*tw;
  gl_Position=vec4(aPos,0.999,1.0);
}`
export const starFS = `
precision mediump float;
varying float vA; varying float vSz;
void main(){
  float d=length(gl_PointCoord-0.5);
  if(d>0.5)discard;
  // Bigger stars get a blue-white tint, tiny ones are warm
  vec3 col=mix(vec3(1.0,0.92,0.75),vec3(0.85,0.92,1.0),smoothstep(1.0,3.0,vSz));
  gl_FragColor=vec4(col,smoothstep(0.5,0.08,d)*vA*0.92);
}`