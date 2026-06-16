import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LandingScene from '@/components/LandingScene'

const carryingOptions = [
  { label: 'Something I lost',           href: '/write?carrying=lost',    icon: '◈' },
  { label: 'Something hurting me',       href: '/write?carrying=hurting', icon: '◈' },
  { label: 'Something I miss',           href: '/write?carrying=missing', icon: '◈' },
  { label: "Something I'm healing from", href: '/write?carrying=healing', icon: '◈' },
  { label: 'Something I never said',     href: '/write?carrying=unsaid',  icon: '◈' },
]

export default async function LandingPage() {
  const session = await auth()

  const letters = await prisma.letter.findMany({
    where:   { isPublic: true, status: 'ANALYZED' },
    orderBy: { createdAt: 'desc' },
    take:    6,
    select:  { id: true, content: true, recipientType: true, emotion: true, createdAt: true },
  })

  const serialized = letters.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))

  return (
    <main className="root">
      {/* Living world behind everything */}
      <LandingScene letters={serialized} />

      {/* UI panel — RPG quest prompt style */}
      <div className="ui-layer">
        <div className="quest-panel">

          {/* Corner ornaments */}
          <div className="corner tl" aria-hidden="true"/>
          <div className="corner tr" aria-hidden="true"/>
          <div className="corner bl" aria-hidden="true"/>
          <div className="corner br" aria-hidden="true"/>

          {/* Logo */}
          <div className="panel-logo">
            <Image src="/img/Unsent-Logo.png" alt="Unsent" width={96} height={30} priority
              style={{objectFit:'contain', objectPosition:'center', filter:'brightness(0) invert(1)', opacity:0.9}}/>
          </div>

          {/* Divider line */}
          <div className="panel-rule" aria-hidden="true">
            <span className="rule-gem">◆</span>
          </div>

          {/* Headline */}
          <div className="panel-headline">
            <p className="panel-eyebrow">a place for words you never sent</p>
            <h1 className="panel-title">
              Some words are too<br/>heavy to carry alone.
            </h1>
          </div>

          {/* Quest prompt */}
          <div className="panel-quest">
            <p className="quest-label">
              <span className="quest-diamond" aria-hidden="true">◇</span>
              What are you carrying today?
            </p>
            <nav className="quest-options" aria-label="Emotional journey options">
              {carryingOptions.map((opt) => (
                <Link
                  key={opt.href}
                  href={session ? opt.href : '/api/auth/signin'}
                  className="quest-choice"
                >
                  <span className="choice-arrow" aria-hidden="true">▶</span>
                  {opt.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom rule + nav */}
          <div className="panel-rule" aria-hidden="true">
            <span className="rule-gem">◆</span>
          </div>

          <div className="panel-foot">
            {session ? (
              <>
                <Link href="/river"   className="foot-link">the river</Link>
                <span className="foot-sep" aria-hidden="true">·</span>
                <Link href="/garden"  className="foot-link">my garden</Link>
                <span className="foot-sep" aria-hidden="true">·</span>
                <Link href="/matches" className="foot-link">matches</Link>
              </>
            ) : (
              <p className="foot-anon">◈ Anonymous by default · Your name is never shown</p>
            )}
          </div>
        </div>

        {/* Hint text bottom-right */}
        <p className="world-hint" aria-label="Tip">
          <span aria-hidden="true">✉</span> tap the letters floating in the river to read them
        </p>
      </div>

      <style>{`
        /* ── Root ── */
        .root {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0E1A0A;
        }

        /* ── UI layer sits above the world ── */
        .ui-layer {
          position: relative;
          z-index: 10;
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          pointer-events: none;
        }

        /* ── Quest panel — game UI frame ── */
        .quest-panel {
          position: relative;
          pointer-events: all;
          max-width: 420px;
          width: 100%;
          background: rgba(8, 12, 6, 0.78);
          border: 1px solid rgba(180, 155, 80, 0.5);
          border-radius: 3px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow:
            0 0 0 1px rgba(180, 155, 80, 0.15),
            0 0 40px rgba(0,0,0,0.6),
            inset 0 0 60px rgba(180, 155, 80, 0.04),
            inset 0 1px 0 rgba(255,240,180,0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Corner ornaments — game UI flourish */
        .corner {
          position: absolute;
          width: 12px; height: 12px;
          border-color: rgba(180,155,80,0.7);
          border-style: solid;
        }
        .corner.tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
        .corner.tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
        .corner.bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
        .corner.br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

        /* ── Logo ── */
        .panel-logo {
          display: flex;
          justify-content: center;
        }

        /* ── Decorative rule ── */
        .panel-rule {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          opacity: 0.45;
        }
        .panel-rule::before,
        .panel-rule::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(180,155,80,0.8), transparent);
        }
        .rule-gem {
          font-size: 0.5rem;
          color: rgba(180,155,80,0.9);
          flex-shrink: 0;
        }

        /* ── Headline ── */
        .panel-headline {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: center;
        }
        .panel-eyebrow {
          font-family: var(--font-body);
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(180,155,80,0.7);
          margin: 0;
        }
        .panel-title {
          font-family: var(--font-display);
          font-size: clamp(1.45rem, 3.5vw, 1.85rem);
          font-weight: 400;
          line-height: 1.35;
          color: rgba(255,245,215,0.95);
          letter-spacing: -0.01em;
          margin: 0;
          text-shadow: 0 2px 20px rgba(180,155,80,0.2);
        }

        /* ── Quest options ── */
        .panel-quest {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .quest-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display);
          font-size: 0.82rem;
          font-style: italic;
          color: rgba(200,185,140,0.8);
          margin: 0;
        }
        .quest-diamond {
          font-size: 0.55rem;
          color: rgba(180,155,80,0.7);
          flex-shrink: 0;
        }

        .quest-options {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .quest-choice {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 0.75rem;
          border: 1px solid transparent;
          border-radius: 2px;
          font-family: var(--font-body);
          font-size: 0.84rem;
          color: rgba(220,205,165,0.85);
          text-decoration: none;
          transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.15s;
          position: relative;
          letter-spacing: 0.01em;
        }
        .quest-choice:hover {
          background: rgba(180,155,80,0.10);
          border-color: rgba(180,155,80,0.35);
          color: rgba(255,240,190,1);
          transform: translateX(4px);
        }
        .choice-arrow {
          font-size: 0.5rem;
          color: rgba(180,155,80,0.5);
          transition: color 0.18s, transform 0.18s;
          flex-shrink: 0;
        }
        .quest-choice:hover .choice-arrow {
          color: rgba(180,155,80,0.9);
          transform: translateX(2px);
        }

        /* ── Footer ── */
        .panel-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .foot-link {
          font-family: var(--font-body);
          font-size: 0.72rem;
          color: rgba(160,145,100,0.7);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }
        .foot-link:hover { color: rgba(200,185,140,0.95); }
        .foot-sep {
          color: rgba(180,155,80,0.3);
          font-size: 0.7rem;
        }
        .foot-anon {
          font-family: var(--font-body);
          font-size: 0.65rem;
          color: rgba(160,145,100,0.55);
          text-align: center;
          letter-spacing: 0.06em;
          margin: 0;
        }

        /* ── World hint ── */
        .world-hint {
          position: fixed;
          bottom: 1.5rem;
          right: 1.75rem;
          font-family: var(--font-body);
          font-size: 0.65rem;
          color: rgba(180,155,80,0.5);
          letter-spacing: 0.05em;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          animation: hint-fade 1s ease 2s both;
        }
        @keyframes hint-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Panel entrance ── */
        .quest-panel {
          animation: panel-enter 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes panel-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .ui-layer { padding: 1rem; align-items: flex-end; padding-bottom: 3rem; }
          .quest-panel { padding: 1.75rem 1.4rem; }
          .world-hint { display: none; }
        }
      `}</style>
    </main>
  )
}