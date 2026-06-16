"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface PublicLetter {
  id: string
  content: string
  recipientType: string
  emotion: string | null
  createdAt: string
}
interface Props { letters: PublicLetter[] }

const EMOTION_COLORS: Record<string, [number,number,number]> = {
  longing:     [196,137,122], sadness:     [122,158,196],
  regret:      [154,138,196], healing:     [122,170,122],
  forgiveness: [196,170,122], love:        [196,122,154],
  hope:        [122,186,196], acceptance:  [138,170,138],
}
const RECIPIENT_LABELS: Record<string,string> = {
  someone_loved:'to someone I loved', someone_lost:'to someone I lost',
  past_self:'to my past self', someone_hurt:'to someone I hurt',
  someone_forgive:'to someone I forgive', myself:'to myself',
}

function timeAgo(d:string){
  const s=Math.floor((Date.now()-new Date(d).getTime())/1000)
  if(s<60)return'just now'; if(s<3600)return`${Math.floor(s/60)}m ago`
  if(s<86400)return`${Math.floor(s/3600)}h ago`; return`${Math.floor(s/86400)}d ago`
}
function seed(n:number){const x=Math.sin(n+1)*10000;return x-Math.floor(x)}

// lat/lng → unit sphere XYZ
function ll2xyz(lat:number,lng:number,r=1):[number,number,number]{
  const phi=(90-lat)*Math.PI/180, theta=(lng+180)*Math.PI/180
  return [-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta)]
}

const GARDENS=[
  [40.7,-74.0],[51.5,-0.1],[35.7,139.7],[-33.9,151.2],[48.8,2.3],
  [55.7,37.6],[-23.5,-46.6],[28.6,77.2],[19.4,-99.1],[-1.3,36.8],
  [37.6,-122.4],[1.3,103.8],[59.9,10.7],[-34.6,-58.4],[30.0,31.2],
]

// ── Column-major mat4 helpers (WebGL standard) ──────────────────────────
// Storage: [col0row0, col0row1, col0row2, col0row3,  col1row0, ...]
// i.e. mat[col*4 + row]
function m4id():number[]{return[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]}

// C = A*B  (column-major)
// C[col][row] = Σk A[k][row] * B[col][k]
// flat: C[col*4+row] += A[k*4+row] * B[col*4+k]
function m4mul(A:number[],B:number[]):number[]{
  const C=new Array(16).fill(0)
  for(let col=0;col<4;col++)
    for(let row=0;row<4;row++)
      for(let k=0;k<4;k++)
        C[col*4+row]+=A[k*4+row]*B[col*4+k]
  return C
}

// Rotation around Y
function m4rotY(a:number):number[]{
  const c=Math.cos(a),s=Math.sin(a)
  return[c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]
}
// Rotation around X
function m4rotX(a:number):number[]{
  const c=Math.cos(a),s=Math.sin(a)
  return[1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]
}
// Translation
function m4trans(x:number,y:number,z:number):number[]{
  return[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]
}
// Perspective
function m4persp(fovY:number,asp:number,near:number,far:number):number[]{
  const f=1/Math.tan(fovY/2),nf=1/(near-far)
  return[f/asp,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]
}
// Upper-left 3×3 of mat4 (for normal transform) — column-major
function m3from4(m:number[]):number[]{
  return[m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]
}

// ── Sphere geometry ───────────────────────────────────────────────────────
function sphere(stacks:number,slices:number,r:number){
  const pos:number[]=[],norm:number[]=[],uv:number[]=[],idx:number[]=[]
  for(let i=0;i<=stacks;i++){
    const phi=i/stacks*Math.PI
    for(let j=0;j<=slices;j++){
      const theta=j/slices*2*Math.PI
      const x=-Math.sin(phi)*Math.cos(theta),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(theta)
      pos.push(r*x,r*y,r*z); norm.push(x,y,z); uv.push(j/slices,i/stacks)
    }
  }
  for(let i=0;i<stacks;i++)for(let j=0;j<slices;j++){
    const a=i*(slices+1)+j,b=a+slices+1
    idx.push(a,b,a+1,b,b+1,a+1)
  }
  return{pos,norm,uv,idx}
}

