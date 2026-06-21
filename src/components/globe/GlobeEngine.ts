// src/components/globe/GlobeEngine.ts
import { m4mul, m4rotX, m4rotY, m4trans, m4persp, m3from4, transformPoint, rotate3 } from './mat4'
import { sphere } from './geometry'
import { globeVS, globeFS, atmVS, atmFS, markerVS, markerFS, starVS, starFS } from './shaders'
import { seed, letterPosition, ll2xyz } from './utils'
import { ZOOM_MIN, ZOOM_MAX, ZOOM_DEFAULT, PICK_RADIUS_PX } from './constants'
import type { PublicLetter } from './types'

interface LetterPoint {
  letter: PublicLetter
  x: number; y: number; z: number
}

export interface GlobeEngineOptions {
  canvas: HTMLCanvasElement
  letters: PublicLetter[]
  greenProgress: number
  onReady?: () => void
  onLetterClick?: (letter: PublicLetter) => void
  onHoverChange?: (hovering: boolean) => void
}

type ProgKey = 'globe' | 'atm' | 'marker' | 'star'

export class GlobeEngine {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private progs = {} as Record<ProgKey, WebGLProgram>
  private bufs: Record<string, any> = {}

  private rot = { x: 0.0, y: 0, vx: 0, vy: 0.003 }
  private zoom = { cur: ZOOM_DEFAULT, target: ZOOM_DEFAULT }
  private drag = { on: false, lx: 0, ly: 0, moved: 0 }
  private pinch: { d: number } | null = null
  private pointers = new Map<number, { x: number; y: number }>()

  private t = 0
  private raf = 0
  private destroyed = false

  private letterPoints: LetterPoint[] = []
  private greenProgress: number
  private lastMVP: number[] = []
  private lastNM: number[] = []
  private hovering = false

  private onLetterClick?: (letter: PublicLetter) => void
  private onHoverChange?: (hovering: boolean) => void
  private handlers: Record<string, (e: any) => void> = {}

  constructor(opts: GlobeEngineOptions) {
    this.canvas = opts.canvas
    this.greenProgress = opts.greenProgress
    this.onLetterClick = opts.onLetterClick
    this.onHoverChange = opts.onHoverChange

    const gl = this.canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    this.progs.globe  = this.mkProg(globeVS, globeFS)
    this.progs.atm    = this.mkProg(atmVS,   atmFS)
    this.progs.marker = this.mkProg(markerVS, markerFS)
    this.progs.star   = this.mkProg(starVS,   starFS)

    const g = sphere(128, 128, 1.0)
    const a = sphere(64,  64,  1.055)
    this.bufs.gPos  = this.vbo(g.pos);  this.bufs.gNorm = this.vbo(g.norm)
    this.bufs.gUV   = this.vbo(g.uv);   this.bufs.gIdx  = this.ibo(g.idx)
    this.bufs.gN    = g.idx.length
    this.bufs.aPos  = this.vbo(a.pos);  this.bufs.aNorm = this.vbo(a.norm)
    this.bufs.aIdx  = this.ibo(a.idx);  this.bufs.aN    = a.idx.length

    // Stars
    const sp: number[] = [], ss: number[] = [], sph: number[] = []
    for (let i = 0; i < 1200; i++) {
      let sx: number, sy: number, sz: number
      if (i < 500) {
        const t = seed(i*3)*2-1, spread = (seed(i*19)-0.5)*0.5
        sx = Math.max(-1,Math.min(1,t*0.85+spread*0.3))
        sy = Math.max(-1,Math.min(1,-t*0.55+spread))
        sz = 0.3+seed(i*13)*0.9
      } else if (i < 700) {
        sx=seed(i*7)*2-1; sy=seed(i*11)*2-1; sz=1.2+seed(i*13)*2.0
      } else {
        sx=seed(i*7)*2-1; sy=seed(i*11)*2-1; sz=0.5+seed(i*13)*1.2
      }
      sp.push(sx,sy); ss.push(sz); sph.push(seed(i*17)*Math.PI*2)
    }
    this.bufs.sPos=this.vbo(sp); this.bufs.sSz=this.vbo(ss)
    this.bufs.sPh=this.vbo(sph); this.bufs.sCount=1200

    this.rebuildLetterBuffers(opts.letters)
    this.attachEvents()
    opts.onReady?.()
    this.frame()
  }

