import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ letterId: string }> }

const ALLOWED = new Set(['understand', 'felt', 'hope'])

// GET: /api/letters/[letterId]/reactions  -> counts per reaction type
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { letterId } = await params

  const rows = await prisma.reaction.findMany({
    where: { letterId },
    select: { type: true },
  })

  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1

  return NextResponse.json({ counts })
}

// POST: create a reaction (anonymous)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { letterId } = await params
  const body = await req.json()
  const { type } = body ?? {}

  if (typeof type !== 'string' || !ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
  }

  const letter = await prisma.letter.findUnique({ where: { id: letterId }, select: { id: true } })
  if (!letter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 })

  const reaction = await prisma.reaction.create({ data: { letterId, type } })
  return NextResponse.json({ reaction }, { status: 201 })
}
