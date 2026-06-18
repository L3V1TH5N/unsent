// src/components/LandingScene.tsx 
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useGlobeEngine } from './globe/useGlobeEngine'
import ZoomControls from './globe/ZoomControls'
import LetterModal from './globe/LetterModal'
import MessageListFallback from './globe/MessageListFallback'
import type { PublicLetter } from './globe/types'

interface Props {
  letters: PublicLetter[]
  /** 0 (barren world, no messages yet) → 1 (fully living world). */
  greenProgress?: number
}

// Shown only when there are zero real letters yet, so the globe still has
// a few glowing points to invite the first message. Empty content means
// they're not clickable.
const FALLBACK_LETTERS: PublicLetter[] = [
  { id: 'fallback-a', content: '', recipientType: 'myself',        emotion: 'healing', createdAt: new Date().toISOString() },
  { id: 'fallback-b', content: '', recipientType: 'someone_loved', emotion: 'longing',  createdAt: new Date().toISOString() },
  { id: 'fallback-c', content: '', recipientType: 'past_self',     emotion: 'hope',     createdAt: new Date().toISOString() },
]

export default function LandingScene({ letters, greenProgress = 0 }: Props) {
  const [openLetter, setOpenLetter] = useState<PublicLetter | null>(null)
  const [modalVis, setModalVis] = useState(false)

  const displayLetters = useMemo(
    () => (letters.length > 0 ? letters : FALLBACK_LETTERS),
    [letters]
  )

  const openModal = useCallback((l: PublicLetter) => {
    if (!l.content) return
    setOpenLetter(l)
    setModalVis(false)
    setTimeout(() => setModalVis(true), 20)
  }, [])
  const closeModal = useCallback(() => {
    setModalVis(false)
    setTimeout(() => setOpenLetter(null), 250)
  }, [])

  const { canvasRef, ready, zoomIn, zoomOut } = useGlobeEngine({
    letters: displayLetters,
    greenProgress,
    onLetterClick: openModal,
  })

  return (
    <>
      <canvas ref={canvasRef} className="gc" style={{ touchAction: 'none', cursor: 'grab' }} />

      {!ready && <div className="gload"><div className="gshim" /></div>}

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <MessageListFallback letters={letters} onOpen={openModal} />

      {openLetter && <LetterModal letter={openLetter} visible={modalVis} onClose={closeModal} />}

      <style>{`
        .gc{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;}
        .gload{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;pointer-events:none;}
        .gshim{width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#1a2a3a,#050a10);animation:gpulse 2s ease-in-out infinite;}
        @keyframes gpulse{0%,100%{opacity:.5;transform:scale(.97)}50%{opacity:.9;transform:scale(1)}}
        @media(prefers-reduced-motion:reduce){.gshim{animation:none!important;}}
      `}</style>
    </>
  )
}