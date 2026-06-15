'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
}

interface Props {
  matchId: string
  currentUserId: string
  initialMessages: Message[]
}

export default function MessageThread({ matchId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content: input.trim(),
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')

    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })
      const data = await res.json()
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? {
          ...data.message,
          senderId: data.message.senderId,
          createdAt: data.message.createdAt,
        } : m)
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="thread-container">
      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="thread-empty">
            <p>This is the beginning of your conversation.</p>
            <p>Say something — they understand.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId
            return (
              <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'}`}>
                <p className="message-content">{msg.content}</p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="message-input-area">
        <div className="input-wrapper">
          <textarea
            className="message-input"
            placeholder="Write something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? '...' : '↑'}
          </button>
        </div>
        <p className="input-hint">Press Enter to send</p>
      </div>

      <style>{`
        .thread-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 640px;
          margin: 0 auto;
          width: 100%;
          padding: 0 2rem;
        }

        .messages-area {
          flex: 1;
          padding: 1rem 0 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 300px;
        }

        .thread-empty {
          text-align: center;
          padding: 3rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .thread-empty p {
          font-family: var(--font-display);
          font-size: 0.95rem;
          font-style: italic;
          color: var(--ink-light);
        }

        .message {
          max-width: 80%;
          padding: 0.75rem 1rem;
          border-radius: 2px;
        }

        .message.own {
          align-self: flex-end;
          background: var(--ink);
          color: var(--parchment);
        }

        .message.other {
          align-self: flex-start;
          background: white;
          border: 1px solid var(--mist);
          color: var(--ink);
        }

        .message-content {
          font-family: var(--font-body);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .message-input-area {
          padding: 1.5rem 0 2rem;
          border-top: 1px solid var(--mist);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-wrapper {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .message-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid var(--mist);
          border-radius: 2px;
          background: white;
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--ink);
          resize: none;
          outline: none;
          line-height: 1.5;
        }

        .message-input:focus {
          border-color: #D4C9BC;
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--ink);
          color: var(--parchment);
          border: none;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }

        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .input-hint {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--ink-light);
          opacity: 0.5;
        }

        @media (max-width: 640px) {
          .thread-container { padding: 0 1rem; }
        }
      `}</style>
    </div>
  )
}