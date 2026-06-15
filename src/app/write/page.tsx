'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const recipients = [
  { value: 'someone_loved', label: 'Someone I loved' },
  { value: 'someone_lost', label: 'Someone I lost' },
  { value: 'past_self', label: 'My past self' },
  { value: 'someone_hurt', label: 'Someone I hurt' },
  { value: 'someone_forgive', label: 'Someone I forgive' },
  { value: 'myself', label: 'Myself' },
]

const carryingToRecipient: Record<string, string> = {
  lost: 'someone_lost',
  hurting: 'someone_loved',
  missing: 'someone_loved',
  healing: 'past_self',
  unsaid: 'someone_loved',
}

export default function WritePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const carrying = searchParams.get('carrying') || ''

  const [recipient, setRecipient] = useState(
    carryingToRecipient[carrying] || 'someone_loved'
  )
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    setWordCount(content.trim() === '' ? 0 : words)
  }, [content])

  async function handleSend() {
    if (content.trim().length < 10) return
    setSending(true)

    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, recipientType: recipient, isPublic }),
      })

      if (res.ok) {
        setSent(true)
        setTimeout(() => router.push('/river'), 2000)
      }
    } catch (e) {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="sent-screen">
        <div className="sent-content">
          <div className="sent-icon">✦</div>
          <h2 className="sent-title">Your words have been released.</h2>
          <p className="sent-sub">Taking you to the river&hellip;</p>
        </div>
        <style>{sentStyles}</style>
      </div>
    )
  }

  return (
    <main className="write-page">
      <nav className="write-nav">
        <Link href="/" className="nav-back">← unsent</Link>
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span className="toggle-label">
            {isPublic ? 'Shared anonymously' : 'Private'}
          </span>
        </label>
      </nav>

      <div className="write-container">
        <div className="letter-paper">
          <div className="recipient-row">
            <span className="to-label">To</span>
            <div className="recipient-pills">
              {recipients.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRecipient(r.value)}
                  className={`recipient-pill ${recipient === r.value ? 'active' : ''}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <textarea
            className="letter-textarea"
            placeholder="Write what you never got to say..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />

          <div className="letter-footer">
            <span className="word-count">
              {wordCount > 0 ? `${wordCount} words` : ''}
            </span>
            <button
              className="send-button"
              onClick={handleSend}
              disabled={content.trim().length < 10 || sending}
            >
              {sending ? 'Releasing...' : 'Release this letter'}
            </button>
          </div>
        </div>
      </div>

      <style>{pageStyles}</style>
    </main>
  )
}

const pageStyles = `
  .write-page {
    min-height: 100vh;
    background: var(--parchment);
    display: flex;
    flex-direction: column;
  }

  .write-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 2rem;
    border-bottom: 1px solid var(--mist);
  }

  .nav-back {
    font-family: var(--font-body);
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-light);
    text-decoration: none;
    transition: color 0.15s;
  }

  .nav-back:hover { color: var(--ink); }

  .privacy-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .privacy-toggle input {
    width: 14px;
    height: 14px;
    accent-color: var(--sage);
    cursor: pointer;
  }

  .toggle-label {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--ink-light);
  }

  .write-container {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 3rem 2rem;
  }

  .letter-paper {
    width: 100%;
    max-width: 640px;
    background: white;
    border: 1px solid var(--mist);
    border-radius: 2px;
    box-shadow: 0 2px 24px rgba(44, 36, 22, 0.05);
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 520px;
  }

  .recipient-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .to-label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-style: italic;
    color: var(--ink-light);
    padding-top: 0.35rem;
    flex-shrink: 0;
  }

  .recipient-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .recipient-pill {
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--mist);
    border-radius: 100px;
    background: transparent;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--ink-light);
    cursor: pointer;
    transition: all 0.15s;
  }

  .recipient-pill:hover {
    border-color: var(--rose);
    color: var(--ink);
  }

  .recipient-pill.active {
    background: var(--rose);
    border-color: var(--rose);
    color: white;
  }

  .divider {
    height: 1px;
    background: var(--mist);
  }

  .letter-textarea {
    flex: 1;
    width: 100%;
    min-height: 300px;
    border: none;
    outline: none;
    resize: none;
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.85;
    color: var(--ink);
    background: transparent;
    caret-color: var(--rose);
  }

  .letter-textarea::placeholder {
    color: var(--ink-light);
    opacity: 0.4;
    font-style: italic;
  }

  .letter-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    border-top: 1px solid var(--mist);
  }

  .word-count {
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--ink-light);
    opacity: 0.5;
  }

  .send-button {
    padding: 0.65rem 1.5rem;
    background: var(--ink);
    color: var(--parchment);
    border: none;
    border-radius: 100px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
  }

  .send-button:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  .send-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .write-container { padding: 1.5rem 1rem; }
    .letter-paper { padding: 1.5rem; }
  }
`

const sentStyles = `
  .sent-screen {
    min-height: 100vh;
    background: var(--parchment);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sent-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: fadeUp 0.6s ease forwards;
  }

  .sent-icon {
    font-size: 2rem;
    color: var(--rose);
    animation: pulse 2s ease infinite;
  }

  .sent-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
  }

  .sent-sub {
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--ink-light);
    opacity: 0.6;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`