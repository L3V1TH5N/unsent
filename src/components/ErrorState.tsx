// FILE: src/components/ErrorState.tsx
'use client'

import Link from 'next/link'

type ErrorStateProps = {
  eyebrow: string
  title: string
  message: string
  onRetry: () => void
  backHref: string
  backLabel: string
}

export default function ErrorState({
  eyebrow,
  title,
  message,
  onRetry,
  backHref,
  backLabel,
}: ErrorStateProps) {
  return (
    <main className="error-page">
      <div className="error-content">
        <p className="error-eyebrow">{eyebrow}</p>
        <h1 className="error-title">{title}</h1>
        <p className="error-sub">{message}</p>
        <div className="error-actions">
          <button onClick={onRetry} className="error-retry">
            Try again
          </button>
          <Link href={backHref} className="error-link">
            {backLabel}
          </Link>
        </div>
      </div>

      <style>{`
        .error-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--parchment);
          padding: 2rem;
        }

        .error-content {
          max-width: 480px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .error-eyebrow {
          font-family: var(--font-body);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose);
        }

        .error-title {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.3;
        }

        .error-sub {
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ink-light);
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .error-retry {
          padding: 0.65rem 1.5rem;
          background: var(--ink);
          color: var(--parchment);
          border: none;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .error-retry:hover {
          opacity: 0.8;
        }

        .error-link {
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: var(--ink-light);
          text-decoration: none;
        }

        .error-link:hover {
          color: var(--ink);
        }
      `}</style>
    </main>
  )
}