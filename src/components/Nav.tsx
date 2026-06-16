// FILE: src/components/Nav.tsx
'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const { status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`)

  const close = () => setOpen(false)

  return (
    <nav className="site-nav">
      <Link href="/" className="nav-logo" onClick={close}>
        <img src="/img/Unsent-Logo.png" alt="Unsent" className="nav-logo-img" />
      </Link>

      <button
        className="nav-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-actions ${open ? 'open' : ''}`}>
        <Link
          href="/river"
          className={`nav-link ${isActive('/river') ? 'active' : ''}`}
          onClick={close}
        >
          the river
        </Link>

        {status === 'authenticated' && (
          <>
            <Link
              href="/garden"
              className={`nav-link ${isActive('/garden') ? 'active' : ''}`}
              onClick={close}
            >
              my garden
            </Link>
            <Link
              href="/matches"
              className={`nav-link ${isActive('/matches') ? 'active' : ''}`}
              onClick={close}
            >
              matches
            </Link>
            <Link
              href="/profile"
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={close}
            >
              profile
            </Link>
          </>
        )}

        <Link href="/write" className="nav-write" onClick={close}>
          write a letter
        </Link>
      </div>

      <style>{`
        .site-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 2rem;
          border-bottom: 1px solid var(--mist);
          position: sticky;
          top: 0;
          background: var(--parchment);
          z-index: 50;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          line-height: 0;
        }

        .nav-logo-img {
          height: 26px;
          width: auto;
          display: block;
        }

        .nav-toggle {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          width: 28px;
          height: 28px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .nav-toggle span {
          display: block;
          width: 20px;
          height: 1.5px;
          background: var(--ink);
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
          transition: color 0.15s;
          position: relative;
          padding-bottom: 0.2rem;
        }

        .nav-link:hover {
          color: var(--ink);
        }

        .nav-link.active {
          color: var(--ink);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -4px;
          height: 1px;
          background: var(--rose);
        }

        .nav-write {
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--ink-light);
          text-decoration: none;
          padding: 0.4rem 1rem;
          border: 1px solid var(--mist);
          border-radius: 100px;
          background: white;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }

        .nav-write:hover {
          color: var(--ink);
          border-color: #D4C9BC;
        }

        @media (max-width: 640px) {
          .site-nav {
            padding: 1rem;
          }

          .nav-toggle {
            display: flex;
          }

          .nav-actions {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1rem 1.25rem 1.5rem;
            background: var(--parchment);
            border-bottom: 1px solid var(--mist);
          }

          .nav-actions.open {
            display: flex;
          }

          .nav-link {
            padding: 0.25rem 0;
          }

          .nav-link.active::after {
            bottom: 0;
          }

          .nav-write {
            text-align: center;
          }
        }
      `}</style>
    </nav>
  )
}