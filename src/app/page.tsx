import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

const carryingOptions = [
  { label: 'Something I lost', href: '/write?carrying=lost' },
  { label: 'Something hurting me', href: '/write?carrying=hurting' },
  { label: 'Something I miss', href: '/write?carrying=missing' },
  { label: 'Something I\'m healing from', href: '/write?carrying=healing' },
  { label: 'Something I never said', href: '/write?carrying=unsaid' },
]

export default async function LandingPage() {
  const session = await auth()

  return (
    <main className="landing">
      <div className="paper-drift" aria-hidden="true">
        <span className="paper-text">
          &ldquo;I hope you are happy,<br />
          even if I am no longer<br />
          part of your life.&rdquo;
        </span>
      </div>

      <div className="landing-content">
        <header className="landing-header">
          <p className="eyebrow">unsent</p>
          <h1 className="headline">
            Some words are too<br />
            heavy to carry alone.
          </h1>
          <p className="subline">
            Write what you never sent. Find someone who understands.
          </p>
        </header>

        <section className="carrying-section">
          <p className="carrying-question">What are you carrying today?</p>
          <div className="carrying-options">
            {carryingOptions.map((option) => (
              <Link
                key={option.href}
                href={session ? option.href : `/api/auth/signin`}
                className="carrying-pill"
              >
                {option.label}
              </Link>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          {session ? (
            <Link href="/river" className="footer-link">
              Read others&rsquo; letters &rarr;
            </Link>
          ) : (
            <p className="footer-note">
              Anonymous by default. Your name is never shown.
            </p>
          )}
        </footer>
      </div>

      <style>{`
        .landing {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 2rem;
        }

        /* Drifting paper fragment */
        .paper-drift {
          position: absolute;
          top: 8%;
          right: 5%;
          width: 200px;
          padding: 1.5rem;
          background: white;
          border: 1px solid var(--mist);
          border-radius: 2px;
          box-shadow: 2px 3px 12px rgba(44, 36, 22, 0.06);
          transform: rotate(3deg);
          animation: drift 8s ease-in-out infinite;
          pointer-events: none;
        }

        .paper-text {
          font-family: var(--font-display);
          font-size: 0.8rem;
          line-height: 1.7;
          color: var(--ink-light);
          font-style: italic;
        }

        @keyframes drift {
          0%, 100% { transform: rotate(3deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(-10px); }
        }

        /* Main content */
        .landing-content {
          max-width: 520px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 3.5rem;
          position: relative;
          z-index: 1;
        }

        .landing-header {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .eyebrow {
          font-family: var(--font-body);
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
          font-weight: 500;
        }

        .headline {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 400;
          line-height: 1.25;
          color: var(--ink);
          letter-spacing: -0.01em;
        }

        .subline {
          font-family: var(--font-body);
          font-size: 1rem;
          color: var(--ink-light);
          line-height: 1.6;
          max-width: 380px;
        }

        /* Carrying section */
        .carrying-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .carrying-question {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-style: italic;
          color: var(--ink-light);
        }

        .carrying-options {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .carrying-pill {
          display: inline-block;
          padding: 0.75rem 1.25rem;
          border: 1px solid var(--mist);
          border-radius: 100px;
          background: white;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ink);
          text-decoration: none;
          width: fit-content;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
        }

        .carrying-pill:hover {
          border-color: var(--rose);
          background: #FDF8F6;
          transform: translateX(4px);
        }

        /* Footer */
        .landing-footer {
          padding-top: 0.5rem;
          border-top: 1px solid var(--mist);
        }

        .footer-link {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--sage);
          text-decoration: none;
        }

        .footer-link:hover {
          text-decoration: underline;
        }

        .footer-note {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          opacity: 0.7;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .paper-drift {
            display: none;
          }

          .landing-content {
            gap: 2.5rem;
          }
        }
      `}</style>
    </main>
  )
}