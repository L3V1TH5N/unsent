// src/components/globe/useGlobeEngine.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GlobeEngine } from './GlobeEngine'
import { ZOOM_BUTTON_STEP } from './constants'
import type { PublicLetter } from './types'

interface UseGlobeEngineOptions {
  letters: PublicLetter[]
  greenProgress: number
  onLetterClick: (letter: PublicLetter) => void
}

export function useGlobeEngine({ letters, greenProgress, onLetterClick }: UseGlobeEngineOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GlobeEngine | null>(null)
  const onLetterClickRef = useRef(onLetterClick)
  onLetterClickRef.current = onLetterClick

  const [ready, setReady] = useState(false)
  const [hovering, setHovering] = useState(false)

  // Mount once. Letters/greenProgress are pushed in via setters below so a
  // change in either never tears down and rebuilds the WebGL context.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new GlobeEngine({
      canvas,
      letters,
      greenProgress,
      onReady: () => setReady(true),
      onLetterClick: (l) => onLetterClickRef.current(l),
      onHoverChange: setHovering,
    })
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { engineRef.current?.setLetters(letters) }, [letters])
  useEffect(() => { engineRef.current?.setGreenProgress(greenProgress) }, [greenProgress])

  const zoomIn = useCallback(() => engineRef.current?.zoomBy(ZOOM_BUTTON_STEP), [])
  const zoomOut = useCallback(() => engineRef.current?.zoomBy(1 / ZOOM_BUTTON_STEP), [])

  return { canvasRef, ready, hovering, zoomIn, zoomOut }
}