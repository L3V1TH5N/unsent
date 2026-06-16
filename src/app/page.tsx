import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LandingScene from '@/components/LandingScene'

const carryingOptions = [
  { label: 'Something I lost',            href: '/write?carrying=lost'    },
  { label: 'Something hurting me',        href: '/write?carrying=hurting' },
  { label: 'Something I miss',            href: '/write?carrying=missing' },
  { label: "Something I'm healing from",  href: '/write?carrying=healing' },
  { label: 'Something I never said',      href: '/write?carrying=unsaid'  },
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
      {/* Deep space background */}
      <div className="space-bg" aria-hidden="true"/>

      {/* 3D Globe + floating letters */}
      <LandingScene letters={serialized} />

      {/* UI panel — left side, dark glass */}
      <div className="ui-shell">
        <aside className="panel">
          {/* Corner ornaments */}
          <div className="co tl"/><div className="co tr"/>
          <div className="co bl"/><div className="co br"/>

          <div className="panel-logo">
            <Image
              src="/img/Unsent-Logo.png"
              alt="Unsent"
              width={100}
              height={32}
              priority
              style={{ objectFit:'contain', objectPosition:'left', filter:'brightness(0) invert(1)', opacity: 0.88 }}
            />
          </div>

          <div className="panel-rule"><span className="rule-gem">◆</span></div>

          <div className="panel-copy">
            <p className="copy-eyebrow">a place for words you never sent</p>
            <h1 className="copy-headline">
              Some words are too<br/>heavy to carry alone.
            </h1>
          </div>

          <div className="panel-rule"><span className="rule-gem">◆</span></div>

          <div className="panel-quest">
            <p className="quest-q">
              <span className="quest-icon" aria-hidden="true">◇</span>
              What are you carrying today?
            </p>
            <nav className="quest-list" aria-label="Choose your journey">
              {carryingOptions.map(opt => (
                <Link
                  key={opt.href}
                  href={session ? opt.href : '/api/auth/signin'}
                  className="quest-item"
                >
                  <span className="qi-arrow" aria-hidden="true">▶</span>
                  {opt.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="panel-rule"><span className="rule-gem">◆</span></div>

          <nav className="panel-nav" aria-label="Site sections">
            <Link href="/river"   className="pnav-link">The River</Link>
            <span className="pnav-dot" aria-hidden="true">·</span>
            <Link href="/garden"  className="pnav-link">My Garden</Link>
            <span className="pnav-dot" aria-hidden="true">·</span>
            <Link href="/matches" className="pnav-link">Matches</Link>
          </nav>

          {!session && (
            <p className="panel-anon">◈ Anonymous by default</p>
          )}
        </aside>
      </div>

      {/* World hint */}
      <p className="world-hint" aria-label="Tip">
        <span aria-hidden="true">✦</span>
        Drag the globe · Click glowing letters to read them
      </p>

      <style>{`
        /* ── Root ── */
        .root {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          background: #000;
        }

        /* Deep space */
        .space-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 70% 50%, #0a1628 0%, #000510 50%, #000 100%);
          z-index: 0;
        }

        /* ── UI shell: left 40% of screen ── */
        .ui-shell {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          padding: 2rem 2rem 2rem 4vw;
          min-height: 100vh;
          width: 42%;
          flex-shrink: 0;
          pointer-events: none;
        }

        /* ── Panel ── */
        .panel {
          position: relative;
          pointer-events: all;
          width: 100%;
          max-width: 380px;
          background: rgba(4, 8, 4, 0.82);
          border: 1px solid rgba(140, 180, 100, 0.30);
          border-radius: 4px;
          padding: 2rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow:
            0 0 0 1px rgba(140,180,100,0.10),
            0 0 60px rgba(0,0,0,0.7),
            inset 0 0 80px rgba(80,140,60,0.03),
            inset 0 1px 0 rgba(180,220,140,0.07);
          animation: panel-rise 0.8s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes panel-rise {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: none; }
        }

        /* Corner ornaments */
        .co {
          position: absolute;
          width: 11px; height: 11px;
          border-color: rgba(140,180,100,0.55);
          border-style: solid;
        }
        .co.tl { top:-1px;    left:-1px;  border-width: 2px 0 0 2px; }
        .co.tr { top:-1px;    right:-1px; border-width: 2px 2px 0 0; }
        .co.bl { bottom:-1px; left:-1px;  border-width: 0 0 2px 2px; }
        .co.br { bottom:-1px; right:-1px; border-width: 0 2px 2px 0; }

        .panel-logo { display: flex; align-items: center; }

        /* Rule */
        .panel-rule {
          display: flex; align-items: center; gap: 0.65rem; opacity: 0.38;
        }
        .panel-rule::before, .panel-rule::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgba(140,180,100,0.8), transparent);
        }
        .rule-gem { font-size: 0.45rem; color: rgba(140,180,100,0.9); flex-shrink: 0; }

        /* Copy */
        .panel-copy { display: flex; flex-direction: column; gap: 0.65rem; }
        .copy-eyebrow {
          font-family: var(--font-body);
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(140,180,100,0.65);
          margin: 0;
        }
        .copy-headline {
          font-family: var(--font-display);
          font-size: clamp(1.35rem, 2.8vw, 1.75rem);
          font-weight: 400;
          line-height: 1.38;
          color: rgba(240,232,210,0.95);
          letter-spacing: -0.01em;
          margin: 0;
          text-shadow: 0 2px 24px rgba(100,160,80,0.15);
        }

        /* Quest */
        .panel-quest { display: flex; flex-direction: column; gap: 0.75rem; }
        .quest-q {
          display: flex; align-items: center; gap: 0.45rem;
          font-family: var(--font-display);
          font-size: 0.8rem; font-style: italic;
          color: rgba(190,175,130,0.75);
          margin: 0;
        }
        .quest-icon { font-size: 0.5rem; color: rgba(140,180,100,0.65); flex-shrink: 0; }

        .quest-list { display: flex; flex-direction: column; gap: 0.22rem; }
        .quest-item {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.52rem 0.65rem;
          border: 1px solid transparent;
          border-radius: 2px;
          font-family: var(--font-body);
          font-size: 0.82rem;
          color: rgba(210,198,160,0.82);
          text-decoration: none;
          transition: background 0.16s, border-color 0.16s, color 0.16s, transform 0.14s;
          letter-spacing: 0.008em;
        }
        .quest-item:hover {
          background: rgba(100,160,60,0.10);
          border-color: rgba(120,170,80,0.30);
          color: rgba(240,228,180,1);
          transform: translateX(4px);
        }
        .qi-arrow {
          font-size: 0.46rem;
          color: rgba(120,170,80,0.45);
          transition: color 0.16s, transform 0.14s;
          flex-shrink: 0;
        }
        .quest-item:hover .qi-arrow {
          color: rgba(140,200,90,0.9);
          transform: translateX(3px);
        }

        /* Nav */
        .panel-nav {
          display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
        }
        .pnav-link {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: rgba(140,170,110,0.65);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.14s;
        }
        .pnav-link:hover { color: rgba(180,220,140,0.9); }
        .pnav-dot { color: rgba(140,180,100,0.25); font-size: 0.7rem; }

        .panel-anon {
          font-family: var(--font-body);
          font-size: 0.62rem;
          color: rgba(140,160,110,0.45);
          letter-spacing: 0.07em;
          margin: 0;
        }

        /* World hint */
        .world-hint {
          position: fixed;
          bottom: 1.5rem;
          right: 1.75rem;
          font-family: var(--font-body);
          font-size: 0.62rem;
          color: rgba(140,180,100,0.45);
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          z-index: 10;
          pointer-events: none;
          animation: hint-in 1s ease 1.5s both;
        }
        @keyframes hint-in { 
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .ui-shell {
            width: 100%;
            align-items: flex-end;
            padding: 1rem 1rem 2.5rem;
          }
          .panel { max-width: 100%; padding: 1.6rem 1.25rem; }
          .world-hint { display: none; }
        }
      `}</style>
    </main>
  )
}