import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import MessageThread from './MessageThread'

export default async function ConversationPage({
  params,
}: {
  params: { matchId: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true } },
        },
      },
    },
  })

  if (!match) notFound()

  const isParticipant =
    match.requesterId === session.user.id ||
    match.receiverId === session.user.id

  if (!isParticipant) redirect('/matches')

  return (
    <main className="conversation-page">
      <nav className="conv-nav">
        <Link href="/matches" className="nav-back">← connections</Link>
        <span className="conv-match-label">
          {Math.round(match.similarity * 100)}% emotional match
        </span>
      </nav>

      <div className="conv-header">
        <p className="conv-eyebrow">anonymous conversation</p>
        <h1 className="conv-title">
          You found someone who understands this feeling.
        </h1>
      </div>

      <MessageThread
        matchId={match.id}
        currentUserId={session.user.id}
        initialMessages={match.messages.map(m => ({
          id: m.id,
          content: m.content,
          senderId: m.sender.id,
          createdAt: m.createdAt.toISOString(),
        }))}
      />

      <style>{`
        .conversation-page {
          min-height: 100vh;
          background: var(--parchment);
          display: flex;
          flex-direction: column;
        }

        .conv-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--mist);
          background: var(--parchment);
        }

        .nav-back {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          text-decoration: none;
        }

        .nav-back:hover { color: var(--ink); }

        .conv-match-label {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--sage);
        }

        .conv-header {
          max-width: 640px;
          margin: 0 auto;
          padding: 2rem 2rem 1rem;
          width: 100%;
        }

        .conv-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
          margin-bottom: 0.5rem;
        }

        .conv-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 400;
          color: var(--ink);
          line-height: 1.4;
        }
      `}</style>
    </main>
  )
}