export default function LandingScene({letters}:Props){
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const stateRef    = useRef({
    gl:null as WebGLRenderingContext|null,
    progs:{} as Record<string,WebGLProgram>,
    bufs:{} as Record<string,any>,
    rot:{x:0.25,y:0,vx:0,vy:0.003},
    drag:{on:false,lx:0,ly:0},
    t:0, raf:0
  })
  const [openLetter,setOpenLetter]=useState<PublicLetter|null>(null)
  const [modalVis,setModalVis]=useState(false)
  const [ready,setReady]=useState(false)

  // ── Compile helper ────────────────────────────────────────────────────
  function mkProg(ctx:WebGLRenderingContext,vs:string,fs:string){
    const mk=(t:number,s:string)=>{const r=ctx.createShader(t)!;ctx.shaderSource(r,s);ctx.compileShader(r);return r}
    const p=ctx.createProgram()!
    ctx.attachShader(p,mk(ctx.VERTEX_SHADER,vs))
    ctx.attachShader(p,mk(ctx.FRAGMENT_SHADER,fs))
    ctx.linkProgram(p)
    if(!ctx.getProgramParameter(p,ctx.LINK_STATUS))console.error(ctx.getProgramInfoLog(p))
    return p
  }

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return
    const gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false})
    if(!gl){console.error('WebGL not supported');return}
    const S=stateRef.current; S.gl=gl
    // Capture as typed const — TypeScript loses null-narrowing inside nested functions
    const G: WebGLRenderingContext = gl
    G.enable(G.DEPTH_TEST); G.enable(G.BLEND)
    G.blendFunc(G.SRC_ALPHA,G.ONE_MINUS_SRC_ALPHA)

    // ── GLOBE ─────────────────────────────────────────────────────────
    const globeVS=`
precision mediump float;
attribute vec3 aPos; attribute vec3 aNorm; attribute vec2 aUV;
uniform mat4 uMVP; uniform mat3 uNorm;
varying vec3 vN; varying vec2 vUV; varying vec3 vP;
void main(){
  gl_Position=uMVP*vec4(aPos,1.0);
  vN=normalize(uNorm*aNorm); vUV=aUV; vP=aPos;
}`
    const globeFS=`
precision mediump float;
varying vec3 vN; varying vec2 vUV; varying vec3 vP;
uniform float uT;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.1;a*=0.5;}return v;}
void main(){
  vec3 ocean=vec3(0.05,0.14,0.30);
  float lm=smoothstep(0.43,0.52,fbm(vUV*5.8+1.3));
  vec3 land=mix(vec3(0.09,0.24,0.10),vec3(0.16,0.38,0.14),fbm(vUV*11.0));
  land=mix(land,vec3(0.32,0.26,0.12),smoothstep(0.54,0.72,fbm(vUV*7.5+3.7))*lm);
  vec3 base=mix(ocean,land,lm);
  base=mix(base,vec3(0.85,0.90,0.96),smoothstep(0.78,0.95,abs(vN.y)));
  vec3 L=normalize(vec3(1.2,0.8,1.0));
  float d=max(dot(vN,L),0.0);
  vec3 lit=base*(0.15+0.85*d);
  float spec=pow(max(dot(normalize(vec3(0,0,1)),normalize(L+vec3(0,0,1))),0.0),48.0)*(1.0-lm)*0.4;
  lit+=vec3(0.5,0.7,1.0)*spec;
  float dark=1.0-smoothstep(0.0,0.22,d);
  lit+=vec3(1.0,0.88,0.45)*smoothstep(0.60,0.72,fbm(vUV*18.0))*lm*dark*0.55;
  float cloud=fbm(vUV*3.8+vec2(uT*0.006,0.0));
  lit=mix(lit,vec3(0.88,0.92,0.96)*(0.18+0.82*d),smoothstep(0.50,0.66,cloud)*0.72);
  gl_FragColor=vec4(lit,1.0);
}`

    // ── ATMOSPHERE ───────────────────────────────────────────────────
    const atmVS=`
precision mediump float;
attribute vec3 aPos; attribute vec3 aNorm;
uniform mat4 uMVP; uniform mat3 uNorm;
varying vec3 vN;
void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNorm*aNorm);}`
    const atmFS=`
precision mediump float;
varying vec3 vN;
void main(){
  float rim=pow(1.0-abs(dot(vN,vec3(0,0,1))),2.6);
  gl_FragColor=vec4(mix(vec3(0.08,0.35,0.95),vec3(0.4,0.75,1.0),rim),rim*0.52);
}`

    // ── GARDEN POINTS ────────────────────────────────────────────────
    const gardenVS=`
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
    const gardenFS=`
