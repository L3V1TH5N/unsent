// src/components/globe/LetterModal.tsx
'use client'

import type { CSSProperties } from 'react'
import type { PublicLetter } from './types'
import { EMOTION_COLORS, RECIPIENT_LABELS } from './constants'
import { timeAgo } from './utils'

interface Props {
  letter: PublicLetter
  visible: boolean
  onClose: () => void
}

export default function LetterModal({ letter, visible, onClose }: Props) {
  const c = EMOTION_COLORS[letter.emotion ?? '']
  const acc = c ? `rgb(${c[0]},${c[1]},${c[2]})` : '#C4897A'

  return (
    <div className={`mb ${visible ? 'mbv' : ''}`} onClick={onClose} role="dialog" aria-modal="true">
      <div className="mc" onClick={e => e.stopPropagation()} style={{ '--a': acc } as CSSProperties}>
        <div className="mt">
          <span className="mr">{RECIPIENT_LABELS[letter.recipientType] ?? 'to someone'}</span>
          {letter.emotion && (
            <span className="me" style={{ color: acc, borderColor: `${acc}55` }}>{letter.emotion}</span>
          )}
          <span className="mtime">{timeAgo(letter.createdAt)}</span>
          <button type="button" className="mx" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mp">
          <div className="mml" style={{ borderColor: `${acc}50` }} />
          <p className="mtxt">{letter.content}</p>
        </div>
        <div className="mf">
          <span className="man">— anonymous</span>
          <a href="/write" className="mca" style={{ background: acc }}>write your own</a>
        </div>
      </div>

      <style>{`
        .mb{position:fixed;inset:0;z-index:200;background:rgba(2,6,2,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1.5rem;opacity:0;transition:opacity .25s;}
        .mbv{opacity:1;}
        .mc{background:#FAF6EE;border:1px solid #D8CCB4;border-radius:3px;max-width:540px;width:100%;max-height:82vh;overflow-y:auto;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.5);animation:crise .3s cubic-bezier(.34,1.56,.64,1) forwards;}
        @keyframes crise{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}
        .mt{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:1.1rem 1.4rem .9rem;border-bottom:1px solid #EAE0D0;}
        .mr{font-family:Georgia,serif;font-size:.8rem;font-style:italic;color:#6B5E4E;}
        .me{font-size:.68rem;padding:.18rem .55rem;border-radius:100px;border:1px solid;font-family:system-ui,sans-serif;letter-spacing:.04em;}
        .mtime{font-size:.66rem;color:#9A8878;font-family:system-ui,sans-serif;margin-left:auto;}
        .mx{background:none;border:none;cursor:pointer;font-size:.82rem;color:#9A8878;padding:2px 4px;border-radius:4px;transition:color .15s,background .15s;}
        .mx:hover{color:#2C2416;background:#EDE4D4;}
        .mp{position:relative;padding:1.75rem 1.75rem 1.25rem 2.75rem;min-height:160px;}
        .mml{position:absolute;top:0;bottom:0;left:2rem;width:1px;border-left:1.5px solid;opacity:.5;}
        .mtxt{font-family:Georgia,serif;font-size:1.02rem;line-height:1.88;color:#2C2416;white-space:pre-wrap;}
        .mf{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.4rem 1.1rem;border-top:1px solid #EAE0D0;}
        .man{font-family:Georgia,serif;font-size:.78rem;font-style:italic;color:#9A8878;}
        .mca{font-family:system-ui,sans-serif;font-size:.78rem;color:white;text-decoration:none;padding:.42rem .95rem;border-radius:100px;transition:opacity .15s;}
        .mca:hover{opacity:.85;}
      `}</style>
    </div>
  )
}