// src/app/api/matches/[matchId]/messages/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type RouteContext = { params: Promise<{ matchId: string }> }

// ─── Helper: verify participant ───────────────────────────────────────────
async function verifyParticipant(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { requesterId: true, receiverId: true, status: true },
  })
  if (!match) return null
  const isParticipant =
    match.requesterId === userId || match.receiverId === userId
  return isParticipant ? match : null
}

// ─── GET /api/matches/[matchId]/messages ──────────────────────────────────
// Used for polling — returns all messages after an optional `after` cursor
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params
  const match = await verifyParticipant(matchId, session.user.id)
  if (!match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const after = searchParams.get('after') // message id cursor

  const messages = await prisma.message.findMany({
    where: {
      matchId,
      ...(after
        ? { createdAt: { gt: await getMessageDate(after) } }
        : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: { select: { id: true } },
    },
  })

  return NextResponse.json({
    messages: messages.map(m => ({
      id: m.id,
      content: m.content,
      senderId: m.sender.id,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}

async function getMessageDate(messageId: string): Promise<Date> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { createdAt: true },
  })
  return msg?.createdAt ?? new Date(0)
}

// ─── POST /api/matches/[matchId]/messages ─────────────────────────────────
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params
  const match = await verifyParticipant(matchId, session.user.id)
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Match not accepted' }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  }

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: session.user.id,
      content: content.trim(),
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: { select: { id: true } },
    },
  })

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      createdAt: message.createdAt.toISOString(),
    },
  })
}