precision mediump float;
varying vec3 vCol; varying float vPulse;
void main(){
  vec2 c=gl_PointCoord-0.5; float d=length(c);
  if(d>0.5)discard;
  float core=smoothstep(0.5,0.08,d);
  float glow=smoothstep(0.5,0.0,d)*vPulse*0.8;
  gl_FragColor=vec4(mix(vCol*1.5,vCol,d*2.0),clamp(core+glow,0.0,1.0)*0.95);
}`

    // ── STARS ────────────────────────────────────────────────────────
    const starVS=`
precision mediump float;
attribute vec2 aPos; attribute float aSz; attribute float aPh;
uniform float uT;
varying float vA;
void main(){
  float tw=0.3+0.7*abs(sin(uT*0.7+aPh));
  vA=tw; gl_PointSize=aSz*tw; gl_Position=vec4(aPos,0.999,1.0);
}`
    const starFS=`
precision mediump float;
varying float vA;
void main(){
  float d=length(gl_PointCoord-0.5);
  if(d>0.5)discard;
  gl_FragColor=vec4(1.0,0.97,0.88,smoothstep(0.5,0.1,d)*vA*0.85);
}`

    S.progs.globe  = mkProg(G,globeVS,globeFS)
    S.progs.atm    = mkProg(G,atmVS,atmFS)
    S.progs.garden = mkProg(G,gardenVS,gardenFS)
    S.progs.star   = mkProg(G,starVS,starFS)

    // ── Upload helpers ──────────────────────────────────────────────
    function vbo(data:number[]){
      const b=G.createBuffer()!
      G.bindBuffer(G.ARRAY_BUFFER,b)
      G.bufferData(G.ARRAY_BUFFER,new Float32Array(data),G.STATIC_DRAW)
      return b
    }
    function ibo(data:number[]){
      const b=G.createBuffer()!
      G.bindBuffer(G.ELEMENT_ARRAY_BUFFER,b)
      G.bufferData(G.ELEMENT_ARRAY_BUFFER,new Uint16Array(data),G.STATIC_DRAW)
      return b
    }

    // Globe & atmosphere geometry
    const g=sphere(48,48,1.0), a=sphere(36,36,1.055)
    S.bufs.gPos=vbo(g.pos); S.bufs.gNorm=vbo(g.norm); S.bufs.gUV=vbo(g.uv)
    S.bufs.gIdx=ibo(g.idx); S.bufs.gN=g.idx.length
    S.bufs.aPos=vbo(a.pos); S.bufs.aNorm=vbo(a.norm)
    S.bufs.aIdx=ibo(a.idx); S.bufs.aN=a.idx.length

    // Garden points
    const gpos:number[]=[],gcol:number[]=[],gsz:number[]=[]
    GARDENS.forEach(([lat,lng],i)=>{
      const [x,y,z]=ll2xyz(lat,lng,1.02); gpos.push(x,y,z)
      const letter=letters[i%Math.max(letters.length,1)]
      const ec=letter?.emotion?EMOTION_COLORS[letter.emotion]:null
      gcol.push(...(ec?[ec[0]/255,ec[1]/255,ec[2]/255]:[0.7,0.95,0.5]))
      gsz.push(0.7+seed(i*7)*0.7)
    })
    S.bufs.gPos2=vbo(gpos); S.bufs.gCol=vbo(gcol); S.bufs.gSz=vbo(gsz)
    S.bufs.gCount=GARDENS.length

    // Stars
    const sp:number[]=[],ss:number[]=[],sph:number[]=[]
    for(let i=0;i<300;i++){
      sp.push(seed(i*7)*2-1,seed(i*11)*2-1)
      ss.push(1.0+seed(i*13)*2.5); sph.push(seed(i*17)*Math.PI*2)
    }
    S.bufs.sPos=vbo(sp); S.bufs.sSz=vbo(ss); S.bufs.sPh=vbo(sph)
    S.bufs.sCount=300

    setReady(true)
  },[])

  // ── Render loop ───────────────────────────────────────────────────────
  useEffect(()=>{
    if(!ready)return
    const S=stateRef.current; const gl=S.gl; if(!gl)return
    const canvas=canvasRef.current; if(!canvas)return

    // gl and canvas are confirmed non-null above — capture as typed locals
    const G: WebGLRenderingContext = gl
    const CV: HTMLCanvasElement = canvas

    function attr(prog:WebGLProgram,name:string,buf:WebGLBuffer,size:number){
      const loc=G.getAttribLocation(prog,name); if(loc<0)return
      G.bindBuffer(G.ARRAY_BUFFER,buf)
      G.vertexAttribPointer(loc,size,G.FLOAT,false,0,0)
      G.enableVertexAttribArray(loc)
    }
    function uni4(prog:WebGLProgram,name:string,v:number[]){
      G.uniformMatrix4fv(G.getUniformLocation(prog,name),false,v)
    }
    function uni3(prog:WebGLProgram,name:string,v:number[]){
      G.uniformMatrix3fv(G.getUniformLocation(prog,name),false,v)
    }
    function uni1f(prog:WebGLProgram,name:string,v:number){
      G.uniform1f(G.getUniformLocation(prog,name),v)
    }

    function frame(){
      S.raf=requestAnimationFrame(frame)
      S.t+=0.016

      const dpr=Math.min(window.devicePixelRatio||1,2)
      const W=CV.offsetWidth*dpr, H=CV.offsetHeight*dpr
      if(CV.width!==W||CV.height!==H){CV.width=W;CV.height=H}
      G.viewport(0,0,W,H)
      G.clearColor(0,0,0,0)
      G.clear(G.COLOR_BUFFER_BIT|G.DEPTH_BUFFER_BIT)

      // Rotation physics
      const rot=S.rot
      if(!S.drag.on){
        rot.vy+=(0.003-rot.vy)*0.018
        rot.vx+=(0-rot.vx)*0.06
      }
      rot.y+=rot.vy; rot.x+=rot.vx
      rot.x=Math.max(-0.55,Math.min(0.55,rot.x))

      // Matrices — column-major throughout
      const proj=m4persp(0.72,W/H,0.1,100)
      const view=m4trans(0,0,-2.75)
      const rotM=m4mul(m4rotX(rot.x),m4rotY(rot.y))
      const mv  =m4mul(view,rotM)
      const mvp =m4mul(proj,mv)
      const nm  =m3from4(rotM)

      // ── Stars ──────────────────────────────────────────────────────
      const sp=S.progs.star; G.useProgram(sp)
      attr(sp,'aPos',S.bufs.sPos,2); attr(sp,'aSz',S.bufs.sSz,1); attr(sp,'aPh',S.bufs.sPh,1)
      uni1f(sp,'uT',S.t)
      G.drawArrays(G.POINTS,0,S.bufs.sCount)

      // ── Globe ──────────────────────────────────────────────────────
      const gp=S.progs.globe; G.useProgram(gp)
      attr(gp,'aPos',S.bufs.gPos,3); attr(gp,'aNorm',S.bufs.gNorm,3); attr(gp,'aUV',S.bufs.gUV,2)
      uni4(gp,'uMVP',mvp); uni3(gp,'uNorm',nm); uni1f(gp,'uT',S.t)
      G.bindBuffer(G.ELEMENT_ARRAY_BUFFER,S.bufs.gIdx)
      G.drawElements(G.TRIANGLES,S.bufs.gN,G.UNSIGNED_SHORT,0)

      // ── Atmosphere ─────────────────────────────────────────────────
      G.depthMask(false)
      const ap=S.progs.atm; G.useProgram(ap)
      attr(ap,'aPos',S.bufs.aPos,3); attr(ap,'aNorm',S.bufs.aNorm,3)
      uni4(ap,'uMVP',mvp); uni3(ap,'uNorm',nm)
      G.bindBuffer(G.ELEMENT_ARRAY_BUFFER,S.bufs.aIdx)
      G.drawElements(G.TRIANGLES,S.bufs.aN,G.UNSIGNED_SHORT,0)
      G.depthMask(true)

      // ── Garden glow points ─────────────────────────────────────────
      const gdp=S.progs.garden; G.useProgram(gdp)
      attr(gdp,'aPos',S.bufs.gPos2,3); attr(gdp,'aCol',S.bufs.gCol,3); attr(gdp,'aSz',S.bufs.gSz,1)
      uni4(gdp,'uMVP',mvp); uni1f(gdp,'uT',S.t)
      G.drawArrays(G.POINTS,0,S.bufs.gCount)
    }
    frame()
    return()=>cancelAnimationFrame(S.raf)
  },[ready])

  // ── Pointer drag ─────────────────────────────────────────────────────
  const onDown=useCallback((e:React.PointerEvent)=>{
    const S=stateRef.current
    S.drag={on:true,lx:e.clientX,ly:e.clientY}
  },[])
  const onMove=useCallback((e:React.PointerEvent)=>{
    const S=stateRef.current; if(!S.drag.on)return
    const dx=e.clientX-S.drag.lx, dy=e.clientY-S.drag.ly
    S.rot.vy=dx*0.005; S.rot.vx=dy*0.005
    S.rot.y+=dx*0.005; S.rot.x+=dy*0.005
    S.drag.lx=e.clientX; S.drag.ly=e.clientY
  },[])
  const onUp=useCallback(()=>{ stateRef.current.drag.on=false },[])

  // ── Modal ─────────────────────────────────────────────────────────────
  function openModal(l:PublicLetter){setOpenLetter(l);setModalVis(false);setTimeout(()=>setModalVis(true),20)}
  function closeModal(){setModalVis(false);setTimeout(()=>setOpenLetter(null),250)}
  useEffect(()=>{
    if(!openLetter)return
    const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')closeModal()}
    window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn)
  },[openLetter])
  useEffect(()=>{document.body.style.overflow=openLetter?'hidden':'';return()=>{document.body.style.overflow=''}},[openLetter])

  const acc=openLetter?(()=>{const c=EMOTION_COLORS[openLetter.emotion??''];return c?`rgb(${c[0]},${c[1]},${c[2]})`:'#C4897A'})():'#C4897A'

  // Fallback letter buttons if no DB letters yet
  const displayLetters = letters.length > 0 ? letters.slice(0,6) : [
    {id:'a',content:'',recipientType:'myself',emotion:'healing',createdAt:new Date().toISOString()},
    {id:'b',content:'',recipientType:'someone_loved',emotion:'longing',createdAt:new Date().toISOString()},
    {id:'c',content:'',recipientType:'past_self',emotion:'hope',createdAt:new Date().toISOString()},
  ]

  return(
    <>
    <canvas ref={canvasRef} className="gc"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
      style={{cursor:'grab',touchAction:'none'}}
    />

    {!ready&&<div className="gload"><div className="gshim"/></div>}

    {/* Floating letter buttons */}
    <div className="fl-wrap">
      {displayLetters.map((l,i)=>{
        const col=EMOTION_COLORS[l.emotion??'']??[196,137,122]
        const rgb=`rgb(${col[0]},${col[1]},${col[2]})`
        return(
          <button key={l.id} className={`fl fl-${i}`}
            style={{'--c':rgb,'--d':`${i*0.9}s`} as React.CSSProperties}
            onClick={()=>l.content?openModal(l):null}
            aria-label={`Letter — ${l.emotion??'unsent'}`}
          >
            <span className="fl-icon">✉</span>
            <span className="fl-txt">{l.emotion??'unsent'}</span>
            {l.content&&<span className="fl-dot"/>}
          </button>
        )
      })}
    </div>

    {/* Modal */}
    {openLetter&&(
      <div className={`mb ${modalVis?'mbv':''}`} onClick={closeModal} role="dialog" aria-modal="true">
        <div className="mc" onClick={e=>e.stopPropagation()} style={{'--a':acc} as React.CSSProperties}>
          <div className="mt">
            <span className="mr">{RECIPIENT_LABELS[openLetter.recipientType]??'to someone'}</span>
            {openLetter.emotion&&<span className="me" style={{color:acc,borderColor:`${acc}55`}}>{openLetter.emotion}</span>}
            <span className="mtime">{timeAgo(openLetter.createdAt)}</span>
            <button className="mx" onClick={closeModal}>✕</button>
          </div>
          <div className="mp"><div className="mml" style={{borderColor:`${acc}50`}}/><p className="mtxt">{openLetter.content}</p></div>
          <div className="mf"><span className="man">— anonymous</span><a href="/write" className="mca" style={{background:acc}}>write your own</a></div>
        </div>
      </div>
    )}

    <style>{`
      .gc{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;}
      .gload{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;pointer-events:none;}
      .gshim{width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#1a2a3a,#050a10);animation:gpulse 2s ease-in-out infinite;}
      @keyframes gpulse{0%,100%{opacity:.5;transform:scale(.97)}50%{opacity:.9;transform:scale(1)}}

      /* Floating letter buttons */
      .fl-wrap{position:absolute;inset:0;pointer-events:none;z-index:5;}
      .fl{
        position:absolute;pointer-events:all;
        display:flex;align-items:center;gap:.4rem;
        padding:.32rem .7rem;
        background:rgba(4,10,4,.78);
        border:1px solid var(--c,#C4897A);
        border-radius:100px;
        cursor:pointer;
        animation:fbob 6s ease-in-out var(--d,0s) infinite;
        box-shadow:0 0 10px var(--c,#C4897A),0 2px 8px rgba(0,0,0,.5);
        backdrop-filter:blur(6px);
        transition:transform .2s,box-shadow .2s;
      }
      .fl:hover{transform:scale(1.14)!important;box-shadow:0 0 22px var(--c),0 4px 16px rgba(0,0,0,.6);}
      .fl:hover{animation-play-state:paused;}
      @keyframes fbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
      /* Positions — right half of viewport */
      .fl-0{top:22%;left:62%;animation-duration:7s;}
      .fl-1{top:36%;left:76%;animation-duration:5.5s;}
      .fl-2{top:52%;left:66%;animation-duration:8s;}
      .fl-3{top:30%;left:57%;animation-duration:6.5s;}
      .fl-4{top:62%;left:72%;animation-duration:9s;}
      .fl-5{top:44%;left:80%;animation-duration:6s;}
      .fl-icon{font-size:.68rem;color:var(--c,#C4897A);}
      .fl-txt{font-family:Georgia,serif;font-size:.62rem;font-style:italic;color:rgba(230,215,185,.85);white-space:nowrap;}
      .fl-dot{width:5px;height:5px;border-radius:50%;background:var(--c);opacity:.8;flex-shrink:0;}

      /* Modal */
      .mb{position:fixed;inset:0;z-index:200;background:rgba(2,6,2,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1.5rem;opacity:0;transition:opacity .25s;}
      .mbv{opacity:1;}
      .mc{background:#FAF6EE;border:1px solid #D8CCB4;border-radius:3px;max-width:540px;width:100%;max-height:82vh;overflow-y:auto;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.5);animation:crise .3s cubic-bezier(.34,1.56,.64,1) forwards;}
      @keyframes crise{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}
      .mt{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:1.1rem 1.4rem .9rem;border-bottom:1px solid #EAE0D0;}
      .mr{font-family:Georgia,serif;font-size:.8rem;font-style:italic;color:#6B5E4E;}
      .me{font-size:.68rem;padding:.18rem .55rem;border-radius:100px;border:1px solid;font-family:system-ui,sans-serif;letter-spacing:.04em;}
      .mtime{font-size:.66rem;color:#9A8878;font-family:system-ui,sans-serif;margin-left:auto;}
      .mx{background:none;border:none;cursor:pointer;font-size:.82rem;color:#9A8878;padding:2px 4px;border-radius:4px;transition:color .15s,background .15s;}
      .mx:hover{color:#2C2416;background:#EDE4D4;}
      .mp{position:relative;padding:1.75rem 1.75rem 1.25rem 2.75rem;min-height:160px;}
      .mml{position:absolute;top:0;bottom:0;left:2rem;width:1px;border-left:1.5px solid;opacity:.5;}
      .mtxt{font-family:Georgia,serif;font-size:1.02rem;line-height:1.88;color:#2C2416;white-space:pre-wrap;}
      .mf{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.4rem 1.1rem;border-top:1px solid #EAE0D0;}
      .man{font-family:Georgia,serif;font-size:.78rem;font-style:italic;color:#9A8878;}
      .mca{font-family:system-ui,sans-serif;font-size:.78rem;color:white;text-decoration:none;padding:.42rem .95rem;border-radius:100px;transition:opacity .15s;}
      .mca:hover{opacity:.85;}

      @media(max-width:600px){.fl{display:none;}}
      @media(prefers-reduced-motion:reduce){.fl,.gshim{animation:none!important;}}
    `}</style>
    </>
  )
}