  private mkProg(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const mk = (t: number, s: string) => {
      const r = gl.createShader(t)!
      gl.shaderSource(r, s); gl.compileShader(r)
      if (!gl.getShaderParameter(r, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(r))
      return r
    }
    const p = gl.createProgram()!
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p))
    return p
  }
  private vbo(data: number[]): WebGLBuffer {
    const gl=this.gl, b=gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER,b)
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW)
    return b
  }
  private ibo(data: number[]): WebGLBuffer {
    const gl=this.gl, b=gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data),gl.STATIC_DRAW)
    return b
  }

  setLetters(letters: PublicLetter[]) { this.rebuildLetterBuffers(letters) }
  setGreenProgress(p: number) { this.greenProgress = p }
  zoomBy(factor: number) {
    this.zoom.target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom.target * factor))
  }
  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.detachEvents()
  }

  private rebuildLetterBuffers(letters: PublicLetter[]) {
    const pos: number[]=[], sz: number[]=[], mat: number[]=[]
    const points: LetterPoint[]=[]
    for (const letter of letters) {
      const { lat, lng, size } = letterPosition(letter.id)
      const [x,y,z] = ll2xyz(lat, lng, 1.02)
      pos.push(x,y,z); sz.push(size)
      mat.push(Math.max(0.18,Math.min(1,(letter.content?.length??0)/240)))
      points.push({ letter, x, y, z })
    }
    this.bufs.mPos   = this.vbo(pos.length ? pos : [0,0,0])
    this.bufs.mSz    = this.vbo(sz.length  ? sz  : [0])
    this.bufs.mMat   = this.vbo(mat.length ? mat : [0])
    this.bufs.mCount = points.length
    this.letterPoints = points
  }

  private attachEvents() {
    const c = this.canvas
    this.handlers.down  = (e: PointerEvent) => this.onPointerDown(e)
    this.handlers.move  = (e: PointerEvent) => this.onPointerMove(e)
    this.handlers.up    = (e: PointerEvent) => this.onPointerUp(e)
    this.handlers.wheel = (e: WheelEvent)   => this.onWheel(e)
    c.addEventListener('pointerdown', this.handlers.down)
    c.addEventListener('pointermove', this.handlers.move)
    window.addEventListener('pointerup', this.handlers.up)
    window.addEventListener('pointercancel', this.handlers.up)
    c.addEventListener('wheel', this.handlers.wheel, { passive: false })
  }
  private detachEvents() {
    const c = this.canvas
    c.removeEventListener('pointerdown', this.handlers.down)
    c.removeEventListener('pointermove', this.handlers.move)
    window.removeEventListener('pointerup', this.handlers.up)
    window.removeEventListener('pointercancel', this.handlers.up)
    c.removeEventListener('wheel', this.handlers.wheel)
  }

  private onPointerDown(e: PointerEvent) {
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if (this.pointers.size===1) this.drag={on:true,lx:e.clientX,ly:e.clientY,moved:0}
    else if (this.pointers.size===2) { this.drag.on=false; this.pinch={d:this.pinchDistance()} }
  }
  private onPointerMove(e: PointerEvent) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if (this.pointers.size>=2&&this.pinch) {
      const d=this.pinchDistance()
      if (this.pinch.d>0&&d>0) this.zoomBy(this.pinch.d/d)
      this.pinch.d=d; return
    }
    if (this.drag.on) {
      const dx=e.clientX-this.drag.lx, dy=e.clientY-this.drag.ly
      this.rot.vy=dx*0.005; this.rot.vx=dy*0.005
      this.rot.y+=dx*0.005; this.rot.x+=dy*0.005
      this.drag.lx=e.clientX; this.drag.ly=e.clientY
      this.drag.moved+=Math.abs(dx)+Math.abs(dy); return
    }
    const hit=this.pick(e.clientX,e.clientY)
    const h=!!hit
    if (h!==this.hovering) {
      this.hovering=h
      this.canvas.style.cursor=h?'pointer':'grab'
      this.onHoverChange?.(h)
    }
  }
  private onPointerUp(e: PointerEvent) {
    const wasClick=this.drag.on&&this.drag.moved<6&&this.pointers.size<=1
    this.pointers.delete(e.pointerId)
    if (this.pointers.size<2) this.pinch=null
    if (wasClick) { const hit=this.pick(e.clientX,e.clientY); if (hit) this.onLetterClick?.(hit.letter) }
    if (this.pointers.size===0) this.drag.on=false
  }
  private onWheel(e: WheelEvent) { e.preventDefault(); this.zoomBy(Math.exp(e.deltaY*0.0015)) }
  private pinchDistance() {
    const pts=Array.from(this.pointers.values())
    return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)
  }

  pick(clientX: number, clientY: number): LetterPoint|null {
    if (!this.lastMVP.length||!this.letterPoints.length) return null
    const rect=this.canvas.getBoundingClientRect()
    let best: LetterPoint|null=null, bestDist=PICK_RADIUS_PX*PICK_RADIUS_PX
    for (const p of this.letterPoints) {
      const front=rotate3(this.lastNM,p.x,p.y,p.z)
      if (front[2]<-0.02) continue
      const clip=transformPoint(this.lastMVP,p.x,p.y,p.z)
      if (clip[3]<=0.001) continue
      const sx=rect.left+(clip[0]/clip[3]*0.5+0.5)*rect.width
      const sy=rect.top+(1-(clip[1]/clip[3]*0.5+0.5))*rect.height
      const d2=(sx-clientX)**2+(sy-clientY)**2
      if (d2<bestDist) { bestDist=d2; best=p }
    }
    return best
  }

  private frame = () => {
    if (this.destroyed) return
    this.raf=requestAnimationFrame(this.frame)
    const gl=this.gl, CV=this.canvas
    this.t+=0.016

    const dpr=Math.min(window.devicePixelRatio||1,3)
    const W=CV.offsetWidth*dpr, H=CV.offsetHeight*dpr
    if (CV.width!==W||CV.height!==H) { CV.width=W; CV.height=H }
    gl.viewport(0,0,W,H)
    gl.clearColor(0,0,0,0)
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)

    const rot=this.rot
    if (!this.drag.on&&!this.pinch) {
      rot.vy+=(0.003-rot.vy)*0.018
      rot.vx+=(0-rot.vx)*0.06
    }
    rot.y+=rot.vy; rot.x+=rot.vx
    rot.x=Math.max(-0.55,Math.min(0.55,rot.x))
    this.zoom.cur+=(this.zoom.target-this.zoom.cur)*0.14

    const proj=m4persp(0.72,W/H,0.1,100)
    const view=m4trans(0,0,-this.zoom.cur)
    const rotM=m4mul(m4rotX(rot.x),m4rotY(rot.y))
    const mv=m4mul(view,rotM)
    const mvp=m4mul(proj,mv)
    const nm=m3from4(rotM)
    this.lastMVP=mvp; this.lastNM=nm

    const attr=(prog: WebGLProgram,name: string,buf: WebGLBuffer,size: number)=>{
      const loc=gl.getAttribLocation(prog,name); if(loc<0)return
      gl.bindBuffer(gl.ARRAY_BUFFER,buf)
      gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)
      gl.enableVertexAttribArray(loc)
    }
    const uni4 =(prog: WebGLProgram,name: string,v: number[])=>gl.uniformMatrix4fv(gl.getUniformLocation(prog,name),false,v)
    const uni3 =(prog: WebGLProgram,name: string,v: number[])=>gl.uniformMatrix3fv(gl.getUniformLocation(prog,name),false,v)
    const uni1f=(prog: WebGLProgram,name: string,v: number)  =>gl.uniform1f(gl.getUniformLocation(prog,name),v)

    // Stars (no culling needed — flat quads)
    gl.disable(gl.CULL_FACE)
    const sp=this.progs.star; gl.useProgram(sp)
    attr(sp,'aPos',this.bufs.sPos,2); attr(sp,'aSz',this.bufs.sSz,1); attr(sp,'aPh',this.bufs.sPh,1)
    uni1f(sp,'uT',this.t)
    gl.drawArrays(gl.POINTS,0,this.bufs.sCount)

    // Globe
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK)
    const gp=this.progs.globe; gl.useProgram(gp)
    attr(gp,'aPos',this.bufs.gPos,3); attr(gp,'aNorm',this.bufs.gNorm,3); attr(gp,'aUV',this.bufs.gUV,2)
    uni4(gp,'uMVP',mvp); uni3(gp,'uNorm',nm); uni1f(gp,'uT',this.t)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.gIdx)
    gl.drawElements(gl.TRIANGLES,this.bufs.gN,gl.UNSIGNED_SHORT,0)

    // Atmosphere — no culling, both faces needed for rim
    gl.depthMask(false)
    gl.disable(gl.CULL_FACE)
    const ap=this.progs.atm; gl.useProgram(ap)
    attr(ap,'aPos',this.bufs.aPos,3); attr(ap,'aNorm',this.bufs.aNorm,3)
    uni4(ap,'uMVP',mvp); uni3(ap,'uNorm',nm)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.aIdx)
    gl.drawElements(gl.TRIANGLES,this.bufs.aN,gl.UNSIGNED_SHORT,0)
    gl.depthMask(true)

    // Markers
    if (this.bufs.mCount>0) {
      gl.disable(gl.CULL_FACE)
      const mp=this.progs.marker; gl.useProgram(mp)
      attr(mp,'aPos',this.bufs.mPos,3); attr(mp,'aSz',this.bufs.mSz,1); attr(mp,'aMat',this.bufs.mMat,1)
      uni4(mp,'uMVP',mvp); uni1f(mp,'uT',this.t)
      gl.drawArrays(gl.POINTS,0,this.bufs.mCount)
    }
  }
}