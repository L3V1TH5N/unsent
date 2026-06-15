import { prisma } from '@/lib/prisma'

const EMOTIONS = [
  'love', 'longing', 'regret', 'sadness',
  'anger', 'forgiveness', 'acceptance', 'healing', 'hope',
] as const

type Emotion = typeof EMOTIONS[number]

type EmotionVector = number[] // length = EMOTIONS.length

// ─── Vector helpers ───────────────────────────────────────────────────────

function emptyVector(): EmotionVector {
  return new Array(EMOTIONS.length).fill(0)
}

function normalise(v: EmotionVector): EmotionVector {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return mag === 0 ? v : v.map(x => x / mag)
}

function cosineSimilarity(a: EmotionVector, b: EmotionVector): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  return Math.max(0, Math.min(1, dot))
}

// Which emotions are dominant (> 15% of the normalised vector)?
function dominantEmotions(v: EmotionVector): Emotion[] {
  return EMOTIONS.filter((_, i) => v[i] > 0.15)
}

// ─── Batch vector builder — ONE query for all users ───────────────────────
// Returns a map of userId → normalised emotion vector.
async function buildVectorsForUsers(
  userIds: string[]
): Promise<Map<string, EmotionVector>> {
  if (userIds.length === 0) return new Map()

  // Single query: fetch all relevant letters for all users at once
  const letters = await prisma.letter.findMany({
    where: {
      userId: { in: userIds },
      emotion: { not: null },
    },
    select: { userId: true, emotion: true, intensity: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Group by userId, keeping only the 50 most recent per user
  const byUser = new Map<string, typeof letters>()
  for (const letter of letters) {
    const bucket = byUser.get(letter.userId) ?? []
    if (bucket.length < 50) bucket.push(letter)
    byUser.set(letter.userId, bucket)
  }

  // Build + normalise each vector
  const result = new Map<string, EmotionVector>()
  for (const userId of userIds) {
    const userLetters = byUser.get(userId) ?? []
    const vec = emptyVector()
    userLetters.forEach((letter, index) => {
      const ei = EMOTIONS.indexOf((letter.emotion ?? '') as Emotion)
      if (ei === -1) return
      const recency = Math.exp(-index * 0.1)
      vec[ei] += (letter.intensity ?? 0.5) * recency
    })
    result.set(userId, normalise(vec))
  }

  return result
}

// ─── Public: find matches ─────────────────────────────────────────────────

export type MatchSuggestion = {
  userId: string
  anonymousName: string | null
  similarity: number
  sharedEmotions: Emotion[]   // what you actually have in common
}

export async function findMatches(userId: string): Promise<MatchSuggestion[]> {
  // 1. Get IDs of users already matched with (any status)
  const existingMatches = await prisma.match.findMany({
    where: {
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    select: { requesterId: true, receiverId: true },
  })

  const alreadyMatched = new Set<string>()
  for (const m of existingMatches) {
    alreadyMatched.add(m.requesterId === userId ? m.receiverId : m.requesterId)
  }

  // 2. Candidate users — have emotional letters, not already matched
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId, notIn: [...alreadyMatched] },
      letters: { some: { emotion: { not: null } } },
    },
    select: { id: true, anonymousName: true },
    take: 200,
  })

  if (candidates.length === 0) return []

  // 3. Build ALL vectors in a single DB round-trip
  const allIds = [userId, ...candidates.map(u => u.id)]
  const vectors = await buildVectorsForUsers(allIds)

  const userVec = vectors.get(userId) ?? emptyVector()
  const hasData = userVec.some(v => v > 0)
  if (!hasData) return []

  const userDominant = dominantEmotions(userVec)

  // 4. Score and filter
  const suggestions: MatchSuggestion[] = []

  for (const candidate of candidates) {
    const otherVec = vectors.get(candidate.id) ?? emptyVector()
    const similarity = cosineSimilarity(userVec, otherVec)
    if (similarity < 0.3) continue

    const otherDominant = dominantEmotions(otherVec)
    const sharedEmotions = userDominant.filter(e => otherDominant.includes(e))

    suggestions.push({
      userId: candidate.id,
      anonymousName: candidate.anonymousName,
      similarity,
      sharedEmotions,
    })
  }

  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
}

// ─── Public: get or create match ──────────────────────────────────────────

export async function getOrCreateMatch(
  requesterId: string,
  receiverId: string,
  similarity: number
) {
  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  })

  if (existing) return existing

  return prisma.match.create({
    data: { requesterId, receiverId, similarity, status: 'PENDING' },
  })
}