'use client'

import { useEffect, useState } from 'react'

type Counts = { understand: number; felt: number; hope: number; thanks: number }

const TYPES: { key: keyof Counts; label: string }[] = [
  { key: 'understand', label: 'I understand' },
  { key: 'felt',       label: 'I felt this' },
  { key: 'hope',       label: "I hope you're okay" },
  { key: 'thanks',     label: 'Thank you for sharing' },
]

export default function ReactionButtons({ letterId }: { letterId: string }) {
  const [counts, setCounts] = useState<Counts>({ understand: 0, felt: 0, hope: 0, thanks: 0 })
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<keyof Counts | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/letters/${letterId}/reactions`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        const c = data.counts ?? {}
        setCounts({
          understand: c.understand ?? 0,
          felt:       c.felt       ?? 0,
          hope:       c.hope       ?? 0,
          thanks:     c.thanks     ?? 0,
        })
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [letterId])

  async function handleReact(type: keyof Counts) {
    if (loading) return
    setLoading(true)
    setCounts((s) => ({ ...s, [type]: s[type] + 1 }))

    try {
      const res = await fetch(`/api/letters/${letterId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) {
        setCounts((s) => ({ ...s, [type]: Math.max(0, s[type] - 1) }))
      }
    } catch {
      setCounts((s) => ({ ...s, [type]: Math.max(0, s[type] - 1) }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {TYPES.map((t) => {
        const isHovered = hovered === t.key
        return (
          <button
            key={t.key}
            onClick={() => handleReact(t.key)}
            onMouseEnter={() => setHovered(t.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '0.3rem 0.75rem',
              border: `1px solid ${isHovered ? '#8A9E8C' : '#EAE6E1'}`,
              borderRadius: '100px',
              background: isHovered ? '#F3F6F3' : 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize: '0.72rem',
              color: isHovered ? '#8A9E8C' : '#9A9490',
              cursor: 'pointer',
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            }}
          >
            <span>{t.label}</span>
            {counts[t.key] > 0 && (
              <span style={{ opacity: 0.6 }}>{counts[t.key]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}