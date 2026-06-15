'use client'

import { useEffect, useState } from 'react'

type Counts = { understand: number; felt: number; hope: number }

const TYPES: { key: keyof Counts; label: string }[] = [
  { key: 'understand', label: 'I understand' },
  { key: 'felt',       label: 'I felt this' },
  { key: 'hope',       label: "I hope you're okay" },
]

export default function ReactionButtons({ letterId }: { letterId: string }) {
  const [counts, setCounts] = useState<Counts>({ understand: 0, felt: 0, hope: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch(`/api/letters/${letterId}/reactions`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        const c = data.counts ?? {}
        setCounts({
          understand: c.understand ?? 0,
          felt: c.felt ?? 0,
          hope: c.hope ?? 0,
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
        // rollback
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
      {TYPES.map((t) => (
        <button
          key={t.key}
          onClick={() => handleReact(t.key)}
          style={{
            padding: '0.3rem 0.75rem',
            border: '1px solid #EAE6E1',
            borderRadius: '100px',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: '0.72rem',
            color: '#9A9490',
            cursor: 'pointer',
            display: 'flex',
            gap: '0.4rem',
            alignItems: 'center',
          }}
        >
          <span>{t.label}</span>
          <span style={{ opacity: 0.6 }}>{counts[t.key]}</span>
        </button>
      ))}
    </div>
  )
}
