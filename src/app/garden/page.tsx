import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Stage } from '@/generated/prisma'

const stageConfig: Record<Stage, { emoji: string; label: string; color: string }> = {
  SEED:    { emoji: '🌱', label: 'Just planted',  color: '#8A9E8C' },
  SPROUT:  { emoji: '🌿', label: 'Growing',       color: '#6B8F6E' },
  HEALING: { emoji: '🌸', label: 'Healing',       color: '#C4897A' },
  BLOOMED: { emoji: '🌹', label: 'Bloomed',       color: '#A0522D' },
  STRONG:  { emoji: '🌳', label: 'Strong tree',   color: '#4A6741' },
}

const stageOrder: Stage[] = ['SEED', 'SPROUT', 'HEALING', 'BLOOMED', 'STRONG']

function StageBar({ stage }: { stage: Stage }) {
  const currentIndex = stageOrder.indexOf(stage)
  return (
    <div className="stage-bar">
      {stageOrder.map((s, i) => (
        <div
          key={s}
          className={`stage-dot ${i <= currentIndex ? 'filled' : ''}`}
          title={stageConfig[s].label}
        />
      ))}
    </div>
  )
}

export default async function GardenPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const [seeds, letterCount] = await Promise.all([
    prisma.seed.findMany({
      where: { userId: session.user.id },
      orderBy: { lastActivity: 'desc' },
    }),
    prisma.letter.count({
      where: { userId: session.user.id },
    }),
  ])

  const bloomedCount = seeds.filter(s => s.stage === 'BLOOMED' || s.stage === 'STRONG').length
  const growingCount = seeds.filter(s => s.stage === 'SPROUT' || s.stage === 'HEALING').length

  return (
    <main className="garden-page">
      <nav className="garden-nav">
        <Link href="/" className="nav-logo">unsent</Link>
        <div className="nav-actions">
          <Link href="/river" className="nav-link">the river</Link>
          <Link href="/write" className="nav-write">write a letter</Link>
        </div>
      </nav>

      <div className="garden-container">
        <header className="garden-header">
          <p className="garden-eyebrow">my garden</p>
          <h1 className="garden-title">Your emotional journey,<br />growing over time.</h1>
        </header>

        <div className="garden-stats">
          <div className="stat-card">
            <span className="stat-number">{seeds.length}</span>
            <span className="stat-label">seeds planted</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{growingCount}</span>
            <span className="stat-label">growing</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{bloomedCount}</span>
            <span className="stat-label">bloomed</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{letterCount}</span>
            <span className="stat-label">letters written</span>
          </div>
        </div>

        {seeds.length === 0 ? (
          <div className="empty-garden">
            <p className="empty-emoji">🌱</p>
            <p className="empty-title">Your garden is waiting.</p>
            <p className="empty-sub">Write your first letter to plant a seed.</p>
            <Link href="/write" className="empty-cta">Write a letter</Link>
          </div>
        ) : (
          <div className="seeds-grid">
            {seeds.map((seed) => {
              const config = stageConfig[seed.stage as Stage]
              return (
                <div key={seed.id} className="seed-card">
                  <div className="seed-top">
                    <span className="seed-emoji">{config.emoji}</span>
                    <div className="seed-info">
                      <h2 className="seed-theme">{seed.theme}</h2>
                      <p className="seed-stage" style={{ color: config.color }}>
                        {config.label}
                      </p>
                    </div>
                  </div>
                  <StageBar stage={seed.stage as Stage} />
                  <p className="seed-count">
                    {seed.letterCount} {seed.letterCount === 1 ? 'letter' : 'letters'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .garden-page {
          min-height: 100vh;
          background: var(--parchment);
        }

        .garden-nav {
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

        .nav-write:hover { color: var(--ink); }

        .garden-container {
          max-width: 680px;
          margin: 0 auto;
          padding: 3rem 2rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .garden-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--sage);
          margin-bottom: 0.5rem;
        }

        .garden-title {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.35;
        }

        .garden-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: center;
        }

        .stat-number {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--ink);
        }

        .stat-label {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--ink-light);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .seeds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .seed-card {
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: border-color 0.2s;
        }

        .seed-card:hover { border-color: #D4C9BC; }

        .seed-top {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
        }

        .seed-emoji {
          font-size: 1.75rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .seed-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .seed-theme {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 400;
          color: var(--ink);
        }

        .seed-stage {
          font-family: var(--font-body);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stage-bar {
          display: flex;
          gap: 0.375rem;
          align-items: center;
        }

        .stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--mist);
          transition: background 0.3s;
        }

        .stage-dot.filled {
          background: var(--sage);
        }

        .seed-count {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: var(--ink-light);
          opacity: 0.6;
        }

        .empty-garden {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .empty-emoji { font-size: 3rem; }

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
        }

        .empty-cta:hover { opacity: 0.8; }

        @media (max-width: 640px) {
          .garden-stats { grid-template-columns: repeat(2, 1fr); }
          .garden-container { padding: 2rem 1rem; }
          .garden-nav { padding: 1rem; }
        }
      `}</style>
    </main>
  )
}