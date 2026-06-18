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

// uGreen (0..1) drives the whole-globe "world healing" progression:
// 0   = a barren, cracked, brown world with no living water
// 1   = full living Earth — deep oceans, green land, polar ice, city lights
// It rises with the total number of messages ever shared (see page.tsx).
export const globeFS = `
    precision mediump float;
    varying vec3 vN; varying vec2 vUV;
    uniform float uT; uniform float uGreen;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.1;a*=0.5;}return v;}
    void main(){
    float lm=smoothstep(0.43,0.52,fbm(vUV*5.8+1.3));

    vec3 oceanBarren=vec3(0.34,0.26,0.16);
    vec3 oceanLiving=vec3(0.05,0.14,0.30);
    vec3 ocean=mix(oceanBarren,oceanLiving,uGreen);
    float cracks=smoothstep(0.5,0.85,fbm(vUV*22.0))*(1.0-uGreen);
    ocean=mix(ocean,ocean*0.6,cracks);

    vec3 landDry=mix(vec3(0.42,0.30,0.16),vec3(0.30,0.21,0.11),fbm(vUV*11.0));
    vec3 landLive=mix(vec3(0.09,0.24,0.10),vec3(0.16,0.38,0.14),fbm(vUV*11.0));
    vec3 land=mix(landDry,landLive,uGreen);
    land=mix(land,vec3(0.32,0.26,0.12),smoothstep(0.54,0.72,fbm(vUV*7.5+3.7))*lm*(0.45+0.55*uGreen));

    vec3 base=mix(ocean,land,lm);

    float iceAmt=mix(0.32,1.0,uGreen);
    base=mix(base,vec3(0.85,0.90,0.96),smoothstep(0.78,0.95,abs(vN.y))*iceAmt);

    vec3 L=normalize(vec3(1.2,0.8,1.0));
    float d=max(dot(vN,L),0.0);
    vec3 lit=base*(0.15+0.85*d);

    float spec=pow(max(dot(normalize(vec3(0,0,1)),normalize(L+vec3(0,0,1))),0.0),48.0)*(1.0-lm)*0.4*uGreen;
    lit+=vec3(0.5,0.7,1.0)*spec;

    float dark=1.0-smoothstep(0.0,0.22,d);
    lit+=vec3(1.0,0.88,0.45)*smoothstep(0.60,0.72,fbm(vUV*18.0))*lm*dark*0.55*uGreen;

    float cloud=fbm(vUV*3.8+vec2(uT*0.006,0.0));
    lit=mix(lit,vec3(0.88,0.92,0.96)*(0.18+0.82*d),smoothstep(0.50,0.66,cloud)*0.72);

    gl_FragColor=vec4(lit,1.0);
}`

// ── ATMOSPHERE (unchanged) ───────────────────────────────────────────
export const atmVS = `
    precision mediump float;
    attribute vec3 aPos; attribute vec3 aNorm;
    uniform mat4 uMVP; uniform mat3 uNorm;
    varying vec3 vN;
    void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNorm*aNorm);
}`

export const atmFS = `
    precision mediump float;
    varying vec3 vN;
    void main(){
    float rim=pow(1.0-abs(dot(vN,vec3(0,0,1))),2.6);
    gl_FragColor=vec4(mix(vec3(0.08,0.35,0.95),vec3(0.4,0.75,1.0),rim),rim*0.52);
}`

// ── MESSAGE MARKERS ───────────────────────────────────────────────────
// One glowing point per letter, placed at its deterministic lat/lng.
// Point size already scales with 1/clip.w, so markers stay correctly
// sized as the camera zooms in and out with no extra work needed here.
export const markerVS = `
    precision mediump float;
    attribute vec3 aPos; attribute vec3 aCol; attribute float aSz;
    uniform mat4 uMVP; uniform float uT;
    varying vec3 vCol; varying float vPulse;
    void main(){
    float p=0.5+0.5*sin(uT*2.2+aSz*6.28);
    vPulse=p; vCol=aCol;
    vec4 clip=uMVP*vec4(aPos*(1.0+p*0.018),1.0);
    gl_PointSize=max(6.0,(aSz*9.0+p*5.0)*(350.0/clip.w));
    gl_Position=clip;
}`

export const markerFS = `
    precision mediump float;
    varying vec3 vCol; varying float vPulse;
    void main(){
    vec2 c=gl_PointCoord-0.5; float d=length(c);
    if(d>0.5)discard;
    float core=smoothstep(0.5,0.08,d);
    float glow=smoothstep(0.5,0.0,d)*vPulse*0.8;
    gl_FragColor=vec4(mix(vCol*1.5,vCol,d*2.0),clamp(core+glow,0.0,1.0)*0.95);
}`

// ── STARS (unchanged) ────────────────────────────────────────────────
export const starVS = `
    precision mediump float;
    attribute vec2 aPos; attribute float aSz; attribute float aPh;
    uniform float uT;
    varying float vA;
    void main(){
    float tw=0.3+0.7*abs(sin(uT*0.7+aPh));
    vA=tw; gl_PointSize=aSz*tw; gl_Position=vec4(aPos,0.999,1.0);
}`

export const starFS = `
    precision mediump float;
    varying float vA;
    void main(){
    float d=length(gl_PointCoord-0.5);
    if(d>0.5)discard;
    gl_FragColor=vec4(1.0,0.97,0.88,smoothstep(0.5,0.1,d)*vA*0.85);
}`