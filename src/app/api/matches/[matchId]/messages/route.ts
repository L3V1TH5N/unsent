import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
  })

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const isParticipant =
    match.requesterId === session.user.id ||
    match.receiverId === session.user.id

  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const message = await prisma.message.create({
    data: {
      matchId: params.matchId,
      senderId: session.user.id,
      content: content.trim(),
    },
    include: {
      sender: { select: { id: true } },
    },
  })

  return NextResponse.json({ message })
}
