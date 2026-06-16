// FILE: src/app/profile/page.tsx — Server Component (no 'use client')
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { getProfileStats } from '@/services/profile.service'

function formatMemberSince(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(date)
  )
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const stats = await getProfileStats(session.user.id)

  return (
    <main className="profile-page">
      <Nav />

      <div className="profile-header">
        <p className="profile-eyebrow">anonymous garden</p>
        <h1 className="profile-title">{stats.anonymousName ?? 'a quiet visitor'}</h1>
        <p className="profile-sub">
          tending this garden since {formatMemberSince(stats.memberSince)}
        </p>
      </div>

      {stats.lettersWritten === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Your garden is still soil.</p>
          <p className="empty-sub">Write your first letter to plant a seed.</p>
          <Link href="/write" className="empty-cta">
            Write a letter
          </Link>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card" style={{ animationDelay: '0s' }}>
              <span className="stat-value">{stats.lettersWritten}</span>
              <span className="stat-label">letters written</span>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.04s' }}>
              <span className="stat-value">{stats.seedsPlanted}</span>
              <span className="stat-label">seeds planted</span>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.08s' }}>
              <span className="stat-value">{stats.growingJourneys}</span>
              <span className="stat-label">growing journeys</span>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.12s' }}>
              <span className="stat-value">{stats.healedMemories}</span>
              <span className="stat-label">healed memories</span>
            </div>
          </div>

          {stats.topEmotions.length > 0 && (
            <div className="emotion-section">
              <p className="emotion-label">feelings that return often</p>
              <div className="emotion-pills">
                {stats.topEmotions.map((e) => (
                  <span key={e.emotion} className="emotion-pill">
                    {e.emotion}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="profile-links">
            <Link href="/garden" className="profile-link">
              visit your garden &rarr;
            </Link>
          </div>
        </>
      )}

      <style>{`
        .profile-page {
          min-height: 100vh;
          background: var(--parchment);
        }

        .profile-header {
          max-width: 640px;
          margin: 0 auto;
          padding: 3rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .profile-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
        }

        .profile-title {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.3;
        }

        .profile-sub {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
        }

        .stat-grid {
          max-width: 640px;
          margin: 0 auto;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          animation: fadeUp 0.4s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 2rem;
          color: var(--ink);
        }

        .stat-label {
          font-family: var(--font-body);
          font-size: 0.78rem;
          color: var(--ink-light);
          text-transform: lowercase;
        }

        .emotion-section {
          max-width: 640px;
          margin: 0 auto;
          padding: 2rem 2rem 0;
        }

        .emotion-label {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 0.85rem;
          color: var(--ink-light);
          margin-bottom: 0.75rem;
        }

        .emotion-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .emotion-pill {
          font-family: var(--font-body);
          font-size: 0.72rem;
          padding: 0.3rem 0.85rem;
          background: #F0EDE8;
          border-radius: 100px;
          color: var(--ink-light);
          text-transform: lowercase;
        }

        .profile-links {
          max-width: 640px;
          margin: 0 auto;
          padding: 2.5rem 2rem 4rem;
        }

        .profile-link {
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: var(--sage);
          text-decoration: none;
        }

        .profile-link:hover {
          text-decoration: underline;
        }

        .empty-state {
          max-width: 640px;
          margin: 0 auto;
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

        .empty-cta:hover {
          opacity: 0.8;
        }

        @media (max-width: 640px) {
          .profile-header, .stat-grid, .emotion-section, .profile-links {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .stat-grid {
            gap: 0.75rem;
          }
        }
      `}</style>
    </main>
  )
}