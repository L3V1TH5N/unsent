import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { findMatches, getOrCreateMatch } from '@/services/match.service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Get existing accepted matches with messages
  const existingMatches = await prisma.match.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { receiverId: userId },
      ],
      status: 'ACCEPTED',
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Find new potential matches
  const suggestions = await findMatches(userId)

  return NextResponse.json({ existingMatches, suggestions })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { receiverId, similarity } = await req.json()

  const match = await getOrCreateMatch(
    session.user.id,
    receiverId,
    similarity
  )

  // Auto-accept for now — can add approval flow later
  await prisma.match.update({
    where: { id: match.id },
    data: { status: 'ACCEPTED' },
  })

  return NextResponse.json({ match })
}