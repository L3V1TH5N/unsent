'use client'

// NOTE: This file is intentionally a Client Component so we can use
// CSS animations and interactive hover states via inline styles + state.
// Data fetching is done in the parent Server Component (garden/page.tsx) and
// passed down as props — keep this file as the display layer only.

import { Stage } from '@/generated/prisma'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────
export type SeedData = {
  id: string
  theme: string
  stage: Stage
  category: string | null
  letterCount: number
  tags: string[] | null
  bloomedAt: Date | null
  lastActivity: Date
}

type GardenClientProps = {
  seeds: SeedData[]
  letterCount: number
}

// ─── Stage config ─────────────────────────────────────────────────────────
const STAGE_CONFIG: Record<Stage, {
  emoji: string
  label: string
  color: string
  bg: string
  thresholdNext: number | null
  thresholdCurrent: number
}> = {
  SEED:    { emoji: '🌱', label: 'Just planted',  color: '#7A9A7E', bg: '#EFF4EF', thresholdCurrent: 0,  thresholdNext: 3  },
  SPROUT:  { emoji: '🌿', label: 'Growing',       color: '#5D8A62', bg: '#EAF0EA', thresholdCurrent: 3,  thresholdNext: 7  },
  HEALING: { emoji: '🌸', label: 'Healing',       color: '#B87A7A', bg: '#F5EDEC', thresholdCurrent: 7,  thresholdNext: 12 },
  BLOOMED: { emoji: '🌹', label: 'Bloomed',       color: '#9A6052', bg: '#F2EAE8', thresholdCurrent: 12, thresholdNext: 20 },
  STRONG:  { emoji: '🌳', label: 'Strong tree',   color: '#4A6741', bg: '#E8EEE8', thresholdCurrent: 20, thresholdNext: null },
}

const STAGE_ORDER: Stage[] = ['SEED', 'SPROUT', 'HEALING', 'BLOOMED', 'STRONG']

// 0.0–1.0 progress toward the NEXT stage
function stageProgress(count: number, stage: Stage): number {
  const cfg = STAGE_CONFIG[stage]
  if (cfg.thresholdNext === null) return 1 // max stage
  const span = cfg.thresholdNext - cfg.thresholdCurrent
  return Math.min((count - cfg.thresholdCurrent) / span, 1)
}

