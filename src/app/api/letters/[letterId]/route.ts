import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ letterId: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { letterId } = await params

  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: {
      id: true,
      content: true,
      recipientType: true,
      emotion: true,
      intensity: true,
      category: true,
      status: true,
      createdAt: true,
    },
  })

  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ letter })
}
