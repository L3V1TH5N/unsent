import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { enqueueAnalysis } from '@/lib/queue'
import { analyzeLetter } from '@/services/emotion.service'
import { updateGardenForLetter } from '@/services/garden.service'
import type { EmotionResult } from '@/services/emotion.service'

// ─── POST /api/letters ────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { content, recipientType, isPublic } = body

  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return NextResponse.json({ error: 'Letter is too short.' }, { status: 400 })
  }

  if (!recipientType || typeof recipientType !== 'string') {
    return NextResponse.json({ error: 'Recipient type is required.' }, { status: 400 })
  }

  // Save the letter immediately — never block on AI
  const letter = await prisma.letter.create({
    data: {
      userId: session.user.id,
      content: content.trim(),
      recipientType,
      isPublic: isPublic ?? true,
      status: 'PENDING',
    },
  })

  // Enqueue analysis job (fast)
  void enqueueAnalysis(letter.id)

  return NextResponse.json({ letter }, { status: 201 })
}

// ─── GET /api/letters ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const emotion = searchParams.get('emotion')
  const cursor  = searchParams.get('cursor')
  const take    = 20

  const letters = await prisma.letter.findMany({
    where: {
      isPublic: true,
      ...(emotion ? { emotion } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id:            true,
      content:       true,
      recipientType: true,
      emotion:       true,
      intensity:     true,
      createdAt:     true,
    },
  })

  const nextCursor = letters.length === take ? letters[letters.length - 1].id : null

  return NextResponse.json({ letters, nextCursor })
}

// ─── Background processing ────────────────────────────────────────────────
async function analyzeAndUpdateGarden(
  userId: string,
  letterId: string,
  content: string
) {
  let emotion: EmotionResult

  try {
    emotion = await analyzeLetter(content)
  } catch (err) {
    console.error('[emotion analysis failed]', err)
    // Fallback: a generic theme so the garden still gets a seed,
    // but we DON'T pollute it with a single hardcoded "Unspoken Words" blob.
    // Instead, derive a theme from the recipientType stored on the letter.
    const letter = await prisma.letter.findUnique({
      where: { id: letterId },
      select: { recipientType: true },
    })
    emotion = fallbackEmotion(letter?.recipientType ?? 'myself')
  }

  try {
    // Update letter with emotion data
    await prisma.letter.update({
      where: { id: letterId },
      data: {
        emotion:   emotion.emotion,
        intensity: emotion.intensity,
        category:  emotion.category,
      },
    })

    // Update garden
    await updateGardenForLetter(userId, letterId, emotion)
  } catch (err) {
    console.error('[garden update failed]', err)
  }
}

// Maps recipientType → a meaningful fallback theme instead of always "Unspoken Words"
function fallbackEmotion(recipientType: string): EmotionResult {
  const map: Record<string, Pick<EmotionResult, 'emotion' | 'seedTheme' | 'category' | 'tags'>> = {
    'someone_loved':   { emotion: 'longing',     seedTheme: 'Someone I Loved',     category: 'past_relationship', tags: ['love', 'distance'] },
    'someone_lost':    { emotion: 'sadness',     seedTheme: 'Losing Someone',      category: 'grief',             tags: ['grief', 'loss'] },
    'past_self':       { emotion: 'regret',      seedTheme: 'Letter to Myself',    category: 'self_reflection',   tags: ['past', 'self'] },
    'someone_hurt':    { emotion: 'regret',      seedTheme: 'Asking Forgiveness',  category: 'self_reflection',   tags: ['guilt', 'sorry'] },
    'someone_forgive': { emotion: 'forgiveness', seedTheme: 'Forgiving Someone',   category: 'healing',           tags: ['forgiveness', 'peace'] },
    'myself':          { emotion: 'healing',     seedTheme: 'Healing With Myself', category: 'self_reflection',   tags: ['self', 'healing'] },
  }

  const key = recipientType.toLowerCase()
  const match = map[key] ?? {
    emotion: 'longing' as const,
    seedTheme: 'Unspoken Words',
    category: 'self_reflection' as const,
    tags: ['unsent', 'words'],
  }

  return { ...match, intensity: 0.5 }
}