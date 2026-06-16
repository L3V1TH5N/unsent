"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface PublicLetter {
  id: string
  content: string
  recipientType: string
  emotion: string | null
  createdAt: string
}

interface Props {
  letters: PublicLetter[]
}

const RECIPIENT_LABELS: Record<string, string> = {
  someone_loved:   'to someone I loved',
  someone_lost:    'to someone I lost',
  past_self:       'to my past self',
  someone_hurt:    'to someone I hurt',
  someone_forgive: 'to someone I forgive',
  myself:          'to myself',
}

const EMOTION_COLORS: Record<string, string> = {
  longing:     '#C4897A',
  sadness:     '#7A9EC4',
  regret:      '#9A8AC4',
  healing:     '#7AAA7A',
  forgiveness: '#C4AA7A',
  love:        '#C47A9A',
  anger:       '#C4847A',
  hope:        '#7ABAC4',
  acceptance:  '#8AAA8A',
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Seeded random for stable SSR/CSR match
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export default function LandingScene({ letters }: Props) {
  const [openLetter, setOpenLetter] = useState<PublicLetter | null>(null)
  const [visible, setVisible] = useState(false)
  const [mouseX, setMouseX] = useState(0.5)
  const [mouseY, setMouseY] = useState(0.5)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const firefliesRef = useRef<{x:number,y:number,phase:number,speed:number,size:number}[]>([])
  const starsRef = useRef<{x:number,y:number,size:number,twinkle:number}[]>([])

  // Init fireflies and stars once
  useEffect(() => {
    firefliesRef.current = Array.from({length: 28}, (_,i) => ({
      x: seededRand(i * 3) * 100,
      y: 30 + seededRand(i * 7) * 45,
      phase: seededRand(i * 11) * Math.PI * 2,
      speed: 0.4 + seededRand(i * 13) * 0.8,
      size: 1.5 + seededRand(i * 17) * 2,
    }))
    starsRef.current = Array.from({length: 60}, (_,i) => ({
      x: seededRand(i * 5) * 100,
      y: seededRand(i * 9) * 38,
      size: 0.5 + seededRand(i * 15) * 1.5,
      twinkle: seededRand(i * 19) * Math.PI * 2,
    }))
  }, [])

  // Firefly canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let t = 0
    function draw() {
      if (!canvas || !ctx) return
      const W = canvas.width  = canvas.offsetWidth
      const H = canvas.height = canvas.offsetHeight

      ctx.clearRect(0, 0, W, H)

      // Stars (fade in from top)
      starsRef.current.forEach(star => {
        const twinkle = 0.4 + 0.6 * Math.sin(t * 0.5 + star.twinkle)
        ctx.beginPath()
        ctx.arc(star.x / 100 * W, star.y / 100 * H, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,245,210,${twinkle * 0.85})`
        ctx.fill()
      })

      // Fireflies
      firefliesRef.current.forEach(ff => {
        const wobbleX = ff.x + Math.sin(t * ff.speed * 0.4 + ff.phase) * 2.5
        const wobbleY = ff.y + Math.cos(t * ff.speed * 0.3 + ff.phase * 1.3) * 1.8
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * ff.speed + ff.phase))
        const px = wobbleX / 100 * W
        const py = wobbleY / 100 * H

        // Glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, ff.size * 5)
        grad.addColorStop(0, `rgba(180,255,120,${pulse * 0.5})`)
        grad.addColorStop(1, 'rgba(180,255,120,0)')
        ctx.beginPath()
        ctx.arc(px, py, ff.size * 5, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(px, py, ff.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,255,160,${pulse * 0.95})`
        ctx.fill()
      })

      t += 0.016
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Parallax on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMouseX(e.clientX / rect.width)
    setMouseY(e.clientY / rect.height)
  }, [])

  // Envelope data — stable positions
  const envelopes = letters.slice(0, 6).map((letter, i) => ({
    letter,
    x: 8 + (i % 3) * 32 + seededRand(i * 7) * 10,
    bobDelay: seededRand(i * 13) * 6,
    bobDur: 5 + seededRand(i * 17) * 4,
    rot: (seededRand(i * 11) - 0.5) * 10,
    riverY: 60 + seededRand(i * 19) * 6,
  }))

  const px = (mouseX - 0.5)
  const py = (mouseY - 0.5)

  function handleOpen(letter: PublicLetter) {
    setOpenLetter(letter)
    setVisible(false)
    setTimeout(() => setVisible(true), 20)
  }

  function handleClose() {
    setVisible(false)
    setTimeout(() => setOpenLetter(null), 250)
  }

  useEffect(() => {
    if (!openLetter) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [openLetter])

  useEffect(() => {
    document.body.style.overflow = openLetter ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [openLetter])

  const accent = openLetter ? (EMOTION_COLORS[openLetter.emotion ?? ''] ?? '#C4897A') : '#C4897A'

  return (
    <>
    <div className="world" onMouseMove={handleMouseMove}>
      {/* ── LAYER 0: DEEP SKY ── */}
      <div className="sky" style={{
        transform: `translate(${px * -8}px, ${py * -4}px)`,
      }}>
        {/* Dusk gradient handled by CSS */}
        {/* Moon */}
        <div className="moon" />
        {/* Stars + fireflies canvas */}
        <canvas ref={canvasRef} className="firefly-canvas" />
      </div>

      {/* ── LAYER 1: DISTANT MOUNTAINS ── */}
      <div className="layer-mountains" style={{
        transform: `translate(${px * -14}px, ${py * -6}px)`,
      }}>
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="mountains-svg">
          <defs>
            <linearGradient id="mt-far" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D5C7A" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#2A4060" stopOpacity="0.3"/>
            </linearGradient>
            <linearGradient id="mt-near" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2C4A2E" stopOpacity="0.75"/>
              <stop offset="100%" stopColor="#1E3420" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          {/* Far mountains */}
          <path d="M0 300 L0 200 L120 120 L240 170 L360 90 L480 150 L600 80 L720 140 L840 100 L960 160 L1080 110 L1200 150 L1200 300Z" fill="url(#mt-far)"/>
          {/* Near mountains */}
          <path d="M0 300 L0 240 L100 180 L220 220 L340 160 L460 210 L580 155 L700 195 L820 165 L940 200 L1060 170 L1200 195 L1200 300Z" fill="url(#mt-near)"/>
        </svg>
      </div>

      {/* ── LAYER 2: FOREST TREE LINE ── */}
      <div className="layer-treeline" style={{
        transform: `translate(${px * -22}px, ${py * -8}px)`,
      }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="treeline-svg">
          <defs>
            <linearGradient id="tree-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A3A1C"/>
              <stop offset="100%" stopColor="#0E2210"/>
            </linearGradient>
          </defs>
          {/* Dense silhouetted treeline */}
          {Array.from({length: 38}, (_,i) => {
            const x = (i / 37) * 1240 - 20
            const h = 60 + seededRand(i*7) * 80
            const w = 18 + seededRand(i*13) * 24
            return (
              <g key={i}>
                <rect x={x + w*0.45} y={200 - h} width={w * 0.12} height={h * 0.4} fill="#0E2210"/>
                <polygon
                  points={`${x+w/2},${200-h} ${x},${200-h*0.35} ${x+w},${200-h*0.35}`}
                  fill="url(#tree-grad)"
                />
                <polygon
                  points={`${x+w/2},${200-h*0.72} ${x+w*0.1},${200-h*0.2} ${x+w*0.9},${200-h*0.2}`}
                  fill="#1A3A1C"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── LAYER 3: GLOWING RIVER ── */}
      <div className="layer-river" style={{
        transform: `translate(${px * -6}px, ${py * -2}px)`,
      }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="river-svg">
          <defs>
            <linearGradient id="river-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1A4A6A"/>
              <stop offset="40%"  stopColor="#0E3050"/>
              <stop offset="100%" stopColor="#081828"/>
            </linearGradient>
            <linearGradient id="river-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#4A9FD0" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#2A6090" stopOpacity="0.05"/>
            </linearGradient>
            <radialGradient id="moon-reflection" cx="50%" cy="0%" r="80%">
              <stop offset="0%"  stopColor="#C8E8FF" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#C8E8FF" stopOpacity="0"/>
            </radialGradient>
            <filter id="river-blur">
              <feGaussianBlur stdDeviation="2"/>
            </filter>
          </defs>
          <rect width="1200" height="200" fill="url(#river-body)"/>
          <rect width="1200" height="200" fill="url(#river-glow)"/>
          <rect width="1200" height="200" fill="url(#moon-reflection)"/>
          {/* Ripple lines */}
          {[20,45,70,90,130,160].map((y,i) => (
            <path key={i}
              d={`M${-50 + i*20} ${y} C${200+i*10} ${y-4},${500-i*8} ${y+3},${800+i*12} ${y-2} S${1100+i*5} ${y+1},${1250+i*8} ${y}`}
              fill="none" stroke="#5ABCEE" strokeWidth="0.8"
              strokeOpacity={0.08 + (i%3)*0.04}
              className={`ripple ripple-${i%3}`}
            />
          ))}
        </svg>
      </div>

      {/* ── LAYER 4: NEAR BANK / GRASS ── */}
      <div className="layer-bank" style={{
        transform: `translate(${px * -30}px, ${py * -10}px)`,
      }}>
        <svg viewBox="0 0 1200 160" preserveAspectRatio="none" className="bank-svg">
          <defs>
            <linearGradient id="bank-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1C3C14"/>
              <stop offset="100%" stopColor="#0C2008"/>
            </linearGradient>
            <linearGradient id="grass-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2A5C1A"/>
              <stop offset="100%" stopColor="#1C3C14"/>
            </linearGradient>
          </defs>
          <path d="M-10 160 L-10 60 C100 40,280 30,500 45 C720 60,940 38,1210 50 L1210 160Z" fill="url(#bank-grad)"/>
          {/* Grass tufts */}
          {Array.from({length: 60}, (_,i) => {
            const x = (i/59)*1200
            const baseY = 55 + seededRand(i*11)*20
            const h = 8 + seededRand(i*7)*18
            return (
              <g key={i} className="grass-blade" style={{animationDelay:`${seededRand(i*3)*2}s`, animationDuration:`${2+seededRand(i*17)*2}s`}}>
                <path
                  d={`M${x} ${baseY} C${x-3} ${baseY-h*0.6},${x-1} ${baseY-h},${x+1} ${baseY-h-4}`}
                  fill="none" stroke="#3A7024" strokeWidth={1+seededRand(i*5)*1.5} strokeLinecap="round"
                />
                <path
                  d={`M${x} ${baseY} C${x+3} ${baseY-h*0.5},${x+2} ${baseY-h*0.85},${x+4} ${baseY-h-2}`}
                  fill="none" stroke="#4A8830" strokeWidth={0.8+seededRand(i*9)*1.2} strokeLinecap="round"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── LAYER 5: GARDEN PLANTS (foreground) ── */}
      <div className="layer-garden" style={{
        transform: `translate(${px * -40}px, ${py * -14}px)`,
      }}>
        <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className="garden-svg">
          <defs>
            <radialGradient id="bloom-glow-r" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFB0A0" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#FFB0A0" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="seed-glow-g" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#80FF80" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#80FF80" stopOpacity="0"/>
            </radialGradient>
            <filter id="plant-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="petal-glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── STRONG TREE left ── */}
          <g transform="translate(50, 30)" className="plant-breathe">
            <ellipse cx="0" cy="0" rx="50" ry="42" fill="#80FF80" opacity="0.04"/>
            <rect x="-5" y="60" width="10" height="90" rx="4" fill="#2A4818"/>
            <ellipse cx="0" cy="58" rx="36" ry="30" fill="#1E4010"/>
            <ellipse cx="0" cy="44" rx="28" ry="24" fill="#2A5818"/>
            <ellipse cx="0" cy="32" rx="20" ry="18" fill="#368020"/>
            <ellipse cx="0" cy="20" rx="14" ry="12" fill="#44A028"/>
            {/* Bioluminescent fruits */}
            {[[-18,52],[16,48],[0,58],[-10,38],[12,36]].map(([fx,fy],i)=>(
              <g key={i}>
                <circle cx={fx} cy={fy} r="5" fill="#FF8870" opacity="0.15" filter="url(#petal-glow)"/>
                <circle cx={fx} cy={fy} r="3" fill="#FF6655" opacity="0.85"/>
              </g>
            ))}
            {/* XP ring */}
            <circle cx="0" cy="20" r="18" fill="none" stroke="#FFE680" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" className="xp-orbit"/>
            <circle cx="0" cy="2" r="3" fill="#FFE680" opacity="0.8" className="xp-orbit"/>
          </g>

          {/* ── BLOOMED PLANT center-left ── */}
          <g transform="translate(200, 95)" className="plant-breathe" style={{animationDelay:'0.6s'}}>
            <ellipse cx="0" cy="0" rx="30" ry="28" fill="#FFB0A0" opacity="0.05"/>
            <rect x="-2.5" y="30" width="5" height="50" rx="2" fill="#2A5010"/>
            {/* leaves */}
            <path d="M0 60 C-18 44,-20 28,-12 22 C-8 32,-4 48,0 60Z" fill="#3A7020"/>
            <path d="M0 52 C18 36,22 20,14 14 C10 24,6 40,0 52Z" fill="#4A8830"/>
            {/* Petals — glowing */}
            {[0,51,102,154,205,256].map((deg,i)=>{
              const rad = deg * Math.PI/180
              const px2 = Math.cos(rad) * 11
              const py2 = Math.sin(rad) * 11
              return (
                <g key={i} filter="url(#petal-glow)">
                  <ellipse cx={px2} cy={18+py2} rx="6" ry="4.5"
                    fill={i%2===0?"#FF9488":"#FFB0A4"} opacity="0.9"
                    transform={`rotate(${deg},${px2},${18+py2})`}/>
                </g>
              )
            })}
            <circle cx="0" cy="18" r="7" fill="#FFE680" filter="url(#petal-glow)"/>
            <circle cx="0" cy="18" r="4" fill="#FFD04A"/>
          </g>

          {/* ── SPROUT cluster ── */}
          {[340,370,395].map((x,i)=>(
            <g key={i} transform={`translate(${x}, ${130+i*5})`} className="plant-breathe" style={{animationDelay:`${i*0.4}s`}}>
              <rect x="-2" y="10" width="4" height={25+i*5} rx="2" fill="#2A5010"/>
              <path d={`M0 28 C-10 18,-12 8,-6 4 C-3 12,0 22,0 28Z`} fill="#3A8020"/>
              <path d={`M0 22 C10 12,14 2,8 -2 C6 6,3 16,0 22Z`} fill="#50A030"/>
              <circle cx="0" cy="2" r="3" fill="#80FF80" opacity="0.6" className="xp-pulse"/>
            </g>
          ))}

          {/* ── HEALING plant center ── */}
          <g transform="translate(520, 80)" className="plant-breathe" style={{animationDelay:'1.1s'}}>
            <rect x="-3" y="38" width="6" height="60" rx="3" fill="#1E4010"/>
            <path d="M0 72 C-14 54,-16 36,-8 28 C-5 42,0 58,0 72Z" fill="#2A6018"/>
            <path d="M0 62 C14 44,18 26,10 18 C8 32,4 50,0 62Z" fill="#38781E"/>
            <path d="M0 50 C-8 38,-10 24,-4 18 C-2 28,0 40,0 50Z" fill="#2A6018" opacity="0.8"/>
            {/* Healing aura */}
            <circle cx="0" cy="26" r="12" fill="#80FF80" opacity="0.08" className="heal-pulse"/>
            <circle cx="0" cy="26" r="5" fill="#A0FFB0" opacity="0.5" className="xp-pulse"/>
          </g>

          {/* ── SEED glow mounds ── */}
          {[650,710,755].map((x,i)=>(
            <g key={i} transform={`translate(${x},${155+i*3})`}>
              <ellipse cx="0" cy="4" rx={12+i*2} ry="5" fill="#1C3C14" opacity="0.8"/>
              <ellipse cx="0" cy="0" rx={8+i} ry={6+i} fill="#2A5010"/>
              <circle cx="0" cy="-3" r="3" fill="#80FF80" opacity="0.5" className="xp-pulse" style={{animationDelay:`${i*0.7}s`}}/>
            </g>
          ))}

          {/* ── STRONG TREE right ── */}
          <g transform="translate(1100, 20)" className="plant-breathe" style={{animationDelay:'0.3s'}}>
            <rect x="-5" y="65" width="10" height="100" rx="4" fill="#2A4818"/>
            <ellipse cx="0" cy="62" rx="40" ry="32" fill="#1A3A0E"/>
            <ellipse cx="0" cy="48" rx="30" ry="25" fill="#245218"/>
            <ellipse cx="0" cy="36" rx="22" ry="19" fill="#307020"/>
            <ellipse cx="0" cy="24" rx="15" ry="13" fill="#3E8C28"/>
            {[[-15,54],[14,50],[0,62],[-8,40],[10,38]].map(([fx,fy],i)=>(
              <g key={i}>
                <circle cx={fx} cy={fy} r="5" fill="#FF8870" opacity="0.12" filter="url(#petal-glow)"/>
                <circle cx={fx} cy={fy} r="3" fill="#FF7060" opacity="0.8"/>
              </g>
            ))}
            <circle cx="0" cy="24" r="16" fill="none" stroke="#FFE680" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" className="xp-orbit"/>
          </g>

          {/* ── Floating petals across scene ── */}
          {[
            {x:160,y:60,c:'#FFB0A4',cls:'petal-a'},{x:460,y:40,c:'#FFD080',cls:'petal-b'},
            {x:620,y:80,c:'#FFB0A4',cls:'petal-c'},{x:840,y:55,c:'#C0D8FF',cls:'petal-a'},
            {x:950,y:70,c:'#FFD080',cls:'petal-b'},{x:280,y:50,c:'#B0FFD0',cls:'petal-c'},
          ].map((p,i)=>(
            <g key={i} className={`petal ${p.cls}`} style={{animationDelay:`${i*1.4}s`}}>
              <ellipse cx={p.x} cy={p.y} rx="5" ry="3" fill={p.c} opacity="0.7"/>
            </g>
          ))}

          {/* ── Sparkle XP stars ── */}
          {[[130,42],[390,30],[600,55],[800,38],[1050,45]].map(([x,y],i)=>(
            <g key={i} className="sparkle" style={{animationDelay:`${i*0.8}s`}}>
              <line x1={x} y1={y-5} x2={x} y2={y+5} stroke="#FFE680" strokeWidth="1.5" opacity="0.55"/>
              <line x1={x-5} y1={y} x2={x+5} y2={y} stroke="#FFE680" strokeWidth="1.5" opacity="0.55"/>
              <line x1={x-3} y1={y-3} x2={x+3} y2={y+3} stroke="#FFE680" strokeWidth="1" opacity="0.35"/>
              <line x1={x+3} y1={y-3} x2={x-3} y2={y+3} stroke="#FFE680" strokeWidth="1" opacity="0.35"/>
            </g>
          ))}
        </svg>
      </div>

      {/* ── LAYER 6: ENVELOPE BUTTONS (on the river) ── */}
      <div className="layer-envelopes" style={{
        transform: `translate(${px * -4}px, ${py * -1}px)`,
      }}>
        {envelopes.map((env, i) => {
          const acc = EMOTION_COLORS[env.letter.emotion ?? ''] ?? '#C4897A'
          return (
            <button
              key={env.letter.id}
              className="envelope"
              style={{
                left: `${env.x}%`,
                top:  `${env.riverY}%`,
                '--acc': acc,
                '--rot': `${env.rot}deg`,
                animationDelay:    `${env.bobDelay}s`,
                animationDuration: `${env.bobDur}s`,
              } as React.CSSProperties}
              onClick={() => handleOpen(env.letter)}
              aria-label="Read letter"
            >
              <div className="env-glow" style={{background:`radial-gradient(circle, ${acc}44 0%, transparent 70%)`}}/>
              <div className="env-paper">
                <div className="env-flap"/>
                <div className="env-seal" style={{background: acc}}>✦</div>
                <div className="env-body-lines">
                  <div className="env-line"/><div className="env-line short"/><div className="env-line"/>
                </div>
              </div>
              <div className="env-label">
                {env.letter.emotion ?? 'unsent'}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── LAYER 7: FOREGROUND DARK GRASS (bottom frame) ── */}
      <div className="layer-foreground">
        <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className="fg-svg">
          <path d="M-10 80 L-10 35 C80 20,200 15,400 25 C600 35,800 18,1000 28 C1100 33,1160 30,1210 32 L1210 80Z"
            fill="#0A1A08"/>
          {/* Foreground grass silhouette blades */}
          {Array.from({length:45},(_,i)=>{
            const x = (i/44)*1200
            const h = 15 + seededRand(i*23)*30
            const bY = 36 + seededRand(i*29)*10
            return (
              <g key={i} className="fg-blade" style={{animationDelay:`${seededRand(i*7)*3}s`, animationDuration:`${2.5+seededRand(i*11)*2}s`}}>
                <path d={`M${x} ${bY} C${x-2} ${bY-h*0.7},${x} ${bY-h},${x+1} ${bY-h-3}`}
                  fill="none" stroke="#162810" strokeWidth={1.5+seededRand(i*13)*2} strokeLinecap="round"/>
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── AMBIENT PARTICLES ── */}
      <div className="particles" aria-hidden="true">
        {Array.from({length:12},(_,i)=>(
          <div key={i} className="particle" style={{
            left: `${seededRand(i*31)*100}%`,
            top: `${20+seededRand(i*37)*50}%`,
            animationDelay: `${seededRand(i*41)*8}s`,
            animationDuration: `${6+seededRand(i*43)*6}s`,
            width: `${2+seededRand(i*47)*3}px`,
            height: `${2+seededRand(i*47)*3}px`,
          }}/>
        ))}
      </div>
    </div>

    {/* ── LETTER MODAL ── */}
    {openLetter && (
      <div
        className={`modal-backdrop ${visible ? 'modal-visible' : ''}`}
        onClick={handleClose}
        role="dialog" aria-modal="true"
      >
        <div className="modal-card" onClick={e=>e.stopPropagation()}
          style={{'--acc': accent} as React.CSSProperties}>
          <div className="modal-top">
            <span className="modal-recipient">{RECIPIENT_LABELS[openLetter.recipientType]??'to someone'}</span>
            {openLetter.emotion && (
              <span className="modal-emotion" style={{color:accent,borderColor:`${accent}44`}}>
                {openLetter.emotion}
              </span>
            )}
            <span className="modal-time">{timeAgo(openLetter.createdAt)}</span>
            <button className="modal-close" onClick={handleClose}>✕</button>
          </div>
          <div className="modal-paper">
            <div className="modal-margin" style={{borderColor:`${accent}50`}}/>
            <p className="modal-text">{openLetter.content}</p>
          </div>
          <div className="modal-foot">
            <span className="modal-anon">— anonymous</span>
            <a href="/write" className="modal-cta" style={{background:accent}}>write your own</a>
          </div>
        </div>
      </div>
    )}

    <style>{`
      /* ═══════════════════════════════════════════
         WORLD
      ═══════════════════════════════════════════ */
      .world {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        background: linear-gradient(
          to bottom,
          #0D0B1A 0%,
          #1A1028 12%,
          #251838 22%,
          #2E1C2C 35%,
          #3A2A1A 52%,
          #2C3A1A 68%,
          #1A2C10 82%,
          #0E1E08 100%
        );
      }

      /* ── Sky layers ── */
      .sky {
        position: absolute;
        inset: 0;
        transition: transform 0.12s ease-out;
        will-change: transform;
      }

      .moon {
        position: absolute;
        top: 6%;
        right: 18%;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #FFF8E8, #E8D8A0);
        box-shadow:
          0 0 20px 6px rgba(255,240,180,0.35),
          0 0 60px 20px rgba(255,240,180,0.12),
          0 0 120px 50px rgba(255,240,180,0.05);
        animation: moon-breathe 8s ease-in-out infinite;
      }

      @keyframes moon-breathe {
        0%,100% { box-shadow: 0 0 20px 6px rgba(255,240,180,0.35), 0 0 60px 20px rgba(255,240,180,0.12); }
        50%      { box-shadow: 0 0 28px 10px rgba(255,240,180,0.50), 0 0 80px 30px rgba(255,240,180,0.18); }
      }

      .firefly-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      /* ── Scene layers ── */
      .layer-mountains, .layer-treeline, .layer-river,
      .layer-bank, .layer-garden, .layer-foreground {
        position: absolute;
        inset: 0;
        pointer-events: none;
        will-change: transform;
        transition: transform 0.14s ease-out;
      }

      .mountains-svg { position:absolute; bottom:30%; left:0; width:100%; height:45%; }
      .treeline-svg  { position:absolute; bottom:26%; left:0; width:100%; height:38%; }
      .river-svg     { position:absolute; bottom:18%; left:0; width:100%; height:34%; }
      .bank-svg      { position:absolute; bottom:10%; left:0; width:100%; height:30%; }
      .garden-svg    { position:absolute; bottom:8%;  left:0; width:100%; height:38%; }
      .fg-svg        { position:absolute; bottom:0;   left:0; width:100%; height:16%; }

      /* ── River ripple animation ── */
      .ripple   { stroke-linecap: round; }
      .ripple-0 { animation: rip 8s ease-in-out infinite; }
      .ripple-1 { animation: rip 11s ease-in-out infinite; animation-delay: -3s; }
      .ripple-2 { animation: rip 9s ease-in-out infinite; animation-delay: -6s; }
      @keyframes rip {
        0%,100% { transform: translateX(0); opacity: 0.8; }
        50%      { transform: translateX(-24px); opacity: 0.4; }
      }

      /* ── Plant animations ── */
      .grass-blade, .fg-blade {
        transform-origin: bottom center;
        animation: sway 3s ease-in-out infinite;
      }
      .plant-breathe {
        transform-origin: bottom center;
        animation: breathe 4s ease-in-out infinite;
      }
      .xp-orbit {
        animation: orbit 10s linear infinite;
      }
      .xp-pulse {
        animation: pulse-glow 2s ease-in-out infinite;
      }
      .heal-pulse {
        animation: heal-aura 3s ease-in-out infinite;
      }
      .sparkle {
        animation: twinkle 2.5s ease-in-out infinite;
      }
      .petal {
        animation: petal-fall 20s ease-in-out infinite;
      }
      .petal-a { animation-duration: 18s; }
      .petal-b { animation-duration: 24s; animation-delay: -8s; }
      .petal-c { animation-duration: 15s; animation-delay: -14s; }

      @keyframes sway {
        0%,100% { transform: rotate(0deg); }
        30%      { transform: rotate(-3deg); }
        70%      { transform: rotate(2.5deg); }
      }
      @keyframes breathe {
        0%,100% { transform: scaleY(1) scaleX(1); }
        50%      { transform: scaleY(1.015) scaleX(0.998); }
      }
      @keyframes orbit {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes pulse-glow {
        0%,100% { opacity: 0.5; transform: scale(1); }
        50%      { opacity: 1;   transform: scale(1.4); }
      }
      @keyframes heal-aura {
        0%,100% { opacity: 0.08; transform: scale(1); }
        50%      { opacity: 0.18; transform: scale(1.15); }
      }
      @keyframes twinkle {
        0%,100% { opacity: 0.5; transform: scale(0.9); }
        50%      { opacity: 1;   transform: scale(1.3); }
      }
      @keyframes petal-fall {
        0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
        10%  { opacity: 0.7; }
        90%  { opacity: 0.5; }
        100% { transform: translate(-180px, 80px) rotate(120deg); opacity: 0; }
      }

      /* ── Ambient particles ── */
      .particles { position: absolute; inset: 0; pointer-events: none; }
      .particle {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(180,255,120,0.8), transparent);
        animation: particle-float 8s ease-in-out infinite;
      }
      @keyframes particle-float {
        0%,100% { transform: translateY(0) scale(1);   opacity: 0; }
        20%      { opacity: 0.6; }
        50%      { transform: translateY(-30px) scale(1.2); opacity: 0.4; }
        80%      { opacity: 0.2; }
      }

      /* ═══════════════════════════════════════════
         ENVELOPE LAYER
      ═══════════════════════════════════════════ */
      .layer-envelopes {
        position: absolute;
        inset: 0;
        pointer-events: none;
        will-change: transform;
        transition: transform 0.14s ease-out;
      }

      .envelope {
        position: absolute;
        pointer-events: all;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        transform: rotate(var(--rot, 0deg));
        animation: env-bob linear infinite;
        will-change: transform;
        z-index: 10;
        transition: filter 0.2s;
      }
      .envelope:hover { filter: brightness(1.15); z-index: 20; }
      .envelope:hover .env-paper {
        transform: translateY(-6px) scale(1.08);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 16px var(--acc, #C4897A44);
      }

      @keyframes env-bob {
        0%,100% { margin-top: 0; }
        50%      { margin-top: -10px; }
      }

      .env-glow {
        position: absolute;
        width: 90px; height: 70px;
        top: -10px; left: -9px;
        border-radius: 50%;
        pointer-events: none;
        animation: env-glow-pulse 3s ease-in-out infinite;
      }
      @keyframes env-glow-pulse {
        0%,100% { opacity: 0.6; transform: scale(1); }
        50%      { opacity: 1;   transform: scale(1.2); }
      }

      .env-paper {
        position: relative;
        width: 72px;
        height: 52px;
        background: #FAF6EE;
        border: 1px solid #D8CCB4;
        border-radius: 2px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2);
        overflow: hidden;
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s;
      }

      .env-flap {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 26px;
        background:
          linear-gradient(135deg, #EDE4D4 50%, transparent 50%),
          linear-gradient(225deg, #EDE4D4 50%, transparent 50%);
        background-size: 50% 100%;
        background-repeat: no-repeat;
        background-position: left, right;
        border-bottom: 1px solid #D0C4B0;
      }

      .env-seal {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        width: 18px; height: 18px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 7px; color: rgba(255,255,255,0.95);
        box-shadow: 0 1px 5px rgba(0,0,0,0.3);
        z-index: 1;
      }

      .env-body-lines {
        position: absolute;
        bottom: 8px; left: 8px; right: 8px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .env-line { height: 1px; background: #C8BCA8; opacity: 0.5; }
      .env-line.short { width: 60%; }

      .env-label {
        font-family: Georgia, serif;
        font-size: 0.6rem;
        font-style: italic;
        color: rgba(255,240,200,0.7);
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        background: rgba(0,0,0,0.25);
        padding: 2px 7px;
        border-radius: 10px;
        backdrop-filter: blur(3px);
        white-space: nowrap;
        transition: opacity 0.2s;
      }
      .envelope:hover .env-label { opacity: 1; color: rgba(255,240,200,0.95); }

      /* ═══════════════════════════════════════════
         LETTER MODAL
      ═══════════════════════════════════════════ */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(8,10,6,0.75);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .modal-visible { opacity: 1; }

      .modal-card {
        background: #FAF6EE;
        border: 1px solid #D8CCB4;
        border-radius: 3px;
        max-width: 540px;
        width: 100%;
        max-height: 82vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 30px 80px rgba(0,0,0,0.5),
          0 0 0 1px rgba(255,255,255,0.05),
          inset 0 1px 0 rgba(255,255,255,0.4);
        animation: card-rise 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
      }
      @keyframes card-rise {
        from { transform: translateY(18px) scale(0.97); opacity: 0; }
        to   { transform: none; opacity: 1; }
      }

      .modal-top {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        padding: 1.1rem 1.4rem 0.9rem;
        border-bottom: 1px solid #EAE0D0;
      }
      .modal-recipient {
        font-family: Georgia, serif;
        font-size: 0.8rem;
        font-style: italic;
        color: #6B5E4E;
      }
      .modal-emotion {
        font-family: system-ui, sans-serif;
        font-size: 0.68rem;
        padding: 0.18rem 0.55rem;
        border-radius: 100px;
        border: 1px solid;
        letter-spacing: 0.04em;
      }
      .modal-time {
        font-size: 0.66rem;
        color: #9A8878;
        font-family: system-ui, sans-serif;
        margin-left: auto;
      }
      .modal-close {
        background: none; border: none; cursor: pointer;
        font-size: 0.82rem; color: #9A8878; padding: 2px 4px; border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      .modal-close:hover { color: #2C2416; background: #EDE4D4; }

      .modal-paper {
        position: relative;
        padding: 1.75rem 1.75rem 1.25rem 2.75rem;
        min-height: 160px;
      }
      .modal-margin {
        position: absolute; top: 0; bottom: 0; left: 2rem;
        width: 1px; border-left: 1.5px solid;
        opacity: 0.5;
      }
      .modal-text {
        font-family: Georgia, serif;
        font-size: 1.02rem;
        line-height: 1.88;
        color: #2C2416;
        white-space: pre-wrap;
      }

      .modal-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 1.4rem 1.1rem;
        border-top: 1px solid #EAE0D0;
      }
      .modal-anon {
        font-family: Georgia, serif;
        font-size: 0.78rem;
        font-style: italic;
        color: #9A8878;
      }
      .modal-cta {
        font-family: system-ui, sans-serif;
        font-size: 0.78rem;
        color: white;
        text-decoration: none;
        padding: 0.42rem 0.95rem;
        border-radius: 100px;
        transition: opacity 0.15s, transform 0.15s;
      }
      .modal-cta:hover { opacity: 0.85; transform: translateY(-1px); }

      /* ── Reduced motion ── */
      @media (prefers-reduced-motion: reduce) {
        .moon, .grass-blade, .fg-blade, .plant-breathe,
        .xp-orbit, .xp-pulse, .heal-pulse, .sparkle,
        .petal, .particle, .envelope, .env-glow,
        .ripple-0, .ripple-1, .ripple-2 { animation: none !important; }
      }

      @media (max-width: 480px) {
        .world { display: none; }
      }
    `}</style>
    </>
  )
}