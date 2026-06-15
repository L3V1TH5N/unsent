'use client'
// src/app/matches/MatchCard.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Emotion → human-readable phrase shown on the card
const EMOTION_PHRASES: Record<string, string> = {
  love:        'love',
  longing:     'longing',
  regret:      'regret',
  sadness:     'sadness',
  anger:       'anger',
  forgiveness: 'forgiveness',
  acceptance:  'acceptance',
  healing:     'healing',
  hope:        'hope',
}

// Similarity score → descriptor
function similarityLabel(s: number): string {
  if (s >= 0.85) return 'deeply resonant'
  if (s >= 0.70) return 'strongly similar'
  if (s >= 0.55) return 'emotionally close'
  return 'emotionally similar'
}

interface Props {
  receiverId: string
  similarity: number
  anonymousName: string | null
  sharedEmotions: string[]
}

export default function MatchCard({
  receiverId,
  similarity,
  sharedEmotions,
}: Props) {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected]   = useState(false)
  const [hovered, setHovered]       = useState(false)
  const router = useRouter()

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, similarity }),
      })
      const data = await res.json()
      if (res.ok) {
        setConnected(true)
        router.push(`/matches/${data.match.id}`)
      }
    } catch {
      setConnecting(false)
    }
  }

  const pct = Math.round(similarity * 100)
  const label = similarityLabel(similarity)

  // Build the shared emotion sentence
  const sharedText =
    sharedEmotions.length === 0
      ? 'a similar emotional weight'
      : sharedEmotions.length === 1
      ? `feelings of ${EMOTION_PHRASES[sharedEmotions[0]] ?? sharedEmotions[0]}`
      : `feelings of ${sharedEmotions
          .slice(0, 3)
          .map(e => EMOTION_PHRASES[e] ?? e)
          .join(' and ')}`

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        border: `1px solid ${hovered ? '#D4CEC8' : '#EAE6E1'}`,
        borderRadius: '4px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      {/* Top row: ring + description */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

        {/* Similarity ring */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '2px solid #7A9A7E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          gap: '1px',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: '#4A6741',
            lineHeight: 1,
          }}>
            {pct}%
          </span>
        </div>

        {/* Label + shared emotions */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#9A9490',
            margin: '0 0 0.3rem',
          }}>
            {label}
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--ink)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            This person carries {sharedText} — much like you do.
          </p>
        </div>
      </div>

      {/* Shared emotion tags */}
      {sharedEmotions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {sharedEmotions.slice(0, 4).map((e) => (
            <span
              key={e}
              style={{
                padding: '0.2rem 0.65rem',
                background: '#F5EDEC',
                borderRadius: '100px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: '#9A6052',
                letterSpacing: '0.03em',
              }}
            >
              {EMOTION_PHRASES[e] ?? e}
            </span>
          ))}
        </div>
      )}

      {/* Connect button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleConnect}
          disabled={connecting || connected}
          style={{
            padding: '0.55rem 1.25rem',
            background: connected ? '#4A6741' : 'transparent',
            border: `1px solid ${connected ? '#4A6741' : 'var(--ink)'}`,
            borderRadius: '100px',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: connected ? 'white' : 'var(--ink)',
            cursor: connecting || connected ? 'not-allowed' : 'pointer',
            opacity: connecting ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {connected ? 'Connected ✦' : connecting ? 'Connecting…' : 'Begin conversation'}
        </button>
      </div>
    </div>
  )
}