// ─── Progress bar ─────────────────────────────────────────────────────────
function ProgressBar({ stage, count }: { stage: Stage; count: number }) {
  const progress = stageProgress(count, stage)
  const cfg = STAGE_CONFIG[stage]
  const isMax = cfg.thresholdNext === null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div
        style={{
          height: '3px',
          background: '#E8E4DF',
          borderRadius: '100px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${(isMax ? 1 : progress) * 100}%`,
            background: cfg.color,
            borderRadius: '100px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: '#9A9490', fontFamily: 'var(--font-body)' }}>
          {isMax ? 'Fully grown' : `${count} / ${cfg.thresholdNext} letters to next stage`}
        </span>
        <span style={{ fontSize: '0.65rem', color: cfg.color, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          {cfg.label}
        </span>
      </div>
    </div>
  )
}

// ─── Stage journey dots ───────────────────────────────────────────────────
function StageJourney({ stage }: { stage: Stage }) {
  const currentIdx = STAGE_ORDER.indexOf(stage)
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {STAGE_ORDER.map((s, i) => {
        const cfg = STAGE_CONFIG[s]
        const isActive  = i === currentIdx
        const isPast    = i < currentIdx
        const isFuture  = i > currentIdx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              title={cfg.label}
              style={{
                width:        isActive ? '22px' : '8px',
                height:       '8px',
                borderRadius: '100px',
                background:   isActive ? cfg.color : isPast ? cfg.color : '#E0DBD5',
                opacity:      isFuture ? 0.35 : 1,
                transition:   'all 0.3s ease',
                fontSize:     isActive ? '0.6rem' : '0',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                overflow:     'hidden',
              }}
            />
            {i < STAGE_ORDER.length - 1 && (
              <div
                style={{
                  width: '12px',
                  height: '1px',
                  background: i < currentIdx ? STAGE_CONFIG[STAGE_ORDER[i]].color : '#E0DBD5',
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tag pill ─────────────────────────────────────────────────────────────
function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.5rem',
        background: '#F0ECE8',
        borderRadius: '100px',
        fontSize: '0.65rem',
        color: '#7A756F',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </span>
  )
}

// ─── Seed card ────────────────────────────────────────────────────────────
function SeedCard({ seed }: { seed: SeedData }) {
  const cfg = STAGE_CONFIG[seed.stage]
  const isBloomed = seed.stage === 'BLOOMED' || seed.stage === 'STRONG'

  return (
    <article
      style={{
        background: 'white',
        border: '1px solid #EAE6E1',
        borderRadius: '4px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'
        el.style.borderColor = '#D4CEC8'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'none'
        el.style.borderColor = '#EAE6E1'
      }}
    >
      {/* Bloom badge */}
      {isBloomed && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: cfg.bg,
            color: cfg.color,
            fontSize: '0.6rem',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.2rem 0.6rem',
            borderRadius: '100px',
            fontWeight: 500,
          }}
        >
          {seed.stage === 'STRONG' ? 'fully grown' : 'bloomed'}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
        <span
          style={{
            fontSize: '2rem',
            lineHeight: 1,
            flexShrink: 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
          }}
        >
          {cfg.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 400,
              color: 'var(--ink)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {seed.theme}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              color: '#9A9490',
              margin: '0.2rem 0 0',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {(seed.category ?? 'self reflection').replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Stage journey */}
      <StageJourney stage={seed.stage} />

      {/* Progress bar */}
      <ProgressBar stage={seed.stage} count={seed.letterCount} />

      {/* Tags */}
      {(seed.tags ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {(seed.tags ?? []).slice(0, 4).map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.5rem',
          borderTop: '1px solid #F0ECE8',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            color: '#B5AFA8',
          }}
        >
          {seed.letterCount} {seed.letterCount === 1 ? 'letter' : 'letters'}
        </span>
        {seed.bloomedAt && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.65rem',
              color: cfg.color,
            }}
          >
            bloomed {new Date(seed.bloomedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </article>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #EAE6E1',
        borderRadius: '4px',
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 400,
          color: 'var(--ink)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.65rem',
          color: '#9A9490',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
export default function GardenClient({ seeds, letterCount }: GardenClientProps) {
  const bloomedCount = seeds.filter(
    (s) => s.stage === 'BLOOMED' || s.stage === 'STRONG'
  ).length
  const growingCount = seeds.filter(
    (s) => s.stage === 'SPROUT' || s.stage === 'HEALING'
  ).length

  return (
    <main style={{ minHeight: '100vh', background: 'var(--parchment)' }}>

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #EAE6E1',
          position: 'sticky',
          top: 0,
          background: 'var(--parchment)',
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          unsent
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link
            href="/river"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: '#9A9490',
              textDecoration: 'none',
            }}
          >
            the river
          </Link>
          <Link
            href="/write"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: '#9A9490',
              textDecoration: 'none',
              padding: '0.4rem 1rem',
              border: '1px solid #EAE6E1',
              borderRadius: '100px',
              background: 'white',
            }}
          >
            write a letter
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '3rem 2rem 5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
        }}
      >
        {/* Header */}
        <header>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#7A9A7E',
              marginBottom: '0.6rem',
            }}
          >
            my garden
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 400,
              color: 'var(--ink)',
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            Your emotional journey,
            <br />
            growing over time.
          </h1>
        </header>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
          }}
        >
          <StatCard value={seeds.length}  label="seeds"    />
          <StatCard value={growingCount}  label="growing"  />
          <StatCard value={bloomedCount}  label="bloomed"  />
          <StatCard value={letterCount}   label="letters"  />
        </div>

        {/* Seeds or empty state */}
        {seeds.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '3rem' }}>🌱</span>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Your garden is waiting.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: '#9A9490',
                margin: 0,
              }}
            >
              Write your first letter to plant a seed.
            </p>
            <Link
              href="/write"
              style={{
                marginTop: '0.5rem',
                padding: '0.65rem 1.5rem',
                background: 'var(--ink)',
                color: 'var(--parchment)',
                borderRadius: '100px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Write a letter
            </Link>
          </div>
        ) : (
          <>
            {/* Section: bloomed/strong */}
            {seeds.some((s) => s.stage === 'BLOOMED' || s.stage === 'STRONG') && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#9A9490',
                    margin: 0,
                  }}
                >
                  Bloomed
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {seeds
                    .filter((s) => s.stage === 'BLOOMED' || s.stage === 'STRONG')
                    .map((seed) => (
                      <SeedCard key={seed.id} seed={seed} />
                    ))}
                </div>
              </section>
            )}

            {/* Section: growing */}
            {seeds.some((s) => s.stage === 'SEED' || s.stage === 'SPROUT' || s.stage === 'HEALING') && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#9A9490',
                    margin: 0,
                  }}
                >
                  Still growing
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {seeds
                    .filter((s) => s.stage === 'SEED' || s.stage === 'SPROUT' || s.stage === 'HEALING')
                    .map((seed) => (
                      <SeedCard key={seed.id} seed={seed} />
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}