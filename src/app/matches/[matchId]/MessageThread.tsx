'use client'
// src/app/matches/[matchId]/MessageThread.tsx

import { useState, useRef, useEffect, useCallback } from 'react'

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

const POLL_INTERVAL_MS = 5000

export default function MessageThread({
  matchId,
  currentUserId,
  initialMessages,
}: Props) {
  const [messages, setMessages]   = useState<Message[]>(initialMessages)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const lastIdRef                 = useRef<string | undefined>(
    initialMessages[initialMessages.length - 1]?.id
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Polling ──────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const afterParam = lastIdRef.current ? `?after=${lastIdRef.current}` : ''
      const res = await fetch(`/api/matches/${matchId}/messages${afterParam}`)
      if (!res.ok) return
      const data = await res.json()
      const newMsgs: Message[] = data.messages ?? []
      if (newMsgs.length === 0) return

      setMessages(prev => {
        // Merge: keep optimistic messages, append real new ones
        const existingIds = new Set(prev.map(m => m.id))
        const toAdd = newMsgs.filter(m => !existingIds.has(m.id))
        if (toAdd.length === 0) return prev
        return [...prev, ...toAdd]
      })

      lastIdRef.current = newMsgs[newMsgs.length - 1].id
    } catch {
      // Silent — don't break UI on poll failure
    }
  }, [matchId])

  useEffect(() => {
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [poll])

  // ── Send ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      content: text,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimistic])
    setInput('')

    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const real: Message = {
        id:        data.message.id,
        content:   data.message.content,
        senderId:  data.message.senderId,
        createdAt: data.message.createdAt,
      }

      setMessages(prev =>
        prev.map(m => (m.id === optimistic.id ? real : m))
      )
      lastIdRef.current = real.id
    } catch {
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text) // restore input
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '640px',
      margin: '0 auto',
      width: '100%',
      padding: '0 2rem',
    }}>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '1rem 0 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '300px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              color: '#9A9490',
              margin: 0,
            }}>
              This is the beginning of your conversation.
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              color: '#9A9490',
              margin: 0,
            }}>
              Say something — they understand.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId
            const isOptimistic = msg.id.startsWith('optimistic-')
            return (
              <div
                key={msg.id}
                style={{
                  maxWidth: '80%',
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  opacity: isOptimistic ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '4px',
                  background: isOwn ? 'var(--ink)' : 'white',
                  border: isOwn ? 'none' : '1px solid #EAE6E1',
                  color: isOwn ? 'var(--parchment)' : 'var(--ink)',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {msg.content}
                  </p>
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.65rem',
                  color: '#B5AFA8',
                  margin: '0.3rem 0 0',
                  textAlign: isOwn ? 'right' : 'left',
                }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '1.5rem 0 2rem',
        borderTop: '1px solid #EAE6E1',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            placeholder="Write something…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #EAE6E1',
              borderRadius: '4px',
              background: 'white',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--ink)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
            onFocus={(e) => { e.target.style.borderColor = '#D4CEC8' }}
            onBlur={(e)  => { e.target.style.borderColor = '#EAE6E1' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--ink)',
              color: 'var(--parchment)',
              border: 'none',
              fontSize: '1rem',
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: !input.trim() || sending ? 0.3 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            ↑
          </button>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.7rem',
          color: '#B5AFA8',
          margin: 0,
        }}>
          Press Enter to send · messages refresh every 5 seconds
        </p>
      </div>
    </div>
  )
}