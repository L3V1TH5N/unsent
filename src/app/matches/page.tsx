// src/app/matches/page.tsx  —  Server Component
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
          select: { content: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--parchment)' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid #EAE6E1',
        position: 'sticky',
        top: 0,
        background: 'var(--parchment)',
        zIndex: 10,
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontStyle: 'italic',
          color: 'var(--ink)',
          textDecoration: 'none',
        }}>
          unsent
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/river" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#9A9490', textDecoration: 'none' }}>the river</Link>
          <Link href="/garden" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#9A9490', textDecoration: 'none' }}>my garden</Link>
          <Link href="/write" style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: '#9A9490',
            textDecoration: 'none',
            padding: '0.4rem 1rem',
            border: '1px solid #EAE6E1',
            borderRadius: '100px',
            background: 'white',
          }}>
            write a letter
          </Link>
        </div>
      </nav>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '3rem 2rem 5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3rem',
      }}>

        {/* Header */}
        <header>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#B87A7A',
            marginBottom: '0.6rem',
          }}>
            connections
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.3,
            margin: 0,
          }}>
            Someone who understands.
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: '#9A9490',
            marginTop: '0.6rem',
          }}>
            Matched by emotional similarity — not by profile, not by looks.
          </p>
        </header>

        {/* Existing conversations */}
        {existingMatches.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#9A9490',
            }}>
              Your conversations
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {existingMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    background: 'white',
                    border: '1px solid #EAE6E1',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#B87A7A', fontSize: '1rem' }}>✦</span>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.875rem',
                        color: 'var(--ink)',
                        margin: 0,
                        marginBottom: '0.2rem',
                      }}>
                        Anonymous
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.775rem',
                        color: '#9A9490',
                        margin: 0,
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {match.messages[0]?.content ?? 'Start the conversation'}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: '#7A9A7E',
                    flexShrink: 0,
                  }}>
                    {Math.round(match.similarity * 100)}% match
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Suggestions */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#9A9490',
          }}>
            {suggestions.length > 0 ? 'People who may understand you' : 'No matches yet'}
          </p>

          {suggestions.length === 0 ? (
            <div style={{
              padding: '2rem',
              background: 'white',
              border: '1px solid #EAE6E1',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: '#9A9490',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Write more letters so we can find someone who understands your emotional journey.
              </p>
              <Link href="/write" style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: '#B87A7A',
                textDecoration: 'none',
              }}>
                Write a letter →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {suggestions.map((s) => (
                <MatchCard
                  key={s.userId}
                  receiverId={s.userId}
                  similarity={s.similarity}
                  anonymousName={s.anonymousName}
                  sharedEmotions={s.sharedEmotions}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}