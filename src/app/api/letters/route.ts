import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { analyzeLetter } from '@/services/emotion.service'
import { updateGardenForLetter } from '@/services/garden.service'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content, recipientType, isPublic } = await req.json()

  if (!content || content.trim().length < 10) {
    return NextResponse.json({ error: 'Letter too short' }, { status: 400 })
  }

  // Save letter immediately — don't block on AI
  const letter = await prisma.letter.create({
    data: {
      userId: session.user.id,
      content: content.trim(),
      recipientType,
      isPublic: isPublic ?? true,
    },
  })

  // Run emotion analysis async — user doesn't wait for this
  analyzeAndUpdateGarden(session.user.id, letter.id, content.trim())

  return NextResponse.json({ letter }, { status: 201 })
}

async function analyzeAndUpdateGarden(
  userId: string,
  letterId: string,
  content: string
) {
  try {
    const emotion = await analyzeLetter(content)

    await prisma.letter.update({
      where: { id: letterId },
      data: {
        emotion: emotion.emotion,
        intensity: emotion.intensity,
        category: emotion.category,
      },
    })

    await updateGardenForLetter(userId, letterId, emotion)
  } catch (err) {
    console.error('[emotion analysis failed]', err)

    // Fallback — create a seed with default values so garden still works
    await updateGardenForLetter(userId, letterId, {
      emotion: 'longing',
      intensity: 0.5,
      category: 'self_reflection',
      seedTheme: 'Unspoken Words',
    })
  }
}

export async function GET() {
  const letters = await prisma.letter.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      content: true,
      recipientType: true,
      emotion: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ letters })
}