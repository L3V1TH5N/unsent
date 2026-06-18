// src/components/globe/MessageListFallback.tsx
'use client'

import { EMOTION_COLORS } from './constants'
import { timeAgo } from './utils'
import type { PublicLetter } from './types'

interface Props {
  letters: PublicLetter[]
  onOpen: (letter: PublicLetter) => void
}

// Capped independently of the globe: this is a real DOM list, so it stays
// short and scannable, while the globe itself still renders/picks every
// letter with no such cap.
const LIST_CAP = 30

export default function MessageListFallback({ letters, onOpen }: Props) {
  const readable = letters.filter(l => l.content).slice(0, LIST_CAP)
  if (!readable.length) return null

  return (
    <div className="mlf" aria-label="Recent unsent messages">
      <p className="mlf-h"><span aria-hidden="true">✦</span> recent messages</p>
      <div className="mlf-list">
        {readable.map(l => {
          const c = EMOTION_COLORS[l.emotion ?? ''] ?? [196, 137, 122]
          return (
            <button type="button" key={l.id} className="mlf-item" onClick={() => onOpen(l)}>
              <span className="mlf-dot" style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }} />
              <span className="mlf-em">{l.emotion ?? 'unsent'}</span>
              <span className="mlf-t">{timeAgo(l.createdAt)}</span>
            </button>
          )
        })}
      </div>

      <style>{`
        .mlf{
          position:fixed; top:0.9rem; left:0.9rem; right:0.9rem; z-index:6;
          border-radius:4px; background:rgba(4,8,4,.78); border:1px solid rgba(140,180,100,.28);
          backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
          max-height:34vh; display:flex; flex-direction:column; overflow:hidden;
        }
        .mlf-h{
          font-family:var(--font-body); font-size:.62rem; letter-spacing:.1em; text-transform:uppercase;
          color:rgba(140,180,100,.7); padding:.7rem .9rem .4rem; display:flex; gap:.4rem; align-items:center;
        }
        .mlf-list{ overflow-y:auto; display:flex; flex-direction:column; padding:0 .4rem .5rem; }
        .mlf-item{
          display:flex; align-items:center; gap:.5rem; width:100%; background:none; border:none;
          padding:.5rem .5rem; border-radius:3px; cursor:pointer; color:rgba(220,210,185,.85); text-align:left;
          transition:background .15s;
        }
        .mlf-item:hover{ background:rgba(120,170,80,.12); }
        .mlf-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .mlf-em{ font-family:var(--font-display); font-style:italic; font-size:.78rem; flex:1; }
        .mlf-t{ font-size:.62rem; color:rgba(160,170,140,.55); }

        /* Desktop has plenty of room to read letters straight off the
           globe, so this fallback is mobile-only. */
        @media(min-width:769px){ .mlf{ display:none; } }
      `}</style>
    </div>
  )
}