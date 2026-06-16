// FILE: src/app/error.tsx
'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ErrorState'

export default function GlobalError({
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
      eyebrow="something went wrong"
      title="This page couldn't hold."
      message="Something didn't load the way it should have. You can try again, or head back to calmer ground."
      onRetry={reset}
      backHref="/river"
      backLabel="back to the river"
    />
  )
}