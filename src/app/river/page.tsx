import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const recipientLabels: Record<string, string> = {
  someone_loved: 'to someone I loved',
  someone_lost: 'to someone I lost',
  past_self: 'to my past self',
  someone_hurt: 'to someone I hurt',
  someone_forgive: 'to someone I forgive',
  myself: 'to myself',
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default async function RiverPage() {
  const session = await auth()

  const letters = await prisma.letter.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      content: true,
      recipientType: true,
      emotion: true,
      createdAt: true,
    },
  })

  return (
    <main className="river-page">
      <nav className="river-nav">
        <Link href="/" className="nav-logo">unsent</Link>
        <div className="nav-actions">
          <Link href="/write" className="nav-write">write a letter</Link>
          {session && (
            <Link href="/garden" className="nav-garden">my garden</Link>
          )}
        </div>
      </nav>

      <div className="river-header">
        <p className="river-eyebrow">the river</p>
        <h1 className="river-title">Words others couldn&rsquo;t keep inside.</h1>
        <p className="river-sub">Anonymous letters, released into the world.</p>
      </div>

      <div className="river-feed">
        {letters.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No letters yet.</p>
            <p className="empty-sub">Be the first to release one.</p>
            <Link href="/write" className="empty-cta">Write a letter</Link>
          </div>
        ) : (
          letters.map((letter, i) => (
            <article key={letter.id} className="letter-card" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="letter-meta">
                <span className="letter-recipient">
                  {recipientLabels[letter.recipientType] || 'to someone'}
                </span>
                {letter.emotion && (
                  <span className="letter-emotion">{letter.emotion}</span>
                )}
                <span className="letter-time">{timeAgo(letter.createdAt)}</span>
              </div>
              <p className="letter-content">{letter.content}</p>
              <div className="letter-reactions">
                <button className="reaction-btn">I understand</button>
                <button className="reaction-btn">I felt this</button>
                <button className="reaction-btn">I hope you&rsquo;re okay</button>
              </div>
            </article>
          ))
        )}
      </div>

      <style>{`
        .river-page {
          min-height: 100vh;
          background: var(--parchment);
        }

        .river-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--mist);
          position: sticky;
          top: 0;
          background: var(--parchment);
          z-index: 10;
        }

        .nav-logo {
          font-family: var(--font-display);
          font-size: 1rem;
          font-style: italic;
          color: var(--ink);
          text-decoration: none;
        }

        .nav-actions {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .nav-write, .nav-garden {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          text-decoration: none;
          transition: color 0.15s;
        }

        .nav-write:hover, .nav-garden:hover {
          color: var(--ink);
        }

        .nav-write {
          padding: 0.4rem 1rem;
          border: 1px solid var(--mist);
          border-radius: 100px;
          background: white;
        }

        .river-header {
          max-width: 640px;
          margin: 0 auto;
          padding: 3rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .river-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
        }

        .river-title {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.3;
        }

        .river-sub {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
        }

        .river-feed {
          max-width: 640px;
          margin: 0 auto;
          padding: 1rem 2rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .letter-card {
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: fadeUp 0.4s ease both;
          transition: border-color 0.2s;
        }

        .letter-card:hover {
          border-color: #D4C9BC;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .letter-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .letter-recipient {
          font-family: var(--font-display);
          font-size: 0.78rem;
          font-style: italic;
          color: var(--ink-light);
        }

        .letter-emotion {
          font-family: var(--font-body);
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
          background: #F0EDE8;
          border-radius: 100px;
          color: var(--ink-light);
          text-transform: lowercase;
        }

        .letter-time {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--ink-light);
          opacity: 0.5;
          margin-left: auto;
        }

        .letter-content {
          font-family: var(--font-display);
          font-size: 1rem;
          line-height: 1.8;
          color: var(--ink);
          white-space: pre-wrap;
        }

        .letter-reactions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-top: 0.5rem;
          border-top: 1px solid var(--mist);
        }

        .reaction-btn {
          padding: 0.3rem 0.75rem;
          border: 1px solid var(--mist);
          border-radius: 100px;
          background: transparent;
          font-family: var(--font-body);
          font-size: 0.72rem;
          color: var(--ink-light);
          cursor: pointer;
          transition: all 0.15s;
        }

        .reaction-btn:hover {
          border-color: var(--sage);
          color: var(--sage);
          background: #F3F6F3;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .empty-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 400;
          color: var(--ink);
        }

        .empty-sub {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
        }

        .empty-cta {
          margin-top: 0.5rem;
          padding: 0.65rem 1.5rem;
          background: var(--ink);
          color: var(--parchment);
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.875rem;
          text-decoration: none;
          transition: opacity 0.15s;
        }

        .empty-cta:hover { opacity: 0.8; }

        @media (max-width: 640px) {
          .river-feed, .river-header { padding-left: 1rem; padding-right: 1rem; }
          .river-nav { padding: 1rem; }
        }
      `}</style>
    </main>
  )
}