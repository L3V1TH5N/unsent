'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  receiverId: string
  similarity: number
  anonymousName: string | null
}

export default function MatchCard({ receiverId, similarity, anonymousName }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
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

  return (
    <div className="suggestion-card">
      <div className="suggestion-left">
        <div className="similarity-ring">
          <span className="similarity-number">
            {Math.round(similarity * 100)}%
          </span>
        </div>
        <div className="suggestion-info">
          <p className="suggestion-label">emotional match</p>
          <p className="suggestion-desc">
            This person&rsquo;s letters carry a similar emotional weight to yours.
          </p>
        </div>
      </div>
      <button
        className="connect-btn"
        onClick={handleConnect}
        disabled={connecting || connected}
      >
        {connected ? 'Connected ✦' : connecting ? 'Connecting...' : 'Begin conversation'}
      </button>

      <style>{`
        .suggestion-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .suggestion-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .similarity-ring {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid var(--sage);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .similarity-number {
          font-family: var(--font-display);
          font-size: 0.85rem;
          color: var(--sage);
        }

        .suggestion-label {
          font-family: var(--font-body);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ink-light);
          margin-bottom: 0.25rem;
        }

        .suggestion-desc {
          font-family: var(--font-body);
          font-size: 0.825rem;
          color: var(--ink);
          line-height: 1.5;
          max-width: 280px;
        }

        .connect-btn {
          padding: 0.6rem 1.25rem;
          background: transparent;
          border: 1px solid var(--ink);
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .connect-btn:hover:not(:disabled) {
          background: var(--ink);
          color: var(--parchment);
        }

        .connect-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}