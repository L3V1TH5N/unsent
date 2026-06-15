// src/app/garden/page.tsx  —  Server Component (no 'use client')
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import GardenClient from './GardenClient'  // the file above

export default async function GardenPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const [seeds, letterCount] = await Promise.all([
    prisma.seed.findMany({
      where: { userId: session.user.id },
      orderBy: [{ stage: 'desc' }, { lastActivity: 'desc' }],
    }),
    prisma.letter.count({
      where: { userId: session.user.id },
    }),
  ])

  return <GardenClient seeds={seeds} letterCount={letterCount} />
}