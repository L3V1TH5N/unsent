import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { findMatches } from '@/services/match.service'
import MatchCard from './MatchCard'

export default async function MatchesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const userId = session.user.id

  const [suggestions, existingMatches] = await Promise.all([
    findMatches(userId),
    prisma.match.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <main className="matches-page">
      <nav className="matches-nav">
        <Link href="/" className="nav-logo">unsent</Link>
        <div className="nav-actions">
          <Link href="/river" className="nav-link">the river</Link>
          <Link href="/garden" className="nav-link">my garden</Link>
          <Link href="/write" className="nav-write">write a letter</Link>
        </div>
      </nav>

      <div className="matches-container">
        <header className="matches-header">
          <p className="matches-eyebrow">connections</p>
          <h1 className="matches-title">Someone who understands.</h1>
          <p className="matches-sub">
            Matched by emotional similarity — not by profile, not by looks.
          </p>
        </header>

        {existingMatches.length > 0 && (
          <section className="matches-section">
            <h2 className="section-title">Your conversations</h2>
            <div className="matches-list">
              {existingMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="conversation-card"
                >
                  <div className="conv-left">
                    <span className="conv-icon">✦</span>
                    <div>
                      <p className="conv-name">Anonymous</p>
                      <p className="conv-preview">
                        {match.messages[0]?.content || 'Start the conversation'}
                      </p>
                    </div>
                  </div>
                  <span className="conv-similarity">
                    {Math.round(match.similarity * 100)}% match
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="matches-section">
          <h2 className="section-title">
            {suggestions.length > 0
              ? 'People who may understand you'
              : 'No matches yet'}
          </h2>

          {suggestions.length === 0 ? (
            <div className="empty-matches">
              <p className="empty-text">
                Write more letters so we can find someone who understands
                your emotional journey.
              </p>
              <Link href="/write" className="empty-cta">Write a letter</Link>
            </div>
          ) : (
            <div className="suggestions-list">
              {suggestions.map((s) => (
                <MatchCard
                  key={s.userId}
                  receiverId={s.userId}
                  similarity={s.similarity}
                  anonymousName={s.anonymousName}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .matches-page {
          min-height: 100vh;
          background: var(--parchment);
        }

        .matches-nav {
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

        .nav-link {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          text-decoration: none;
        }

        .nav-link:hover { color: var(--ink); }

        .nav-write {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          text-decoration: none;
          padding: 0.4rem 1rem;
          border: 1px solid var(--mist);
          border-radius: 100px;
          background: white;
        }

        .matches-container {
          max-width: 640px;
          margin: 0 auto;
          padding: 3rem 2rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .matches-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
          margin-bottom: 0.5rem;
        }

        .matches-title {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.3;
        }

        .matches-sub {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
          margin-top: 0.5rem;
        }

        .matches-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title {
          font-family: var(--font-body);
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-light);
          font-weight: 400;
        }

        .matches-list, .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .conversation-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          text-decoration: none;
          transition: border-color 0.2s;
        }

        .conversation-card:hover { border-color: #D4C9BC; }

        .conv-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .conv-icon {
          color: var(--rose);
          font-size: 1rem;
        }

        .conv-name {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink);
          margin-bottom: 0.2rem;
        }

        .conv-preview {
          font-family: var(--font-body);
          font-size: 0.775rem;
          color: var(--ink-light);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .conv-similarity {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--sage);
          flex-shrink: 0;
        }

        .empty-matches {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 2rem;
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
        }

        .empty-text {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
          line-height: 1.6;
        }

        .empty-cta {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--rose);
          text-decoration: none;
        }

        .empty-cta:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .matches-container { padding: 2rem 1rem; }
          .matches-nav { padding: 1rem; }
          .nav-actions { gap: 1rem; }
        }
      `}</style>
    </main>
  )
}
