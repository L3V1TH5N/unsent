// FILE: src/app/garden/error.tsx
'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ErrorState'

export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorState
      eyebrow="the garden"
      title="Your garden couldn't grow right now."
      message="There was a problem loading your seeds and progress. Your letters are safe — try again in a moment."
      onRetry={reset}
      backHref="/river"
      backLabel="back to the river"
    />
  )
}